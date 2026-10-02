import { db } from "@/lib/db/supabase";
import {
  flagUnreachableLeads,
  deleteHasWebsiteLeads,
  deleteLowScoreLeads,
  deleteIneligibleLeads,
} from "@/lib/leads/reachability";
import { discoverContacts } from "@/lib/leads/contactDiscoveryService";
import { enrichLeads } from "@/lib/leads/enrichmentService";
import { templateProvider } from "@/lib/mockup/templateMockup";
import { enqueueVideoJob } from "@/lib/video/queue";
import { sendOutreach } from "@/lib/outreach/gmailService";
import { processFollowUps } from "@/lib/outreach/followUpService";
import { qualifyAndPruneLeads, removeUnsendableLeads, isSendableLead, getContactedLeadIds } from "@/lib/pipeline/qualification";
import { OUTREACH_STATUSES } from "@/lib/outreach/gmailService";

const MOCKUP_BATCH_SIZE = 8;
// Enrichment costs real Anthropic tokens per lead, and every enriched lead
// keeps moving through mockup/video generation whether or not it'll actually
// get sent soon — there's no point enriching far more leads than the outreach
// rate limiter (lib/outreach/rateLimiter.ts) can even send in the near
// future. Top-priority-score leads first, small batch per tick.
const ENRICH_LEAD_LIMIT = 10;

export async function runPipeline(
  campaignId?: string,
  baseUrl?: string,
  opts?: { skipOutreach?: boolean }
): Promise<void> {
  // Every stage below is independently try/caught: one stage failing (e.g. an
  // Anthropic API error) must not prevent reply-checking, follow-ups, or
  // outreach from still running later in the same tick — those matter more
  // than enrichment and shouldn't silently stop firing every 15 minutes just
  // because an earlier, unrelated stage broke.

  // 0a. (Removed 2026-10-01.) This used to re-fetch Place Details for EVERY
  //     active lead on EVERY 15-minute tick (~7,000 billed calls/day at 73
  //     leads) and was the main driver of a $34 Google bill. Lead data is now
  //     a discovery-day snapshot. If freshness matters again, call
  //     refreshLeadData() only for the few leads about to be emailed — never
  //     for the whole table. See lib/leads/refreshLeadData.ts.

  // 0b. Flag leads with no email and no phone for manual review — backstop
  //     for leads that skipped contactDiscoveryService entirely (e.g. CSV imports).
  try {
    await flagUnreachableLeads();
  } catch (err) {
    console.error("Stage failed: flagUnreachableLeads:", err);
  }

  // 0c. Filtering net, part 1 — delete any lead that already has a website.
  //     See lib/leads/reachability.ts for why.
  try {
    await deleteHasWebsiteLeads();
  } catch (err) {
    console.error("Stage failed: deleteHasWebsiteLeads:", err);
  }

  // 0d. Filtering net, part 2 — delete any lead scoring below 6.
  try {
    await deleteLowScoreLeads();
  } catch (err) {
    console.error("Stage failed: deleteLowScoreLeads:", err);
  }

  // 0e. Filtering net, part 3 — delete any lead failing the hard eligibility
  //     cutoffs (reviews, rating, tenure). See lib/leads/reachability.ts.
  try {
    await deleteIneligibleLeads();
  } catch (err) {
    console.error("Stage failed: deleteIneligibleLeads:", err);
  }

  // 1. Contact discovery — find email and social media for new leads.
  //    Runs before enrichment so outreach channels are known before Claude processes leads.
  try {
    const discoveryQuery = db.from("leads").select("id").eq("status", "new");
    if (campaignId) discoveryQuery.eq("campaign_id", campaignId);
    const { data: discoveryLeads } = await discoveryQuery;

    if (discoveryLeads?.length) {
      await discoverContacts(discoveryLeads.map((l) => l.id));
    }
  } catch (err) {
    console.error("Stage failed: discoverContacts:", err);
  }

  // 1b. Qualify: email-bearing new leads go straight into the outreach pool
  //     (capped at today's remaining send budget; the surplus is removed).
  //     No enrichment, website or video is built before a lead replies; that
  //     happens in lib/pipeline/replyFlow.ts. See CLAUDE.md "Build-on-Reply".
  try {
    await removeUnsendableLeads();
    await qualifyAndPruneLeads();
  } catch (err) {
    console.error("Stage failed: qualifyAndPruneLeads:", err);
  }

  // 2-4. Manual-source leads (Cyril's hand-picked entries) keep the old
  //      enrich -> mockup -> video path; automated leads never reach it.
  try {
    if (process.env.PAUSE_ENRICHMENT === "true") {
      console.log("Enrichment paused (PAUSE_ENRICHMENT=true) — skipping manual-lead builds this tick.");
    } else {
      const { data: manualNew } = await db
        .from("leads")
        .select("id")
        .eq("status", "new")
        .eq("source", "manual")
        .limit(ENRICH_LEAD_LIMIT);
      if (manualNew?.length) await enrichLeads(manualNew.map((l) => l.id));

      const { data: manualBrief } = await db
        .from("leads")
        .select("id, site_brief, business_name")
        .eq("status", "brief_ready")
        .eq("source", "manual")
        .is("website_url", null)
        .limit(MOCKUP_BATCH_SIZE);
      for (const lead of manualBrief ?? []) {
        if (!lead.site_brief) continue;
        try {
          await templateProvider.build(lead.id, lead.site_brief, lead.business_name, baseUrl);
        } catch (err) {
          console.error(`Mockup failed for ${lead.id}:`, err);
          await db.from("leads").update({ status: "brief_ready" }).eq("id", lead.id);
        }
      }

      const { data: manualMockup } = await db
        .from("leads")
        .select("id, business_name, screenshot_paths")
        .eq("status", "mockup_ready")
        .eq("source", "manual");
      for (const lead of manualMockup ?? []) {
        if (!lead.screenshot_paths?.length) continue;
        await enqueueVideoJob(lead.id, lead.business_name, lead.screenshot_paths).catch((err) =>
          console.error(`Queueing video failed for ${lead.id}:`, err)
        );
      }
    }
  } catch (err) {
    console.error("Stage failed: manual-lead builds:", err);
  }

  // 5-6. Reply detection, interest notifications, and the build-on-reply flow
  //      run on their own faster timer (scheduler.ts -> replyFlow.ts).

  // 7. Process follow-ups — second send priority (existing threads, due by
  //    schedule). Also generates text via Anthropic, so it shares the
  //    PAUSE_ENRICHMENT gate (name kept as-is; it really means "pause
  //    Anthropic-cost pipeline stages").
  try {
    if (process.env.PAUSE_ENRICHMENT === "true") {
      console.log("Follow-ups paused (PAUSE_ENRICHMENT=true) — skipping this tick.");
    } else {
      await processFollowUps();
    }
  } catch (err) {
    console.error("Stage failed: processFollowUps:", err);
  }

  // 8. Cold outreach. The scheduler passes skipOutreach because it runs its own
  //    jittered sender (see scheduler.ts); a manual POST /api/pipeline still sends
  //    at most one here.
  if (!opts?.skipOutreach) await sendNextOutreach(campaignId);
}

/**
 * Send the cold email to the single highest-priority lead in the outreach pool
 * (uncontacted, has an email). Always one lead per call (deliverability: no
 * bursts). Still gated by canSendOutreachEmail() (PAUSE_OUTREACH + daily cap)
 * inside sendOutreach.
 */
export async function sendNextOutreach(campaignId?: string): Promise<void> {
  const poolQuery = db
    .from("leads")
    .select("id, source, status, business_name, email")
    .in("status", OUTREACH_STATUSES)
    .eq("manual_outreach_only", false)
    .eq("opted_out", false)
    .not("email", "is", null)
    .order("priority_score", { ascending: false })
    .limit(50);
  if (campaignId) poolQuery.eq("campaign_id", campaignId);
  const { data: pool } = await poolQuery;

  const contacted = await getContactedLeadIds();
  // Manual leads only go out once their video is ready (their old behavior).
  const next = (pool ?? []).find(
    (l) => !contacted.has(l.id) && (l.source === "manual" || isSendableLead(l)) && (l.source !== "manual" || l.status === "video_ready")
  );
  if (!next) return;

  try {
    await sendOutreach(next.id);
  } catch (err) {
    console.error(`Outreach failed for ${next.id}:`, err);
  }
}

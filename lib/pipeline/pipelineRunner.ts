import { db } from "@/lib/db/supabase";
import {
  flagUnreachableLeads,
  deleteHasWebsiteLeads,
  deleteLowScoreLeads,
  deleteIneligibleLeads,
} from "@/lib/leads/reachability";
import { refreshLeadData } from "@/lib/leads/refreshLeadData";
import { discoverContacts } from "@/lib/leads/contactDiscoveryService";
import { enrichLeads } from "@/lib/leads/enrichmentService";
import { templateProvider } from "@/lib/mockup/templateMockup";
import { enqueueVideoJob } from "@/lib/video/queue";
import { sendOutreach } from "@/lib/outreach/gmailService";
import { processFollowUps } from "@/lib/outreach/followUpService";
import { checkReplies } from "@/lib/outreach/replyMonitor";
import { sendSchedulingEmail } from "@/lib/outreach/schedulingService";

const MOCKUP_BATCH_SIZE = 8;
// Enrichment costs real Anthropic tokens per lead, and every enriched lead
// keeps moving through mockup/video generation whether or not it'll actually
// get sent soon — there's no point enriching far more leads than the outreach
// rate limiter (lib/outreach/rateLimiter.ts) can even send in the near
// future. Top-priority-score leads first, small batch per tick.
const ENRICH_LEAD_LIMIT = 10;

export async function runPipeline(campaignId?: string, baseUrl?: string): Promise<void> {
  // Every stage below is independently try/caught: one stage failing (e.g. an
  // Anthropic API error) must not prevent reply-checking, follow-ups, or
  // outreach from still running later in the same tick — those matter more
  // than enrichment and shouldn't silently stop firing every 15 minutes just
  // because an earlier, unrelated stage broke.

  // 0a. Refresh review_count/rating/website_url from live Places data before
  //     any filtering decisions run off them — see lib/leads/refreshLeadData.ts.
  try {
    await refreshLeadData();
  } catch (err) {
    console.error("Stage failed: refreshLeadData:", err);
  }

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

  // 2. Enrich all new leads (diagnosis, cold message, site brief) — costs real
  //    Anthropic tokens per lead, so PAUSE_ENRICHMENT lets the rest of the
  //    scheduler (contact discovery, mockups, video queue, reply-checks,
  //    outreach) keep running for free while enrichment spend is held off
  //    deliberately (e.g. a large backlog of 'new' leads awaiting a go-ahead).
  try {
    if (process.env.PAUSE_ENRICHMENT === "true") {
      console.log("Enrichment paused (PAUSE_ENRICHMENT=true) — skipping this tick.");
    } else {
      const newLeadsQuery = db
        .from("leads")
        .select("id")
        .eq("status", "new")
        .order("priority_score", { ascending: false })
        .limit(ENRICH_LEAD_LIMIT);
      if (campaignId) newLeadsQuery.eq("campaign_id", campaignId);
      const { data: newLeads } = await newLeadsQuery;

      if (newLeads?.length) {
        await enrichLeads(newLeads.map((l) => l.id));
      }
    }
  } catch (err) {
    console.error("Stage failed: enrichLeads:", err);
  }

  // 3. Build mockups for top leads (brief_ready, sorted by priority_score).
  //    No-website leads only — a business that already has a site, even an
  //    outdated one, isn't a fit for a generic mockup template (Cyril found
  //    real 6-7/10 existing sites that beat it on custom structure/content
  //    the template can't replicate per-business). The score cutoff for
  //    which no-website leads qualify is still being worked out — see
  //    CLAUDE.md "Targeting: No-Website Leads Only".
  const mockupQuery = db
    .from("leads")
    .select("id, site_brief, business_name")
    .eq("status", "brief_ready")
    .is("website_url", null)
    .order("priority_score", { ascending: false })
    .limit(MOCKUP_BATCH_SIZE);
  if (campaignId) mockupQuery.eq("campaign_id", campaignId);
  const { data: mockupLeads } = await mockupQuery;

  for (const lead of mockupLeads ?? []) {
    if (!lead.site_brief) continue;
    try {
      await templateProvider.build(lead.id, lead.site_brief, lead.business_name, baseUrl);
    } catch (err) {
      console.error(`Mockup failed for ${lead.id}:`, err);
      await db.from("leads").update({ status: "brief_ready" }).eq("id", lead.id);
    }
  }

  // 4. Queue videos for mockup_ready leads — actual generation happens in the
  //    background worker (lib/video/queueWorker.ts), one at a time, shared
  //    with manually-triggered "Generate Video" clicks so the two paths never
  //    run Playwright concurrently against each other.
  const videoQuery = db
    .from("leads")
    .select("id, business_name, screenshot_paths")
    .eq("status", "mockup_ready");
  if (campaignId) videoQuery.eq("campaign_id", campaignId);
  const { data: videoLeads } = await videoQuery;

  for (const lead of videoLeads ?? []) {
    if (!lead.screenshot_paths?.length) continue;
    try {
      await enqueueVideoJob(lead.id, lead.business_name, lead.screenshot_paths);
    } catch (err) {
      console.error(`Queueing video failed for ${lead.id}:`, err);
    }
  }

  // 5. Check replies first (global, not per-campaign) so today's send-rate
  //    budget (shared across steps 6-8, see lib/outreach/rateLimiter.ts) goes
  //    to real human engagement before fresh cold outreach.
  try {
    await checkReplies();
  } catch (err) {
    console.error("Stage failed: checkReplies:", err);
  }

  // 6. Send scheduling emails to positive replies — highest send priority,
  //    since these are replies to someone who already responded.
  const { data: positiveLeads } = await db
    .from("leads")
    .select("id")
    .eq("status", "positive");

  for (const lead of positiveLeads ?? []) {
    try {
      await sendSchedulingEmail(lead.id);
    } catch (err) {
      console.error(`Scheduling email failed for ${lead.id}:`, err);
    }
  }

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

  // 8. Send outreach for video_ready leads that have an email — lowest send
  //    priority; gets whatever's left of today's rate-limited budget.
  //    Capped to ONE send per tick (2026-09-22, deliverability research):
  //    the daily cap alone still allowed every eligible lead to send
  //    back-to-back within a single tick — a burst pattern that's a spam
  //    signal independent of the daily total. One per 15-minute tick spreads
  //    sends across the day instead (5/day takes ≥75min, 20/day takes ≥5hr).
  const outreachQuery = db
    .from("leads")
    .select("id")
    .eq("status", "video_ready")
    .eq("manual_outreach_only", false)
    .not("email", "is", null)
    .order("priority_score", { ascending: false })
    .limit(1);
  if (campaignId) outreachQuery.eq("campaign_id", campaignId);
  const { data: outreachLeads } = await outreachQuery;

  for (const lead of outreachLeads ?? []) {
    try {
      await sendOutreach(lead.id);
    } catch (err) {
      console.error(`Outreach failed for ${lead.id}:`, err);
    }
  }
}

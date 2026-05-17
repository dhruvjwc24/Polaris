import { db } from "@/lib/db/supabase";
import { discoverContacts } from "@/lib/leads/contactDiscoveryService";
import { enrichLeads } from "@/lib/leads/enrichmentService";
import { templateProvider } from "@/lib/mockup/templateMockup";
import { higgsFieldProvider } from "@/lib/video/higgsFieldAutomation";
import { sendOutreach } from "@/lib/outreach/gmailService";
import { processFollowUps } from "@/lib/outreach/followUpService";
import { checkReplies } from "@/lib/outreach/replyMonitor";
import { sendSchedulingEmail } from "@/lib/outreach/schedulingService";

const MOCKUP_BATCH_SIZE = 8;

export async function runPipeline(campaignId?: string, baseUrl?: string): Promise<void> {
  // 1. Contact discovery — find email, social media, and queue SMS for new leads
  //    Runs before enrichment so outreach channels are known before Claude processes leads.
  const discoveryQuery = db.from("leads").select("id").eq("status", "new");
  if (campaignId) discoveryQuery.eq("campaign_id", campaignId);
  const { data: discoveryLeads } = await discoveryQuery;

  if (discoveryLeads?.length) {
    await discoverContacts(discoveryLeads.map((l) => l.id));
  }

  // 2. Enrich all new leads (diagnosis, cold message, site brief)
  const newLeadsQuery = db.from("leads").select("id").eq("status", "new");
  if (campaignId) newLeadsQuery.eq("campaign_id", campaignId);
  const { data: newLeads } = await newLeadsQuery;

  if (newLeads?.length) {
    await enrichLeads(newLeads.map((l) => l.id));
  }

  // 2. Build mockups for top leads (brief_ready, sorted by priority_score)
  const mockupQuery = db
    .from("leads")
    .select("id, site_brief, business_name")
    .eq("status", "brief_ready")
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

  // 3. Generate videos for mockup_ready leads
  const videoQuery = db
    .from("leads")
    .select("id, screenshot_paths")
    .eq("status", "mockup_ready");
  if (campaignId) videoQuery.eq("campaign_id", campaignId);
  const { data: videoLeads } = await videoQuery;

  for (const lead of videoLeads ?? []) {
    if (!lead.screenshot_paths?.length) continue;
    try {
      await higgsFieldProvider.generate(lead.id, lead.screenshot_paths);
    } catch (err) {
      console.error(`Video failed for ${lead.id}:`, err);
      await db.from("leads").update({ status: "mockup_ready" }).eq("id", lead.id);
    }
  }

  // 4. Send outreach for video_ready leads that have an email
  const outreachQuery = db
    .from("leads")
    .select("id")
    .eq("status", "video_ready")
    .not("email", "is", null);
  if (campaignId) outreachQuery.eq("campaign_id", campaignId);
  const { data: outreachLeads } = await outreachQuery;

  for (const lead of outreachLeads ?? []) {
    try {
      await sendOutreach(lead.id);
    } catch (err) {
      console.error(`Outreach failed for ${lead.id}:`, err);
    }
  }

  // 5. Process follow-ups and check replies (global, not per-campaign)
  await processFollowUps();
  await checkReplies();

  // 6. Send scheduling emails to positive replies
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
}

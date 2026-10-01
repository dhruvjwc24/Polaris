import { db } from "@/lib/db/supabase";
import { enrichLeads } from "@/lib/leads/enrichmentService";
import { templateProvider } from "@/lib/mockup/templateMockup";
import { enqueueVideoJob } from "@/lib/video/queue";
import { checkReplies } from "@/lib/outreach/replyMonitor";
import { getGmailClient, buildRfc2822 } from "@/lib/outreach/gmailClient";
import { canSendOutreachEmail } from "@/lib/outreach/rateLimiter";
import { canSpamFooter } from "@/lib/outreach/canSpamFooter";
import { resolveSendTarget } from "@/lib/outreach/testMode";
import { notifyDiscord } from "@/lib/notify";
import { getContactedLeadIds } from "@/lib/pipeline/qualification";
import {
  processMeetingFlow,
  latestInboundText,
  extractMeetingTime,
  combinedDeliveryBody,
  planMeeting,
  recordBooking,
  type MeetingPlan,
} from "@/lib/pipeline/meetingFlow";
import type { Lead } from "@/lib/types";

// Build-on-reply flow (Cyril, 2026-09-30). The cold email is plain text and
// nothing is built for a lead until it replies with interest. Then, with no
// human needed: enrich -> website mockup -> video -> reply in the same thread
// with the video link and a Zoom/Meet invitation. Steps are keyed on what data
// the lead already has (a lead that was built earlier skips straight ahead),
// so every pass is idempotent and safe to repeat.
//
// Interest is detected by replyMonitor.checkReplies() (status 'positive'),
// which already pings Discord and Cyril's main inbox the moment it happens.

const FLOW_STATUSES = ["positive", "brief_ready", "mockup_ready", "video_ready"];

function deliveryBody(videoUrl: string): string {
  return (
    "Thanks so much for getting back to me! I put together the website for you. Here's a short recorded video of it so you can see what it looks like:\n\n" +
    `${videoUrl}\n\n` +
    "If you like where it's going, give me a date and time that you're free and we can hop on a Zoom. I'll walk you through it and you can ask me anything. Or whatever time works best for you is good with me. If you want anything changed or added, just tell me."
  );
}

async function deliverWebsite(lead: Lead & { outreach_messages?: { gmail_thread_id: string | null; subject: string | null }[] }): Promise<void> {
  if (!lead.email || !lead.video_url) return;
  if (lead.opted_out) return;
  // A reply to someone who wrote first: honors PAUSE_OUTREACH but not the cold daily budget.
  if (!(await canSendOutreachEmail({ isReply: true }))) return;

  const original = lead.outreach_messages?.[0];

  // If their interested reply already named a time, book it in this same email.
  let booked: MeetingPlan | null = null;
  let bookedMsgId = "";
  let bookedText = "";
  if (process.env.ZOOM_LINK && original?.gmail_thread_id) {
    try {
      const inbound = await latestInboundText(original.gmail_thread_id);
      if (inbound) {
        const found = await extractMeetingTime(inbound.text);
        if (found.kind === "specific" && found.iso) {
          booked = planMeeting(found);
          bookedMsgId = inbound.msgId;
          bookedText = inbound.text;
        }
      }
    } catch (err) {
      console.error(`[replyFlow] could not read time from reply for ${lead.id}:`, err);
    }
  }
  const body = (booked ? combinedDeliveryBody(lead.video_url, booked) : deliveryBody(lead.video_url)) + canSpamFooter();
  const target = resolveSendTarget({
    realEmail: lead.email,
    businessName: lead.business_name,
    realSubject: `Re: ${original?.subject ?? `A website for ${lead.business_name}`}`,
    realThreadId: original?.gmail_thread_id,
  });

  const sent = await getGmailClient().users.messages.send({
    userId: "me",
    requestBody: { raw: buildRfc2822(target.to, target.subject, body), threadId: target.threadId },
  });
  if (target.testMode) return;

  await db.from("outreach_messages").insert({
    lead_id: lead.id,
    channel: "email",
    subject: target.subject,
    body,
    follow_up_number: 3,
    gmail_thread_id: sent.data.threadId ?? null,
    gmail_message_id: sent.data.id ?? null,
  });
  await db.from("leads").update({ status: "call_scheduled" }).eq("id", lead.id);

  if (booked) {
    await recordBooking({ leadId: lead.id, businessName: lead.business_name, leadEmail: lead.email, plan: booked, msgId: bookedMsgId, replyText: bookedText });
    notifyDiscord(`✅ Sent the website video to **${lead.business_name}** along with the meeting details.`).catch(() => {});
  } else {
    notifyDiscord(`✅ Sent the website video to **${lead.business_name}**. Watch your inbox for their date and time.`).catch(() => {});
  }
}

export async function advanceInterestedLeads(baseUrl?: string): Promise<void> {
  const contacted = await getContactedLeadIds();
  const { data: rows, error } = await db
    .from("leads")
    .select("*, outreach_messages(gmail_thread_id, subject)")
    .in("status", FLOW_STATUSES)
    .eq("opted_out", false);
  if (error) {
    console.error("[replyFlow] failed to load interested leads:", error.message);
    return;
  }

  for (const row of rows ?? []) {
    if (!contacted.has(row.id)) continue; // only leads we actually emailed
    const leadId = row.id as string;
    try {
      let lead = row as Lead & { outreach_messages?: { gmail_thread_id: string | null; subject: string | null }[] };

      // 1. Enrichment (site brief + structure) only now that they replied.
      if (!lead.site_brief) {
        await enrichLeads([leadId], true);
        const { data: fresh } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
        if (!fresh?.site_brief) continue; // retry next pass
        lead = { ...lead, ...fresh };
      }

      // 2. Website mockup.
      if (!lead.screenshot_paths?.length) {
        await templateProvider.build(leadId, lead.site_brief!, lead.business_name, baseUrl);
        const { data: fresh } = await db.from("leads").select("*").eq("id", leadId).maybeSingle();
        if (!fresh?.screenshot_paths?.length) continue;
        lead = { ...lead, ...fresh };
      }

      // 3. Video (queued; the background worker generates it and sets video_ready).
      if (!lead.video_url) {
        await enqueueVideoJob(leadId, lead.business_name, lead.screenshot_paths!);
        await db.from("leads").update({ status: "positive" }).eq("id", leadId);
        continue;
      }

      // 4. Deliver in the original thread.
      await deliverWebsite(lead);
    } catch (err) {
      console.error(`[replyFlow] step failed for lead ${leadId}:`, err);
    }
  }
}

/** One full pass: detect replies (notifies Discord + email), then advance builds and deliveries. */
export async function processReplyFlow(baseUrl?: string): Promise<void> {
  try {
    await checkReplies();
  } catch (err) {
    console.error("[replyFlow] checkReplies failed:", err);
  }
  await advanceInterestedLeads(baseUrl);
  await processMeetingFlow();
}

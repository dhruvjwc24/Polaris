import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "./gmailClient";
import { canSendOutreachEmail } from "./rateLimiter";
import { canSpamFooter } from "./canSpamFooter";
import { resolveSendTarget } from "./testMode";
import { EMAIL_INTRO, EMAIL_OFFER, EMAIL_ADD_MORE, EMAIL_CLOSE, EMAIL_VIDEO_NOTE, EMAIL_LEGIT, stripDashes } from "./copyStyle";
import { buildColdObservation } from "./coldTemplate";
import type { Lead } from "@/lib/types";

// Subjects must stay truthful: nothing has been built when this goes out.
const SUBJECT_LINES = [
  "A website for {name}",
  "Quick idea for {name}",
  "Saw {name} online",
];

function pickSubject(businessName: string): string {
  const template = SUBJECT_LINES[Math.floor(Math.random() * SUBJECT_LINES.length)];
  return template.replace("{name}", businessName);
}

// Plain text, no links (Cyril, 2026-09-30, backed by cold-email deliverability
// research: first-touch links from a new shared-Gmail sender hurt inbox
// placement). The website and video are only built after the lead replies;
// see lib/pipeline/replyFlow.ts.
export function buildBody(lead: Lead): string {
  const observation =
    lead.source === "manual" && lead.cold_message
      ? stripDashes(lead.cold_message)
      : buildColdObservation(lead);
  const lines = [
    EMAIL_INTRO,
    "",
    observation,
    "",
    `${EMAIL_OFFER} ${EMAIL_ADD_MORE}`,
    "",
    EMAIL_CLOSE,
    "",
    EMAIL_VIDEO_NOTE,
    "",
    EMAIL_LEGIT,
  ];
  lines.push(canSpamFooter());
  return lines.join("\n");
}

// Any not-yet-contacted lead state may be sent; the reply flow (replyFlow.ts)
// handles everything after a lead has been emailed.
export const OUTREACH_STATUSES = ["enriched", "brief_ready", "mockup_building", "mockup_ready", "video_building", "video_ready"];

export async function sendOutreach(leadId: string, force = false): Promise<void> {
  const query = db.from("leads").select("*").eq("id", leadId);
  if (!force) query.in("status", OUTREACH_STATUSES);
  const { data: lead, error: fetchError } = await query.maybeSingle();

  if (fetchError) {
    console.error(`[gmailService] failed to fetch lead ${leadId}:`, fetchError.message);
    return;
  }
  if (!lead?.email) return;
  if (lead.opted_out) {
    console.log(`Skipping outreach to ${leadId} — opted out`);
    return;
  }

  if (!(await canSendOutreachEmail())) {
    console.log(`Outreach send-rate cap reached, skipping ${leadId} until tomorrow`);
    return;
  }

  const gmail = getGmailClient();
  const body = buildBody(lead);
  const target = resolveSendTarget({
    realEmail: lead.email,
    businessName: lead.business_name,
    realSubject: pickSubject(lead.business_name),
  });
  const raw = buildRfc2822(target.to, target.subject, body);

  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  // A test-mode send is a dry run of content/delivery only — it must not
  // touch the real lead's pipeline state. See testMode.ts's resolveSendTarget
  // doc comment for the real incident this guards against.
  if (target.testMode) return;

  const threadId = sent.data.threadId ?? null;
  const messageId = sent.data.id ?? null;

  await db.from("outreach_messages").insert({
    lead_id: leadId,
    channel: "email",
    subject: target.subject,
    body,
    follow_up_number: 0,
    gmail_thread_id: threadId,
    gmail_message_id: messageId,
  });

  await db
    .from("leads")
    .update({ status: "outreach_sent" })
    .eq("id", leadId);
}

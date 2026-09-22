import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "./gmailClient";
import { canSendOutreachEmail } from "./rateLimiter";
import type { Lead } from "@/lib/types";

const SUBJECT_LINES = [
  "Built something for {name}",
  "Quick mockup for {name}",
  "Saw your reviews, made you something",
];

function pickSubject(businessName: string): string {
  const template = SUBJECT_LINES[Math.floor(Math.random() * SUBJECT_LINES.length)];
  return template.replace("{name}", businessName);
}

function buildBody(lead: Lead): string {
  const lines = [lead.cold_message ?? ""];
  // One link only (2026-09-22, deliverability research) — and it has to be
  // the video, not the mockup: lovable_url currently resolves to
  // localhost:3000 (Polaris isn't deployed anywhere public), so it's only
  // ever usable by Cyril himself sharing his own screen on a call. The video
  // is hosted on Supabase storage — a real public URL — so it's the only
  // link that actually works for the recipient. Do not swap this back to
  // lovable_url until Polaris is deployed publicly.
  if (lead.video_url) lines.push(`\n10-second walkthrough: ${lead.video_url}`);
  // Static, not AI-generated, so it's guaranteed to be in every send — since
  // these are now built from a generic template (no-website leads only,
  // 2026-09-21 pivot), we can't know what each business specifically wants
  // added, so we offer to add it instead. Names concrete examples (pages a
  // competitor site, woodbridgeroofers.com, actually had) rather than a
  // vague "anything," per Cyril 2026-09-22 — specific reads as credible,
  // vague reads as a throwaway line.
  lines.push(
    "\nHappy to add more to this — extra pages for services, financing, the areas you serve, whatever's useful. Just let me know."
  );
  return lines.join("\n");
}

export async function sendOutreach(leadId: string, force = false): Promise<void> {
  const query = db.from("leads").select("*").eq("id", leadId);
  if (!force) query.eq("status", "video_ready");
  const { data: lead } = await query.maybeSingle();

  if (!lead?.email || !lead.cold_message) return;

  if (!(await canSendOutreachEmail())) {
    console.log(`Outreach send-rate cap reached, skipping ${leadId} until tomorrow`);
    return;
  }

  const gmail = getGmailClient();
  const subject = pickSubject(lead.business_name);
  const body = buildBody(lead);
  const raw = buildRfc2822(lead.email, subject, body);

  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  const threadId = sent.data.threadId ?? null;
  const messageId = sent.data.id ?? null;

  await db.from("outreach_messages").insert({
    lead_id: leadId,
    channel: "email",
    subject,
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

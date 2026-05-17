import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "./gmailClient";
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
  if (lead.video_url) lines.push(`\n10-second walkthrough: ${lead.video_url}`);
  if (lead.lovable_url) lines.push(`Full preview: ${lead.lovable_url}`);
  return lines.join("\n");
}

export async function sendOutreach(leadId: string): Promise<void> {
  const { data: lead } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("status", "video_ready")
    .maybeSingle();

  if (!lead?.email || !lead.cold_message) return;

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

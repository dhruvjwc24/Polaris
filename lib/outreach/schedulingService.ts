import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "./gmailClient";

const CALENDLY_URL = process.env.CALENDLY_URL ?? "";

export async function sendSchedulingEmail(leadId: string): Promise<void> {
  const { data: lead } = await db
    .from("leads")
    .select("*, outreach_messages(gmail_thread_id, subject)")
    .eq("id", leadId)
    .eq("status", "positive")
    .maybeSingle();

  if (!lead?.email) return;

  const gmail = getGmailClient();
  const originalMessage = lead.outreach_messages?.[0];
  const subject = `Re: ${originalMessage?.subject ?? `Quick mockup for ${lead.business_name}`}`;
  const body = `Thanks for getting back to me! Here's a link to grab 15 minutes at whatever time works best for you:\n\n${CALENDLY_URL}\n\nLooking forward to it.`;

  const raw = buildRfc2822(lead.email, subject, body);

  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: originalMessage?.gmail_thread_id ?? undefined,
    },
  });

  await db.from("outreach_messages").insert({
    lead_id: leadId,
    channel: "email",
    subject,
    body,
    follow_up_number: 3,
    gmail_thread_id: sent.data.threadId ?? null,
    gmail_message_id: sent.data.id ?? null,
  });

  await db.from("leads").update({ status: "call_scheduled" }).eq("id", leadId);
}

import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "./gmailClient";
import { canSendOutreachEmail } from "./rateLimiter";
import { canSpamFooter } from "./canSpamFooter";
import { resolveSendTarget } from "./testMode";

const CALENDLY_URL = process.env.CALENDLY_URL ?? "";

export async function sendSchedulingEmail(leadId: string): Promise<void> {
  const { data: lead, error: fetchError } = await db
    .from("leads")
    .select("*, outreach_messages(gmail_thread_id, subject)")
    .eq("id", leadId)
    .eq("status", "positive")
    .maybeSingle();

  if (fetchError) {
    console.error(`[schedulingService] failed to fetch lead ${leadId}:`, fetchError.message);
    return;
  }
  if (!lead?.email) return;
  if (lead.opted_out) {
    console.log(`Skipping scheduling email for ${leadId} — opted out`);
    return;
  }

  if (!(await canSendOutreachEmail())) {
    console.log(`Outreach send-rate cap reached, skipping scheduling email for ${leadId} until tomorrow`);
    return;
  }

  const gmail = getGmailClient();
  const originalMessage = lead.outreach_messages?.[0];
  const body = `Thanks for getting back to me! Here's a link to grab 15 minutes at whatever time works best for you:\n\n${CALENDLY_URL}\n\nLooking forward to it.` + canSpamFooter();
  const target = resolveSendTarget({
    realEmail: lead.email,
    businessName: lead.business_name,
    realSubject: `Re: ${originalMessage?.subject ?? `Quick mockup for ${lead.business_name}`}`,
    realThreadId: originalMessage?.gmail_thread_id,
  });

  const raw = buildRfc2822(target.to, target.subject, body);

  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: target.threadId },
  });

  // Dry run only in test mode — see testMode.ts's resolveSendTarget doc comment.
  if (target.testMode) return;

  await db.from("outreach_messages").insert({
    lead_id: leadId,
    channel: "email",
    subject: target.subject,
    body,
    follow_up_number: 3,
    gmail_thread_id: sent.data.threadId ?? null,
    gmail_message_id: sent.data.id ?? null,
  });

  await db.from("leads").update({ status: "call_scheduled" }).eq("id", leadId);
}

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "./gmailClient";
import type { Lead } from "@/lib/types";

const client = new Anthropic();

const FOLLOW_UP_CONFIG = [
  { status: "outreach_sent" as const, nextStatus: "followed_up_1" as const, days: 4, num: 1, angle: "gap" },
  { status: "followed_up_1" as const, nextStatus: "followed_up_2" as const, days: 7, num: 2, angle: "competitor" },
];

async function generateFollowUp(lead: Lead, angle: "gap" | "competitor"): Promise<string> {
  const prompt =
    angle === "gap"
      ? `Write a follow-up email for ${lead.business_name} in ${lead.city} (${lead.niche}). Under 50 words. Reference a specific gap in their current online presence: ${lead.gap_analysis ?? "no visible website"}. Same tone as original outreach. No AI mentions.`
      : `Write a follow-up email for ${lead.business_name} in ${lead.city} (${lead.niche}). Under 50 words. Reference what a competitor is likely doing better online. Specific, not generic. No AI mentions.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

export async function processFollowUps(): Promise<void> {
  const now = new Date();
  const gmail = getGmailClient();

  for (const config of FOLLOW_UP_CONFIG) {
    const cutoff = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000).toISOString();

    const { data: leads } = await db
      .from("leads")
      .select("*, outreach_messages(gmail_thread_id, subject)")
      .eq("status", config.status)
      .lt("updated_at", cutoff);

    if (!leads?.length) continue;

    for (const lead of leads) {
      const body = await generateFollowUp(lead, config.angle as "gap" | "competitor");
      if (!body || !lead.email) continue;

      const originalMessage = lead.outreach_messages?.[0];
      const subject = `Re: ${originalMessage?.subject ?? `Quick mockup for ${lead.business_name}`}`;
      const raw = buildRfc2822(lead.email, subject, body);

      const sent = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw,
          threadId: originalMessage?.gmail_thread_id ?? undefined,
        },
      });

      await db.from("outreach_messages").insert({
        lead_id: lead.id,
        channel: "email",
        subject,
        body,
        follow_up_number: config.num,
        gmail_thread_id: sent.data.threadId ?? null,
        gmail_message_id: sent.data.id ?? null,
      });

      await db.from("leads").update({ status: config.nextStatus }).eq("id", lead.id);
    }
  }

  // Archive leads with no reply after follow-up 2 + 7 days grace
  const archiveCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .from("leads")
    .update({ status: "archived" })
    .eq("status", "followed_up_2")
    .lt("updated_at", archiveCutoff);
}

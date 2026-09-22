import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "./gmailClient";
import { canSendOutreachEmail } from "./rateLimiter";
import { canSpamFooter } from "./canSpamFooter";
import { resolveSendTarget } from "./testMode";
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
  let rateCapped = false;

  for (const config of FOLLOW_UP_CONFIG) {
    if (rateCapped) break;

    const cutoff = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000).toISOString();

    // `.not("email", "is", null)`: phone-only leads also land at
    // status="outreach_sent" via /api/leads/[id]/mark-contacted (Cyril
    // marking a manual call/text done). Without this filter, every one of
    // those — forever, since their updated_at never advances again —
    // matches this query on every tick, burns a real Anthropic call in
    // generateFollowUp() below, and only then gets discarded for having no
    // email to send to. Skip them before spending anything.
    const { data: leads, error: fetchError } = await db
      .from("leads")
      .select("*, outreach_messages(gmail_thread_id, subject)")
      .eq("status", config.status)
      .eq("opted_out", false)
      .not("email", "is", null)
      .lt("updated_at", cutoff);

    if (fetchError) {
      // Must be loud: a silent failure here (e.g. a not-yet-applied migration
      // for the opted_out column) would look identical to "nothing due yet"
      // and quietly stop follow-ups — or worse, stop an opt-out from ever
      // being honored — with no visible error anywhere.
      console.error(`[followUps] failed to fetch leads for status "${config.status}":`, fetchError.message);
      continue;
    }
    if (!leads?.length) continue;

    for (const lead of leads) {
      if (!(await canSendOutreachEmail())) {
        console.log(`Outreach send-rate cap reached, deferring remaining follow-ups until tomorrow`);
        rateCapped = true;
        break;
      }

      try {
        let body: string;
        try {
          body = await generateFollowUp(lead, config.angle as "gap" | "competitor");
        } catch (err) {
          console.error(`[followUps] generation failed for lead ${lead.id}:`, err);
          continue;
        }
        if (!body || !lead.email) continue;
        // Same static, non-AI-generated offer as the initial email — see
        // gmailService.ts for why it's worded with concrete examples.
        body += "\n\nHappy to add more to this — extra pages for services, financing, the areas you serve, whatever's useful. Just let me know.";
        body += canSpamFooter();

        const originalMessage = lead.outreach_messages?.[0];
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
        if (target.testMode) continue;

        await db.from("outreach_messages").insert({
          lead_id: lead.id,
          channel: "email",
          subject: target.subject,
          body,
          follow_up_number: config.num,
          gmail_thread_id: sent.data.threadId ?? null,
          gmail_message_id: sent.data.id ?? null,
        });

        await db.from("leads").update({ status: config.nextStatus }).eq("id", lead.id);
      } catch (err) {
        // One lead's Gmail API failure (revoked thread, transient error, etc.)
        // must not abort the rest of this batch — each lead is independent.
        console.error(`[followUps] send failed for lead ${lead.id}:`, err);
      }
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

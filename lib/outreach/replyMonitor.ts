import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/supabase";
import { getGmailClient } from "./gmailClient";
import { notifyMainEmail, notifyDiscord } from "@/lib/notify";

const client = new Anthropic();

type ReplyIntent = "positive" | "not_interested" | "question" | "unsubscribe" | "other";

async function classifyReply(body: string): Promise<ReplyIntent> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 16,
    messages: [
      {
        role: "user",
        content: `Classify this email reply intent as exactly one of: positive, not_interested, question, unsubscribe, other. Use "unsubscribe" for any request to stop receiving emails, be removed from the list, or opt out — even if phrased politely or mixed with other text.\n\nReply:\n${body.slice(0, 500)}\n\nReturn only the classification word.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim().toLowerCase() : "other";
  const valid: ReplyIntent[] = ["positive", "not_interested", "question", "unsubscribe", "other"];
  return valid.includes(raw as ReplyIntent) ? (raw as ReplyIntent) : "other";
}

export async function checkReplies(): Promise<void> {
  const gmail = getGmailClient();

  // Get all tracked thread IDs for active leads
  const { data: messages } = await db
    .from("outreach_messages")
    .select("lead_id, gmail_thread_id")
    .not("gmail_thread_id", "is", null);

  if (!messages?.length) return;

  const threadMap = new Map<string, string>(); // threadId -> leadId
  for (const msg of messages) {
    if (msg.gmail_thread_id) threadMap.set(msg.gmail_thread_id, msg.lead_id);
  }

  // Check each thread for new replies
  for (const [threadId, leadId] of Array.from(threadMap.entries())) {
    // Only check leads that haven't replied yet
    const { data: lead } = await db
      .from("leads")
      .select("status")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead || ["replied", "positive", "call_scheduled", "closed", "archived"].includes(lead.status)) {
      continue;
    }

    let thread;
    try {
      thread = await gmail.users.threads.get({ userId: "me", id: threadId });
    } catch (err) {
      // A thread can be unreachable from the currently authenticated account
      // (e.g. sent under a previously-connected Gmail account before a
      // switch) or simply deleted. Either way, one bad thread must not stop
      // every other lead's replies from being checked.
      console.error(`[replyMonitor] could not fetch thread ${threadId} for lead ${leadId}:`, err);
      continue;
    }
    const messages = thread.data.messages ?? [];

    // A reply exists if there's more than 1 message in the thread
    if (messages.length <= 1) continue;

    // Get the latest reply body
    const lastMsg = messages[messages.length - 1];
    const bodyPart = lastMsg.payload?.parts?.find((p) => p.mimeType === "text/plain")
      ?? lastMsg.payload;
    const bodyData = bodyPart?.body?.data ?? "";
    const body = Buffer.from(bodyData, "base64url").toString("utf-8");

    let intent: ReplyIntent;
    try {
      intent = await classifyReply(body);
    } catch (err) {
      // e.g. Anthropic API failure — leave the lead unclassified so it's
      // retried next tick instead of dropping every other thread's check.
      console.error(`[replyMonitor] classification failed for lead ${leadId}:`, err);
      continue;
    }

    const { error: updateError } = await db
      .from("leads")
      .update({
        status: intent === "positive" ? "positive" : intent === "unsubscribe" ? "archived" : "replied",
        ...(intent === "unsubscribe" ? { opted_out: true } : {}),
      })
      .eq("id", leadId);

    if (updateError) {
      // Must be loud, especially for "unsubscribe": a silent failure here
      // means a business that explicitly asked to stop receiving email keeps
      // getting follow-ups sent to it, with nothing anywhere indicating why.
      console.error(`[replyMonitor] failed to update lead ${leadId} (intent=${intent}):`, updateError.message);
      continue;
    }

    // Real engagement — worth Cyril's immediate attention, not just a status change.
    if (intent === "positive" || intent === "question") {
      const { data: leadInfo } = await db
        .from("leads")
        .select("business_name")
        .eq("id", leadId)
        .maybeSingle();
      const bizName = leadInfo?.business_name ?? "A lead";
      const label = intent === "positive" ? "responded with interest" : "asked a question";
      const preview = body.slice(0, 400).trim();

      try {
        await notifyMainEmail(
          `${bizName} ${label} — reply in`,
          `${bizName} ${label} on the outreach email.\n\nReply:\n${preview}`
        );
      } catch (err) {
        console.error(`[replyMonitor] main-email notification failed for lead ${leadId}:`, err);
      }

      try {
        await notifyDiscord(`📬 **${bizName}** ${label}!\n> ${preview.replace(/\n/g, "\n> ")}`);
      } catch (err) {
        console.error(`[replyMonitor] Discord notification failed for lead ${leadId}:`, err);
      }
    }
  }
}

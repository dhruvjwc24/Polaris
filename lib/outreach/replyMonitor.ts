import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/supabase";
import { getGmailClient } from "./gmailClient";

const client = new Anthropic();

type ReplyIntent = "positive" | "not_interested" | "question" | "other";

async function classifyReply(body: string): Promise<ReplyIntent> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 16,
    messages: [
      {
        role: "user",
        content: `Classify this email reply intent as exactly one of: positive, not_interested, question, other.\n\nReply:\n${body.slice(0, 500)}\n\nReturn only the classification word.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim().toLowerCase() : "other";
  const valid: ReplyIntent[] = ["positive", "not_interested", "question", "other"];
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

    const thread = await gmail.users.threads.get({ userId: "me", id: threadId });
    const messages = thread.data.messages ?? [];

    // A reply exists if there's more than 1 message in the thread
    if (messages.length <= 1) continue;

    // Get the latest reply body
    const lastMsg = messages[messages.length - 1];
    const bodyPart = lastMsg.payload?.parts?.find((p) => p.mimeType === "text/plain")
      ?? lastMsg.payload;
    const bodyData = bodyPart?.body?.data ?? "";
    const body = Buffer.from(bodyData, "base64url").toString("utf-8");

    const intent = await classifyReply(body);

    await db
      .from("leads")
      .update({ status: intent === "positive" ? "positive" : "replied" })
      .eq("id", leadId);
  }
}

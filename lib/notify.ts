import { getGmailClient, buildRfc2822 } from "@/lib/outreach/gmailClient";

// Cyril's main personal inbox — reserved for things that need his eyes right
// away (a real reply showing interest), separate from the dedicated Polaris
// outreach account that sends/receives the bulk cold-email traffic.
// NOT markmsn0@gmail.com — that address is Claude Code login only.
const MAIN_EMAIL = "cyrilkafle6@gmail.com";

export async function notifyMainEmail(subject: string, body: string): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRfc2822(MAIN_EMAIL, subject, body) },
  });
}

export async function notifyDiscord(message: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[notify] DISCORD_WEBHOOK_URL not set — skipping Discord notification");
    return;
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
}

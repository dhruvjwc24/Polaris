import Anthropic from "@anthropic-ai/sdk";
import type { gmail_v1 } from "googleapis";
import { db } from "@/lib/db/supabase";
import { getGmailClient, buildRfc2822 } from "@/lib/outreach/gmailClient";
import { canSendOutreachEmail } from "@/lib/outreach/rateLimiter";
import { canSpamFooter } from "@/lib/outreach/canSpamFooter";
import { resolveSendTarget } from "@/lib/outreach/testMode";
import { notifyDiscord } from "@/lib/notify";
import { addMeetingToCalendar, calendarConfigured } from "@/lib/calendar/googleCalendar";

// Meeting scheduling after the website video has been delivered (Cyril,
// 2026-09-30). The delivery email asks the lead for a date and time. When they
// answer with a concrete time, this sends the Zoom link automatically, stores
// the meeting in call_logs, and emails a reminder about an hour before.
// Anything vague ("whenever works") is forwarded to Discord for Cyril to handle.
// Auto-confirming does NOT check Cyril's calendar, so every booking is also
// announced on Discord.

const client = new Anthropic();
const ZOOM_LINK = process.env.ZOOM_LINK ?? "";
const ZOOM_MEETING_ID = process.env.ZOOM_MEETING_ID ?? "";
const ZOOM_PASSCODE = process.env.ZOOM_PASSCODE ?? "";
const TZ = "America/New_York";
const REMINDER_WINDOW_MS = 60 * 60 * 1000; // email the lead when the meeting is an hour away
const DISCORD_HEADS_UP_MS = 70 * 60 * 1000; // ping Cyril 10 min earlier so he can set up

export type Extracted = { kind: "specific" | "flexible" | "unclear"; iso?: string; endIso?: string };

function spacedId(id: string): string {
  return id.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3");
}

/** Everything a guest needs to join, in plain text. */
export function zoomBlock(): string {
  const lines = [`Join link: ${ZOOM_LINK}`];
  if (ZOOM_MEETING_ID) lines.push(`Meeting ID: ${spacedId(ZOOM_MEETING_ID)}`);
  if (ZOOM_PASSCODE) lines.push(`Passcode: ${ZOOM_PASSCODE}`);
  return lines.join("\n");
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

export type MeetingPlan = {
  startIso: string;
  endIso?: string; // end of the window they offered, when they gave a range
  windowMinutes: number; // 0 when they gave one exact time
};

/**
 * Pick the meeting start from what the lead offered (Cyril, 2026-09-30):
 * one exact time -> that time; a window of an hour or less -> the start;
 * a wider window (90+ min) -> start plus 30 minutes, which leaves breathing
 * room if they run late (3-5 -> 3:30, 6-11 -> 6:30, 3-4 -> 3:00). Never picks
 * a time so late that a 30 minute call would overrun their window.
 */
export function planMeeting(found: Extracted): MeetingPlan {
  const start = new Date(found.iso!).getTime();
  const end = found.endIso ? new Date(found.endIso).getTime() : NaN;
  if (Number.isNaN(end)) return { startIso: new Date(start).toISOString(), windowMinutes: 0 };
  const minutes = Math.round((end - start) / 60000);
  let chosen = start;
  if (minutes >= 90 && start + 30 * 60000 + 30 * 60000 <= end) chosen = start + 30 * 60000;
  return { startIso: new Date(chosen).toISOString(), endIso: new Date(end).toISOString(), windowMinutes: minutes };
}

/** The sentence that confirms the chosen time, worded for how much room they gave. */
function scheduleSentence(plan: MeetingPlan): string {
  const when = prettyTime(plan.startIso);
  let lead: string;
  if (!plan.windowMinutes) lead = `Perfect, ${when} works for me too.`;
  else if (plan.windowMinutes <= 60)
    lead = `Perfect, since you're only free for a short window, I won't take up much of your time. Let's do ${when}.`;
  else if (plan.windowMinutes >= 180)
    lead = `That's a nice wide window, so let's do ${when}. That gives you some room in case you end up running a little late.`;
  else lead = `Yeah, ${when} is good with me.`;
  const note = plan.endIso
    ? ` I've written it down in my calendar, but if another time before ${timeOnly(plan.endIso)} ends up being better for you, just let me know.`
    : " I've written it down in my calendar.";
  return lead + note;
}

export function confirmationBody(plan: MeetingPlan): string {
  return `${scheduleSentence(plan)} Here's the Zoom link, meeting ID and passcode:\n\n${zoomBlock()}\n\nJust click the link at that time to join. Looking forward to talking with you!`;
}

/** First reply to an interested lead who already gave a time: the video plus the booking in one email. */
export function combinedDeliveryBody(videoUrl: string, plan: MeetingPlan): string {
  return (
    "Thanks so much for getting back to me! I put together the website for you. Here's a short recorded video of it so you can see what it looks like:\n\n" +
    `${videoUrl}\n\n` +
    `${scheduleSentence(plan)} Here's the Zoom link, meeting ID and passcode:\n\n${zoomBlock()}\n\n` +
    "I'll walk you through the website and you can ask me anything. If you want anything changed or added, just tell me."
  );
}

/** Book it everywhere: call log, Cyril's Google Calendar, and a Discord heads-up. */
export async function recordBooking(opts: {
  leadId: string;
  businessName: string;
  leadEmail: string | null;
  plan: MeetingPlan;
  msgId: string;
  replyText?: string;
}): Promise<void> {
  await db.from("call_logs").insert({ lead_id: opts.leadId, scheduled_at: opts.plan.startIso, notes: `booked from msg ${opts.msgId}` });
  const onCalendar = await addMeetingToCalendar({
    businessName: opts.businessName,
    leadEmail: opts.leadEmail,
    startIso: opts.plan.startIso,
    windowEndIso: opts.plan.endIso,
    zoomDetails: zoomBlock(),
    replyText: opts.replyText,
  });
  const calNote = onCalendar
    ? "Added to your Google Calendar."
    : calendarConfigured()
      ? "Could not add it to Google Calendar (check the server log), so add it by hand."
      : "Google Calendar isn't connected yet, so add it by hand (run npm run calendar:auth once).";
  notifyDiscord(`📅 Meeting booked with **${opts.businessName}** for **${prettyTime(opts.plan.startIso)}**. Zoom info sent. ${calNote}`).catch(() => {});
}

export function reminderBody(whenIso: string): string {
  return `Hey, it's Cyril from Polaris. Just a quick heads up that we have our meeting coming up in about an hour, at ${timeOnly(whenIso)} Eastern. Here's the Zoom info again in case you need it:\n\n${zoomBlock()}\n\nCan't wait to talk with you!`;
}

export function prettyTime(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-US", {
      timeZone: TZ,
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) + " Eastern"
  );
}

export function textFromPayload(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  for (const part of payload.parts ?? []) {
    const t = textFromPayload(part);
    if (t) return t;
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8").replace(/<[^>]+>/g, " ");
  }
  return payload.body?.data ? Buffer.from(payload.body.data, "base64url").toString("utf-8") : "";
}

// Drop the quoted earlier conversation so only the lead's new words are parsed.
export function newTextOnly(text: string): string {
  const cut = text.split(/\n\s*On .{5,120}wrote:|\n-{2,}\s*Original Message/i)[0];
  return cut
    .split("\n")
    .filter((l) => !l.trim().startsWith(">"))
    .join("\n")
    .trim();
}

export async function extractMeetingTime(text: string): Promise<Extracted> {
  const nowET = new Date().toLocaleString("en-US", { timeZone: TZ, dateStyle: "full", timeStyle: "short" });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content:
          `Right now it is ${nowET} (US Eastern). A business owner replied to an email asking for a date and time to meet on Zoom. ` +
          `Return ONLY JSON like {"kind":"specific","iso":"2026-10-02T15:00:00-04:00","endIso":"2026-10-02T17:00:00-04:00"} (endIso only when they gave a range, e.g. "3 to 5" means iso=3:00 PM start, endIso=5:00 PM). ` +
          `kind "specific" = they gave a concrete date AND time (resolve words like tomorrow or Friday relative to now; iso must be ISO 8601 with the correct US Eastern offset). ` +
          `kind "flexible" = they said any time works or asked me to pick. kind "unclear" = anything else, including a date with no time, a question, or a no.\n\nReply:\n${text.slice(0, 800)}`,
      },
    ],
  });
  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim());
    if (parsed.kind === "specific" && typeof parsed.iso === "string") {
      const t = new Date(parsed.iso).getTime();
      const now = Date.now();
      // Must be a real future time within 60 days, else treat as unclear.
      if (!Number.isNaN(t) && t > now + 15 * 60 * 1000 && t < now + 60 * 24 * 3600 * 1000) {
        const e = typeof parsed.endIso === "string" ? new Date(parsed.endIso).getTime() : NaN;
        return { kind: "specific", iso: new Date(t).toISOString(), ...(!Number.isNaN(e) && e > t ? { endIso: new Date(e).toISOString() } : {}) };
      }
      return { kind: "unclear" };
    }
    return { kind: parsed.kind === "flexible" ? "flexible" : "unclear" };
  } catch {
    return { kind: "unclear" };
  }
}

type LeadRow = {
  id: string;
  business_name: string;
  email: string | null;
  opted_out: boolean;
  outreach_messages?: { gmail_thread_id: string | null; subject: string | null }[];
};

async function sendInThread(lead: LeadRow, body: string, followUpNumber: number): Promise<boolean> {
  if (!lead.email || lead.opted_out) return false;
  if (!(await canSendOutreachEmail({ isReply: true }))) return false;
  const original = lead.outreach_messages?.[0];
  const fullBody = body + canSpamFooter();
  const target = resolveSendTarget({
    realEmail: lead.email,
    businessName: lead.business_name,
    realSubject: `Re: ${original?.subject ?? `A website for ${lead.business_name}`}`,
    realThreadId: original?.gmail_thread_id,
  });
  const sent = await getGmailClient().users.messages.send({
    userId: "me",
    requestBody: { raw: buildRfc2822(target.to, target.subject, fullBody), threadId: target.threadId },
  });
  if (target.testMode) return true;
  await db.from("outreach_messages").insert({
    lead_id: lead.id,
    channel: "email",
    subject: target.subject,
    body: fullBody,
    follow_up_number: followUpNumber,
    gmail_thread_id: sent.data.threadId ?? null,
    gmail_message_id: sent.data.id ?? null,
  });
  return true;
}

/** A: read replies to the delivery email and book the meeting when a concrete time is given. */
async function processTimeReplies(): Promise<void> {
  const { data: leads, error } = await db
    .from("leads")
    .select("id, business_name, email, opted_out, outreach_messages(gmail_thread_id, subject)")
    .eq("status", "call_scheduled")
    .eq("opted_out", false);
  if (error || !leads?.length) return;

  const gmail = getGmailClient();
  for (const lead of leads as LeadRow[]) {
    try {
      const threadId = lead.outreach_messages?.find((m) => m.gmail_thread_id)?.gmail_thread_id;
      if (!threadId) continue;

      const { data: logs } = await db.from("call_logs").select("scheduled_at, notes").eq("lead_id", lead.id);
      if (logs?.some((l) => l.scheduled_at)) continue; // already booked

      const thread = await gmail.users.threads.get({ userId: "me", id: threadId });
      const msgs = thread.data.messages ?? [];
      const last = msgs[msgs.length - 1];
      if (!last?.id || last.labelIds?.includes("SENT")) continue; // we spoke last, nothing new
      if (logs?.some((l) => l.notes?.includes(`handled:${last.id}`))) continue;

      const text = newTextOnly(textFromPayload(last.payload));
      if (!text) continue;
      const found = await extractMeetingTime(text);

      if (found.kind === "specific" && found.iso && ZOOM_LINK) {
        const plan = planMeeting(found);
        const ok = await sendInThread(lead, confirmationBody(plan), 4);
        if (ok) {
          await recordBooking({ leadId: lead.id, businessName: lead.business_name, leadEmail: lead.email, plan, msgId: last.id, replyText: text });
        }
        continue;
      }

      // Vague reply, or no Zoom link configured: hand it to Cyril once.
      await db.from("call_logs").insert({ lead_id: lead.id, scheduled_at: null, notes: `handled:${last.id}` });
      const why = found.kind === "specific" && !ZOOM_LINK ? " (ZOOM_LINK isn't set, so I couldn't auto-confirm)" : "";
      notifyDiscord(
        `🕒 **${lead.business_name}** replied about timing${why}. Reply to them yourself:\n> ${text.slice(0, 300).replace(/\n/g, "\n> ")}`
      ).catch(() => {});
    } catch (err) {
      console.error(`[meetingFlow] time-reply step failed for lead ${lead.id}:`, err);
    }
  }
}

/** Discord heads-up to Cyril ~70 minutes before each booked meeting (does not need Zoom or the lead's email). */
async function processDiscordHeadsUps(): Promise<void> {
  const now = Date.now();
  const { data: logs } = await db
    .from("call_logs")
    .select("id, lead_id, scheduled_at, notes")
    .not("scheduled_at", "is", null)
    .gt("scheduled_at", new Date(now).toISOString())
    .lt("scheduled_at", new Date(now + DISCORD_HEADS_UP_MS).toISOString());

  for (const log of logs ?? []) {
    if (log.notes?.includes("dping")) continue;
    const { data: lead } = await db.from("leads").select("business_name").eq("id", log.lead_id).maybeSingle();
    const mins = Math.max(1, Math.round((new Date(log.scheduled_at).getTime() - now) / 60000));
    await notifyDiscord(
      `⏰ Meeting with **${lead?.business_name ?? "a lead"}** in about ${mins} minutes (${prettyTime(log.scheduled_at)}). Time to get set up. The reminder email goes to them at the 1 hour mark.`
    ).catch(() => {});
    await db.from("call_logs").update({ notes: `${log.notes ?? ""}; dping` }).eq("id", log.id);
  }
}

/** B: an hour before each booked meeting, email the lead a reminder with the Zoom link. */
async function processReminders(): Promise<void> {
  if (!ZOOM_LINK) return;
  const now = Date.now();
  const { data: logs } = await db
    .from("call_logs")
    .select("id, lead_id, scheduled_at, notes")
    .not("scheduled_at", "is", null)
    .gt("scheduled_at", new Date(now).toISOString())
    .lt("scheduled_at", new Date(now + REMINDER_WINDOW_MS).toISOString());

  for (const log of logs ?? []) {
    if (log.notes?.includes("reminded")) continue;
    try {
      const { data: lead } = await db
        .from("leads")
        .select("id, business_name, email, opted_out, outreach_messages(gmail_thread_id, subject)")
        .eq("id", log.lead_id)
        .maybeSingle();
      if (!lead) continue;
      const ok = await sendInThread(
        lead as LeadRow,
        reminderBody(log.scheduled_at),
        5
      );
      if (ok) await db.from("call_logs").update({ notes: `${log.notes ?? ""}; reminded` }).eq("id", log.id);
    } catch (err) {
      console.error(`[meetingFlow] reminder failed for call ${log.id}:`, err);
    }
  }
}

/** Cheap DB-only check, run every minute so reminders land at ~1 hour / ~70 minutes, not on the 15-minute tick. */
export async function processMeetingReminders(): Promise<void> {
  await processDiscordHeadsUps().catch((err) => console.error("[meetingFlow] processDiscordHeadsUps failed:", err));
  await processReminders().catch((err) => console.error("[meetingFlow] processReminders failed:", err));
}

export async function processMeetingFlow(): Promise<void> {
  await processTimeReplies().catch((err) => console.error("[meetingFlow] processTimeReplies failed:", err));
  await processMeetingReminders();
}

/** The lead's most recent message text in a thread (quoted history removed), or null if we spoke last. */
export async function latestInboundText(threadId: string): Promise<{ text: string; msgId: string } | null> {
  const thread = await getGmailClient().users.threads.get({ userId: "me", id: threadId });
  const msgs = thread.data.messages ?? [];
  const last = msgs[msgs.length - 1];
  if (!last?.id || last.labelIds?.includes("SENT")) return null;
  const text = newTextOnly(textFromPayload(last.payload));
  return text ? { text, msgId: last.id } : null;
}

/**
 * Outreach send-rate limiter.
 *
 * Cyril's #1 project risk is `polarisoutreach.co@gmail.com` getting flagged as
 * spam or banned by Gmail — that would make every future outreach email
 * invisible, silently or permanently. His required mitigation is a gradual
 * warm-up ramp instead of sending everything eligible in one scheduler tick:
 * ~5 emails/day to start, ~20/day after about a week, continuing to scale
 * gradually from there (never an unbounded jump).
 *
 * This caps ALL outbound email from the account (initial outreach,
 * follow-ups, scheduling replies) against one shared daily budget, since
 * Gmail's reputation system cares about total volume, not message type.
 * `outreach_messages.sent_at` (every send already logs a row there) is the
 * source of truth for both "how many have gone out today" and "when did
 * sending actually start" — no separate table needed.
 */

import { db } from "@/lib/db/supabase";

const RAMP_START = Number(process.env.OUTREACH_RAMP_START ?? 5);
const RAMP_TARGET = Number(process.env.OUTREACH_RAMP_TARGET ?? 20);
const RAMP_DAYS = Number(process.env.OUTREACH_RAMP_DAYS ?? 7);
const RAMP_DAILY_INCREMENT_AFTER = Number(process.env.OUTREACH_RAMP_DAILY_INCREMENT_AFTER ?? 2);
const RAMP_MAX_DAILY = Number(process.env.OUTREACH_RAMP_MAX_DAILY ?? 50);

const DAY_MS = 24 * 60 * 60 * 1000;

async function getAnchorDate(): Promise<Date> {
  const { data } = await db
    .from("outreach_messages")
    .select("sent_at")
    .eq("channel", "email")
    .order("sent_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.sent_at ? new Date(data.sent_at) : new Date();
}

function dailyCapForDay(dayIndex: number): number {
  if (dayIndex >= RAMP_DAYS) {
    const daysPastRamp = dayIndex - RAMP_DAYS + 1;
    return Math.min(RAMP_MAX_DAILY, RAMP_TARGET + daysPastRamp * RAMP_DAILY_INCREMENT_AFTER);
  }
  const step = (RAMP_TARGET - RAMP_START) / RAMP_DAYS;
  return Math.round(RAMP_START + step * dayIndex);
}

/** How many more outreach emails (any type) can go out today, per the warm-up ramp. */
export async function getRemainingSendBudget(): Promise<number> {
  const anchor = await getAnchorDate();
  const dayIndex = Math.max(0, Math.floor((Date.now() - anchor.getTime()) / DAY_MS));
  const cap = dailyCapForDay(dayIndex);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("channel", "email")
    .gte("sent_at", startOfToday.toISOString());

  return Math.max(0, cap - (count ?? 0));
}

export async function canSendOutreachEmail(): Promise<boolean> {
  return (await getRemainingSendBudget()) > 0;
}

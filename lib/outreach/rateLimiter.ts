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
import { isTestMode } from "./testMode";

// Ceiling capped at 10/day permanently, per Cyril 2026-09-22 — was a 20/day
// ramp target climbing to a 50/day hard max; he wants the ramp behavior
// (start low, climb gradually) but with 10 as a hard permanent ceiling, not
// a waypoint it keeps growing past.
const RAMP_START = Number(process.env.OUTREACH_RAMP_START ?? 5);
const RAMP_TARGET = Number(process.env.OUTREACH_RAMP_TARGET ?? 10);
const RAMP_DAYS = Number(process.env.OUTREACH_RAMP_DAYS ?? 7);
const RAMP_DAILY_INCREMENT_AFTER = Number(process.env.OUTREACH_RAMP_DAILY_INCREMENT_AFTER ?? 2);
const RAMP_MAX_DAILY = Number(process.env.OUTREACH_RAMP_MAX_DAILY ?? 10);

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

export function dailyCapForDay(dayIndex: number): number {
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

// PAUSE_OUTREACH is a hard stop separate from the Anthropic spend gate
// (PAUSE_ENRICHMENT) — 2026-09-22: emails slipped out mid-build (2 sent
// while Cyril was still deciding targeting strategy) because nothing
// blocked sending itself, only rate-limited its volume. That's a real gap:
// throttling to 5/day still means real emails hit real inboxes without an
// explicit go-ahead. This is the single choke point all three send paths
// (gmailService, schedulingService, followUpService) share — gate here
// once, rather than in three call sites where a fourth path could forget
// it. Cyril confirmed go-live 2026-09-22; PAUSE_OUTREACH is now false, but
// the gate itself stays in the code as the default-safe fallback.
//
// Test mode (lib/outreach/testMode.ts) bypasses this gate entirely, folded
// in here rather than left to each of the three call sites to remember
// (that was the original bug this file warns about, just for a different
// gate) — a redirected test send can't hit the real rate budget or
// PAUSE_OUTREACH's protection because it was never going to reach a real
// business in the first place.
export async function canSendOutreachEmail(): Promise<boolean> {
  if (isTestMode()) return true;
  if (process.env.PAUSE_OUTREACH === "true") return false;
  return (await getRemainingSendBudget()) > 0;
}

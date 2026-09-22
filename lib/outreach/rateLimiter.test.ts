import { describe, it, expect, afterEach } from "vitest";
import { dailyCapForDay, canSendOutreachEmail } from "./rateLimiter";

describe("dailyCapForDay", () => {
  it("starts at the ramp-start cap on day 0", () => {
    expect(dailyCapForDay(0)).toBe(5);
  });

  it("reaches the ramp-target cap once the ramp window elapses", () => {
    expect(dailyCapForDay(7)).toBe(10);
  });

  it("climbs gradually and monotonically within the ramp window", () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map(dailyCapForDay);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
    }
    expect(days[0]).toBe(5);
  });

  it("permanently flatlines at the 10/day ceiling once the ramp window ends — never grows past it", () => {
    // 2026-09-22: Cyril wants a hard 10/day ceiling, not a waypoint on the
    // way to a higher max — this guards against that regressing back to an
    // unbounded/50-cap climb.
    expect(dailyCapForDay(8)).toBe(10);
    expect(dailyCapForDay(30)).toBe(10);
    expect(dailyCapForDay(365)).toBe(10);
  });
});

describe("canSendOutreachEmail", () => {
  afterEach(() => {
    delete process.env.PAUSE_OUTREACH;
    delete process.env.OUTREACH_TEST_MODE;
  });

  it("returns false immediately when PAUSE_OUTREACH is set, without touching the DB", async () => {
    // The real bug this guards: emails sent mid-build because nothing
    // hard-blocked sending itself, only rate-limited its volume. This must
    // short-circuit before any budget/DB lookup, not just return a low cap.
    process.env.PAUSE_OUTREACH = "true";
    await expect(canSendOutreachEmail()).resolves.toBe(false);
  });

  it("returns true immediately when test mode is on, even if PAUSE_OUTREACH is also set", async () => {
    // Test mode redirects the recipient elsewhere entirely (lib/outreach/testMode.ts)
    // so the real-send gate doesn't apply — this is the single centralized
    // bypass point, folded in here so a fourth send path can't forget it.
    process.env.PAUSE_OUTREACH = "true";
    process.env.OUTREACH_TEST_MODE = "true";
    await expect(canSendOutreachEmail()).resolves.toBe(true);
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { dailyCapForDay, canSendOutreachEmail } from "./rateLimiter";

describe("dailyCapForDay", () => {
  it("starts at the ramp-start cap on day 0", () => {
    expect(dailyCapForDay(0)).toBe(5);
  });

  it("reaches the ramp-target cap once the ramp window elapses", () => {
    expect(dailyCapForDay(7)).toBe(22);
  });

  it("climbs gradually and monotonically within the ramp window", () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map(dailyCapForDay);
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThanOrEqual(days[i - 1]);
    }
    expect(days[0]).toBe(5);
  });

  it("keeps climbing past the ramp window instead of flatlining, up to the hard max", () => {
    expect(dailyCapForDay(8)).toBe(24);
    expect(dailyCapForDay(30)).toBeLessThanOrEqual(50);
  });
});

describe("canSendOutreachEmail", () => {
  afterEach(() => {
    delete process.env.PAUSE_OUTREACH;
  });

  it("returns false immediately when PAUSE_OUTREACH is set, without touching the DB", async () => {
    // The real bug this guards: emails sent mid-build because nothing
    // hard-blocked sending itself, only rate-limited its volume. This must
    // short-circuit before any budget/DB lookup, not just return a low cap.
    process.env.PAUSE_OUTREACH = "true";
    await expect(canSendOutreachEmail()).resolves.toBe(false);
  });
});

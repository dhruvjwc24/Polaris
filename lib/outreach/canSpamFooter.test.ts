import { describe, it, expect, afterEach } from "vitest";
import { canSpamFooter } from "./canSpamFooter";

describe("canSpamFooter", () => {
  const ORIGINAL = process.env.OUTREACH_MAILING_ADDRESS;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.OUTREACH_MAILING_ADDRESS;
    else process.env.OUTREACH_MAILING_ADDRESS = ORIGINAL;
  });

  it("throws instead of silently omitting a required physical address", () => {
    delete process.env.OUTREACH_MAILING_ADDRESS;
    expect(() => canSpamFooter()).toThrow(/OUTREACH_MAILING_ADDRESS/);
  });

  it("includes the configured mailing address and an opt-out instruction", () => {
    process.env.OUTREACH_MAILING_ADDRESS = "123 Main St, Anytown, VA 20101";
    const footer = canSpamFooter();
    expect(footer).toContain("123 Main St, Anytown, VA 20101");
    expect(footer.toLowerCase()).toContain("unsubscribe");
  });
});

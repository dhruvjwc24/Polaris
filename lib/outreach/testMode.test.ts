import { describe, it, expect, afterEach } from "vitest";
import { isTestMode, testRecipient, resolveSendTarget } from "./testMode";

describe("testMode", () => {
  const ORIGINAL_MODE = process.env.OUTREACH_TEST_MODE;
  const ORIGINAL_EMAIL = process.env.OUTREACH_TEST_EMAIL;

  afterEach(() => {
    if (ORIGINAL_MODE === undefined) delete process.env.OUTREACH_TEST_MODE;
    else process.env.OUTREACH_TEST_MODE = ORIGINAL_MODE;
    if (ORIGINAL_EMAIL === undefined) delete process.env.OUTREACH_TEST_EMAIL;
    else process.env.OUTREACH_TEST_EMAIL = ORIGINAL_EMAIL;
  });

  it("is off by default", () => {
    delete process.env.OUTREACH_TEST_MODE;
    expect(isTestMode()).toBe(false);
  });

  it("is on only when explicitly set to the string \"true\"", () => {
    process.env.OUTREACH_TEST_MODE = "1";
    expect(isTestMode()).toBe(false);
    process.env.OUTREACH_TEST_MODE = "true";
    expect(isTestMode()).toBe(true);
  });

  it("refuses to guess a recipient when test mode is on but no test email is configured", () => {
    process.env.OUTREACH_TEST_MODE = "true";
    delete process.env.OUTREACH_TEST_EMAIL;
    expect(() => testRecipient()).toThrow(/OUTREACH_TEST_EMAIL/);
  });

  it("returns the configured test email", () => {
    process.env.OUTREACH_TEST_EMAIL = "cyril@example.com";
    expect(testRecipient()).toBe("cyril@example.com");
  });

  describe("resolveSendTarget", () => {
    const input = {
      realEmail: "owner@acmeroofing.com",
      businessName: "Acme Roofing",
      realSubject: "Built something for Acme Roofing",
      realThreadId: "thread-123",
    };

    it("passes through the real recipient/subject/thread untouched when test mode is off", () => {
      delete process.env.OUTREACH_TEST_MODE;
      const result = resolveSendTarget(input);
      expect(result).toEqual({
        to: "owner@acmeroofing.com",
        subject: "Built something for Acme Roofing",
        threadId: "thread-123",
        testMode: false,
      });
    });

    it("redirects to the test email, marks the subject, and drops the thread id when test mode is on", () => {
      process.env.OUTREACH_TEST_MODE = "true";
      process.env.OUTREACH_TEST_EMAIL = "cyril@example.com";
      const result = resolveSendTarget(input);
      expect(result.to).toBe("cyril@example.com");
      expect(result.subject).toBe("[TEST] Built something for Acme Roofing (real target: owner@acmeroofing.com)");
      expect(result.threadId).toBeUndefined();
      expect(result.testMode).toBe(true);
    });
  });
});

/**
 * Simulation / test-mode email redirect — added 2026-09-22 for running a
 * full pipeline dry run (discovery → enrich → mockup → video → "send")
 * without ever touching a real business's inbox.
 *
 * This is deliberately a separate mechanism from `PAUSE_OUTREACH`
 * (lib/outreach/rateLimiter.ts), not a weakening of it. `PAUSE_OUTREACH`
 * stays `true` throughout a test run — it's the default-safe outer gate.
 * Test mode is a narrow, explicit bypass of that gate that ONLY exists to
 * unconditionally redirect the recipient to a real address Cyril owns. If
 * `OUTREACH_TEST_MODE` is ever on by accident with `OUTREACH_TEST_EMAIL`
 * unset, this throws rather than falling back to the lead's real email. See
 * CLAUDE.md "Simulation / Test Mode".
 */

export function isTestMode(): boolean {
  return process.env.OUTREACH_TEST_MODE === "true";
}

/** The address to send to instead of the lead's real email, when test mode is on. Throws if misconfigured. */
export function testRecipient(): string {
  const email = process.env.OUTREACH_TEST_EMAIL ?? "";
  if (!email) {
    throw new Error(
      "OUTREACH_TEST_MODE is true but OUTREACH_TEST_EMAIL is unset — refusing to send rather than guessing a recipient."
    );
  }
  return email;
}

interface RedirectInput {
  realEmail: string;
  businessName: string;
  realSubject: string;
  realThreadId?: string | null;
}

interface RedirectResult {
  to: string;
  subject: string;
  threadId: string | undefined;
  /** When true, the caller must NOT write any lead-status/outreach_messages
   *  changes — see the note on why below. */
  testMode: boolean;
}

/**
 * Single source of truth for how a send gets redirected in test mode —
 * shared by gmailService.ts, followUpService.ts, and schedulingService.ts
 * so the recipient/subject/thread-suppression/log behavior can't drift
 * between the three call sites.
 *
 * Deliberately does NOT touch DB state (lead status, outreach_messages) —
 * that's left to each caller to skip entirely when `testMode` comes back
 * true. Found live 2026-09-22: an earlier version of this let test sends
 * advance a real lead's status to outreach_sent/etc. even though the email
 * itself only ever reached Cyril's inbox. That "used up" the lead — once
 * test mode was turned back off, the real business's status filter
 * (`eq("status","video_ready")` etc.) no longer matched it, so it silently
 * never got a real send. Confirmed happening to a real lead (GLS Tech) and
 * had to be manually reset. A test-mode send must change nothing about the
 * lead's real progress through the pipeline — it's a dry run of content and
 * delivery only.
 */
export function resolveSendTarget(input: RedirectInput): RedirectResult {
  if (!isTestMode()) {
    return { to: input.realEmail, subject: input.realSubject, threadId: input.realThreadId ?? undefined, testMode: false };
  }
  const to = testRecipient();
  console.log(
    `[TEST MODE] Redirecting outreach for "${input.businessName}" to ${to} instead of ${input.realEmail} — ` +
      `lead status and outreach_messages will NOT be updated (dry run only, real lead stays untouched).`
  );
  return {
    to,
    subject: `[TEST] ${input.realSubject} (real target: ${input.realEmail})`,
    threadId: undefined,
    testMode: true,
  };
}

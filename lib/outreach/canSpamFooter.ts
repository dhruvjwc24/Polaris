/**
 * CAN-SPAM compliance footer, appended to every outbound outreach email
 * (initial cold outreach, follow-ups, scheduling replies) — added
 * 2026-09-22 after an audit found two legally required elements missing: a
 * physical mailing address and a clear opt-out mechanism. Both are required
 * on every commercial email in a thread, not just the first one.
 *
 * Throws instead of silently omitting the address so a missing env var
 * fails loud at send time rather than shipping a non-compliant email.
 */
export function canSpamFooter(): string {
  const address = process.env.OUTREACH_MAILING_ADDRESS ?? "";
  if (!address) {
    throw new Error(
      "OUTREACH_MAILING_ADDRESS is not set — required by CAN-SPAM on every outbound email. Set it in .env.local before sending."
    );
  }
  return `\n\n---\n${address}\nDon't want these emails? Just reply "unsubscribe" and I'll take you off the list right away.`;
}

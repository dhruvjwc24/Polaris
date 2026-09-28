import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock, hasOp, type RecordedCall } from "@/lib/testUtils/supabaseMock";

// Covers the fix in followUpService.ts: a real Gmail follow-up send followed
// by an outreach_messages insert / leads status update whose Supabase error
// was previously swallowed silently. Left unnoticed, a failed status update
// leaves the lead matching the same due-follow-up query again next tick,
// sending a duplicate follow-up to the same business (and a lost insert
// loses the gmail_thread_id the *next* follow-up needs to reply in-thread).
// Nothing here touches a real Gmail account, a real Anthropic API key, or a
// real database — all three are mocked.

const sendMock = vi.fn().mockResolvedValue({ data: { id: "msg-3", threadId: "thread-3" } });
const anthropicCreateMock = vi.fn().mockResolvedValue({
  content: [{ type: "text", text: "Generated follow-up body." }],
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: anthropicCreateMock },
  })),
}));

vi.mock("./gmailClient", () => ({
  getGmailClient: () => ({ users: { messages: { send: sendMock } } }),
  buildRfc2822: () => "raw-fake-message",
}));

vi.mock("./rateLimiter", () => ({
  canSendOutreachEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./canSpamFooter", () => ({
  canSpamFooter: () => "\n\n---\n123 Fake St\nReply unsubscribe to opt out.",
}));

// Only the first FOLLOW_UP_CONFIG entry (status "outreach_sent") should find
// a due lead; the second ("followed_up_1") returns empty so the test only
// has to reason about one send.
const FAKE_LEAD = {
  id: "lead-3",
  business_name: "Acme Roofing",
  city: "Woodbridge",
  niche: "roofing",
  email: "owner@acmeroofing.com",
  gap_analysis: "no visible website",
  outreach_messages: [{ gmail_thread_id: "orig-thread", subject: "Built something for Acme Roofing" }],
};

let insertError: { message: string } | null = null;
let updateError: { message: string } | null = null;

function responder(call: RecordedCall) {
  if (call.table === "leads" && hasOp(call, "select")) {
    const statusArg = call.ops.find((op) => op.method === "eq" && op.args[0] === "status")?.args[1];
    if (statusArg === "outreach_sent") return { data: [FAKE_LEAD], error: null };
    return { data: [], error: null };
  }
  if (call.table === "outreach_messages" && hasOp(call, "insert")) {
    return { error: insertError };
  }
  if (call.table === "leads" && hasOp(call, "update")) {
    const payload = call.ops.find((op) => op.method === "update")?.args[0] as { status?: string } | undefined;
    // The end-of-run "archive stale followed_up_2 leads" sweep also lands
    // here — it's not part of what this test is exercising, so let it
    // succeed regardless of the per-lead updateError under test.
    if (payload?.status === "archived") return { data: [], error: null };
    return { error: updateError };
  }
  return { data: null, error: null };
}

vi.mock("@/lib/db/supabase", () => ({
  db: createSupabaseMock(responder),
}));

describe("followUpService.processFollowUps — DB-write-failure logging", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    insertError = null;
    updateError = null;
    sendMock.mockClear();
    anthropicCreateMock.mockClear();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("logs loudly and does not throw when the outreach_messages insert fails after a real send", async () => {
    insertError = { message: "connection reset" };

    const { processFollowUps } = await import("./followUpService");
    await expect(processFollowUps()).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("outreach_messages insert failed for lead lead-3"),
      "connection reset"
    );
  });

  it("logs loudly and does not throw when the leads status update fails after a real send", async () => {
    updateError = { message: "row locked" };

    const { processFollowUps } = await import("./followUpService");
    await expect(processFollowUps()).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("status update to followed_up_1 failed for lead lead-3"),
      "row locked"
    );
  });

  it("logs nothing when both writes succeed", async () => {
    const { processFollowUps } = await import("./followUpService");
    await processFollowUps();

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

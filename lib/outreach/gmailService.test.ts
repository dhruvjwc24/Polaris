import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock, hasOp, type RecordedCall } from "@/lib/testUtils/supabaseMock";

// Covers the fix in gmailService.ts: a real Gmail send followed by an
// outreach_messages insert / leads status update whose Supabase error was
// previously swallowed silently. Left unnoticed, a failed status update
// leaves the lead matching status="video_ready" again on the next
// pipelineRunner tick, sending a duplicate real cold email to the same
// business — so this must log loudly instead of failing silent. Nothing
// here touches a real Gmail account or a real database; both are mocked.

const sendMock = vi.fn().mockResolvedValue({ data: { id: "msg-1", threadId: "thread-1" } });

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

const FAKE_LEAD = {
  id: "lead-1",
  business_name: "Acme Roofing",
  email: "owner@acmeroofing.com",
  cold_message: "Saw your reviews, built you a mockup.",
  video_url: "https://storage.example.com/video.mp4",
  opted_out: false,
};

let insertError: { message: string } | null = null;
let updateError: { message: string } | null = null;

function responder(call: RecordedCall) {
  if (call.table === "leads" && hasOp(call, "select")) {
    return { data: FAKE_LEAD, error: null };
  }
  if (call.table === "outreach_messages" && hasOp(call, "insert")) {
    return { error: insertError };
  }
  if (call.table === "leads" && hasOp(call, "update")) {
    return { error: updateError };
  }
  return { data: null, error: null };
}

vi.mock("@/lib/db/supabase", () => ({
  db: createSupabaseMock(responder),
}));

describe("gmailService.sendOutreach — DB-write-failure logging", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    insertError = null;
    updateError = null;
    sendMock.mockClear();
    // vi.restoreAllMocks() would also wipe the module-level rateLimiter/
    // gmailClient vi.fn() mocks (they have no "original" to restore to, so
    // it resets them to a no-op) — spy on/restore console.error individually
    // instead, leaving the other mocks' implementations intact across tests.
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("logs loudly and does not throw when the outreach_messages insert fails after a real send", async () => {
    insertError = { message: "connection reset" };

    const { sendOutreach } = await import("./gmailService");
    await expect(sendOutreach("lead-1")).resolves.toBeUndefined();

    // The email must still have gone out — a write failure must never
    // silently swallow the fact that a real send already happened.
    expect(sendMock).toHaveBeenCalledTimes(1);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("outreach_messages insert failed for lead lead-1"),
      "connection reset"
    );
  });

  it("logs loudly and does not throw when the leads status update fails after a real send", async () => {
    updateError = { message: "row locked" };

    const { sendOutreach } = await import("./gmailService");
    await expect(sendOutreach("lead-1")).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("status update to outreach_sent failed for lead lead-1"),
      "row locked"
    );
  });

  it("logs nothing when both writes succeed", async () => {
    const { sendOutreach } = await import("./gmailService");
    await sendOutreach("lead-1");

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

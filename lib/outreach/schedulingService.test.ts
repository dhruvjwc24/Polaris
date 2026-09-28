import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupabaseMock, hasOp, type RecordedCall } from "@/lib/testUtils/supabaseMock";

// Covers the fix in schedulingService.ts: a real Gmail scheduling-link send
// followed by an outreach_messages insert / leads status update whose
// Supabase error was previously swallowed silently. Left unnoticed, a
// failed status update leaves the lead matching status="positive" again on
// the next pipelineRunner tick, sending a duplicate scheduling email to
// someone who already replied with interest. Nothing here touches a real
// Gmail account or a real database; both are mocked.

const sendMock = vi.fn().mockResolvedValue({ data: { id: "msg-2", threadId: "thread-2" } });

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
  id: "lead-2",
  business_name: "Acme Roofing",
  email: "owner@acmeroofing.com",
  opted_out: false,
  outreach_messages: [{ gmail_thread_id: "orig-thread", subject: "Built something for Acme Roofing" }],
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

describe("schedulingService.sendSchedulingEmail — DB-write-failure logging", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    insertError = null;
    updateError = null;
    sendMock.mockClear();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("logs loudly and does not throw when the outreach_messages insert fails after a real send", async () => {
    insertError = { message: "connection reset" };

    const { sendSchedulingEmail } = await import("./schedulingService");
    await expect(sendSchedulingEmail("lead-2")).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("outreach_messages insert failed for lead lead-2"),
      "connection reset"
    );
  });

  it("logs loudly and does not throw when the leads status update fails after a real send", async () => {
    updateError = { message: "row locked" };

    const { sendSchedulingEmail } = await import("./schedulingService");
    await expect(sendSchedulingEmail("lead-2")).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("status update to call_scheduled failed for lead lead-2"),
      "row locked"
    );
  });

  it("logs nothing when both writes succeed", async () => {
    const { sendSchedulingEmail } = await import("./schedulingService");
    await sendSchedulingEmail("lead-2");

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

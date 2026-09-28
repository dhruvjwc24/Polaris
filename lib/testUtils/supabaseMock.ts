/**
 * Minimal fake Supabase query builder for unit tests — NOT used by any
 * production code path, only imported from `*.test.ts` files via
 * `vi.mock("@/lib/db/supabase", ...)`.
 *
 * Real Supabase's PostgrestFilterBuilder mutates itself and returns `this`
 * from every filter method (`.eq()`, `.not()`, etc.), and is awaitable
 * directly (a "thenable") as well as via a terminal `.maybeSingle()`/
 * `.single()` call. This fake reproduces just enough of that shape to drive
 * the send-path services under test without touching a real database —
 * every call is recorded, and a test-supplied `responder` inspects the
 * recorded table + method calls to decide what `{ data, error }` to resolve.
 */

export interface RecordedCall {
  table: string;
  ops: Array<{ method: string; args: unknown[] }>;
}

export type SupabaseMockResponder = (call: RecordedCall) => { data?: unknown; error?: { message: string } | null };

const CHAIN_METHODS = [
  "select",
  "eq",
  "neq",
  "not",
  "in",
  "or",
  "order",
  "limit",
  "gte",
  "lt",
  "is",
] as const;

function makeBuilder(table: string, responder: SupabaseMockResponder) {
  const record: RecordedCall = { table, ops: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {};

  for (const method of CHAIN_METHODS) {
    builder[method] = (...args: unknown[]) => {
      record.ops.push({ method, args });
      return builder;
    };
  }

  builder.insert = (payload: unknown) => {
    record.ops.push({ method: "insert", args: [payload] });
    return builder;
  };
  builder.update = (payload: unknown) => {
    record.ops.push({ method: "update", args: [payload] });
    return builder;
  };
  builder.delete = () => {
    record.ops.push({ method: "delete", args: [] });
    return builder;
  };

  builder.maybeSingle = () => Promise.resolve(responder(record));
  builder.single = () => Promise.resolve(responder(record));
  // Makes `await builder` work for call sites that never call a terminal
  // method (e.g. `await db.from("leads").update({...}).eq("id", x)`).
  builder.then = (
    onResolve: (value: { data?: unknown; error?: { message: string } | null }) => unknown,
    onReject?: (reason: unknown) => unknown
  ) => Promise.resolve(responder(record)).then(onResolve, onReject);

  return builder;
}

/** Does this recorded call include a call to `method` (optionally matching its args)? */
export function hasOp(call: RecordedCall, method: string, match?: (args: unknown[]) => boolean): boolean {
  return call.ops.some((op) => op.method === method && (!match || match(op.args)));
}

/** The args of the first recorded call to `method`, or undefined if never called. */
export function opArgs(call: RecordedCall, method: string): unknown[] | undefined {
  return call.ops.find((op) => op.method === method)?.args;
}

export function createSupabaseMock(responder: SupabaseMockResponder) {
  return {
    from: (table: string) => makeBuilder(table, responder),
  };
}

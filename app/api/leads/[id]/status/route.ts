import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";
import type { LeadStatus } from "@/lib/types";

// Was z.string().min(1) — accepted any non-empty string, so a bad request
// (typo, stale client) could set a status value that matches none of the
// pipeline's queries and silently strand the lead (not archived, just
// invisible everywhere). Tightened to the actual LeadStatus union.
const LEAD_STATUSES: [LeadStatus, ...LeadStatus[]] = [
  "new", "enriched", "brief_ready",
  "mockup_building", "mockup_ready",
  "video_building", "video_ready",
  "outreach_sent", "followed_up_1", "followed_up_2",
  "replied", "positive", "call_scheduled",
  "closed", "archived",
];

const Body = z.object({ status: z.enum(LEAD_STATUSES) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { error } = await db
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

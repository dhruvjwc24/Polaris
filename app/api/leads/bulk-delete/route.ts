import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";

const Body = z.object({ ids: z.array(z.string().uuid()).min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Hard delete, not archive — these are dead-end leads the user has chosen
  // to clear out. outreach_messages/call_logs/estimate_requests/
  // video_generation_queue all cascade on lead delete (see their migrations).
  const { data, error } = await db.from("leads").delete().in("id", parsed.data.ids).select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: data?.length ?? 0 });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";

// Phone-only leads (no email) are never auto-contacted — Cyril calls/texts
// them himself, then marks it here so it drops out of the manual-outreach
// pile instead of nagging him every session.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { error } = await db
    .from("leads")
    .update({ manual_contact_done: true, status: "outreach_sent" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

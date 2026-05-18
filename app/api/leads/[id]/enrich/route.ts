import { NextResponse } from "next/server";
import { enrichLeads } from "@/lib/leads/enrichmentService";
import { db } from "@/lib/db/supabase";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await enrichLeads([id], true);

  // Verify enrichment actually saved data — the service can silently fail
  // if Claude returns an unexpected response format.
  const { data: lead } = await db
    .from("leads")
    .select("site_brief")
    .eq("id", id)
    .maybeSingle();

  if (!lead?.site_brief) {
    return NextResponse.json(
      { error: "Enrichment failed — Claude returned an unexpected response. Check server logs and try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

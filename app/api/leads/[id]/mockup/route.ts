import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";
import { templateProvider } from "@/lib/mockup/templateMockup";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(req.url).origin;

  const { data: lead } = await db
    .from("leads")
    .select("site_brief, business_name")
    .eq("id", id)
    .maybeSingle();

  if (!lead?.site_brief) {
    return NextResponse.json({ error: "Lead not enriched yet" }, { status: 400 });
  }

  try {
    const result = await templateProvider.build(id, lead.site_brief, lead.business_name, origin);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mockup build failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

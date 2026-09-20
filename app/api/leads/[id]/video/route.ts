import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";
import { enqueueVideoJob } from "@/lib/video/queue";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: lead } = await db
    .from("leads")
    .select("business_name, screenshot_paths")
    .eq("id", id)
    .maybeSingle();

  if (!lead?.screenshot_paths?.length) {
    return NextResponse.json({ error: "No screenshots available" }, { status: 400 });
  }

  const result = await enqueueVideoJob(id, lead.business_name, lead.screenshot_paths);
  return NextResponse.json({ queued: true, ...result });
}

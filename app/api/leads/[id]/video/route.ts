import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";
import { screenRecordingProvider } from "@/lib/video/screenRecording";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: lead } = await db
    .from("leads")
    .select("screenshot_paths")
    .eq("id", id)
    .maybeSingle();

  if (!lead?.screenshot_paths?.length) {
    return NextResponse.json({ error: "No screenshots available" }, { status: 400 });
  }

  const result = await screenRecordingProvider.generate(id, lead.screenshot_paths);
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { sendOutreach } from "@/lib/outreach/gmailService";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sendOutreach(id);
  return NextResponse.json({ ok: true });
}

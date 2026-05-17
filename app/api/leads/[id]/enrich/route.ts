import { NextResponse } from "next/server";
import { enrichLeads } from "@/lib/leads/enrichmentService";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await enrichLeads([id], true);
  return NextResponse.json({ ok: true });
}

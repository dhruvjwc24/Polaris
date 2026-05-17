import { NextResponse } from "next/server";
import { z } from "zod";
import { enrichLeads } from "@/lib/leads/enrichmentService";

const Body = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    await enrichLeads(parsed.data.leadIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

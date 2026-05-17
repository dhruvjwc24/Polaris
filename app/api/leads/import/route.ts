import { NextResponse } from "next/server";
import { z } from "zod";
import { importLeads } from "@/lib/leads/importService";

const Body = z.object({
  leads: z.array(z.record(z.unknown())),
  campaignId: z.string().uuid().nullable().default(null),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await importLeads(parsed.data.leads as never, parsed.data.campaignId);
  return NextResponse.json(result);
}

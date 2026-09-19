import { NextResponse } from "next/server";
import { z } from "zod";
import { extractFromMapsUrl } from "@/lib/leads/mapsExtract";

const Body = z.object({ mapsUrl: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "mapsUrl is required" }, { status: 400 });
  }

  const result = await extractFromMapsUrl(parsed.data.mapsUrl);
  if (!result) {
    return NextResponse.json(
      { error: "Couldn't find that business. Double-check the link, or fill the fields in manually." },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}

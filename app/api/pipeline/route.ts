import { NextResponse } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/pipeline/pipelineRunner";

const Body = z.object({ campaignId: z.string().uuid().optional() });

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const campaignId = parsed.success ? parsed.data.campaignId : undefined;
  await runPipeline(campaignId, origin);
  return NextResponse.json({ ok: true });
}

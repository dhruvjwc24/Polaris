import { NextResponse } from "next/server";
import { getQueueStatus } from "@/lib/video/queue";

export async function GET() {
  const status = await getQueueStatus();
  return NextResponse.json(status);
}

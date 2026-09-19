import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";
import { discoverContacts } from "@/lib/leads/contactDiscoveryService";
import { enrichLeads } from "@/lib/leads/enrichmentService";
import { templateProvider } from "@/lib/mockup/templateMockup";
import { screenRecordingProvider } from "@/lib/video/screenRecording";

// Runs one lead through the same build stages as the campaign pipeline
// (contact discovery -> enrichment -> mockup -> video), stopping at
// video_ready. Used for cold-call-sourced leads created via /leads/new,
// which are never auto-emailed (manual_outreach_only).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(req.url).origin;

  let { data: lead } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (lead.status === "new") {
    await discoverContacts([id]);
    await enrichLeads([id], true);
    ({ data: lead } = await db.from("leads").select("*").eq("id", id).single());
  }

  if (lead.status === "brief_ready" && lead.site_brief) {
    try {
      await templateProvider.build(id, lead.site_brief, lead.business_name, origin);
    } catch (err) {
      return NextResponse.json({ error: `Mockup build failed: ${String(err)}` }, { status: 500 });
    }
    ({ data: lead } = await db.from("leads").select("*").eq("id", id).single());
  }

  if (lead.status === "mockup_ready" && lead.screenshot_paths?.length) {
    try {
      await screenRecordingProvider.generate(id, lead.screenshot_paths);
    } catch (err) {
      await db.from("leads").update({ status: "mockup_ready" }).eq("id", id);
      return NextResponse.json({ error: `Video generation failed: ${String(err)}` }, { status: 500 });
    }
    ({ data: lead } = await db.from("leads").select("*").eq("id", id).single());
  }

  return NextResponse.json({ status: lead.status, lovable_url: lead.lovable_url, video_url: lead.video_url });
}

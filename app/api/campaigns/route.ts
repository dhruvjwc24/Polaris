import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";
import { discoverLeads } from "@/lib/leads/discoveryService";
import { discoverContacts } from "@/lib/leads/contactDiscoveryService";
import { enrichLeads } from "@/lib/leads/enrichmentService";

const Body = z.object({
  niche: z.string().min(1),
  city: z.string().min(1),
  autoDiscover: z.boolean().default(true),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { niche, city, autoDiscover } = parsed.data;

  const { data: campaign, error } = await db
    .from("campaigns")
    .insert({ niche, city })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let discovered = 0;
  if (autoDiscover) {
    discovered = await discoverLeads(niche, city, campaign.id);

    // Fire-and-forget: contact discovery → enrichment, runs in background
    if (discovered > 0) {
      db.from("leads")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("status", "new")
        .then(async ({ data }) => {
          if (!data?.length) return;
          const ids = data.map((l) => l.id);
          await discoverContacts(ids).catch(console.error);
          await enrichLeads(ids).catch(console.error);
        });
    }
  }

  return NextResponse.json({ campaign, discovered });
}

export async function GET() {
  const { data, error } = await db
    .from("campaigns")
    .select("*, leads(count)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

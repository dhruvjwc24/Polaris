import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const campaign = searchParams.get("campaign");
  const niche = searchParams.get("niche");
  const city = searchParams.get("city");

  let query = db
    .from("leads")
    .select("*")
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (campaign) query = query.eq("campaign_id", campaign);
  if (niche) query = query.eq("niche", niche);
  if (city) query = query.eq("city", city);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

// GET /api/debug/discover?niche=roofing&city=Arlington&state=VA
// Shows exactly what Places API returns + which results already exist in DB
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche") ?? "";
  const city = searchParams.get("city") ?? "";
  const state = searchParams.get("state") ?? "";
  const key = process.env.GOOGLE_PLACES_API_KEY;

  if (!niche || !city || !state) {
    return NextResponse.json({ error: "niche, city, state are required" }, { status: 400 });
  }

  const query = encodeURIComponent(`${niche} in ${city}, ${state}`);
  const url = `${PLACES_API_BASE}/textsearch/json?query=${query}&key=${key}`;

  const res = await fetch(url);
  const data = await res.json();

  const placeIds: string[] = (data.results ?? []).map((r: { place_id: string }) => r.place_id);

  // Check which of these place_ids already exist in the DB
  const { data: existing } = await db
    .from("leads")
    .select("google_maps_id, business_name, campaign_id, status")
    .in("google_maps_id", placeIds);

  const existingMap = new Map((existing ?? []).map((e) => [e.google_maps_id, e]));

  const summary = (data.results ?? []).map((r: Record<string, unknown>, i: number) => {
    const pid = r.place_id as string;
    const inDb = existingMap.get(pid);
    return {
      position: i,
      name: r.name,
      address: r.formatted_address,
      rating: r.rating,
      reviews: r.user_ratings_total,
      place_id: pid,
      already_in_db: !!inDb,
      db_status: inDb?.status ?? null,
      db_campaign: inDb?.campaign_id ?? null,
    };
  });

  const newCount = summary.filter((r: { already_in_db: boolean }) => !r.already_in_db).length;

  return NextResponse.json({
    status: data.status,
    query: decodeURIComponent(query),
    total: summary.length,
    new_leads_available: newCount,
    already_in_db: summary.length - newCount,
    results: summary,
  });
}

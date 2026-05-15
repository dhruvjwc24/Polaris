import { db } from "@/lib/db/supabase";
import { scoreLead } from "./scoring";

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  user_ratings_total?: number;
  rating?: number;
}

async function fetchPage(
  url: string
): Promise<{ results: PlaceResult[]; next_page_token?: string }> {
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") return { results: [] };
  return { results: data.results ?? [], next_page_token: data.next_page_token };
}

async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const fields =
    "place_id,name,formatted_address,formatted_phone_number,website,user_ratings_total,rating";
  const res = await fetch(
    `${PLACES_API_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result;
}

async function hasLiveWebsite(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function discoverLeads(
  niche: string,
  city: string,
  campaignId: string
): Promise<number> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const query = encodeURIComponent(`${niche} in ${city}`);

  // Fetch up to 2 pages (40 results total)
  const page1 = await fetchPage(
    `${PLACES_API_BASE}/textsearch/json?query=${query}&key=${key}`
  );
  let allResults = [...page1.results];

  if (page1.next_page_token) {
    // Google requires a short delay before next_page_token is valid
    await new Promise((r) => setTimeout(r, 2000));
    const page2 = await fetchPage(
      `${PLACES_API_BASE}/textsearch/json?pagetoken=${page1.next_page_token}&key=${key}`
    );
    allResults = allResults.concat(page2.results);
  }

  if (!allResults.length) return 0;

  // Skip top 4 (prominence-sorted — they're already winning)
  const candidates = allResults.slice(4);
  let inserted = 0;

  for (const candidate of candidates) {
    // Only skip if clearly over-reviewed (100+); let scoring handle the rest
    if (
      candidate.user_ratings_total !== undefined &&
      candidate.user_ratings_total >= 100
    )
      continue;

    const detail = await getPlaceDetails(candidate.place_id);
    if (!detail) continue;

    // Check if website is alive
    let websiteUrl: string | null = detail.website ?? null;
    if (websiteUrl && !(await hasLiveWebsite(websiteUrl))) websiteUrl = null;

    // Deduplicate by google_maps_id
    const { data: existing } = await db
      .from("leads")
      .select("id")
      .eq("google_maps_id", detail.place_id)
      .maybeSingle();
    if (existing) continue;

    const score = scoreLead({
      website_url: websiteUrl,
      review_count: detail.user_ratings_total ?? null,
      rating: detail.rating ?? null,
      years_established: null,
    });

    await db.from("leads").insert({
      campaign_id: campaignId,
      business_name: detail.name,
      website_url: websiteUrl,
      phone: detail.formatted_phone_number ?? null,
      location: detail.formatted_address,
      city,
      niche,
      google_maps_id: detail.place_id,
      review_count: detail.user_ratings_total ?? null,
      rating: detail.rating ?? null,
      source: "google_places",
      priority_score: score,
    });

    inserted++;
  }

  return inserted;
}

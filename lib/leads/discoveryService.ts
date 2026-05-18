import { db } from "@/lib/db/supabase";
import { scoreLead } from "./scoring";

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";
const MAX_LEADS = 15;

interface PlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
}

interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  user_ratings_total?: number;
  rating?: number;
  photos?: PlacePhoto[];
  reviews?: PlaceReview[];
  opening_hours?: { weekday_text?: string[] };
}

// Convert person-form / plural niches to the service-form that Places API matches best.
// "roofers" → "roofing" significantly outperforms in textsearch matching.
function normalizeQueryNiche(niche: string): string {
  const n = niche.toLowerCase().trim();
  const map: [RegExp, string][] = [
    [/^roofers?$/, "roofing"],
    [/^plumbers?$/, "plumbing"],
    [/^electricians?$/, "electrician"],
    [/^landscapers?$/, "landscaping"],
    [/^painters?$/, "painting"],
    [/^cleaners?$/, "cleaning service"],
    [/^carpenters?$/, "carpentry"],
    [/^masons?$/, "masonry"],
    [/^lawyers?$/, "law firm"],
    [/^attorneys?$/, "attorney"],
    [/^dentists?$/, "dental"],
    [/^mechanics?$/, "auto repair"],
    [/^photographers?$/, "photography"],
    [/^contractors?$/, "contractor"],
    [/^handymen?|handypersons?$/, "handyman"],
    [/^movers?$/, "moving company"],
  ];
  for (const [re, mapped] of map) {
    if (re.test(n)) return mapped;
  }
  return n;
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
    "place_id,name,formatted_address,formatted_phone_number,website,user_ratings_total,rating,photos,reviews,opening_hours";
  const res = await fetch(
    `${PLACES_API_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result;
}

// Trust the Places API URL unless the domain is completely dead (DNS failure / connection refused).
// HEAD requests are widely blocked by hosting providers — a 4xx still means a real site exists.
async function isDomainDead(url: string): Promise<boolean> {
  try {
    await fetch(url, { method: "GET", signal: AbortSignal.timeout(6000) });
    return false; // any response (even 4xx) means the domain is live
  } catch {
    return true; // only a network-level failure means the domain is truly dead
  }
}

async function fetchAllResults(
  niche: string,
  city: string,
  state: string,
  key: string | undefined
): Promise<PlaceResult[]> {
  const queryNiche = normalizeQueryNiche(niche);
  const query = encodeURIComponent(`${queryNiche} in ${city}, ${state}`);

  const page1 = await fetchPage(
    `${PLACES_API_BASE}/textsearch/json?query=${query}&key=${key}`
  );
  let allResults = [...page1.results];

  if (page1.next_page_token) {
    await new Promise((r) => setTimeout(r, 2000)); // required delay before next_page_token is valid
    const page2 = await fetchPage(
      `${PLACES_API_BASE}/textsearch/json?pagetoken=${page1.next_page_token}&key=${key}`
    );
    allResults = allResults.concat(page2.results);
  }

  // If primary query returned very few results, try a fallback query with "services" appended
  if (allResults.length < 5 && queryNiche === niche) {
    const fallback = encodeURIComponent(`${niche} services in ${city}, ${state}`);
    const fb = await fetchPage(
      `${PLACES_API_BASE}/textsearch/json?query=${fallback}&key=${key}`
    );
    // Merge in any new place_ids not already seen
    const seen = new Set(allResults.map((r) => r.place_id));
    for (const r of fb.results) {
      if (!seen.has(r.place_id)) allResults.push(r);
    }
  }

  return allResults;
}

export async function discoverLeads(
  niche: string,
  state: string,
  cities: string[],
  campaignId: string
): Promise<number> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  let inserted = 0;

  for (const city of cities) {
    if (inserted >= MAX_LEADS) break;

    const allResults = await fetchAllResults(niche, city, state, key);
    if (!allResults.length) continue;

    for (let i = 0; i < allResults.length && inserted < MAX_LEADS; i++) {
      const candidate = allResults[i];

      const detail = await getPlaceDetails(candidate.place_id);
      if (!detail) continue;

      // Trust Places API website field; only clear it if the domain is completely dead
      let websiteUrl: string | null = detail.website ?? null;
      if (websiteUrl && (await isDomainDead(websiteUrl))) websiteUrl = null;

      // Deduplicate within this campaign only — same business can appear in separate campaigns
      const { data: existing } = await db
        .from("leads")
        .select("id")
        .eq("google_maps_id", detail.place_id)
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (existing) continue;

      const score = scoreLead({
        website_url: websiteUrl,
        review_count: detail.user_ratings_total ?? null,
        rating: detail.rating ?? null,
        years_established: null,
        position: i,
      });

      const { error: insertError } = await db.from("leads").insert({
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
        photo_refs: detail.photos?.slice(0, 10).map((p) => p.photo_reference) ?? null,
        review_snippets: detail.reviews
          ?.filter((r) => r.rating >= 4 && r.text.trim().length > 20)
          .slice(0, 5)
          .map((r) => ({
            author: r.author_name,
            rating: r.rating,
            text: r.text.trim(),
            time_desc: r.relative_time_description,
          })) ?? null,
        business_hours: detail.opening_hours?.weekday_text ?? null,
        source: "google_places",
        priority_score: score,
      });

      if (insertError) {
        console.error(`[discovery] insert failed for "${detail.name}": ${insertError.message}`);
        continue;
      }

      inserted++;
    }
  }

  return inserted;
}

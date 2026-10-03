import { db } from "@/lib/db/supabase";
import { scoreLead, isLeadEligible, MAX_REVIEWS_DISCOVERY } from "./scoring";
import { placesFetch, PlacesBudgetExceeded } from "./placesBudget";
import { hasWebsiteCached, markHasWebsite, noEmailCached, markNoEmail } from "./placesSeen";
import { findEmailForBusiness, isSocialOnlyUrl } from "./contactDiscoveryService";
import { isSendableLead } from "@/lib/pipeline/qualification";

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";
// Default cap of 15 leads per discovery run (was unlimited 2026-09-22 until
// 2026-10-01). Unlimited discovery on 2026-09-30 produced most of a $34 Google
// bill — Places calls are billed per request, so "find everything" is not
// free. Overridable via DISCOVERY_MAX_LEADS; spend is also hard-capped by
// lib/leads/placesBudget.ts regardless of this number. An empty string (this
// repo's convention for "unset, see .env.local.example") falls back to the
// default, not Number("") === 0.
const rawMaxLeads = process.env.DISCOVERY_MAX_LEADS;
const MAX_LEADS = rawMaxLeads ? Number(rawMaxLeads) : 15;
// Anything scoring below this on the combined signals — reviews, rating,
// tenure, search prominence — isn't a strong enough prospect to spend a
// mockup + outreach cycle on. 6 is the practical floor given the current
// rubric: isLeadEligible's hard cutoffs (review_count, rating, tenure) mean
// nothing can score below 5, and 5 itself is deliberately excluded too — see
// CLAUDE.md "Targeting: No-Website Leads Only".
const MIN_PRIORITY_SCORE = 6; // tried 5 on 2026-09-30, moved back: a 5 is too easy to hit to be a real signal

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
  const res = await placesFetch("text", url);
  const data = await res.json();
  if (data.status !== "OK") return { results: [] };
  return { results: data.results ?? [], next_page_token: data.next_page_token };
}

// "light" asks only for website + phone (Google's cheaper Contact data); it is
// enough to decide whether a candidate has no website. "full" adds
// rating/reviews/hours/photos (the pricey Atmosphere data) and is only called
// for the few candidates that already passed every other filter.
export async function getPlaceDetails(
  placeId: string,
  mode: "light" | "full" = "full"
): Promise<PlaceResult | null> {
  const fields =
    mode === "light"
      ? "place_id,name,formatted_address,formatted_phone_number,website"
      : "place_id,name,formatted_address,formatted_phone_number,website,user_ratings_total,rating,photos,reviews,opening_hours";
  const res = await placesFetch(
    mode === "light" ? "detailsLight" : "detailsFull",
    `${PLACES_API_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${process.env.GOOGLE_PLACES_API_KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result;
}

// Trust the Places API URL unless the domain is completely dead (DNS failure / connection refused).
// HEAD requests are widely blocked by hosting providers — a 4xx still means a real site exists.
export async function isDomainDead(url: string): Promise<boolean> {
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

  // Page 2 is OFF by default (DISCOVERY_PAGES=2 turns it on). Each page is one
  // $0.032 Text Search call, and of 72 existing leads with a recorded search
  // position none came from position 20+ (page 2) — 27% of page-1 top-10
  // leads ended up emailable vs 13% for positions 10-19. Experiment started
  // 2026-10-02; compare the per-run funnel log before turning it back on.
  const wantPage2 = Number(process.env.DISCOVERY_PAGES ?? 1) >= 2;
  if (wantPage2 && page1.next_page_token) {
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
  // Per-run funnel, logged at the end, so search tuning is measured not guessed.
  const funnel = {
    candidates: 0,
    passedPrefilter: 0,
    cachedHasWebsite: 0,
    cachedNoEmail: 0,
    lightChecked: 0,
    noWebsite: 0,
    socialOnly: 0,
    emailFromSocial: 0,
    emailSearched: 0,
    emailFound: 0,
  };

  try {
  for (const city of cities) {
    if (inserted >= MAX_LEADS) break;

    const allResults = await fetchAllResults(niche, city, state, key);
    if (!allResults.length) continue;

    for (let i = 0; i < allResults.length && inserted < MAX_LEADS; i++) {
      const candidate = allResults[i];
      funnel.candidates++;

      // Every filter that can run on data we already have runs BEFORE any
      // billed Place Details call. Text Search results already carry rating
      // and review count, so ineligible/low-score candidates (most of them)
      // cost nothing further. Previously every candidate got a full Details
      // call first.
      const preReviews = candidate.user_ratings_total ?? null;
      const preRating = candidate.rating ?? null;
      if (!isLeadEligible({ review_count: preReviews, rating: preRating, years_established: null })) continue;
      if (preReviews !== null && preReviews > MAX_REVIEWS_DISCOVERY) continue;
      const preScore = scoreLead({
        review_count: preReviews,
        rating: preRating,
        years_established: null,
        position: i,
      });
      if (preScore < MIN_PRIORITY_SCORE) continue;
      funnel.passedPrefilter++;

      // Deduplicate within this campaign only — same business can appear in separate campaigns
      const { data: existing } = await db
        .from("leads")
        .select("id")
        .eq("google_maps_id", candidate.place_id)
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (existing) continue;

      // Already paid to learn this business has a website (any earlier run,
      // any niche) — don't pay again. See lib/leads/placesSeen.ts.
      if (hasWebsiteCached(candidate.place_id)) {
        funnel.cachedHasWebsite++;
        continue;
      }
      if (noEmailCached(candidate.place_id)) {
        funnel.cachedNoEmail++;
        continue;
      }

      // Cheap call first: website + phone only.
      const light = await getPlaceDetails(candidate.place_id, "light");
      funnel.lightChecked++;
      if (!light) continue;

      // Trust Places API website field; only clear it if the domain is completely dead
      let websiteUrl: string | null = light.website ?? null;
      if (websiteUrl && (await isDomainDead(websiteUrl))) websiteUrl = null;

      // No-website businesses only (2026-09-21 pivot) — skip before doing any
      // more work on this candidate.
      // A Facebook/Instagram/Yelp page in the "website" field is not a
      // website: keep the lead and use that page to find the email.
      let socialUrl: string | null = null;
      if (websiteUrl && isSocialOnlyUrl(websiteUrl)) {
        socialUrl = websiteUrl;
        websiteUrl = null;
        funnel.socialOnly++;
      }
      if (websiteUrl) {
        markHasWebsite(candidate.place_id);
        continue;
      }

      funnel.noWebsite++;

      // Email-first (Cyril, 2026-10-02): only ~24% of no-website leads ever
      // had a findable email and a lead with no email is deleted later
      // anyway, so find the email BEFORE paying for the full record and
      // before inserting. Free web-search quota (capped in searchBudget.ts).
      const bizName = light.name ?? candidate.name;
      const { email: foundEmail, via } = await findEmailForBusiness(bizName, city, socialUrl);
      if (via === "social") funnel.emailFromSocial++;
      funnel.emailSearched++;
      if (!foundEmail || !isSendableLead({ business_name: bizName, email: foundEmail })) {
        markNoEmail(candidate.place_id);
        continue;
      }
      funnel.emailFound++;

      // Only now pay for the full record (reviews, hours, photos).
      const detail = await getPlaceDetails(candidate.place_id, "full");
      if (!detail) continue;

      const reviewCount = detail.user_ratings_total ?? null;
      const rating = detail.rating ?? null;
      const score = preScore;

      const { error: insertError } = await db.from("leads").insert({
        campaign_id: campaignId,
        business_name: detail.name,
        website_url: websiteUrl,
        phone: detail.formatted_phone_number ?? null,
        email: foundEmail,
        location: detail.formatted_address,
        city,
        niche,
        google_maps_id: detail.place_id,
        review_count: reviewCount,
        rating,
        search_position: i,
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
  } catch (err) {
    // Budget guard tripped (lib/leads/placesBudget.ts): stop discovery
    // cleanly and keep whatever was already inserted.
    if (!(err instanceof PlacesBudgetExceeded)) throw err;
    console.warn(`[discovery] ${err.message} Stopping with ${inserted} lead(s) inserted.`);
  }

  console.log(`[discovery] ${niche}/${state} funnel: ${JSON.stringify({ ...funnel, inserted })}`);
  return inserted;
}

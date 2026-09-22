import { db } from "@/lib/db/supabase";
import { getPlaceDetails, isDomainDead } from "./discoveryService";
import { scoreLead } from "./scoring";

// Review counts and ratings on Google drift over time (new reviews land,
// Google periodically purges fake/flagged ones) — a lead's numbers are only
// as fresh as the day it was discovered. Confirmed live 2026-09-22: a lead
// showing 19 reviews in our DB had actually dropped to 13 on Google by the
// time Cyril checked. Since the filtering net (lib/leads/reachability.ts)
// makes real keep/delete calls off these numbers, it needs to work off
// current data, not a stale discovery-day snapshot — this refreshes
// review_count/rating/website_url for every active automated lead right
// before that net runs each tick.
//
// Only google_places leads have a google_maps_id to re-look-up; manual leads
// are skipped (they're exempt from the filtering net entirely anyway).
export async function refreshLeadData(): Promise<number> {
  const { data: leads, error: selectError } = await db
    .from("leads")
    .select("id, google_maps_id, website_url, years_established, search_position")
    .eq("source", "google_places")
    .not("google_maps_id", "is", null)
    .not("status", "eq", "archived");

  // Surface loudly, not silently — e.g. if migration 015_search_position.sql
  // hasn't been applied yet, this select fails entirely and every lead's
  // data just goes on being stale with no visible sign why.
  if (selectError) throw new Error(`refreshLeadData select failed: ${selectError.message}`);

  let refreshed = 0;

  for (const lead of leads ?? []) {
    const detail = await getPlaceDetails(lead.google_maps_id!);
    if (!detail) continue;

    let websiteUrl: string | null = detail.website ?? null;
    if (websiteUrl && (await isDomainDead(websiteUrl))) websiteUrl = null;

    const reviewCount = detail.user_ratings_total ?? null;
    const rating = detail.rating ?? null;

    // Recompute priority_score too — the filtering net checks the stored
    // score, not raw review_count/rating, so a refresh that updates the raw
    // fields but leaves the score stale would defeat the point.
    const priorityScore = scoreLead({
      review_count: reviewCount,
      rating,
      years_established: lead.years_established,
      position: lead.search_position ?? undefined,
    });

    const update = {
      review_count: reviewCount,
      rating,
      website_url: websiteUrl,
      priority_score: priorityScore,
    };

    const { error } = await db.from("leads").update(update).eq("id", lead.id);
    if (!error) refreshed++;
  }

  return refreshed;
}

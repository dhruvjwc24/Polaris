// 2026-09-21 rubric rework: website presence/age used to be the dominant
// signal (see git history) back when outdated-site businesses were the
// target. Now that only no-website businesses are targeted at all (that
// filter happens elsewhere — see lib/leads/reachability.ts
// deleteHasWebsiteLeads and discoveryService's own skip), it's dropped from
// scoring entirely: it was a binary in/out, not something worth a point
// spread among leads that already passed it.
interface ScoringInput {
  review_count: number | null;
  rating: number | null;
  // Years the business has been established. Currently always null for
  // Google-Places-discovered leads (Places has no such field and nothing
  // computes an estimate yet) — only populated today via manual CSV import.
  // Treated as "unknown," never as "new," so it doesn't exclude or penalize.
  years_established: number | null;
  // 0-indexed position in Places API results (before skipping top 4)
  // Lower = more prominent in search = higher urgency
  position?: number;
}

// Hard cutoffs — a business failing any of these was never a real prospect,
// so it's excluded before scoring even runs (not just scored low). Checked
// both at discovery time (never inserted) and by the recurring filtering net
// (deleted if one slips through, e.g. a review count that drops over time).
// Discovery-only ceiling: 0 of 11 businesses above 150 reviews had no website.
export const MIN_REVIEWS = 5;
export const MAX_REVIEWS_DISCOVERY = 150;

export function isLeadEligible(
  input: Pick<ScoringInput, "review_count" | "rating" | "years_established">
): boolean {
  // 2026-10-03 measurement (72 candidates, small-operator niches in NoVA):
  // no-website rate was 45% at 0-15 reviews, 20% at 16-50, 12% at 51-150,
  // 0% above 150. Well-reviewed businesses are established and already have
  // sites, so the old >15 floor was throwing away the best bucket. Floor is
  // now 3 (1-2 review listings had no findable email and look dormant).
  if (input.review_count === null || input.review_count < MIN_REVIEWS) return false;
  // No rating (or a 0) means no real signal to go on at all.
  if (input.rating === null || input.rating === 0) return false;
  // Under 6 months old — too new to have proven it'll stick around.
  if (input.years_established !== null && input.years_established < 0.5) return false;
  return true;
}

export function scoreLead(input: ScoringInput): number {
  let score = 5;

  // Review count. 16-50 is the sweet spot (2026-10-03, Cyril): established
  // enough to afford a ~$500 site and plausibly reply, still often without
  // one (20% no-website). 5-15 is a real but secondary focus: the highest
  // no-website rate (~45%) but the smallest budgets, so it must NOT outscore
  // 16-50. 51+ has the lowest no-website rate (9-12%) and gets no bonus.
  if (input.review_count !== null) {
    if (input.review_count >= 16 && input.review_count <= 50) score += 2;
    else if (input.review_count >= 5 && input.review_count <= 15) score += 1;
  }

  // Rating — same, only reachable if non-null/non-zero already.
  if (input.rating !== null) {
    if (input.rating < 3) score -= 1;
    else if (input.rating >= 4) score += 1;
    // 3.x stays +0
  }

  // Tenure — see the field comment above on why this is usually a no-op today.
  if (input.years_established !== null && input.years_established >= 1) score += 1;

  // Search position — kept deliberately (confirmed 2026-09-22): businesses
  // with a website tend to rank higher in Places search on SEO alone, so a
  // no-website business still ranking near the top is a well-known,
  // well-trafficked business — more likely to actually want a site built.
  if (input.position !== undefined) {
    if (input.position <= 6) score += 2;
    else if (input.position <= 10) score += 1;
  }

  return Math.min(Math.max(score, 1), 10);
}

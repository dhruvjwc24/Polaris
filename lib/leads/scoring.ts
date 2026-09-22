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
export function isLeadEligible(
  input: Pick<ScoringInput, "review_count" | "rating" | "years_established">
): boolean {
  // 15 or fewer reviews reads as not enough credibility/traction to be worth
  // pursuing — not established enough to plausibly afford or want a website.
  // Was 20 (2026-09-21), lowered to 15 (2026-09-22): most real leads were
  // getting killed by this cutoff specifically (not rating), and companies
  // under ~50 reviews turned out to correlate strongly with no website at
  // all — a 20-review floor was excluding good candidates.
  if (input.review_count === null || input.review_count <= 15) return false;
  // No rating (or a 0) means no real signal to go on at all.
  if (input.rating === null || input.rating === 0) return false;
  // Under 6 months old — too new to have proven it'll stick around.
  if (input.years_established !== null && input.years_established < 0.5) return false;
  return true;
}

export function scoreLead(input: ScoringInput): number {
  let score = 5;

  // Review count — only reachable here at all if isLeadEligible already
  // passed (i.e. > 15). Two tiers, confirmed 2026-09-22: >15 is +1, >50 is
  // +2 (the eligibility floor stays 15 — this is a bonus tier on top, not a
  // second exclusion cutoff).
  if (input.review_count !== null) {
    if (input.review_count > 50) score += 2;
    else if (input.review_count > 15) score += 1;
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

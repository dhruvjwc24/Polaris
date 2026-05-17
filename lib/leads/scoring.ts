interface ScoringInput {
  website_url: string | null;
  review_count: number | null;
  rating: number | null;
  years_established: number | null;
  // 0-indexed position in Places API results (before skipping top 4)
  // Lower = more prominent in search = higher urgency if no site
  position?: number;
}

export function scoreLead(input: ScoringInput): number {
  let score = 5;

  // Website presence
  if (!input.website_url) score += 3;
  else score -= 2; // has existing site = less urgent

  // Review count — sweet spot is established but not review-dominant
  if (input.review_count !== null && input.review_count < 20) score += 2;
  else if (input.review_count !== null && input.review_count < 50) score += 1;

  // Rating — winning on quality despite no site
  if (input.rating !== null && input.rating >= 4.0) score += 2;

  // Tenure — established business that never upgraded
  if (input.years_established !== null && input.years_established >= 5) score += 1;

  // Search position — ranking high without a site = maximum urgency
  // They're outranking businesses WITH sites on pure reputation
  if (input.position !== undefined) {
    if (input.position <= 6) score += 2;       // top 7 results
    else if (input.position <= 10) score += 1; // positions 7–10
  }

  return Math.min(Math.max(score, 1), 10);
}

interface ScoringInput {
  website_url: string | null;
  review_count: number | null;
  rating: number | null;
  years_established: number | null;
}

export function scoreLead(input: ScoringInput): number {
  let score = 5;
  if (!input.website_url) score += 3;
  else score -= 2; // has existing website = less urgent
  if (input.review_count !== null && input.review_count < 20) score += 2;
  else if (input.review_count !== null && input.review_count < 50) score += 1;
  if (input.rating !== null && input.rating >= 4.0) score += 2;
  if (input.years_established !== null && input.years_established >= 5) score += 1;
  return Math.min(Math.max(score, 1), 10);
}

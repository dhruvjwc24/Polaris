import { describe, it, expect } from "vitest";
import { isLeadEligible, scoreLead } from "./scoring";

describe("isLeadEligible", () => {
  it("excludes fewer than 5 reviews", () => {
    expect(isLeadEligible({ review_count: 4, rating: 4.5, years_established: null })).toBe(false);
    expect(isLeadEligible({ review_count: 0, rating: 4.5, years_established: null })).toBe(false);
  });

  it("accepts 5 or more reviews, including the old 15-or-fewer band", () => {
    expect(isLeadEligible({ review_count: 5, rating: 4.5, years_established: null })).toBe(true);
    expect(isLeadEligible({ review_count: 15, rating: 4.5, years_established: null })).toBe(true);
  });

  it("excludes null or zero rating", () => {
    expect(isLeadEligible({ review_count: 30, rating: null, years_established: null })).toBe(false);
    expect(isLeadEligible({ review_count: 30, rating: 0, years_established: null })).toBe(false);
  });

  it("excludes under 6 months established", () => {
    expect(isLeadEligible({ review_count: 30, rating: 4.5, years_established: 0.4 })).toBe(false);
  });

  it("accepts 6 months or more established", () => {
    expect(isLeadEligible({ review_count: 30, rating: 4.5, years_established: 0.5 })).toBe(true);
  });

  it("treats unknown (null) tenure as acceptable, not as too new", () => {
    expect(isLeadEligible({ review_count: 30, rating: 4.5, years_established: null })).toBe(true);
  });
});

describe("scoreLead", () => {
  it("never scores below 5 given eligible input", () => {
    // Worst-case eligible combo with 5-150 reviews: 16 reviews (+2), 1-star rating (-1), 6mo tenure (+0)
    const score = scoreLead({ review_count: 16, rating: 1, years_established: 0.5 });
    expect(score).toBe(6);
  });

  it("can reach 10 with strong signals across the board", () => {
    const score = scoreLead({ review_count: 30, rating: 4.8, years_established: 3, position: 2 });
    expect(score).toBe(10); // raw 11, clamped to 10
  });

  it("scores reviews correctly: 16-50 is +2, 5-15 is +1, 51+ is +0", () => {
    const base = { rating: null, years_established: null };
    expect(scoreLead({ ...base, review_count: 5 })).toBe(6);
    expect(scoreLead({ ...base, review_count: 15 })).toBe(6);
    expect(scoreLead({ ...base, review_count: 16 })).toBe(7);
    expect(scoreLead({ ...base, review_count: 50 })).toBe(7);
    expect(scoreLead({ ...base, review_count: 51 })).toBe(5);
  });

  it("scores rating correctly: under 3 is -1, 3.x is +0, 4+ is +1", () => {
    const base = { review_count: null, years_established: null };
    expect(scoreLead({ ...base, rating: 2.5 })).toBe(4);
    expect(scoreLead({ ...base, rating: 3.5 })).toBe(5);
    expect(scoreLead({ ...base, rating: 4.2 })).toBe(6);
  });

  it("gives tenure a +1 at 1 year or more, +0 below that", () => {
    const base = { review_count: null, rating: null };
    expect(scoreLead({ ...base, years_established: 0.9 })).toBe(5);
    expect(scoreLead({ ...base, years_established: 1 })).toBe(6);
  });
});

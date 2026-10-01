import type { Lead } from "@/lib/types";

// Per-lead opening for the cold email, built from data we already have (no AI
// call, so no token cost per lead). Cyril, 2026-09-30: websites, videos and
// enrichment now only happen AFTER a lead replies, so the first email is plain
// text and this is the only personalization it gets. Every statement here is
// true of the lead as stored: we found them, they have reviews, no website.

type Fields = Pick<Lead, "id" | "business_name" | "city" | "review_count" | "rating">;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function buildColdObservation(lead: Fields): string {
  const name = lead.business_name;
  const openers = ["I was looking at", "I was checking out", "I came across"];
  const opener = openers[hash(lead.id) % openers.length];
  // Only claim "doing great" when the reviews back it up.
  const doingWell = (lead.rating ?? 0) >= 4 ? "seem to be doing great with customers" : "seem to have a solid customer base";
  return `${opener} ${name} and you guys ${doingWell}, but I notice that you guys don't have a website.`;
}

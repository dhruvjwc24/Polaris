import fs from "fs";
import path from "path";

// Niche priority system (Cyril, 2026-10-03). Discovery works down this list
// best-first and only moves to a lower tier once the higher ones are dry.
//
// Each niche is scored from three inputs:
//   ticket   1-5  typical web-project value / customer lifetime value. A ~$500
//                 site is only an easy yes where one job pays for it.
//   noSite   1-5  how often owners in the trade have no website (web research:
//                 auto repair ~45%, HVAC ~23%, electricians ~23%, plumbing ~19%).
//   reach    1-5  how reachable/decision-making the owner is by email.
// rank = ticket*2 + noSite + reach  (ticket counts double: budget matters most).
//
// Sources (2026-10-03 web research): leadsbylocation.com best-niches-for-web-design,
// theblueprint.training niches-for-your-agency, pipelineon.com HVAC LTV
// ($15k HVAC, $12-18k roofing, $8-12k plumbing; lawn care lower-ticket),
// b2bleadfinder.io/webleadr.com (barbers/detailers/cleaners often no site but
// small budgets). The inputs are judgement calls from that research, not
// measurements: real per-niche yield from runs (nicheStats below) overrides
// them once a niche has enough samples.

export interface Niche {
  name: string; // text-search phrase
  ticket: number;
  noSite: number;
  reach: number;
}

export const NICHES: Niche[] = [
  // Tier 1: high-ticket trades, owner-operators, job value >> $500
  { name: "roofing contractor", ticket: 5, noSite: 3, reach: 4 },
  { name: "HVAC", ticket: 5, noSite: 3, reach: 4 },
  { name: "plumber", ticket: 4, noSite: 3, reach: 4 },
  { name: "electrician", ticket: 4, noSite: 3, reach: 4 },
  { name: "general contractor remodeling", ticket: 5, noSite: 3, reach: 3 },
  { name: "auto repair", ticket: 3, noSite: 5, reach: 4 },
  { name: "concrete contractor", ticket: 4, noSite: 4, reach: 3 },
  { name: "paving asphalt", ticket: 4, noSite: 4, reach: 3 },
  // Tier 2: solid project value
  { name: "fence installation", ticket: 3, noSite: 4, reach: 3 },
  { name: "flooring installation", ticket: 3, noSite: 4, reach: 3 },
  { name: "painting contractor", ticket: 3, noSite: 4, reach: 3 },
  { name: "garage door repair", ticket: 3, noSite: 3, reach: 3 },
  { name: "tree service", ticket: 3, noSite: 4, reach: 3 },
  { name: "septic service", ticket: 3, noSite: 3, reach: 3 },
  { name: "chimney repair", ticket: 3, noSite: 3, reach: 3 },
  { name: "landscaping", ticket: 3, noSite: 3, reach: 3 },
  { name: "handyman", ticket: 2, noSite: 4, reach: 3 },
  { name: "cleaning service", ticket: 2, noSite: 4, reach: 3 },
  // Tier 3: recurring/low-ticket, smaller budgets (barely worth the $500 ask)
  { name: "pressure washing", ticket: 2, noSite: 4, reach: 3 },
  { name: "carpet cleaning", ticket: 2, noSite: 3, reach: 3 },
  { name: "mobile car detailing", ticket: 2, noSite: 4, reach: 3 },
  { name: "lawn care", ticket: 2, noSite: 4, reach: 3 },
  { name: "junk removal", ticket: 2, noSite: 3, reach: 2 },
  { name: "hauling service", ticket: 2, noSite: 4, reach: 3 },
];

// Do NOT target (documented so nobody re-adds them): dentists, lawyers,
// accountants, real estate agents (already have sites and agencies, and
// reply rates from the dental test lead were nil), restaurants, and franchises
// (franchise emails bounce or reach the wrong business).

export function nicheScore(n: Niche): number {
  return n.ticket * 2 + n.noSite + n.reach;
}

export function tierOf(n: Niche): 1 | 2 | 3 {
  const s = nicheScore(n);
  return s >= 15 ? 1 : s >= 12 ? 2 : 3;
}

// ── Learned stats: real runs override the research guesses ────────────────
const STATS_FILE = path.join(process.cwd(), ".niche-stats.json");
const DRY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // a dry niche is skipped for 30 days
const MIN_RUNS_TO_LEARN = 2;

export interface NicheStats {
  runs: number;
  inserted: number;
  lastRun: number;
  lastInserted: number;
}
type StatsMap = Record<string, NicheStats>;

function load(): StatsMap {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, "utf8")) as StatsMap;
  } catch {
    return {};
  }
}

export function recordNicheRun(name: string, inserted: number): void {
  const m = load();
  const s = m[name] ?? { runs: 0, inserted: 0, lastRun: 0, lastInserted: 0 };
  s.runs++;
  s.inserted += inserted;
  s.lastRun = Date.now();
  s.lastInserted = inserted;
  m[name] = s;
  fs.writeFileSync(STATS_FILE, JSON.stringify(m, null, 2));
}

function isDry(name: string, stats: StatsMap): boolean {
  const s = stats[name];
  return !!s && s.lastInserted === 0 && Date.now() - s.lastRun < DRY_TTL_MS;
}

// Research score, nudged by measured yield once there are enough runs
// (average leads per run, capped so a lucky run can't leapfrog a whole tier).
function effectiveScore(n: Niche, stats: StatsMap): number {
  const s = stats[n.name];
  const base = nicheScore(n);
  if (!s || s.runs < MIN_RUNS_TO_LEARN) return base;
  return base + Math.max(-3, Math.min(3, s.inserted / s.runs - 2));
}

/** Niches best-first, with dry ones (recent run found nothing) pushed out. */
export function rankedNiches(): { niche: Niche; tier: 1 | 2 | 3; score: number }[] {
  const stats = load();
  return NICHES.filter((n) => !isDry(n.name, stats))
    .map((niche) => ({ niche, tier: tierOf(niche), score: effectiveScore(niche, stats) }))
    .sort((a, b) => b.score - a.score);
}

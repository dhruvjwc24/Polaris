// Best-niche-first lead discovery. Usage: npx tsx scripts/discover.mts [targetLeads=3] [--dry-list]
// Works down lib/leads/niches.ts (best score first), stops at the target or when the
// Places budget guard trips. A niche that yields 0 is skipped for 30 days, so the run
// naturally falls through to lower tiers only when higher ones are dry.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const args = process.argv.slice(2);
const target = Number(args.find((a) => /^\d+$/.test(a)) ?? 3);
process.env.DISCOVERY_MAX_LEADS = String(target);

const { rankedNiches, recordNicheRun } = await import("@/lib/leads/niches");
const ranked = rankedNiches();
if (args.includes("--dry-list")) {
  for (const r of ranked) console.log(`T${r.tier} ${r.score.toFixed(1)} ${r.niche.name}`);
  process.exit(0);
}

const { discoverLeads } = await import("@/lib/leads/discoveryService");
const { db } = await import("@/lib/db/supabase");
const { placesUsageSummary } = await import("@/lib/leads/placesBudget");

// 3 cities per niche (each city = one $0.032 text search). Added after a
// 2026-10-03 run spent $0.86 on 27 searches across top-tier niches and found 0 leads.
const CITIES = ["Manassas", "Woodbridge", "Stafford"];
const MIN_DAILY_HEADROOM_USD = 0.2; // enough for one niche (3 searches + checks)
let total = 0;
for (const { niche, tier } of ranked) {
  if (total >= target) break;
  const u = placesUsageSummary();
  if (u.dailyLimit - u.dayUsd < MIN_DAILY_HEADROOM_USD || u.monthlyLimit - u.monthUsd < MIN_DAILY_HEADROOM_USD) {
    console.log("Stopping: Places budget headroom too low. Not recording remaining niches as dry.");
    break;
  }
  const { data: c, error } = await db
    .from("campaigns")
    .insert({ niche: niche.name, city: CITIES[0], state: "VA", cities: CITIES })
    .select()
    .single();
  if (error || !c) throw new Error(error?.message ?? "campaign insert failed");
  const n = await discoverLeads(niche.name, "VA", CITIES, c.id);
  recordNicheRun(niche.name, n);
  total += n;
  console.log(`T${tier} ${niche.name}: +${n} (total ${total}/${target}) | Places $${placesUsageSummary().dayUsd.toFixed(2)} today`);
}
console.log(`Done: ${total} new lead(s).`);

import { db } from "@/lib/db/supabase";

// Backstop for leads that never went through contactDiscoveryService at all
// (e.g. manual CSV imports via importService.ts) — normally-discovered leads
// already get flagged inline by contactDiscoveryService's own last-resort
// search. A lead with neither email nor phone is flagged for Cyril to
// review/delete himself in a separate UI tab — never archived or deleted
// automatically, and never needs his approval to be flagged in the first
// place.
export async function flagUnreachableLeads(): Promise<number> {
  const { data, error } = await db
    .from("leads")
    .update({ needs_contact_review: true })
    .is("email", null)
    .is("phone", null)
    .eq("needs_contact_review", false)
    .neq("status", "archived")
    .select("id");

  if (error) throw new Error(`flagUnreachableLeads failed: ${error.message}`);
  return data?.length ?? 0;
}

// All three filtering-net functions below only ever apply to automated leads
// (source='google_places' or CSV-imported). Manual "Create Website Request"
// leads (source='manual', app/api/leads/manual/route.ts) are Cyril's own
// hand-picked cold-call entries — often with no review_count/rating filled
// in at all — and are a deliberate human override of the automated
// qualification rules, not something the filtering net should touch.

// Filtering net, part 1: a business that already has a website — even an
// outdated one — is no longer a target at all (2026-09-21 pivot: real
// existing 6-7/10 sites beat the generic mockup template on custom
// structure/content, so "upgrade an outdated site" isn't the pitch anymore).
// Hard delete, not archive/flag, since there's nothing to review — this
// should just never have become a lead. Run every tick as a safety net in
// case scoring/discovery ever lets one through.
export async function deleteHasWebsiteLeads(): Promise<number> {
  const { data, error } = await db
    .from("leads")
    .delete()
    .not("website_url", "is", null)
    .not("status", "eq", "archived")
    .neq("source", "manual")
    .select("id, business_name, website_url");

  if (error) throw new Error(`deleteHasWebsiteLeads failed: ${error.message}`);
  if (data?.length) {
    console.log(
      `[reachability] deleteHasWebsiteLeads removed ${data.length}: ` +
        data.map((l) => `"${l.business_name}" (${l.website_url})`).join(", ")
    );
  }
  return data?.length ?? 0;
}

// Filtering net, part 2: given the current rubric (lib/leads/scoring.ts),
// nothing can score below 5, and Cyril deliberately wants 5 itself excluded
// too — only 6+ gets built. In practice this only ever catches a 5 (isLeadEligible's
// hard cutoffs already stop discovery from producing anything lower), but
// it's a real safety net, not dead code, since scores can shift if a
// business's review count/rating changes on a later re-check.
export async function deleteLowScoreLeads(): Promise<number> {
  const { data, error } = await db
    .from("leads")
    .delete()
    .lt("priority_score", 6)
    .not("status", "eq", "archived")
    .neq("source", "manual")
    .select("id, business_name, priority_score");

  if (error) throw new Error(`deleteLowScoreLeads failed: ${error.message}`);
  if (data?.length) {
    console.log(
      `[reachability] deleteLowScoreLeads removed ${data.length}: ` +
        data.map((l) => `"${l.business_name}" (score ${l.priority_score})`).join(", ")
    );
  }
  return data?.length ?? 0;
}

// Filtering net, part 3: the hard eligibility cutoffs from
// lib/leads/scoring.ts's isLeadEligible, enforced as a standing DB check —
// discoveryService.ts/importService.ts already skip these at insert time,
// this is the safety net for anything that slips through (e.g. a review
// count that drops on a later re-check). Mirrors isLeadEligible's
// review_count/rating conditions; deliberately omits the tenure (<6mo)
// condition — `leads.years_established` is an `int` column (can't hold the
// 0.5-year/6-month cutoff the rubric needs without migration 014), and in
// practice it's only ever non-null on manual-source leads anyway, which are
// already excluded here. Revisit if a real per-lead tenure data source ever
// gets built for automated leads.
export async function deleteIneligibleLeads(): Promise<number> {
  const { data, error } = await db
    .from("leads")
    .delete()
    .not("status", "eq", "archived")
    .neq("source", "manual")
    .or("review_count.is.null,review_count.lte.15,rating.is.null,rating.eq.0")
    .select("id, business_name, review_count, rating");

  if (error) throw new Error(`deleteIneligibleLeads failed: ${error.message}`);
  if (data?.length) {
    console.log(
      `[reachability] deleteIneligibleLeads removed ${data.length}: ` +
        data.map((l) => `"${l.business_name}" (reviews=${l.review_count ?? "null"}, rating=${l.rating ?? "null"})`).join(", ")
    );
  }
  return data?.length ?? 0;
}

import { db } from "@/lib/db/supabase";
import { getRemainingSendBudget } from "@/lib/outreach/rateLimiter";
import { OUTREACH_STATUSES } from "@/lib/outreach/gmailService";

// Outreach pool + capacity gate (Cyril, 2026-09-30).
//
// New direction: nothing expensive (enrichment, website, video) is spent on a
// lead before it replies. A discovered lead that has an email and passed the
// discovery filters is "qualified" (status -> 'enriched', name kept from the
// old pipeline though no enrichment happens) and goes straight into the
// outreach pool. The pool is capped at today's remaining send budget, and the
// surplus is removed, so the pipeline never holds more leads than it can send.
//
// Manual-source leads (Cyril's hand-picked entries) are exempt from every rule
// here, same as the filtering nets in lib/leads/reachability.ts.

export async function getContactedLeadIds(): Promise<Set<string>> {
  const { data } = await db.from("outreach_messages").select("lead_id");
  return new Set((data ?? []).map((r) => r.lead_id as string));
}

export interface PipelineCapacity {
  remaining: number; // cold emails still allowed today
  pool: number; // uncontacted email leads waiting to be sent
  slots: number; // how many more leads may be qualified into the pool
}

export async function getPipelineCapacity(): Promise<PipelineCapacity> {
  const remaining = await getRemainingSendBudget();
  const contacted = await getContactedLeadIds();
  const { data } = await db
    .from("leads")
    .select("id")
    .in("status", OUTREACH_STATUSES)
    .neq("source", "manual")
    .not("email", "is", null)
    .eq("opted_out", false);
  const pool = (data ?? []).filter((l) => !contacted.has(l.id)).length;
  return { remaining, pool, slots: Math.max(0, remaining - pool) };
}

/**
 * Qualify the top-scoring email-bearing 'new' leads into the outreach pool (up
 * to the open slots) and delete the rest. Skipped when today's budget is
 * exhausted so a full day of sending doesn't wipe the queue tomorrow needs.
 */
export async function qualifyAndPruneLeads(): Promise<{ qualified: number; pruned: number }> {
  const { remaining, slots } = await getPipelineCapacity();
  if (remaining <= 0) return { qualified: 0, pruned: 0 };

  const { data: candidates, error } = await db
    .from("leads")
    .select("id, business_name, priority_score")
    .eq("status", "new")
    .neq("source", "manual")
    .not("email", "is", null)
    .eq("opted_out", false)
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`qualifyAndPruneLeads failed: ${error.message}`);
  const keep = (candidates ?? []).slice(0, slots);
  const surplus = (candidates ?? []).slice(slots);

  if (keep.length) {
    const { error: upError } = await db
      .from("leads")
      .update({ status: "enriched" })
      .in("id", keep.map((l) => l.id));
    if (upError) throw new Error(`qualifyAndPruneLeads update failed: ${upError.message}`);
    console.log(`[qualification] qualified ${keep.length} leads for outreach: ${keep.map((l) => `"${l.business_name}"`).join(", ")}`);
  }

  if (surplus.length) {
    const { error: delError } = await db
      .from("leads")
      .delete()
      .in("id", surplus.map((l) => l.id));
    if (delError) throw new Error(`qualifyAndPruneLeads delete failed: ${delError.message}`);
    console.log(
      `[qualification] pruned ${surplus.length} surplus leads (kept ${keep.length}): ` +
        surplus.map((l) => `"${l.business_name}" (score ${l.priority_score})`).join(", ")
    );
  }

  return { qualified: keep.length, pruned: surplus.length };
}

// Emails that would bounce, reach the wrong party, or belong to a national
// chain (CLAUDE.md: avoid franchises). Bounces are what hurt the shared Gmail
// sender, so these are removed before any cold email goes out (2026-09-30:
// the pool held placeholder scrapes like FLast@ / First.Middle@ / first@).
const PLACEHOLDER_LOCAL =
  /^(first|flast|f\.?last|first\.?last|first\.?middle|firstname|lastname|last|name|yourname|example|test|privacyrequest|privacy|dpo|abuse|legal|unsubscribe|noreply|no-reply)$/i;
const AGENCY_LOCAL = /rankhigh|seo|webdesign|webdev|marketing/i;
const CHAIN_NAME =
  /floor coverings international|one hour (air|heating)|mr\.? rooter|roto-rooter|servpro|stanley steemer|merry maids|molly maid|the home depot|lowe'?s/i;

export function isSendableLead(lead: { business_name: string; email: string | null }): boolean {
  if (!lead.email) return false;
  const local = lead.email.split("@")[0] ?? "";
  if (PLACEHOLDER_LOCAL.test(local) || AGENCY_LOCAL.test(local)) return false;
  if (CHAIN_NAME.test(lead.business_name)) return false;
  return true;
}

/** Delete not-yet-contacted automated leads whose email/name fails isSendableLead. */
export async function removeUnsendableLeads(): Promise<number> {
  const contacted = await getContactedLeadIds();
  const { data } = await db
    .from("leads")
    .select("id, business_name, email")
    .in("status", ["new", ...OUTREACH_STATUSES])
    .neq("source", "manual")
    .not("email", "is", null);
  const bad = (data ?? []).filter((l) => !contacted.has(l.id) && !isSendableLead(l));
  if (!bad.length) return 0;
  const { error } = await db.from("leads").delete().in("id", bad.map((l) => l.id));
  if (error) throw new Error(`removeUnsendableLeads failed: ${error.message}`);
  console.log(`[qualification] removed ${bad.length} unsendable leads: ${bad.map((l) => `"${l.business_name}" <${l.email}>`).join(", ")}`);
  return bad.length;
}

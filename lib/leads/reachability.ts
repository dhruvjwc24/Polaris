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

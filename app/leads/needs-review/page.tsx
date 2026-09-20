import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { NeedsReviewTable } from "@/components/NeedsReviewTable";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NeedsReviewPage() {
  const { data: leads } = await db
    .from("leads")
    .select("*")
    .eq("needs_contact_review", true)
    .not("status", "eq", "archived")
    .order("created_at", { ascending: false });

  return (
    <main className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Pipeline</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">Needs Contact Info</h1>
        <span className="text-sm text-gray-500 ml-auto">{leads?.length ?? 0} pending review</span>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        No email or phone found for these even after an automated search. Search again, fill one in
        yourself if you find it, or clear them out — nothing here blocks the rest of the pipeline.
      </p>

      <NeedsReviewTable leads={(leads ?? []) as Lead[]} />
    </main>
  );
}

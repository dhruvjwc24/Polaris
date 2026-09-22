import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { ManualOutreachTable } from "@/components/ManualOutreachTable";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManualOutreachPage() {
  const { data: leads } = await db
    .from("leads")
    .select("*")
    .is("email", null)
    .not("phone", "is", null)
    .eq("status", "video_ready")
    .eq("manual_contact_done", false)
    .order("priority_score", { ascending: false });

  return (
    <main className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Pipeline</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">Manual Outreach</h1>
        <span className="text-sm text-gray-500 ml-auto">{leads?.length ?? 0} waiting on you</span>
      </div>

      <p className="text-gray-500 text-sm mb-4">
        These leads have a phone but no email, so they never go through automated outreach —
        call or text them yourself from your own phone, then mark contacted. Scored 8+ are
        flagged to do first.
      </p>

      <ManualOutreachTable leads={(leads ?? []) as Lead[]} />
    </main>
  );
}

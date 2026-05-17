import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { KanbanBoard } from "@/components/KanbanBoard";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: leads } = await db
    .from("leads")
    .select("*")
    .not("status", "eq", "archived")
    .order("priority_score", { ascending: false });

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Polaris Pipeline</h1>
        <div className="flex gap-3">
          <Link
            href="/campaigns/new"
            className="bg-white text-gray-950 rounded px-4 py-1.5 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            New Campaign
          </Link>
          <Link href="/leads" className="text-sm text-gray-400 hover:text-gray-200 px-2 py-1.5">
            All Leads
          </Link>
          <Link href="/analytics" className="text-sm text-gray-400 hover:text-gray-200 px-2 py-1.5">
            Analytics
          </Link>
          <Link href="/tables" className="text-sm text-gray-400 hover:text-gray-200 px-2 py-1.5">
            Tables
          </Link>
        </div>
      </div>
      <KanbanBoard leads={(leads ?? []) as Lead[]} />
    </main>
  );
}

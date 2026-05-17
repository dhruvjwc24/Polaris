import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const filters = await searchParams;
  let query = db.from("leads").select("*").order("priority_score", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.niche) query = query.eq("niche", filters.niche);
  if (filters.city) query = query.eq("city", filters.city);

  const { data: leads } = await query;

  return (
    <main className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Pipeline</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">Leads</h1>
        <span className="text-sm text-gray-500 ml-auto">{leads?.length ?? 0} total</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-2 pr-4 font-normal">Business</th>
              <th className="text-left py-2 pr-4 font-normal">City</th>
              <th className="text-left py-2 pr-4 font-normal">Niche</th>
              <th className="text-left py-2 pr-4 font-normal">Score</th>
              <th className="text-left py-2 pr-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).map((lead: Lead) => (
              <tr key={lead.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
                <td className="py-2 pr-4">
                  <Link href={`/leads/${lead.id}`} className="hover:text-white">
                    {lead.business_name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-gray-400">{lead.city}</td>
                <td className="py-2 pr-4 text-gray-400">{lead.niche}</td>
                <td className="py-2 pr-4 text-gray-400">{lead.priority_score}</td>
                <td className="py-2">
                  <StatusBadge status={lead.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

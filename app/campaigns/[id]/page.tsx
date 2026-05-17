import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { LeadSelectionTable } from "@/components/LeadSelectionTable";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: campaign }, { data: leads }] = await Promise.all([
    db.from("campaigns").select("*").eq("id", id).single(),
    db.from("leads")
      .select("*")
      .eq("campaign_id", id)
      .order("priority_score", { ascending: false }),
  ]);

  if (!campaign) return <main className="p-6 text-gray-400">Campaign not found</main>;

  const cities: string[] = campaign.cities ?? [campaign.city];
  const locationLabel = cities.join(" · ");

  return (
    <main className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/" className="hover:text-gray-300">Pipeline</Link>
            <span>/</span>
            <span className="text-gray-300">{campaign.niche}</span>
          </div>
          <h1 className="text-xl font-bold capitalize">{campaign.niche}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {campaign.state ? `${locationLabel} · ${campaign.state}` : locationLabel}
          </p>
        </div>
        <span className="text-sm text-gray-600 mt-1">{leads?.length ?? 0} leads</span>
      </div>

      <LeadSelectionTable leads={(leads ?? []) as Lead[]} />
    </main>
  );
}

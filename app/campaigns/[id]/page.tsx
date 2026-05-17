import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { KanbanBoard } from "@/components/KanbanBoard";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: campaign }, { data: leads }] = await Promise.all([
    db.from("campaigns").select("*").eq("id", id).single(),
    db.from("leads").select("*").eq("campaign_id", id).order("priority_score", { ascending: false }),
  ]);

  if (!campaign) return <main className="p-6 text-gray-400">Campaign not found</main>;

  return (
    <main className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">
          Pipeline
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">
          {campaign.niche} in {campaign.city}
        </h1>
        <span className="text-sm text-gray-500 ml-auto">{leads?.length ?? 0} leads</span>
      </div>
      <RunPipelineButton campaignId={id} />
      <div className="mt-6">
        <KanbanBoard leads={(leads ?? []) as Lead[]} />
      </div>
    </main>
  );
}

function RunPipelineButton({ campaignId }: { campaignId: string }) {
  return (
    <form action={`/api/pipeline`} method="POST">
      <input type="hidden" name="campaignId" value={campaignId} />
      <button
        type="submit"
        className="bg-white text-gray-950 rounded px-4 py-1.5 text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Run Pipeline
      </button>
    </form>
  );
}

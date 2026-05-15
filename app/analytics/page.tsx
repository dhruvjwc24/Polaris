import Link from "next/link";
import { db } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { data: leads } = await db.from("leads").select("status, priority_score");
  const { data: calls } = await db.from("call_logs").select("outcome, deal_value");

  const total = leads?.length ?? 0;
  const outreachSent = leads?.filter((l) => ["outreach_sent", "followed_up_1", "followed_up_2", "replied", "positive", "call_scheduled", "closed"].includes(l.status)).length ?? 0;
  const replied = leads?.filter((l) => ["replied", "positive", "call_scheduled", "closed"].includes(l.status)).length ?? 0;
  const closed = leads?.filter((l) => l.status === "closed").length ?? 0;
  const totalRevenue = calls?.filter((c) => c.outcome === "closed").reduce((sum, c) => sum + (c.deal_value ?? 0), 0) ?? 0;

  const replyRate = outreachSent > 0 ? ((replied / outreachSent) * 100).toFixed(1) : "—";
  const closeRate = replied > 0 ? ((closed / replied) * 100).toFixed(1) : "—";

  return (
    <main className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Pipeline</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metric label="Total Leads" value={total.toString()} />
        <Metric label="Outreach Sent" value={outreachSent.toString()} />
        <Metric label="Reply Rate" value={`${replyRate}%`} />
        <Metric label="Close Rate" value={`${closeRate}%`} />
        <Metric label="Deals Closed" value={closed.toString()} />
        <Metric label="Revenue" value={totalRevenue > 0 ? `$${(totalRevenue / 100).toLocaleString()}` : "—"} />
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db/supabase";
import { TableViewer } from "@/components/TableViewer";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const [
    { data: campaigns },
    { data: leads },
    { data: messages },
    { data: calls },
  ] = await Promise.all([
    db.from("campaigns").select("*").order("created_at", { ascending: false }),
    db.from("leads").select("id, business_name, city, niche, status, priority_score, email, phone, website_url, review_count, rating, source, created_at").order("created_at", { ascending: false }),
    db.from("outreach_messages").select("*").order("sent_at", { ascending: false }),
    db.from("call_logs").select("*").order("created_at", { ascending: false }),
  ]);

  const tables = [
    { name: "campaigns", rows: (campaigns ?? []) as Record<string, unknown>[] },
    { name: "leads", rows: (leads ?? []) as Record<string, unknown>[] },
    { name: "outreach_messages", rows: (messages ?? []) as Record<string, unknown>[] },
    { name: "call_logs", rows: (calls ?? []) as Record<string, unknown>[] },
  ];

  return (
    <main className="p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">Pipeline</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold">Tables</h1>
      </div>
      <TableViewer tables={tables} />
    </main>
  );
}

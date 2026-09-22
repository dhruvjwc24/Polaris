"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/types";

export function ManualOutreachTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function markContacted(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/leads/${id}/mark-contacted`, { method: "POST" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead? This can't be undone.")) return;
    setBusyId(id);
    try {
      await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!leads.length) {
    return <p className="text-gray-500 text-sm">Nothing here — every ready lead has an email on file.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-500 border-b border-gray-800">
          <th className="text-left py-2 pr-4 font-normal">Business</th>
          <th className="text-left py-2 pr-4 font-normal">City</th>
          <th className="text-left py-2 pr-4 font-normal">Niche</th>
          <th className="text-left py-2 pr-4 font-normal">Phone</th>
          <th className="text-left py-2 pr-4 font-normal">Score</th>
          <th className="text-left py-2 pr-4 font-normal">Mockup</th>
          <th className="text-left py-2 pr-4 font-normal"></th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr key={lead.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
            <td className="py-2 pr-4">
              <Link href={`/leads/${lead.id}`} className="hover:text-white">
                {lead.business_name}
              </Link>
            </td>
            <td className="py-2 pr-4 text-gray-400">{lead.city}</td>
            <td className="py-2 pr-4 text-gray-400">{lead.niche}</td>
            <td className="py-2 pr-4 text-gray-400">{lead.phone ?? "—"}</td>
            <td className="py-2 pr-4">
              {lead.priority_score >= 8 ? (
                <span className="text-amber-400 font-medium">{lead.priority_score} · do first</span>
              ) : (
                <span className="text-gray-400">{lead.priority_score}</span>
              )}
            </td>
            <td className="py-2 pr-4 flex items-center gap-2">
              {lead.lovable_url && (
                <a href={lead.lovable_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  Mockup
                </a>
              )}
              {lead.video_url && (
                <a href={lead.video_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  Video
                </a>
              )}
            </td>
            <td className="py-2 pr-4 flex items-center gap-2">
              <button
                onClick={() => markContacted(lead.id)}
                disabled={busyId === lead.id}
                className="bg-white text-gray-950 rounded px-3 py-1 text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {busyId === lead.id ? "..." : "Mark Contacted"}
              </button>
              <button
                onClick={() => deleteLead(lead.id)}
                disabled={busyId === lead.id}
                className="bg-gray-800 hover:bg-red-900 disabled:opacity-40 rounded px-3 py-1 text-xs transition-colors"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

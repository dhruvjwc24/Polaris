"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/types";

const DONE_STATUSES = new Set(["video_ready", "outreach_sent", "followed_up_1", "followed_up_2", "replied", "positive", "call_scheduled", "closed"]);

export function ColdCallQueue({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [buildingId, setBuildingId] = useState<string | null>(null);

  async function build(id: string) {
    setBuildingId(id);
    try {
      const res = await fetch(`/api/leads/${id}/build`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Build failed");
        return;
      }
      router.refresh();
    } finally {
      setBuildingId(null);
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Cold Call Queue — Manual Requests
      </h2>
      <div className="flex flex-col gap-2">
        {leads.map((lead) => {
          const isDone = DONE_STATUSES.has(lead.status);
          return (
            <div key={lead.id} className="bg-gray-900 rounded p-3 flex items-center justify-between gap-4">
              <div>
                <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                  {lead.business_name}
                </Link>
                <span className="text-gray-500 text-xs ml-2">{lead.city} · {lead.niche} · {lead.status}</span>
              </div>
              <div className="flex items-center gap-3">
                {lead.lovable_url && (
                  <a href={lead.lovable_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">
                    Mockup
                  </a>
                )}
                {lead.video_url && (
                  <a href={lead.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">
                    Video
                  </a>
                )}
                {!isDone && (
                  <button
                    onClick={() => build(lead.id)}
                    disabled={buildingId === lead.id}
                    className="bg-white text-gray-950 rounded px-3 py-1 text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {buildingId === lead.id ? "Building..." : "Build Website"}
                  </button>
                )}
                {isDone && <span className="text-green-400 text-xs">Ready — call/email yourself</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

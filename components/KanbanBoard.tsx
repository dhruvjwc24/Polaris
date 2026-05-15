"use client";

import { LeadCard } from "./LeadCard";
import type { Lead, LeadStatus } from "@/lib/types";

const COLUMNS: { label: string; statuses: LeadStatus[] }[] = [
  { label: "New", statuses: ["new", "enriched", "brief_ready"] },
  { label: "Building", statuses: ["mockup_building", "mockup_ready", "video_building", "video_ready"] },
  { label: "Outreach", statuses: ["outreach_sent", "followed_up_1", "followed_up_2"] },
  { label: "Replied", statuses: ["replied", "positive", "call_scheduled"] },
  { label: "Closed", statuses: ["closed"] },
];

export function KanbanBoard({ leads }: { leads: Lead[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => col.statuses.includes(l.status));
        return (
          <div key={col.label} className="flex-shrink-0 w-64">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400">{col.label}</h3>
              <span className="text-xs text-gray-600">{colLeads.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

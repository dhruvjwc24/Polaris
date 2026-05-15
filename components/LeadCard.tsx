"use client";

import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import type { Lead } from "@/lib/types";

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium truncate">{lead.business_name}</span>
        <span className="text-xs text-gray-500 shrink-0">{lead.priority_score}/10</span>
      </div>
      <div className="text-xs text-gray-500 mb-2">{lead.city} · {lead.niche}</div>
      <StatusBadge status={lead.status} />
    </Link>
  );
}

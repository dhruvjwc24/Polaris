"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import type { Lead } from "@/lib/types";

const ENRICHABLE = new Set(["new", "enriched"]);
// Any lead with a site_brief can have its mockup built or rebuilt
const HAS_BRIEF = new Set(["brief_ready", "mockup_building", "mockup_ready", "video_building", "video_ready", "outreach_sent", "followed_up_1", "followed_up_2", "replied", "positive", "call_scheduled", "closed"]);
const VIDEOABLE = new Set(["mockup_ready"]);
const SENDABLE = new Set(["video_ready"]);

export function LeadSelectionTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const enrichable = leads.filter((l) => ENRICHABLE.has(l.status));
  const allEnrichableSelected =
    enrichable.length > 0 && enrichable.every((l) => selected.has(l.id));

  function toggleSelectAll() {
    if (allEnrichableSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        enrichable.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        enrichable.forEach((l) => next.add(l.id));
        return next;
      });
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function enrichSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setEnriching(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error ?? "Enrichment failed" });
      } else {
        setFeedback({ ok: true, msg: `${ids.length} lead${ids.length === 1 ? "" : "s"} enriched` });
        setSelected(new Set());
        router.refresh();
      }
    } catch {
      setFeedback({ ok: false, msg: "Network error" });
    } finally {
      setEnriching(false);
    }
  }

  if (!leads.length) {
    return <p className="text-gray-600 text-sm">No leads yet. Discovery may still be running — refresh in a moment.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {enrichable.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
          >
            {allEnrichableSelected ? "Deselect all" : `Select all unenriched (${enrichable.length})`}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={enrichSelected}
            disabled={enriching}
            className="bg-white text-gray-950 rounded px-3 py-1.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            {enriching ? "Enriching..." : `Enrich Selected (${selected.size})`}
          </button>
        )}
        {feedback && (
          <span className={`text-sm ${feedback.ok ? "text-green-400" : "text-red-400"}`}>
            {feedback.msg}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-left">
              <th className="py-2 pr-3 w-8 font-normal" />
              <th className="py-2 pr-4 font-normal">Business</th>
              <th className="py-2 pr-4 font-normal">City</th>
              <th className="py-2 pr-4 font-normal">Score</th>
              <th className="py-2 pr-4 font-normal">Status</th>
              <th className="py-2 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-900 hover:bg-gray-900/50 transition-colors">
                <td className="py-2.5 pr-3">
                  {ENRICHABLE.has(lead.status) && (
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                      className="rounded accent-white"
                    />
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <Link href={`/leads/${lead.id}`} className="hover:text-white font-medium">
                    {lead.business_name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-gray-400">{lead.city}</td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs font-semibold ${lead.priority_score >= 8 ? "text-green-400" : lead.priority_score >= 6 ? "text-yellow-400" : "text-gray-500"}`}>
                    {lead.priority_score}/10
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="py-2.5">
                  <LeadActions lead={lead} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadActions({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(action: string) {
    setLoading(action);
    try {
      await fetch(`/api/leads/${lead.id}/${action}`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {lead.lovable_url && (
        <a
          href={lead.lovable_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline"
        >
          Preview
        </a>
      )}
      {HAS_BRIEF.has(lead.status) && (
        <button
          onClick={() => run("mockup")}
          disabled={loading === "mockup"}
          className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
        >
          {loading === "mockup" ? "Building..." : lead.lovable_url ? "Rebuild" : "Build Mockup"}
        </button>
      )}
      {VIDEOABLE.has(lead.status) && (
        <button
          onClick={() => run("video")}
          disabled={loading === "video"}
          className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
        >
          {loading === "video" ? "Generating..." : "Make Video"}
        </button>
      )}
      {SENDABLE.has(lead.status) && lead.email && (
        <button
          onClick={() => run("send")}
          disabled={loading === "send"}
          className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
        >
          {loading === "send" ? "Sending..." : "Send Outreach"}
        </button>
      )}
    </div>
  );
}

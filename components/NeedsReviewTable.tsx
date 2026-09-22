"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/types";
import { safeHref } from "@/lib/safeHref";

export function NeedsReviewTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function searchAgain(id: string) {
    setSearchingId(id);
    try {
      const res = await fetch("/api/leads/recheck-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await res.json().catch(() => ({}));
      if (result.scratched) {
        alert("Still nothing found (no email, phone, or social) — lead deleted.");
      }
      router.refresh();
    } finally {
      setSearchingId(null);
    }
  }

  async function deleteIds(ids: string[]) {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} lead${ids.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setSelected(new Set());
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (!leads.length) {
    return <p className="text-gray-500 text-sm">Nothing here — every lead has an email or phone on file.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => deleteIds(Array.from(selected))}
          disabled={selected.size === 0 || deleting}
          className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded px-3 py-1.5 text-sm transition-colors"
        >
          Delete Selected ({selected.size})
        </button>
        <button
          onClick={() => deleteIds(leads.map((l) => l.id))}
          disabled={deleting}
          className="bg-red-900 hover:bg-red-800 disabled:opacity-40 rounded px-3 py-1.5 text-sm transition-colors"
        >
          Delete All ({leads.length})
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 pr-4 font-normal w-8">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            </th>
            <th className="text-left py-2 pr-4 font-normal">Business</th>
            <th className="text-left py-2 pr-4 font-normal">City</th>
            <th className="text-left py-2 pr-4 font-normal">Niche</th>
            <th className="text-left py-2 pr-4 font-normal">Email</th>
            <th className="text-left py-2 pr-4 font-normal">Phone</th>
            <th className="text-left py-2 pr-4 font-normal">Facebook</th>
            <th className="text-left py-2 pr-4 font-normal">Instagram</th>
            <th className="text-left py-2 pr-4 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-900 hover:bg-gray-900 transition-colors">
              <td className="py-2 pr-4">
                <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} />
              </td>
              <td className="py-2 pr-4">
                <Link href={`/leads/${lead.id}`} className="hover:text-white">
                  {lead.business_name}
                </Link>
              </td>
              <td className="py-2 pr-4 text-gray-400">{lead.city}</td>
              <td className="py-2 pr-4 text-gray-400">{lead.niche}</td>
              <td className="py-2 pr-4 text-gray-400">{lead.email ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-400">{lead.phone ?? "—"}</td>
              <td className="py-2 pr-4 text-gray-400">
                {lead.facebook_url ? (
                  <a href={safeHref(lead.facebook_url)} target="_blank" rel="noreferrer" className="hover:text-white underline">
                    Open
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-4 text-gray-400">
                {lead.instagram_url ? (
                  <a href={safeHref(lead.instagram_url)} target="_blank" rel="noreferrer" className="hover:text-white underline">
                    Open
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-4 flex items-center gap-2">
                <button
                  onClick={() => searchAgain(lead.id)}
                  disabled={searchingId === lead.id}
                  className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded px-3 py-1 text-xs transition-colors"
                >
                  {searchingId === lead.id ? "Searching..." : "Search Again"}
                </button>
                <button
                  onClick={() => deleteIds([lead.id])}
                  disabled={deleting}
                  className="bg-gray-800 hover:bg-red-900 disabled:opacity-40 rounded px-3 py-1 text-xs transition-colors"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

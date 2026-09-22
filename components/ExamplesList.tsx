"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReferenceExample } from "@/lib/types";
import { safeHref } from "@/lib/safeHref";

export function ExamplesList({ examples }: { examples: ReferenceExample[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function add() {
    if (!url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), note: note.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to add");
        return;
      }
      setUrl("");
      setNote("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/examples/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm flex-1"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's good about it (optional)"
          className="bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm flex-1"
        />
        <button
          onClick={add}
          disabled={saving || !url.trim()}
          className="bg-white text-gray-950 rounded px-4 py-1.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition-colors"
        >
          {saving ? "Adding..." : "Add"}
        </button>
      </div>

      {!examples.length ? (
        <p className="text-gray-500 text-sm">
          No examples yet — add a competitor or reference site here to pull up live during calls.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {examples.map((ex) => (
            <div key={ex.id} className="bg-gray-900 rounded p-3 flex items-center justify-between gap-4">
              <div>
                <a href={safeHref(ex.url)} target="_blank" rel="noreferrer" className="font-medium hover:underline text-blue-400">
                  {ex.url}
                </a>
                {ex.note && <p className="text-gray-500 text-xs mt-1">{ex.note}</p>}
              </div>
              <button
                onClick={() => remove(ex.id)}
                disabled={busyId === ex.id}
                className="bg-gray-800 hover:bg-red-900 disabled:opacity-40 rounded px-3 py-1 text-xs transition-colors flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

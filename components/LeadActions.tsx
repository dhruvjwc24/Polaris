"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "enrich" | "mockup" | "video" | "send";

const ACTIONS: { action: Action; label: string }[] = [
  { action: "enrich", label: "Enrich" },
  { action: "mockup", label: "Build Mockup" },
  { action: "video", label: "Generate Video" },
  { action: "send", label: "Send Outreach" },
];

export function LeadActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [feedback, setFeedback] = useState<{ action: Action; ok: boolean; message: string } | null>(null);

  async function run(action: Action) {
    setLoading(action);
    setFeedback(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ action, ok: false, message: data.error ?? `${action} failed` });
      } else {
        setFeedback({ action, ok: true, message: `${action} complete` });
        router.refresh();
      }
    } catch {
      setFeedback({ action, ok: false, message: "Network error" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex gap-3 flex-wrap mb-3">
        {ACTIONS.map(({ action, label }) => (
          <button
            key={action}
            onClick={() => run(action)}
            disabled={loading !== null}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded px-3 py-1.5 text-sm transition-colors"
          >
            {loading === action ? (
              <span className="flex items-center gap-1.5">
                <span className="animate-pulse">·</span> Running...
              </span>
            ) : (
              label
            )}
          </button>
        ))}
      </div>
      {feedback && (
        <p className={`text-sm ${feedback.ok ? "text-green-400" : "text-red-400"}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}

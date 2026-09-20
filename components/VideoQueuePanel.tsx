"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface QueueItem {
  id: string;
  leadId: string;
  businessName: string;
  status: "queued" | "processing";
  etaSeconds: number;
}

interface QueueStatus {
  workerOnline: boolean;
  items: QueueItem[];
}

const POLL_MS = 5000;

function formatEta(seconds: number): string {
  if (seconds <= 0) return "any moment";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function VideoQueuePanel() {
  const [status, setStatus] = useState<QueueStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/video-queue");
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        // network hiccup — next poll will retry
      }
    }

    poll();
    const pollId = setInterval(poll, POLL_MS);

    // Between polls, tick every queued item's displayed ETA down by a second
    // so it doesn't sit frozen; the next poll resyncs it to the real value.
    const tickId = setInterval(() => {
      setStatus((prev) =>
        prev
          ? { ...prev, items: prev.items.map((item) => ({ ...item, etaSeconds: Math.max(item.etaSeconds - 1, 0) })) }
          : prev
      );
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, []);

  if (!status || status.items.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Video Queue</h2>
        <span className={`w-2 h-2 rounded-full ${status.workerOnline ? "bg-green-400" : "bg-gray-500"}`} />
        <span className="text-xs text-gray-500">{status.workerOnline ? "Worker online" : "Worker offline"}</span>
      </div>
      <div className="flex flex-col gap-2">
        {status.items.map((item, i) => (
          <div key={item.id} className="bg-gray-900 rounded p-3 flex items-center justify-between gap-4">
            <div>
              <Link href={`/leads/${item.leadId}`} className="font-medium hover:underline">
                {item.businessName}
              </Link>
              <span className="text-gray-500 text-xs ml-2">
                {item.status === "processing" ? "Recording now" : `Queued — #${i + 1}`}
              </span>
            </div>
            <span className="text-xs text-gray-400">~{formatEta(item.etaSeconds)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

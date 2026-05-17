"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunPipelineButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="bg-white text-gray-950 rounded px-4 py-1.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
    >
      {loading ? "Running..." : "Run Pipeline"}
    </button>
  );
}

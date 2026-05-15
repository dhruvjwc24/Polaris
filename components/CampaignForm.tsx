"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CampaignForm() {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [autoDiscover, setAutoDiscover] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niche, city, autoDiscover }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create campaign");
      return;
    }

    router.push(`/campaigns/${data.campaign.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Niche</label>
        <input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. cosmetic dentists"
          required
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">City</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. West Austin"
          required
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={autoDiscover}
          onChange={(e) => setAutoDiscover(e.target.checked)}
          className="rounded"
        />
        Auto-discover leads via Google Maps
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-white text-gray-950 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creating..." : "Create Campaign"}
      </button>
    </form>
  );
}

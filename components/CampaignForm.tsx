"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StateSelect } from "./StateSelect";
import { CitySelect } from "./CitySelect";

export function CampaignForm() {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = niche.trim() && stateAbbr && cities.length > 0;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niche: niche.trim(), state: stateAbbr, cities }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Niche</label>
        <input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. roofers, plumbers, landscapers"
          required
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">State</label>
        <StateSelect value={stateAbbr} onChange={(abbr) => { setStateAbbr(abbr); setCities([]); }} />
      </div>

      {stateAbbr && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Cities <span className="text-gray-600">(one or more)</span>
          </label>
          <CitySelect stateAbbr={stateAbbr} value={cities} onChange={setCities} />
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="bg-white text-gray-950 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition-colors"
      >
        {loading ? "Finding leads..." : "Create Campaign"}
      </button>

      {!canSubmit && niche && stateAbbr && cities.length === 0 && (
        <p className="text-gray-600 text-xs -mt-3">Add at least one city to continue</p>
      )}
    </form>
  );
}

import fs from "fs";
import path from "path";

// Monthly cap on web-search queries (Tavily/Brave) used to find lead emails.
// Tavily's free plan is 1,000 credits/month; nothing counted them before
// 2026-10-02, so a busy discovery day could silently run past the free tier.
// Stops at WEB_SEARCH_MONTHLY_LIMIT (default 900, leaving headroom under 1,000).
// Local counter file, same convention as placesBudget.ts.

const FILE = path.join(process.cwd(), ".search-usage.json");

interface Usage {
  month: string;
  count: number;
}

function load(): Usage {
  const month = new Date().toISOString().slice(0, 7);
  try {
    const u = JSON.parse(fs.readFileSync(FILE, "utf8")) as Usage;
    return u.month === month ? u : { month, count: 0 };
  } catch {
    return { month, count: 0 };
  }
}

// Returns false (and does not count) once the monthly limit is reached.
export function reserveWebSearch(): boolean {
  const limitRaw = Number(process.env.WEB_SEARCH_MONTHLY_LIMIT ?? 900);
  const limit = Number.isFinite(limitRaw) && limitRaw >= 0 ? limitRaw : 900;
  const u = load();
  if (u.count >= limit) {
    console.warn(`[search budget] monthly web-search limit reached (${u.count}/${limit}); skipping search.`);
    return false;
  }
  u.count += 1;
  try {
    fs.writeFileSync(FILE, JSON.stringify(u));
  } catch {
    return false; // cannot persist the counter -> cannot trust the cap
  }
  return true;
}

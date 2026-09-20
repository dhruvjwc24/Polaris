export type WebsiteAgeStatus = "outdated" | "modern" | "unknown";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const OLD_DOMAIN_YEARS = 6; // the domain's history needs to go back at least this far
const STALE_YEARS = 3; // and nothing on it has visibly changed in at least this long

function parseWaybackTimestamp(ts: string): Date {
  // Wayback CDX timestamps are "yyyyMMddHHmmss"
  return new Date(Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8)));
}

// Estimates whether a business's existing website is a stale relic (worth
// pitching a rebuild) or actively maintained (not a fit — they already have
// what we're selling) using the Internet Archive's free CDX API, no key
// required. matchType=domain scopes the history to the whole site rather than
// one exact URL, since a Places API website field and what's actually
// archived don't always match path-for-path. collapse=digest keeps only the
// crawls where content actually changed, so the timestamp of the last kept
// row is effectively "the last time anything on this domain visibly changed."
export async function classifyWebsiteAge(url: string): Promise<WebsiteAgeStatus> {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return "unknown";
  }

  try {
    const base = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(hostname)}&matchType=domain&output=json&filter=statuscode:200`;

    // Two small, targeted queries instead of one big one: a high-volume
    // domain can have far more than any reasonable row limit's worth of
    // history, and a positive limit returns from the START (oldest first) —
    // pulling "the last row" out of a truncated ascending list silently
    // returns an old row, not the actual most recent one. limit=1 (earliest)
    // and limit=-1 (latest, after collapsing to real content changes) each
    // fetch a single row regardless of the domain's total crawl volume.
    const [firstRes, lastRes] = await Promise.all([
      fetch(`${base}&fl=timestamp&limit=1`, { signal: AbortSignal.timeout(8000) }),
      fetch(`${base}&fl=timestamp,digest&collapse=digest&limit=-1`, { signal: AbortSignal.timeout(8000) }),
    ]);
    if (!firstRes.ok || !lastRes.ok) return "unknown";

    const [firstRows, lastRows]: [string[][], string[][]] = await Promise.all([
      firstRes.json().catch(() => []),
      lastRes.json().catch(() => []),
    ]);
    if (firstRows.length < 2 || lastRows.length < 2) return "unknown"; // just headers, or nothing archived

    const first = parseWaybackTimestamp(firstRows[1][0]);
    const last = parseWaybackTimestamp(lastRows[1][0]);
    const now = new Date();

    const domainAgeYears = (now.getTime() - first.getTime()) / MS_PER_YEAR;
    const yearsSinceLastChange = (now.getTime() - last.getTime()) / MS_PER_YEAR;

    if (domainAgeYears >= OLD_DOMAIN_YEARS && yearsSinceLastChange >= STALE_YEARS) {
      return "outdated";
    }
    return "modern";
  } catch {
    return "unknown";
  }
}

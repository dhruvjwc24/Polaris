import fs from "fs";
import path from "path";

// Remembers businesses discovery already paid to check and found to HAVE a
// website, so re-running the same city/niche (or a different niche that
// returns the same business) never pays for that Details call again.
// ~88% of candidates have a website (2026-09 data), so this is where repeat
// spend used to go. Local file, same convention as placesBudget.ts.
// Entries expire after 60 days since a business can add a website later.

const SEEN_FILE = path.join(process.cwd(), ".places-seen.json");
const TTL_MS = 60 * 24 * 60 * 60 * 1000;

type SeenMap = Record<string, number>; // place_id -> epoch ms checked

function load(): SeenMap {
  try {
    return JSON.parse(fs.readFileSync(SEEN_FILE, "utf8")) as SeenMap;
  } catch {
    return {};
  }
}

export function hasWebsiteCached(placeId: string): boolean {
  const t = load()[placeId];
  return typeof t === "number" && Date.now() - t < TTL_MS;
}

function mark(key: string): void {
  const m = load();
  const now = Date.now();
  for (const k of Object.keys(m)) if (now - m[k] >= TTL_MS) delete m[k];
  m[key] = now;
  try {
    fs.writeFileSync(SEEN_FILE, JSON.stringify(m));
  } catch {
    // Cache only; failing to write just means a repeat check later.
  }
}

export function markHasWebsite(placeId: string): void {
  mark(placeId);
}

// A no-website business we searched for an email and could not find one for.
// Cached under a prefixed key so discovery never re-pays for it (Google light
// Details + a web search) for 60 days.
export function noEmailCached(placeId: string): boolean {
  return hasWebsiteCached(`noemail:${placeId}`);
}

export function markNoEmail(placeId: string): void {
  mark(`noemail:${placeId}`);
}

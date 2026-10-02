import fs from "fs";
import path from "path";

// Hard in-app spending cap for Google Places. Added 2026-10-01 after a $34.10
// September bill: ~4,150 Place Details calls (reviews/rating + contact fields)
// and ~2,100 photo fetches, almost all on 2026-09-30. Google budgets only send
// alerts, so this is the first of two defense lines (the second is a daily
// quota set on the Places API in the Google Cloud console).
//
// EVERY Places request in this repo must go through placesFetch(). It checks
// a monthly and a daily dollar ceiling BEFORE the request leaves the machine,
// and records an estimated cost after.

export type PlacesCallKind = "text" | "detailsLight" | "detailsFull" | "photo";

// Estimated USD per call, rounded up from the 2026-09 invoice (Atmosphere
// $3.80/1k + Contact $2.28/1k per full Details call, Photo $3.71/1k) and
// Google's list price for Text Search ($32/1k).
const COST_USD: Record<PlacesCallKind, number> = {
  text: 0.032,
  detailsLight: 0.003, // website + phone only (Contact data)
  detailsFull: 0.008, // adds rating/reviews/hours/photos (Atmosphere data)
  photo: 0.004,
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Hard stop at $8/month (leaves $2 of headroom under Cyril's $10 ceiling for
// estimate error) and $1.50/day (so one runaway day cannot be the whole month).
const monthlyLimit = () => envNumber("PLACES_MONTHLY_BUDGET_USD", 8);
const dailyLimit = () => envNumber("PLACES_DAILY_BUDGET_USD", 1.5);

const USAGE_FILE = path.join(process.cwd(), ".places-usage.json");

interface Usage {
  month: string; // YYYY-MM
  monthUsd: number;
  day: string; // YYYY-MM-DD
  dayUsd: number;
  counts: Record<string, number>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): Usage {
  const day = today();
  const month = day.slice(0, 7);
  const fresh: Usage = { month, monthUsd: 0, day, dayUsd: 0, counts: {} };
  try {
    const u = JSON.parse(fs.readFileSync(USAGE_FILE, "utf8")) as Usage;
    if (u.month !== month) return fresh;
    if (u.day !== day) return { ...u, day, dayUsd: 0 };
    return u;
  } catch {
    return fresh;
  }
}

function save(u: Usage): void {
  try {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(u, null, 2));
  } catch (err) {
    // Never silently lose the guard: if the counter cannot be persisted, the
    // cap cannot be trusted, so treat it as a hard failure.
    throw new Error(`placesBudget: cannot write ${USAGE_FILE}: ${(err as Error).message}`);
  }
}

export class PlacesBudgetExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacesBudgetExceeded";
  }
}

export function placesUsageSummary(): { monthUsd: number; dayUsd: number; monthlyLimit: number; dailyLimit: number } {
  const u = load();
  return { monthUsd: u.monthUsd, dayUsd: u.dayUsd, monthlyLimit: monthlyLimit(), dailyLimit: dailyLimit() };
}

// Reserve budget for one call, or throw. Reserving happens before the network
// request so a crash or error response still counts (Google bills many failed
// calls too).
export function reservePlacesCall(kind: PlacesCallKind): void {
  if (process.env.PLACES_DISABLED === "true") {
    throw new PlacesBudgetExceeded("Places API disabled (PLACES_DISABLED=true)");
  }
  const u = load();
  const cost = COST_USD[kind];
  if (u.monthUsd + cost > monthlyLimit()) {
    throw new PlacesBudgetExceeded(
      `Places monthly budget reached ($${u.monthUsd.toFixed(2)} of $${monthlyLimit()}). Skipping ${kind} call.`
    );
  }
  if (u.dayUsd + cost > dailyLimit()) {
    throw new PlacesBudgetExceeded(
      `Places daily budget reached ($${u.dayUsd.toFixed(2)} of $${dailyLimit()}). Skipping ${kind} call.`
    );
  }
  u.monthUsd += cost;
  u.dayUsd += cost;
  u.counts[kind] = (u.counts[kind] ?? 0) + 1;
  save(u);
}

// The only way code in this repo should call Google Places.
export async function placesFetch(
  kind: PlacesCallKind,
  url: string,
  init?: RequestInit
): Promise<Response> {
  reservePlacesCall(kind);
  return fetch(url, init);
}

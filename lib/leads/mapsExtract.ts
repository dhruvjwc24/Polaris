/**
 * Extracts business details from a pasted Google Maps link, for the manual
 * "Create" flow (cold-call sourced leads). Resolves short links, pulls the
 * business name out of the URL, then re-uses the Places API the same way
 * the automated discovery flow does.
 */

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

interface PlacePhoto {
  photo_reference: string;
}

interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  user_ratings_total?: number;
  rating?: number;
  photos?: PlacePhoto[];
  reviews?: PlaceReview[];
  opening_hours?: { weekday_text?: string[] };
}

export interface ExtractedBusiness {
  businessName: string;
  phone: string | null;
  websiteUrl: string | null;
  location: string | null;
  city: string | null;
  rating: number | null;
  reviewCount: number | null;
  businessHours: string[] | null;
  reviewSnippets: { author: string; rating: number; text: string; time_desc: string }[] | null;
  photoRefs: string[] | null;
  googleMapsId: string | null;
}

// Best-effort city parse from a US-style "..., City, ST 12345" formatted address.
function parseCity(formattedAddress: string): string | null {
  const match = formattedAddress.match(/,\s*([^,]+),\s*[A-Z]{2}\s*\d{5}/);
  return match ? match[1].trim() : null;
}

// Only Google-owned hosts are legitimate for a Maps link (share links, short
// links, and the canonical maps.google.com). Anything else is rejected before
// a request is ever made, since this URL comes straight from a form field and
// following arbitrary redirects server-side is an SSRF vector.
const ALLOWED_MAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
]);

function isAllowedMapsUrl(rawUrl: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!ALLOWED_MAPS_HOSTS.has(parsed.hostname)) return null;
  return parsed;
}

// Follows redirects manually, re-validating the hostname of every hop against
// the same allowlist, instead of letting fetch's redirect:"follow" chase an
// attacker-controlled Location header to an internal address.
async function resolveFinalUrl(mapsUrl: string): Promise<string> {
  let current = isAllowedMapsUrl(mapsUrl);
  if (!current) return mapsUrl;

  for (let hop = 0; hop < 3; hop++) {
    try {
      const res = await fetch(current.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        const next = isAllowedMapsUrl(new URL(location, current).toString());
        if (!next) return current.toString();
        current = next;
        continue;
      }
      return current.toString();
    } catch {
      return current.toString();
    }
  }
  return current.toString();
}

function parseNameAndLatLng(url: string): { name: string | null; lat: string | null; lng: string | null } {
  const nameMatch = url.match(/\/maps\/place\/([^/@]+)/);
  const name = nameMatch ? decodeURIComponent(nameMatch[1]).replace(/\+/g, " ") : null;

  const latLngMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return {
    name,
    lat: latLngMatch ? latLngMatch[1] : null,
    lng: latLngMatch ? latLngMatch[2] : null,
  };
}

// findplacefromtext requires a billing tier that isn't enabled on this
// project; textsearch is the same endpoint the automated discovery flow
// already uses successfully, so reuse it here instead.
async function findPlaceId(name: string, lat: string | null, lng: string | null, key: string): Promise<string | null> {
  const params = new URLSearchParams({ query: name, key });
  if (lat && lng) params.set("location", `${lat},${lng}`);

  const res = await fetch(`${PLACES_API_BASE}/textsearch/json?${params}`);
  const data = await res.json();
  return data.results?.[0]?.place_id ?? null;
}

async function getPlaceDetails(placeId: string, key: string): Promise<PlaceResult | null> {
  const fields =
    "place_id,name,formatted_address,formatted_phone_number,website,user_ratings_total,rating,photos,reviews,opening_hours";
  const res = await fetch(
    `${PLACES_API_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${key}`
  );
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.result;
}

export async function extractFromMapsUrl(mapsUrl: string): Promise<ExtractedBusiness | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;

  const finalUrl = await resolveFinalUrl(mapsUrl);
  const { name, lat, lng } = parseNameAndLatLng(finalUrl);
  if (!name) return null;

  const placeId = await findPlaceId(name, lat, lng, key);
  if (!placeId) return null;

  const detail = await getPlaceDetails(placeId, key);
  if (!detail) return null;

  return {
    businessName: detail.name,
    phone: detail.formatted_phone_number ?? null,
    websiteUrl: detail.website ?? null,
    location: detail.formatted_address ?? null,
    city: parseCity(detail.formatted_address ?? ""),
    rating: detail.rating ?? null,
    reviewCount: detail.user_ratings_total ?? null,
    businessHours: detail.opening_hours?.weekday_text ?? null,
    reviewSnippets:
      detail.reviews
        ?.filter((r) => r.rating >= 4 && r.text.trim().length > 20)
        .slice(0, 5)
        .map((r) => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text.trim(),
          time_desc: r.relative_time_description,
        })) ?? null,
    photoRefs: detail.photos?.slice(0, 10).map((p) => p.photo_reference) ?? null,
    googleMapsId: detail.place_id,
  };
}

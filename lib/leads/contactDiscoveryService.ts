/**
 * Contact Discovery Service
 *
 * For each lead that comes in from Google Maps with only a name + phone,
 * this service searches for a way to reach them in priority order:
 *
 *   1. Email  — scraped from their website, then Brave/Tavily web search
 *   2. Social — Facebook page, Instagram profile (scrape + web search + FB API)
 *   3. Last resort — if the lead still has neither email nor phone after all
 *      of the above (rare — Google Places almost always returns a phone), a
 *      broader combined web search for either, before giving up and flagging
 *      it for Cyril to review manually.
 *
 * Run this BEFORE enrichment so the pipeline can send outreach automatically.
 *
 * Required env vars:
 *   BRAVE_SEARCH_API_KEY   — free at https://api.search.brave.com (2,000 queries/month free)
 *   META_APP_ACCESS_TOKEN  — App-level token from developers.facebook.com (no user auth needed)
 */

import { db } from "@/lib/db/supabase";

// Supports Tavily (free, 1k/month), Brave ($5/month), or Bing ($, needs card).
// Set whichever key you have — Tavily is checked first.
const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY ?? "";
const META_APP_TOKEN = process.env.META_APP_ACCESS_TOKEN ?? "";
const GRAPH_API = "https://graph.facebook.com/v21.0";

// ── Regex patterns ────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const FACEBOOK_RE =
  /https?:\/\/(www\.)?facebook\.com\/(?!sharer|share|login|dialog|photo|watch|hashtag|groups\/)[a-zA-Z0-9._/\-]+/g;
const INSTAGRAM_RE = /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?/g;
const LINKEDIN_RE =
  /https?:\/\/(www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._\-]+\/?/g;

// Emails that are clearly not business contacts
const JUNK_EMAIL_PATTERNS = [
  "example.com", "sentry.io", "wix.com", "wordpress.com",
  "squarespace.com", "godaddy.com", "@2x", ".png", ".jpg", ".gif", ".svg",
];

function isRealEmail(email: string): boolean {
  return !JUNK_EMAIL_PATTERNS.some((pattern) => email.includes(pattern));
}

// ── Website scraping ──────────────────────────────────────────────────────────

interface ScrapedContacts {
  emails: string[];
  phones: string[];
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
}

async function scrapeWebsite(url: string): Promise<ScrapedContacts> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { emails: [], phones: [], facebook: null, instagram: null, linkedin: null };

    const html = await res.text();

    const emails = [...new Set(html.match(EMAIL_RE) ?? [])].filter(isRealEmail);
    const phones = [...new Set(html.match(PHONE_RE) ?? [])];
    const fbMatches = html.match(FACEBOOK_RE) ?? [];
    const igMatches = html.match(INSTAGRAM_RE) ?? [];
    const liMatches = html.match(LINKEDIN_RE) ?? [];

    return {
      emails,
      phones,
      facebook: fbMatches[0] ?? null,
      instagram: igMatches[0] ?? null,
      linkedin: liMatches[0] ?? null,
    };
  } catch {
    return { emails: [], phones: [], facebook: null, instagram: null, linkedin: null };
  }
}

// ── Web Search (Tavily → Brave fallback) ─────────────────────────────────────
// Tavily: free 1,000/month at tavily.com — no credit card required.
// Brave:  $5/month at api.search.brave.com — fallback if you prefer it.

async function webSearch(query: string): Promise<string[]> {
  if (TAVILY_API_KEY) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          max_results: 5,
          search_depth: "basic",
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      return (data.results ?? []).map(
        (item: { url: string }) => item.url
      ) as string[];
    } catch {
      return [];
    }
  }

  if (BRAVE_API_KEY) {
    try {
      const params = new URLSearchParams({ q: query, count: "5" });
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?${params}`,
        {
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": BRAVE_API_KEY,
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      const data = await res.json();
      return (data.web?.results ?? []).map(
        (item: { url: string }) => item.url
      ) as string[];
    } catch {
      return [];
    }
  }

  return [];
}

async function findEmailViaSearch(
  businessName: string,
  city: string
): Promise<string | null> {
  const links = await webSearch(`"${businessName}" "${city}" email contact`);
  for (const link of links.slice(0, 3)) {
    const { emails } = await scrapeWebsite(link);
    if (emails.length) return emails[0];
  }
  return null;
}

async function findSocialViaSearch(
  businessName: string,
  city: string
): Promise<{ facebook: string | null; instagram: string | null }> {
  const [fbLinks, igLinks] = await Promise.all([
    webSearch(`"${businessName}" "${city}" site:facebook.com`),
    webSearch(`"${businessName}" "${city}" site:instagram.com`),
  ]);
  return {
    facebook: fbLinks[0] ?? null,
    instagram: igLinks[0] ?? null,
  };
}

// Last resort when a lead still has neither email nor phone after every other
// step — rare, since Google Places almost always returns a phone. One
// broader search covering both, instead of the narrower email-only query
// above. Callable again later (e.g. a "search again" action on a flagged
// lead) since it's just a normal function, not a one-shot pipeline step.
async function findContactViaBroadSearch(
  businessName: string,
  city: string
): Promise<{ email: string | null; phone: string | null }> {
  const links = await webSearch(`"${businessName}" "${city}" phone number email contact`);
  for (const link of links.slice(0, 3)) {
    const { emails, phones } = await scrapeWebsite(link);
    if (emails.length || phones.length) {
      return { email: emails[0] ?? null, phone: phones[0] ?? null };
    }
  }
  return { email: null, phone: null };
}

// ── Facebook Pages API ────────────────────────────────────────────────────────

async function searchFacebookPages(businessName: string): Promise<string | null> {
  if (!META_APP_TOKEN) return null;
  try {
    const params = new URLSearchParams({
      q: businessName,
      fields: "id,name,link",
      limit: "1",
      access_token: META_APP_TOKEN,
    });
    const res = await fetch(`${GRAPH_API}/pages/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return (data.data?.[0]?.link as string) ?? null;
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function discoverContacts(leadIds: string[]): Promise<void> {
  const { data: leads, error } = await db
    .from("leads")
    .select(
      "id, business_name, city, website_url, email, phone, facebook_url, instagram_url, needs_contact_review"
    )
    .in("id", leadIds);

  if (error || !leads?.length) return;

  for (const lead of leads) {
    const update: Record<string, string | boolean | null> = {};

    // ── Priority 1: Email ────────────────────────────────────────────────

    if (!lead.email) {
      // 1a. Scrape own website first (free, fast)
      if (lead.website_url) {
        const scraped = await scrapeWebsite(lead.website_url);
        if (scraped.emails.length) update.email = scraped.emails[0];
        // Collect social while we're on their site
        if (!lead.facebook_url && scraped.facebook) update.facebook_url = scraped.facebook;
        if (!lead.instagram_url && scraped.instagram) update.instagram_url = scraped.instagram;
        if (scraped.linkedin) update.linkedin_url = scraped.linkedin;
      }

      // 1b. Web search for email if scraping didn't find one
      if (!update.email) {
        const emailFromSearch = await findEmailViaSearch(lead.business_name, lead.city);
        if (emailFromSearch) update.email = emailFromSearch;
      }
    }

    // ── Priority 2: Social media ─────────────────────────────────────────

    const missingFacebook = !lead.facebook_url && !update.facebook_url;
    const missingInstagram = !lead.instagram_url && !update.instagram_url;

    if (missingFacebook || missingInstagram) {
      // 2a. Google search for social profiles
      const fromSearch = await findSocialViaSearch(lead.business_name, lead.city);
      if (missingFacebook && fromSearch.facebook) update.facebook_url = fromSearch.facebook;
      if (missingInstagram && fromSearch.instagram) update.instagram_url = fromSearch.instagram;

      // 2b. Facebook Pages API (more reliable than Google search for FB pages)
      if (!update.facebook_url) {
        const fbFromApi = await searchFacebookPages(lead.business_name);
        if (fbFromApi) update.facebook_url = fbFromApi;
      }
    }

    // ── Last resort: still no email AND no phone at all ───────────────────
    // Google Places almost always returns a phone, so reaching this point is
    // rare. One broader combined search before giving up; if it still finds
    // nothing, flag for Cyril to review/delete manually instead of silently
    // dropping the lead.

    const stillHasEmail = Boolean(lead.email || update.email);
    const stillHasPhone = Boolean(lead.phone);

    if (!stillHasEmail && !stillHasPhone) {
      const found = await findContactViaBroadSearch(lead.business_name, lead.city);
      if (found.email) update.email = found.email;
      if (found.phone) update.phone = found.phone;
    }

    // Resolve the flag off final state, not just the broad-search branch above —
    // an earlier tier (e.g. the plain email search) can also be what clears a
    // stale true flag on a re-check, and that must count too. Only write it
    // when it actually changes, so a lead with nothing new doesn't get an
    // update call just for this.
    const nowHasEmail = Boolean(lead.email || update.email);
    const nowHasPhone = Boolean(lead.phone || update.phone);
    const shouldReview = !nowHasEmail && !nowHasPhone;
    if (shouldReview !== lead.needs_contact_review) update.needs_contact_review = shouldReview;

    if (Object.keys(update).length) {
      await db.from("leads").update(update).eq("id", lead.id);
    }
  }
}

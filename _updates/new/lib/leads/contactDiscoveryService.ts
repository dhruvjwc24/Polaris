/**
 * Contact Discovery Service
 *
 * For each lead that comes in from Google Maps with only a name + phone,
 * this service searches for a way to reach them in priority order:
 *
 *   1. Email  — scraped from their website, then Brave web search
 *   2. Social — Facebook page, Instagram profile (scrape + Brave search + FB API)
 *   3. Phone  — already guaranteed from Google Maps; queued for SMS (stub)
 *
 * Run this BEFORE enrichment so the pipeline can send outreach automatically.
 *
 * Required env vars:
 *   BRAVE_SEARCH_API_KEY   — free at https://api.search.brave.com (2,000 queries/month free)
 *   META_APP_ACCESS_TOKEN  — App-level token from developers.facebook.com (no user auth needed)
 *
 * SMS env vars (message template to be configured separately):
 *   SMS_MESSAGE_TEMPLATE   — message body template, e.g. "Hey {name}, I built you a site mockup..."
 *   TWILIO_ACCOUNT_SID     — from twilio.com/console
 *   TWILIO_AUTH_TOKEN      — from twilio.com/console
 *   TWILIO_FROM_NUMBER     — your Twilio phone number e.g. +15005550006
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
    if (!res.ok) return { emails: [], facebook: null, instagram: null, linkedin: null };

    const html = await res.text();

    const emails = [...new Set(html.match(EMAIL_RE) ?? [])].filter(isRealEmail);
    const fbMatches = html.match(FACEBOOK_RE) ?? [];
    const igMatches = html.match(INSTAGRAM_RE) ?? [];
    const liMatches = html.match(LINKEDIN_RE) ?? [];

    return {
      emails,
      facebook: fbMatches[0] ?? null,
      instagram: igMatches[0] ?? null,
      linkedin: liMatches[0] ?? null,
    };
  } catch {
    return { emails: [], facebook: null, instagram: null, linkedin: null };
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

// ── SMS stub ──────────────────────────────────────────────────────────────────
// Message template will be provided separately via SMS_MESSAGE_TEMPLATE env var.
// Sending will use Twilio once TWILIO_* credentials are configured.

async function queueSmsOutreach(leadId: string, phone: string): Promise<void> {
  // Mark lead so the pipeline knows SMS is the outreach path
  await db.from("leads").update({ sms_queued: true }).eq("id", leadId);
  console.log(`[SMS QUEUED] Lead ${leadId} → ${phone}`);

  // TODO: Uncomment and configure once SMS_MESSAGE_TEMPLATE is provided
  // const template = process.env.SMS_MESSAGE_TEMPLATE ?? "";
  // const { data: lead } = await db.from("leads").select("business_name").eq("id", leadId).single();
  // const body = template.replace("{name}", lead?.business_name ?? "there");
  // await sendViaTwilio(phone, body);
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function discoverContacts(leadIds: string[]): Promise<void> {
  const { data: leads, error } = await db
    .from("leads")
    .select(
      "id, business_name, city, website_url, email, phone, facebook_url, instagram_url"
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

    // ── Priority 3: Phone → SMS queue (last resort) ───────────────────────
    // Phone is almost always present from Google Maps.
    // Queue SMS only if we found no email and no social media at all.

    const hasEmail = lead.email || update.email;
    const hasSocial = update.facebook_url || update.instagram_url ||
                      lead.facebook_url || lead.instagram_url;

    if (!hasEmail && !hasSocial && lead.phone) {
      await queueSmsOutreach(lead.id, lead.phone);
      // sms_queued is written inside queueSmsOutreach — skip adding to update
    }

    if (Object.keys(update).length) {
      await db.from("leads").update(update).eq("id", lead.id);
    }
  }
}

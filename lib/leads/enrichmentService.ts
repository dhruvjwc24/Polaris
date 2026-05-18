import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/supabase";
import type { Lead } from "@/lib/types";

const client = new Anthropic();
const BUCKET = "pictures";
const PLACES_PHOTO_BASE = "https://maps.googleapis.com/maps/api/place/photo";

interface EnrichmentResult {
  diagnosis: string;
  outreach_angle: string;
  gap_analysis: string;
  site_brief: string;
  cold_message: string;
  site_structure: {
    headline: string;
    tagline: string;
    services: { name: string; desc: string }[];
    about: string;
    cta: string;
  };
}

function buildPrompt(leads: Lead[]): string {
  const list = leads
    .map(
      (l, i) =>
        `${i + 1}. Business: ${l.business_name} | Niche: ${l.niche} | City: ${l.city} | ` +
        `Website: ${l.website_url ?? "none"} | Reviews: ${l.review_count ?? "unknown"} | ` +
        `Rating: ${l.rating ?? "unknown"} | Phone: ${l.phone ?? "unknown"}`
    )
    .join("\n");

  return `You are a senior local marketing strategist. For each business below, return a JSON array where each object has exactly these keys:
- "diagnosis": 50-word max, what is wrong with their online presence and what revenue is leaking
- "outreach_angle": one specific hook I can use based on what I see
- "gap_analysis": the specific gap a new website would close
- "site_brief": 100-word max, hero angle, key services to highlight, tone, CTA, one design differentiator
- "cold_message": under 70 words, opens with a specific observation about THIS business, references their service or location, ends with soft ask to see a mockup. No corporate language, no AI mentions.
- "site_structure": object with exactly these fields:
  - "headline": compelling 6-10 word hero headline for their website (specific to their business and city)
  - "tagline": supporting sub-headline, 10-15 words
  - "services": array of exactly 3 objects, each {"name": "2-4 word service name", "desc": "8-12 word description of that service"}
  - "about": 2-sentence about blurb for this specific business
  - "cta": call-to-action button text, 3-5 words (e.g. "Get Your Free Quote")

Return ONLY a valid JSON array, no markdown, no explanation.

Businesses:
${list}`;
}

// Fetch a single Google Places photo and upload it to Supabase Storage.
// Returns the public URL, or null on failure.
async function uploadPhoto(ref: string, leadId: string, index: number): Promise<string | null> {
  try {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    const url = `${PLACES_PHOTO_BASE}?maxwidth=1200&photoreference=${ref}&key=${key}`;
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `leads/${leadId}/${index}.${ext}`;

    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`[photos] upload failed for lead ${leadId} photo ${index}: ${error.message}`);
      return null;
    }

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error(`[photos] fetch failed for lead ${leadId} photo ${index}:`, err);
    return null;
  }
}

// Upload all photo_refs for a lead to Supabase Storage and save the URLs.
async function storeLeadPhotos(lead: Lead): Promise<void> {
  if (!lead.photo_refs?.length) return;

  const urls: string[] = [];
  const maxPhotos = Math.min(lead.photo_refs.length, 10);
  for (let i = 0; i < maxPhotos; i++) {
    const url = await uploadPhoto(lead.photo_refs[i], lead.id, i);
    if (url) urls.push(url);
  }

  if (!urls.length) return;

  await db.from("leads").update({ photo_urls: urls }).eq("id", lead.id);
  console.log(`[photos] stored ${urls.length} photos for "${lead.business_name}"`);
}

async function findSocialLinks(websiteUrl: string): Promise<{
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
}> {
  const result = { instagram: null as string | null, facebook: null as string | null, linkedin: null as string | null };
  try {
    const res = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    });
    if (!res.ok) return result;
    const html = await res.text();

    const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})(?:\/|\?|"|'|\s)/);
    if (igMatch && !["p", "explore", "reel", "tv", "stories"].includes(igMatch[1])) {
      result.instagram = `https://www.instagram.com/${igMatch[1]}/`;
    }

    const fbMatch = html.match(
      /https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|plugins|dialog|login|pages\/category|photo|video|groups|events|hashtag|watch)([a-zA-Z0-9._-]{3,60})(?:\/|\?|"|'|\s)/
    );
    if (fbMatch) result.facebook = `https://www.facebook.com/${fbMatch[1]}/`;

    const liMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9_-]{1,60})(?:\/|\?|"|'|\s)/);
    if (liMatch) result.linkedin = `https://www.linkedin.com/company/${liMatch[1]}/`;
  } catch {
    // website may block crawlers or be unreachable
  }
  return result;
}

export async function enrichLeads(leadIds: string[], force = false): Promise<boolean> {
  let baseQuery = db.from("leads").select("*").in("id", leadIds);
  if (!force) baseQuery = baseQuery.in("status", ["new"]);
  const { data: leads, error } = await baseQuery;

  if (error || !leads?.length) return false;

  let anySuccess = false;

  // Process in batches of 10
  for (let i = 0; i < leads.length; i += 10) {
    const batch = leads.slice(i, i + 10) as Lead[];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(batch) }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown fences Claude sometimes wraps around JSON
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let results: EnrichmentResult[];
    try {
      results = JSON.parse(stripped);
    } catch {
      console.error("[enrich] JSON parse failed. Raw response:", raw.slice(0, 400));
      continue;
    }

    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (!r) continue;

      await db
        .from("leads")
        .update({
          diagnosis: r.diagnosis,
          outreach_angle: r.outreach_angle,
          gap_analysis: r.gap_analysis,
          site_brief: r.site_brief,
          cold_message: r.cold_message,
          site_structure: r.site_structure ?? null,
          status: "brief_ready",
        })
        .eq("id", batch[j].id);

      // Store photos to Supabase Storage after enrichment text is saved
      await storeLeadPhotos(batch[j]);

      // Scrape social media links from the business website
      if (batch[j].website_url) {
        const socials = await findSocialLinks(batch[j].website_url!);
        const socialUpdate: Record<string, string> = {};
        if (socials.instagram) socialUpdate.instagram_url = socials.instagram;
        if (socials.facebook)  socialUpdate.facebook_url  = socials.facebook;
        if (socials.linkedin)  socialUpdate.linkedin_url  = socials.linkedin;
        if (Object.keys(socialUpdate).length > 0) {
          await db.from("leads").update(socialUpdate).eq("id", batch[j].id);
          console.log(`[socials] found ${Object.keys(socialUpdate).join(", ")} for "${batch[j].business_name}"`);
        }
      }

      anySuccess = true;
    }
  }

  return anySuccess;
}

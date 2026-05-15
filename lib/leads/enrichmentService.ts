import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db/supabase";
import type { Lead } from "@/lib/types";

const client = new Anthropic();

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

export async function enrichLeads(leadIds: string[]): Promise<void> {
  const { data: leads, error } = await db
    .from("leads")
    .select("*")
    .in("id", leadIds)
    .in("status", ["new"]);

  if (error || !leads?.length) return;

  // Process in batches of 10
  for (let i = 0; i < leads.length; i += 10) {
    const batch = leads.slice(i, i + 10);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(batch) }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    let results: EnrichmentResult[];
    try {
      results = JSON.parse(raw);
    } catch {
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
    }
  }
}

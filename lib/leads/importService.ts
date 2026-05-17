import { z } from "zod";
import { db } from "@/lib/db/supabase";
import { scoreLead } from "./scoring";

const LeadRowSchema = z.object({
  business_name: z.string().min(1),
  city: z.string().min(1),
  niche: z.string().min(1),
  website_url: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  location: z.string().optional().nullable(),
  review_count: z.coerce.number().int().nonnegative().optional().nullable(),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  years_established: z.coerce.number().int().nonnegative().optional().nullable(),
});

export type LeadImportRow = z.input<typeof LeadRowSchema>;

export async function importLeads(
  rows: LeadImportRow[],
  campaignId: string | null
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    const parsed = LeadRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`${raw.business_name ?? "unknown"}: ${parsed.error.issues[0].message}`);
      continue;
    }

    const row = parsed.data;
    const score = scoreLead({
      website_url: row.website_url ?? null,
      review_count: row.review_count ?? null,
      rating: row.rating ?? null,
      years_established: row.years_established ?? null,
    });

    const { error } = await db.from("leads").insert({
      campaign_id: campaignId,
      business_name: row.business_name,
      website_url: row.website_url ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      location: row.location ?? null,
      city: row.city,
      niche: row.niche,
      review_count: row.review_count ?? null,
      rating: row.rating ?? null,
      years_established: row.years_established ?? null,
      source: "manual",
      priority_score: score,
    });

    if (error) {
      // Unique constraint on google_maps_id won't apply for manual, but catch other errors
      errors.push(`${row.business_name}: ${error.message}`);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}

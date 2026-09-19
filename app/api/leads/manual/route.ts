import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/supabase";

const ReviewSnippet = z.object({
  author: z.string(),
  rating: z.number(),
  text: z.string(),
  time_desc: z.string().optional().default(""),
});

const Body = z.object({
  businessName: z.string().min(1),
  niche: z.string().min(1),
  city: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  websiteUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  location: z.string().optional(),
  googleMapsId: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  businessHours: z.array(z.string()).optional(),
  reviewSnippets: z.array(ReviewSnippet).optional(),
  photoRefs: z.array(z.string()).optional(),
  photoUrls: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const { data, error } = await db
    .from("leads")
    .insert({
      campaign_id: null,
      business_name: b.businessName,
      niche: b.niche,
      city: b.city,
      phone: b.phone ?? null,
      email: b.email ?? null,
      website_url: b.websiteUrl ?? null,
      facebook_url: b.facebookUrl ?? null,
      instagram_url: b.instagramUrl ?? null,
      linkedin_url: b.linkedinUrl ?? null,
      location: b.location ?? null,
      google_maps_id: b.googleMapsId ?? null,
      rating: b.rating ?? null,
      review_count: b.reviewCount ?? null,
      business_hours: b.businessHours ?? null,
      review_snippets: b.reviewSnippets ?? null,
      photo_refs: b.photoRefs ?? null,
      photo_urls: b.photoUrls ?? null,
      source: "manual",
      manual_outreach_only: true,
      status: "new",
      priority_score: 10,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

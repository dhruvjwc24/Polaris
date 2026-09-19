import { db } from "@/lib/db/supabase";
import type { Lead, SiteStructure, ReviewSnippet } from "@/lib/types";
import { WarmNeighborhoodTemplate, type TemplateData } from "./templates";

export const dynamic = "force-dynamic";

// Cloudinary video URLs keyed by niche bucket.
// Swap in bucket-specific URLs as videos are generated per the video prompt spec.
const NICHE_VIDEOS: Record<string, string> = {
  exterior:  "https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4",
  systems:   "https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4",
  landscape: "https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4",
  cleaning:  "https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4",
  interior:  "https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4",
};

function getNicheVideo(niche: string): string {
  const n = niche.toLowerCase();
  if (/roof|chimney|siding|gutter|fence|mason|concrete|construct/.test(n)) return NICHE_VIDEOS.exterior;
  if (/plumb|hvac|heat|cool|electr|water heater|drain/.test(n))           return NICHE_VIDEOS.systems;
  if (/landscape|lawn|garden|tree|turf|irrigation|mow|hardscape/.test(n)) return NICHE_VIDEOS.landscape;
  if (/clean|pressure|wash|carpet|window clean|junk/.test(n))             return NICHE_VIDEOS.cleaning;
  if (/paint|floor|tile|remodel|interior|carpent/.test(n))                return NICHE_VIDEOS.interior;
  return NICHE_VIDEOS.exterior;
}

export default async function MockupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await db.from("leads").select("*").eq("id", id).maybeSingle();

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#1e1208", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a7060", fontFamily: "system-ui, sans-serif" }}>
        Lead not found
      </div>
    );
  }

  const lead = data as Lead;
  const ss = lead.site_structure as SiteStructure | null;
  const nicheTitle = lead.niche.charAt(0).toUpperCase() + lead.niche.slice(1);

  // Use enrichment data when available; fall back to clean generic copy
  const headline  = ss?.headline  ?? lead.business_name;
  const tagline   = ss?.tagline   ?? `Quality work. Honest pricing. Proudly serving ${lead.city} and surrounding areas.`;
  const cta       = ss?.cta       ?? "Get a Free Estimate";
  const about     = ss?.about     ?? `${lead.business_name} has built its reputation one job at a time — serving ${lead.city} with the kind of craftsmanship and honesty you'd expect from a neighbor, not a corporation.`;
  const services  = ss?.services?.length
    ? ss.services.slice(0, 3)
    : [
        { name: "Expert Workmanship", desc: "Professional results on every job, backed by a satisfaction guarantee." },
        { name: "On-Time, Every Time", desc: "We show up when we say and finish what we start. No exceptions." },
        { name: "Free Estimates",      desc: "Straight talk, transparent pricing, zero hidden fees." },
      ];

  // Photos: prefer stored Supabase URLs, fall back to proxy
  const heroPhoto = lead.photo_urls?.[0]
    ?? (lead.photo_refs?.length ? `/api/leads/${id}/photos/0` : null);
  const galleryPhotos = lead.photo_urls?.slice(0, 5)
    ?? lead.photo_refs?.slice(0, 5).map((_, i) => `/api/leads/${id}/photos/${i}`)
    ?? [];

  const yearsEst = lead.years_established ?? 10;

  // Real reviews only, straight from the Google Maps extraction — never
  // fabricated testimonials. If a lead has none, the section just doesn't render.
  const reviews = (lead.review_snippets as ReviewSnippet[] | null)
    ?.filter((r) => r.rating >= 4 && r.text.trim().length > 20) ?? [];

  const templateData: TemplateData = {
    lead, id, headline, tagline, cta, about, services,
    reviews, heroPhoto, heroVideo: getNicheVideo(lead.niche),
    galleryPhotos, yearsEst, nicheTitle,
  };

  return <WarmNeighborhoodTemplate {...templateData} />;
}

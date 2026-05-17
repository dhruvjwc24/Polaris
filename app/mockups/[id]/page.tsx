import { db } from "@/lib/db/supabase";
import type { Lead, SiteStructure } from "@/lib/types";
import {
  FALLBACK_REVIEWS,
  DarkPremiumTemplate,
  BoldEditorialTemplate,
  WarmNeighborhoodTemplate,
  CleanLightTemplate,
  PhotoForwardTemplate,
  type TemplateData,
} from "./templates";

export const dynamic = "force-dynamic";

const VARIANT_LABELS = [
  "Dark Premium",
  "Bold Editorial",
  "Warm Neighborhood",
  "Clean Light",
  "Photo Forward",
];

const TEMPLATES = [
  DarkPremiumTemplate,
  BoldEditorialTemplate,
  WarmNeighborhoodTemplate,
  CleanLightTemplate,
  PhotoForwardTemplate,
];

export default async function MockupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const { v } = await searchParams;
  const variant = Math.min(Math.max(parseInt(v ?? "1") || 1, 1), 5);

  const { data } = await db.from("leads").select("*").eq("id", id).maybeSingle();

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontFamily: "system-ui, sans-serif" }}>
        Lead not found
      </div>
    );
  }

  const lead = data as Lead;
  const ss = lead.site_structure as SiteStructure | null;
  const nicheTitle = lead.niche.charAt(0).toUpperCase() + lead.niche.slice(1);

  // Pull enrichment data — site_structure is populated after enrichment runs
  const headline = ss?.headline ?? `${lead.business_name}`;
  const tagline = ss?.tagline ?? `Quality work. Honest pricing. Proudly serving ${lead.city} and surrounding areas.`;
  const cta = ss?.cta ?? "Get a Free Estimate";
  const about = ss?.about ?? `${lead.business_name} has built its reputation one job at a time — serving ${lead.city} with the kind of craftsmanship and honesty you'd expect from a neighbor, not a corporation.`;
  const services = ss?.services?.length
    ? ss.services.slice(0, 3)
    : [
        { name: "Expert Workmanship", desc: "Professional results on every job, backed by a satisfaction guarantee." },
        { name: "On-Time, Every Time", desc: "We show up when we say and finish what we start. No exceptions." },
        { name: "Free Estimates", desc: "Straight talk, transparent pricing, zero hidden fees." },
      ];

  // Prefer stored Supabase URLs — fall back to proxy if photos haven't been stored yet
  const heroPhoto = lead.photo_urls?.[0] ?? (lead.photo_refs?.length ? `/api/leads/${id}/photos/0` : null);
  const galleryPhotos = lead.photo_urls?.slice(0, 5)
    ?? lead.photo_refs?.slice(0, 5).map((_, i) => `/api/leads/${id}/photos/${i}`)
    ?? [];
  const yearsEst = lead.years_established ?? 10;

  const storedReviews = (lead.review_snippets as typeof FALLBACK_REVIEWS | null)
    ?.filter((r) => r.rating >= 4 && r.text.trim().length > 20) ?? null;
  const reviews = storedReviews?.length ? storedReviews : FALLBACK_REVIEWS;
  const usingRealReviews = !!(storedReviews?.length);

  const templateData: TemplateData = {
    lead, id, headline, tagline, cta, about, services,
    reviews, heroPhoto, galleryPhotos, yearsEst, usingRealReviews, nicheTitle,
  };

  const Template = TEMPLATES[variant - 1];

  return (
    <>
      <Template {...templateData} />

      {/* Floating variant switcher */}
      <div style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(10,10,10,0.88)",
        backdropFilter: "blur(12px)",
        borderRadius: 40,
        padding: "8px 12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", paddingRight: 6, whiteSpace: "nowrap" }}>
          Design
        </span>
        {VARIANT_LABELS.map((label, i) => {
          const n = i + 1;
          const active = n === variant;
          return (
            <a
              key={n}
              href={`?v=${n}`}
              title={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: active ? "auto" : 32,
                height: 32,
                padding: active ? "0 14px" : "0",
                borderRadius: 24,
                background: active ? "#fff" : "transparent",
                color: active ? "#0a0a0a" : "rgba(255,255,255,0.45)",
                fontSize: active ? 12 : 13,
                fontWeight: active ? 700 : 500,
                textDecoration: "none",
                transition: "all .2s",
                whiteSpace: "nowrap",
              }}
            >
              {active ? label : n}
            </a>
          );
        })}
      </div>
    </>
  );
}

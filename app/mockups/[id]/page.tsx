import { db } from "@/lib/db/supabase";
import type { Lead, SiteStructure } from "@/lib/types";

export const dynamic = "force-dynamic";

function accentColor(niche: string): string {
  const n = niche.toLowerCase();
  if (/roof|fence|chimney|siding|gutter|construct|mason|concrete/.test(n)) return "#1e40af";
  if (/landscape|lawn|garden|tree|turf|irrigation|mow/.test(n)) return "#166534";
  if (/hvac|plumb|heat|cool|electr|water heater|drain/.test(n)) return "#c2410c";
  if (/dental|medic|health|doctor|clinic|ortho|chiro/.test(n)) return "#0f766e";
  if (/law|legal|attorney|firm/.test(n)) return "#3730a3";
  if (/salon|spa|beauty|hair|nail|barber/.test(n)) return "#9d174d";
  if (/photo|video|film/.test(n)) return "#4c1d95";
  return "#1e40af";
}

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

const PLACEHOLDER_REVIEWS = [
  { quote: "Excellent work from start to finish. Would recommend to anyone in the area.", name: "James M." },
  { quote: "Professional, on time, and the quality exceeded our expectations. Will use again.", name: "Sarah K." },
  { quote: "They handled everything and kept us updated throughout. Couldn't be happier.", name: "Robert T." },
];

export default async function MockupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await db.from("leads").select("*").eq("id", id).maybeSingle();

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
        Lead not found
      </div>
    );
  }

  const lead = data as Lead;
  const color = accentColor(lead.niche);
  const ss = lead.site_structure as SiteStructure | null;

  const nicheTitle = lead.niche.charAt(0).toUpperCase() + lead.niche.slice(1);
  const headline = ss?.headline ?? `Trusted ${nicheTitle} Specialists in ${lead.city}`;
  const tagline = ss?.tagline ?? `Quality service you can count on. Serving ${lead.city} and surrounding areas.`;
  const cta = ss?.cta ?? "Get Your Free Quote";
  const about = ss?.about ?? `${lead.business_name} has been proudly serving the ${lead.city} area with honest, reliable service. We treat every job like it's our own property.`;
  const services = ss?.services?.length
    ? ss.services.slice(0, 3)
    : [
        { name: "Quality Workmanship", desc: "Professional results backed by years of local experience." },
        { name: "Fast Response", desc: "We show up on time and complete every job right." },
        { name: "Free Estimates", desc: "No-obligation quotes for every project we take on." },
      ];

  const bodyStyle = "margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111827;";

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "system-ui,-apple-system,sans-serif", background: "#fff", color: "#111827", minHeight: "100vh" }}>

      {/* Nav */}
      <nav data-section="nav" style={{ background: color, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{lead.business_name}</span>
        {lead.phone && (
          <a href={`tel:${lead.phone}`} style={{ background: "#fff", color, fontWeight: 700, fontSize: 14, padding: "8px 20px", borderRadius: 6, textDecoration: "none" }}>
            {lead.phone}
          </a>
        )}
      </nav>

      {/* Hero */}
      <section data-section="hero" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, padding: "96px 32px", textAlign: "center" }}>
        <h1 style={{ color: "#fff", fontSize: 42, fontWeight: 800, marginBottom: 16, lineHeight: 1.2, maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
          {headline}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 20, marginBottom: 40, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          {tagline}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={{ background: "#fff", color, fontWeight: 700, fontSize: 17, padding: "14px 36px", borderRadius: 8, border: "none", cursor: "pointer" }}>
            {cta}
          </button>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ background: "transparent", color: "#fff", fontWeight: 600, fontSize: 17, padding: "14px 36px", borderRadius: 8, border: "2px solid rgba(255,255,255,0.6)", textDecoration: "none" }}>
              Call Now
            </a>
          )}
        </div>
      </section>

      {/* Services */}
      <section data-section="services" style={{ background: "#f9fafb", padding: "72px 32px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 800, marginBottom: 48, color: "#111827" }}>Our Services</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, maxWidth: 960, margin: "0 auto" }}>
          {services.map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6" }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: color, color: "#fff", fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                {i + 1}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#111827" }}>{s.name}</h3>
              <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section data-section="reviews" style={{ background: "#fff", padding: "72px 32px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 800, marginBottom: 16, color: "#111827" }}>
          What Our Customers Say
        </h2>
        {lead.rating && (
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ color: "#f59e0b", fontSize: 28 }}>{renderStars(lead.rating)}</span>
            <span style={{ marginLeft: 10, color: "#6b7280", fontSize: 15 }}>
              {lead.rating} · {lead.review_count ?? 0} reviews on Google
            </span>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, maxWidth: 960, margin: "0 auto" }}>
          {PLACEHOLDER_REVIEWS.map((r, i) => (
            <div key={i} style={{ background: "#f9fafb", borderRadius: 12, padding: 24, border: "1px solid #f3f4f6" }}>
              <div style={{ color: "#f59e0b", fontSize: 14, marginBottom: 12 }}>★★★★★</div>
              <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.7, fontStyle: "italic", marginBottom: 12 }}>
                &ldquo;{r.quote}&rdquo;
              </p>
              <p style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, margin: 0 }}>— {r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section data-section="about" style={{ background: "#f9fafb", padding: "72px 32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24, color: "#111827" }}>About {lead.business_name}</h2>
          <p style={{ color: "#4b5563", fontSize: 17, lineHeight: 1.8, marginBottom: 32 }}>{about}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              "Licensed & Fully Insured",
              `Proudly Serving ${lead.city} & Surrounding Areas`,
              lead.years_established
                ? `${lead.years_established}+ Years of Local Experience`
                : "Experienced Local Team",
              "Free Estimates — No Obligation",
            ].map((item, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, color: "#374151", fontSize: 15 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: color, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section data-section="cta" style={{ background: color, padding: "80px 32px", textAlign: "center" }}>
        <h2 style={{ color: "#fff", fontSize: 34, fontWeight: 800, marginBottom: 16 }}>Ready to Get Started?</h2>
        <p style={{ color: "rgba(255,255,255,0.88)", fontSize: 18, marginBottom: 40 }}>
          Contact us today for a free, no-obligation estimate.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ background: "#fff", color, fontWeight: 700, fontSize: 16, padding: "14px 32px", borderRadius: 8, textDecoration: "none" }}>
              Call {lead.phone}
            </a>
          )}
          <button style={{ background: "transparent", color: "#fff", fontWeight: 700, fontSize: 16, padding: "14px 32px", borderRadius: 8, border: "2px solid rgba(255,255,255,0.7)", cursor: "pointer" }}>
            {cta}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#111827", padding: "32px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
        © {new Date().getFullYear()} {lead.business_name} · {lead.city}
      </footer>
    </div>
  );
}

import type { Lead, ReviewSnippet } from "@/lib/types";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface TemplateData {
  lead: Lead;
  id: string;
  headline: string;
  tagline: string;
  cta: string;
  about: string;
  services: Array<{ name: string; desc: string }>;
  reviews: ReviewSnippet[];
  heroPhoto: string | null;
  galleryPhotos: string[];
  yearsEst: number;
  usingRealReviews: boolean;
  nicheTitle: string;
}

export function stars(rating: number) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export const FALLBACK_REVIEWS: ReviewSnippet[] = [
  { author: "James M.", rating: 5, text: "Showed up on time, did the job right, left everything spotless. Will absolutely use again.", time_desc: "a month ago" },
  { author: "Sarah K.", rating: 5, text: "Called in the morning, they were out by noon. Incredibly professional from start to finish.", time_desc: "2 months ago" },
  { author: "Robert T.", rating: 5, text: "Best experience with a local contractor — transparent pricing, excellent work, no mess.", time_desc: "3 months ago" },
];

// Shared inline script for scroll reveal + review carousel
export const CAROUSEL_SCRIPT = (accentHex: string) => `
(function(){
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('on'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(function(el){ obs.observe(el); });

  var track = document.getElementById('review-track');
  var dots = document.querySelectorAll('[data-dot]');
  var prev = document.getElementById('rev-prev');
  var next = document.getElementById('rev-next');
  if (!track) return;
  var current = 0;
  var total = track.children.length;

  function goTo(idx) {
    current = (idx + total) % total;
    track.scrollTo({ left: current * track.offsetWidth, behavior: 'smooth' });
    dots.forEach(function(d, i) {
      d.style.background = i === current ? '${accentHex}' : 'rgba(255,255,255,0.2)';
    });
  }

  if (prev) prev.addEventListener('click', function(){ goTo(current - 1); });
  if (next) next.addEventListener('click', function(){ goTo(current + 1); });
  dots.forEach(function(d){ d.addEventListener('click', function(){ goTo(parseInt(d.dataset.dot)); }); });

  track.addEventListener('scrollend', function(){
    var idx = Math.round(track.scrollLeft / track.offsetWidth);
    dots.forEach(function(d, i){ d.style.background = i === idx ? '${accentHex}' : 'rgba(255,255,255,0.2)'; });
    current = idx;
  });
})();
`;

// ── V1: DARK PREMIUM ──────────────────────────────────────────────────────────
// Bolder decisions:
// - Hero H1 pushed to clamp(72px,12vw,160px) — dramatic scale jump from body copy
// - Stats numbers at clamp(56px,8vw,96px) — they ARE the credibility signal, treat them like it
// - Services: "01/02/03" as 200px watermark behind each card, name small+bold over it
// - Review pull quotes at clamp(28px,4vw,52px) — quote IS the content, make it command space
// - CTA headline at clamp(72px,12vw,160px) — matches hero for rhythm
// - Weight: 900 headlines, 400 body only. Nothing 600 unless it's metadata.
// - No glassmorphism, no gradient text, no cyan/purple

export function DarkPremiumTemplate(d: TemplateData) {
  const gold = "#c9900a";
  const bg = "#0d0d0b";
  const surface = "#161613";
  const border = "#2a2924";
  const { lead, id, headline, tagline, cta, about, services, reviews, heroPhoto, galleryPhotos, yearsEst, usingRealReviews } = d;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${bg}; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .h1{animation:fadeIn .5s ease .05s both;}
        .h2{animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .12s both;}
        .h3{animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .24s both;}
        .h4{animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .38s both;}
        .h5{animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .5s both;}

        .reveal { opacity:0; transform:translateY(20px); transition:opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .reveal.on { opacity:1; transform:none; }
        .rd1{transition-delay:.07s;} .rd2{transition-delay:.14s;} .rd3{transition-delay:.22s;}

        .gallery-scroll { display:flex; gap:10px; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .gallery-scroll::-webkit-scrollbar { display:none; }
        .gallery-img { flex-shrink:0; width:420px; height:300px; object-fit:cover; scroll-snap-align:start; }

        .review-track { display:flex; overflow-x:scroll; scroll-snap-type:x mandatory; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .review-track::-webkit-scrollbar { display:none; }
        .review-slide { flex-shrink:0; width:100%; scroll-snap-align:start; }

        .rev-btn { width:40px; height:40px; border-radius:50%; background:transparent; border:1.5px solid rgba(255,255,255,0.15); color:#fff; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:border-color .2s; }
        .rev-btn:hover { border-color:${gold}; }

        .cta-btn { transition:opacity .18s; cursor:pointer; }
        .cta-btn:hover { opacity:.85; }

        /* Service watermark number */
        .svc-num-bg { position:absolute; top:-20px; left:-8px; font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:200px; color:#fff; opacity:.03; line-height:1; pointer-events:none; user-select:none; letter-spacing:-0.04em; }

        @media(max-width:720px){
          .hero-wrap{flex-direction:column!important;}
          .hero-photo{display:none!important;}
          .svc-grid{grid-template-columns:1fr!important;}
          .about-grid{grid-template-columns:1fr!important;}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important;}
          .gallery-img{width:300px;height:220px;}
        }
      `}</style>

      <div style={{ fontFamily: "'Barlow', system-ui, sans-serif", color: "#e8e4d8", background: bg, minHeight: "100vh" }}>

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: `rgba(13,13,11,0.97)`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}`, padding: "0 clamp(24px,5vw,64px)", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 17, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lead.business_name}</span>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ color: gold, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", textDecoration: "none", textTransform: "uppercase", borderBottom: `1px solid ${gold}55` }}>{lead.phone}</a>}
        </nav>

        {/* HERO */}
        <section style={{ minHeight: "92vh", background: bg, display: "flex", overflow: "hidden", position: "relative" }}>
          <div className="hero-wrap" style={{ display: "flex", width: "100%", alignItems: "stretch" }}>

            {/* Text column */}
            <div style={{ flex: "0 0 58%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px clamp(24px,5vw,72px)", position: "relative", zIndex: 2 }}>
              {lead.rating && (
                <div className="h1" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
                  <span style={{ color: gold, fontSize: 12, letterSpacing: 3 }}>{stars(lead.rating)}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{lead.rating} · {lead.review_count} reviews</span>
                </div>
              )}

              {/* Dramatic headline — 3-5x body size */}
              <h1 className="h2" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(72px,11vw,156px)", lineHeight: 0.88, letterSpacing: "-0.02em", color: "#fff", textTransform: "uppercase", marginBottom: 0 }}>
                {headline}
              </h1>

              {/* Gold rule */}
              <div className="h3" style={{ width: 56, height: 2, background: gold, margin: "28px 0 24px" }} />

              <p className="h3" style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(15px,1.5vw,17px)", lineHeight: 1.75, maxWidth: 400, fontWeight: 400, marginBottom: 48 }}>{tagline}</p>

              <div className="h4" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: gold, color: bg, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 13, padding: "14px 36px", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
                    {lead.phone}
                  </a>
                )}
                <button className="cta-btn" style={{ background: "transparent", color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, padding: "14px 36px", border: `1.5px solid ${border}`, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {cta}
                </button>
              </div>
            </div>

            {/* Photo column */}
            <div className="hero-photo" style={{ flex: "0 0 42%", position: "relative", overflow: "hidden" }}>
              {heroPhoto ? (
                <>
                  <img src={heroPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${bg} 0%, transparent 35%), linear-gradient(to top, ${bg} 0%, transparent 50%)` }} />
                </>
              ) : (
                <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(45deg, #1a1a17 0, #1a1a17 1px, transparent 0, transparent 40%)`, backgroundSize: "28px 28px" }} />
              )}
              {/* Corner frame */}
              <div style={{ position: "absolute", top: 48, right: 48, width: 72, height: 72, border: `1px solid ${gold}44`, pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 48, right: 48, width: 72, height: 72, border: `1px solid ${gold}44`, pointerEvents: "none" }} />
            </div>
          </div>
        </section>

        {/* STATS — numbers ARE the message */}
        <section style={{ background: gold }}>
          <div className="stats-grid reveal" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 1200, margin: "0 auto" }}>
            {[
              { n: `${yearsEst}+`, label: "Years" },
              { n: lead.review_count ? `${lead.review_count}+` : "100+", label: "Jobs" },
              { n: lead.rating ? `${lead.rating}★` : "5.0★", label: "Rating" },
              { n: "Free", label: "Estimates" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "32px 28px", borderLeft: i > 0 ? "1px solid rgba(13,13,11,0.12)" : "none" }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(48px,7vw,88px)", color: bg, lineHeight: 0.9, letterSpacing: "-0.02em" }}>{s.n}</div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: `${bg}66`, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.12em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES — watermark numbers, flat grid */}
        <section style={{ background: surface, padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(48px,8vw,108px)", color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.88, marginBottom: 72 }}>
              What We Do
            </h2>
            <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
              {services.map((s, i) => (
                <div key={i} className={`reveal rd${i + 1}`} style={{ background: bg, padding: "52px 40px 52px", position: "relative", overflow: "hidden", borderTop: `2px solid ${gold}` }}>
                  <div className="svc-num-bg">{`0${i + 1}`}</div>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <h3 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(22px,2.5vw,30px)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.05, marginBottom: 16 }}>{s.name}</h3>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.8, fontWeight: 400 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        {galleryPhotos.length > 1 && (
          <section style={{ background: bg, padding: "88px 0 88px clamp(24px,5vw,64px)", overflow: "hidden" }}>
            <h2 className="reveal" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(48px,8vw,108px)", color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.88, marginBottom: 48, maxWidth: 1200 }}>
              Our Work
            </h2>
            <div className="gallery-scroll">
              {galleryPhotos.map((url, idx) => <img key={idx} src={url} alt={`Work ${idx + 1}`} className="gallery-img" />)}
            </div>
          </section>
        )}

        {/* REVIEWS — pull quote at dramatic scale */}
        <section style={{ background: surface, padding: "104px 0", overflow: "hidden" }}>
          <div style={{ padding: "0 clamp(24px,5vw,64px)", maxWidth: 1200, margin: "0 auto 56px" }} className="reveal">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
              <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(48px,8vw,108px)", color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.88 }}>
                {usingRealReviews ? "Real Reviews" : "What They Say"}
              </h2>
              {lead.rating && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", paddingBottom: 6 }}>{stars(lead.rating)} {lead.rating} on Google</span>}
            </div>
          </div>

          <div id="review-track" className="review-track">
            {reviews.map((r, i) => (
              <div key={i} className="review-slide" style={{ padding: "0 clamp(24px,5vw,64px)" }}>
                <div style={{ maxWidth: 900, margin: "0 auto", borderTop: `3px solid ${gold}`, paddingTop: 48 }}>
                  {/* Pull quote at dramatic scale */}
                  <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(28px,4.5vw,56px)", color: "#fff", lineHeight: 1.15, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 44 }}>
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 36, height: 36, background: gold, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 15, color: bg }}>{r.author[0]}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{r.author}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{r.time_desc}</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: gold, fontSize: 12, letterSpacing: 3 }}>{"★".repeat(r.rating)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {reviews.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "40px clamp(24px,5vw,64px) 0" }}>
              <button className="rev-btn" id="rev-prev">‹</button>
              <div id="rev-dots" style={{ display: "flex", gap: 6 }}>
                {reviews.map((_, i) => <div key={i} data-dot={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? gold : "rgba(255,255,255,0.15)", cursor: "pointer" }} />)}
              </div>
              <button className="rev-btn" id="rev-next">›</button>
            </div>
          )}
        </section>

        {/* ABOUT */}
        <section style={{ background: bg, padding: "104px clamp(24px,5vw,64px)" }}>
          <div className="about-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "64px 80px", alignItems: "start" }}>
            <div className="reveal">
              <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(40px,6vw,80px)", color: "#fff", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.9, marginBottom: 32 }}>{lead.business_name}</h2>
              <div style={{ width: 40, height: 2, background: gold, marginBottom: 28 }} />
              <p style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.9, color: "rgba(255,255,255,0.4)" }}>{about}</p>
            </div>
            <div className="reveal rd2">
              {["Licensed & fully insured", `${yearsEst}+ years in ${lead.city}`, "Background-checked team", "Workmanship warranty", "Free estimates", "5-star on Google"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${border}` }}>
                  <div style={{ width: 6, height: 6, background: gold, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.5)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: gold, padding: "96px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: "clamp(72px,11vw,156px)", color: bg, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.88, marginBottom: 48 }}>
              Ready?
            </h2>
            <div className="reveal rd1" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: bg, color: gold, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 14, padding: "16px 44px", letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>Call {lead.phone}</a>}
              <button className="cta-btn" style={{ background: "transparent", color: bg, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, padding: "16px 44px", border: `2px solid ${bg}44`, letterSpacing: "0.08em", textTransform: "uppercase" }}>{cta}</button>
              <span style={{ fontSize: 13, color: `${bg}88`, fontWeight: 400 }}>Free estimate · No obligation</span>
            </div>
          </div>
        </section>

        <footer style={{ background: surface, padding: "28px clamp(24px,5vw,64px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.1em" }}>© {new Date().getFullYear()} {lead.business_name}</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.12)" }}>{[lead.city, lead.phone].filter(Boolean).join(" · ")}</span>
        </footer>
      </div>
      <script dangerouslySetInnerHTML={{ __html: CAROUSEL_SCRIPT(gold) }} />
    </>
  );
}

// ── V2: BOLD EDITORIAL ────────────────────────────────────────────────────────
// Bolder decisions:
// - Full-bleed photo hero, text bottom-left, headline at 140px desktop
// - Service section: 160px background numerals behind each card — the number IS the composition
// - Stats: red strip, 88px numbers
// - Reviews: newspaper pull-quote style, huge red quote mark, 48px quote text
// - CTA: "Let's Talk. / [Red: Get a Free Estimate.]" — two-line contrast

export function BoldEditorialTemplate(d: TemplateData) {
  const ink = "#111111";
  const red = "#d42b1a";
  const { lead, id, headline, tagline, cta, about, services, reviews, heroPhoto, galleryPhotos, yearsEst, usingRealReviews } = d;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .h1{animation:fadeIn .4s ease both;} .h2{animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .1s both;}
        .h3{animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .22s both;} .h4{animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .36s both;}
        .reveal{opacity:0;transform:translateY(18px);transition:opacity .65s cubic-bezier(.16,1,.3,1),transform .65s cubic-bezier(.16,1,.3,1);}
        .reveal.on{opacity:1;transform:none;} .rd1{transition-delay:.07s;} .rd2{transition-delay:.14s;} .rd3{transition-delay:.21s;}
        .gallery-scroll{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .gallery-scroll::-webkit-scrollbar{display:none;}
        .gallery-img{flex-shrink:0;width:400px;height:280px;object-fit:cover;scroll-snap-align:start;}
        .review-track{display:flex;overflow-x:scroll;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .review-track::-webkit-scrollbar{display:none;}
        .review-slide{flex-shrink:0;width:100%;scroll-snap-align:start;}
        .rev-btn{width:36px;height:36px;background:transparent;border:1.5px solid #ccc;color:#444;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .2s,color .2s;}
        .rev-btn:hover{border-color:${red};color:${red};}
        .cta-btn{transition:opacity .15s;cursor:pointer;} .cta-btn:hover{opacity:.85;}
        .svc-bg-num{position:absolute;top:-32px;left:-16px;font-family:'Oswald',sans-serif;font-weight:700;font-size:200px;color:${ink};opacity:.04;line-height:1;pointer-events:none;user-select:none;letter-spacing:-0.04em;}
        @media(max-width:720px){
          .svc-grid{grid-template-columns:1fr!important;} .about-grid{grid-template-columns:1fr!important;}
          .gallery-img{width:300px;height:220px;}
        }
      `}</style>

      <div style={{ fontFamily: "'Source Sans 3',system-ui,sans-serif", color: ink, background: "#fff", minHeight: "100vh" }}>

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: `3px solid ${ink}`, padding: "0 clamp(24px,5vw,64px)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 18, color: ink, textTransform: "uppercase", letterSpacing: "0.04em" }}>{lead.business_name}</span>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ background: red, color: "#fff", fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 13, padding: "8px 20px", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>{lead.phone}</a>}
        </nav>

        {/* HERO — full bleed, text bottom-left */}
        <section style={{ position: "relative", minHeight: "92vh", background: ink, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
          {heroPhoto ? (
            <>
              <img src={heroPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${ink} 35%, transparent 65%)` }} />
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(-45deg, #1c1c1c 0, #1c1c1c 1px, transparent 0, transparent 56%)`, backgroundSize: "44px 44px" }} />
          )}
          <div style={{ position: "relative", zIndex: 2, padding: "0 clamp(24px,5vw,64px) 80px", width: "100%" }}>
            {lead.rating && (
              <div className="h1" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <span style={{ color: "#fbbf24", letterSpacing: 2, fontSize: 13 }}>{stars(lead.rating)}</span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{lead.rating} · {lead.review_count} reviews</span>
              </div>
            )}
            <h1 className="h2" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(64px,10vw,144px)", lineHeight: 0.9, color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em", maxWidth: 880, marginBottom: 28 }}>{headline}</h1>
            <p className="h3" style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(15px,1.5vw,18px)", lineHeight: 1.65, maxWidth: 460, marginBottom: 40, fontWeight: 400 }}>{tagline}</p>
            <div className="h4" style={{ display: "flex", gap: 12 }}>
              {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: red, color: "#fff", fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 13, padding: "13px 36px", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.06em" }}>Call Now</a>}
              <button className="cta-btn" style={{ background: "transparent", color: "#fff", fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 13, padding: "13px 36px", border: "1.5px solid rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{cta}</button>
            </div>
          </div>
        </section>

        {/* STATS — red strip, huge numbers */}
        <section style={{ background: red }}>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 1200, margin: "0 auto" }}>
            {[{ n: `${yearsEst}+`, l: "Years" }, { n: lead.review_count ? `${lead.review_count}+` : "100+", l: "Customers" }, { n: lead.rating ?? "5.0", l: "Rating" }, { n: "Free", l: "Estimates" }].map((s, i) => (
              <div key={i} style={{ padding: "28px 24px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(44px,7vw,88px)", color: "#fff", lineHeight: 0.9, letterSpacing: "-0.01em" }}>{s.n}</div>
                <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES — 160px background number, name overlaid */}
        <section style={{ background: "#fff", padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(48px,8vw,112px)", color: ink, textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 0.88, marginBottom: 72 }}>What We Do</h2>
            <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0 2px" }}>
              {services.map((s, i) => (
                <div key={i} className={`reveal rd${i + 1}`} style={{ padding: "56px 40px 48px", background: "#fafafa", position: "relative", overflow: "hidden", borderTop: `3px solid ${ink}` }}>
                  <div className="svc-bg-num">{`0${i + 1}`}</div>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <h3 style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(20px,2.2vw,28px)", color: ink, textTransform: "uppercase", lineHeight: 1.05, marginBottom: 16 }}>{s.name}</h3>
                    <p style={{ fontSize: 15, color: "#666", lineHeight: 1.75, fontWeight: 400 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        {galleryPhotos.length > 1 && (
          <section style={{ background: "#f3f3f1", padding: "80px 0 80px clamp(24px,5vw,64px)", overflow: "hidden" }}>
            <h2 className="reveal" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(44px,7vw,100px)", color: ink, textTransform: "uppercase", lineHeight: 0.88, marginBottom: 44, maxWidth: 1200 }}>Our Work</h2>
            <div className="gallery-scroll">
              {galleryPhotos.map((url, idx) => <img key={idx} src={url} alt={`Work ${idx + 1}`} className="gallery-img" />)}
            </div>
          </section>
        )}

        {/* REVIEWS — newspaper pull quote */}
        <section style={{ background: "#fff", padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="reveal" style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 64, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(48px,8vw,112px)", color: ink, textTransform: "uppercase", lineHeight: 0.88 }}>{usingRealReviews ? "Real Reviews" : "Reviews"}</h2>
              {lead.rating && <span style={{ fontSize: 12, color: "#aaa", paddingBottom: 6 }}>{stars(lead.rating)} {lead.rating} on Google</span>}
            </div>
          </div>
          <div id="review-track" className="review-track">
            {reviews.map((r, i) => (
              <div key={i} className="review-slide" style={{ padding: "0 clamp(24px,5vw,64px)" }}>
                <div style={{ maxWidth: 920, margin: "0 auto" }}>
                  {/* Huge red quote mark */}
                  <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 160, lineHeight: 0.7, color: red, fontWeight: 700, marginBottom: 16, userSelect: "none" }}>&ldquo;</div>
                  <p style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: "clamp(26px,4vw,52px)", color: ink, lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 36 }}>{r.text}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, borderTop: `1px solid #e5e5e5`, paddingTop: 20 }}>
                    <span style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 14, color: "#333" }}>{r.author}</span>
                    <span style={{ fontSize: 12, color: "#bbb" }}>· {r.time_desc}</span>
                    <span style={{ color: "#fbbf24", fontSize: 13, marginLeft: "auto" }}>{"★".repeat(r.rating)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {reviews.length > 1 && (
            <div style={{ display: "flex", gap: 10, padding: "40px clamp(24px,5vw,64px) 0" }}>
              <button className="rev-btn" id="rev-prev">‹</button>
              <div id="rev-dots" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {reviews.map((_, i) => <div key={i} data-dot={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? red : "#ddd", cursor: "pointer" }} />)}
              </div>
              <button className="rev-btn" id="rev-next">›</button>
            </div>
          )}
        </section>

        {/* ABOUT */}
        <section style={{ background: "#f3f3f1", padding: "104px clamp(24px,5vw,64px)" }}>
          <div className="about-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "64px 80px", alignItems: "start" }}>
            <div className="reveal">
              <h2 style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(36px,5.5vw,76px)", color: ink, textTransform: "uppercase", lineHeight: 0.9, marginBottom: 32 }}>{lead.business_name}</h2>
              <p style={{ fontSize: 16, color: "#555", lineHeight: 1.85, fontWeight: 400 }}>{about}</p>
            </div>
            <div className="reveal rd2">
              {["Licensed & fully insured", `${yearsEst}+ years in ${lead.city}`, "Background-checked team", "Workmanship warranty", "Free estimates", "5-star on Google"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #e0e0e0" }}>
                  <div style={{ width: 18, height: 18, border: `2px solid ${red}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: red, fontSize: 9, fontWeight: 800 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — two-line contrast headline */}
        <section style={{ background: ink, padding: "96px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: "clamp(56px,9vw,128px)", color: "#fff", textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 0.88, marginBottom: 48 }}>
              Let&apos;s Talk.<br /><span style={{ color: red }}>Free Estimate.</span>
            </h2>
            <div className="reveal rd1" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: red, color: "#fff", fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: 14, padding: "15px 44px", textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.06em" }}>Call {lead.phone}</a>}
              <button className="cta-btn" style={{ background: "transparent", color: "#fff", fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 13, padding: "15px 44px", border: "1.5px solid rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{cta}</button>
            </div>
          </div>
        </section>

        <footer style={{ background: "#0a0a0a", padding: "24px clamp(24px,5vw,64px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.18)", textTransform: "uppercase" }}>© {new Date().getFullYear()} {lead.business_name}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.12)" }}>{[lead.city, lead.phone].filter(Boolean).join(" · ")}</span>
        </footer>
      </div>
      <script dangerouslySetInnerHTML={{ __html: CAROUSEL_SCRIPT(red) }} />
    </>
  );
}

// ── V3: WARM NEIGHBORHOOD ─────────────────────────────────────────────────────
// Bolder decisions:
// - Removed emoji icons (template slop — banned by bolder reference)
// - Headline at 128px desktop — was modest before
// - Stats numbers at 88px — were too soft
// - Services: oversized step numbers as background watermarks (same pattern as V1/V2)
// - About section: 3fr/2fr asymmetric split instead of 1fr/1fr

export function WarmNeighborhoodTemplate(d: TemplateData) {
  const cream = "#fdf6ed";
  const brown = "#2c1a0e";
  const terra = "#c4581a";
  const mid = "#f0e0cc";
  const { lead, id, headline, tagline, cta, about, services, reviews, heroPhoto, galleryPhotos, yearsEst, usingRealReviews } = d;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${cream}; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .h1{animation:fadeIn .4s ease both;} .h2{animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .1s both;}
        .h3{animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .22s both;} .h4{animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .36s both;}
        .reveal{opacity:0;transform:translateY(18px);transition:opacity .65s cubic-bezier(.16,1,.3,1),transform .65s cubic-bezier(.16,1,.3,1);}
        .reveal.on{opacity:1;transform:none;} .rd1{transition-delay:.07s;} .rd2{transition-delay:.14s;} .rd3{transition-delay:.21s;}
        .gallery-scroll{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .gallery-scroll::-webkit-scrollbar{display:none;}
        .gallery-img{flex-shrink:0;width:380px;height:272px;object-fit:cover;scroll-snap-align:start;}
        .review-track{display:flex;overflow-x:scroll;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .review-track::-webkit-scrollbar{display:none;}
        .review-slide{flex-shrink:0;width:100%;scroll-snap-align:start;}
        .rev-btn{width:40px;height:40px;border-radius:50%;background:${mid};border:none;color:${brown};font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;}
        .rev-btn:hover{background:${terra};color:#fff;}
        .cta-btn{transition:opacity .15s;cursor:pointer;} .cta-btn:hover{opacity:.85;}
        .svc-bg-num{position:absolute;top:-24px;left:-12px;font-family:'Nunito',sans-serif;font-weight:900;font-size:200px;color:${terra};opacity:.06;line-height:1;pointer-events:none;user-select:none;letter-spacing:-0.04em;}
        @media(max-width:720px){
          .hero-photo-warm{display:none!important;} .svc-grid{grid-template-columns:1fr!important;}
          .about-grid{grid-template-columns:1fr!important;} .gallery-img{width:300px;height:220px;}
        }
      `}</style>

      <div style={{ fontFamily: "'Nunito',system-ui,sans-serif", color: brown, background: cream, minHeight: "100vh" }}>

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: `rgba(253,246,237,0.96)`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${mid}`, padding: "0 clamp(24px,5vw,64px)", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 900, fontSize: 17, color: brown }}>{lead.business_name}</span>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ background: terra, color: "#fff", fontWeight: 800, fontSize: 14, padding: "9px 24px", textDecoration: "none" }}>{lead.phone}</a>}
        </nav>

        {/* HERO */}
        <section style={{ padding: "80px clamp(24px,5vw,64px) 88px", maxWidth: 1200, margin: "0 auto", display: "flex", gap: "64px 80px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            {lead.rating && (
              <div className="h1" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: mid, padding: "8px 16px", marginBottom: 32 }}>
                <span style={{ color: terra, fontSize: 13, letterSpacing: 2 }}>{stars(lead.rating)}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: brown }}>{lead.rating} · {lead.review_count} reviews</span>
              </div>
            )}
            <h1 className="h2" style={{ fontWeight: 900, fontSize: "clamp(52px,9vw,128px)", lineHeight: 0.92, color: brown, marginBottom: 24 }}>{headline}</h1>
            <p className="h3" style={{ fontSize: "clamp(16px,1.7vw,19px)", color: `${brown}99`, lineHeight: 1.7, marginBottom: 44, fontWeight: 400 }}>{tagline}</p>
            <div className="h4" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: terra, color: "#fff", fontWeight: 900, fontSize: 15, padding: "14px 36px", textDecoration: "none" }}>Call Now</a>}
              <button className="cta-btn" style={{ background: mid, color: brown, fontWeight: 800, fontSize: 15, padding: "14px 36px", border: "none" }}>{cta}</button>
            </div>
          </div>
          {heroPhoto && <div className="hero-photo-warm" style={{ flex: "0 0 400px", height: 480, overflow: "hidden", position: "relative" }}><img src={heroPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>}
        </section>

        {/* STATS */}
        <section style={{ background: terra }}>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 1200, margin: "0 auto" }}>
            {[{ n: `${yearsEst}+`, l: "Years" }, { n: lead.review_count ? `${lead.review_count}+` : "100+", l: "Customers" }, { n: lead.rating ?? "5.0", l: "Rating" }, { n: "Free", l: "Estimates" }].map((s, i) => (
              <div key={i} style={{ padding: "32px 28px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.22)" : "none" }}>
                <div style={{ fontWeight: 900, fontSize: "clamp(44px,7vw,88px)", color: "#fff", lineHeight: 0.9 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 700, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section style={{ background: cream, padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontWeight: 900, fontSize: "clamp(48px,8vw,112px)", color: brown, lineHeight: 0.9, marginBottom: 72 }}>How we help</h2>
            <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
              {services.map((s, i) => (
                <div key={i} className={`reveal rd${i + 1}`} style={{ background: mid, padding: "52px 40px 48px", position: "relative", overflow: "hidden", borderTop: `3px solid ${terra}` }}>
                  <div className="svc-bg-num">{`0${i + 1}`}</div>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <h3 style={{ fontWeight: 900, fontSize: "clamp(20px,2.2vw,26px)", color: brown, lineHeight: 1.05, marginBottom: 14 }}>{s.name}</h3>
                    <p style={{ fontSize: 14, color: `${brown}99`, lineHeight: 1.8, fontWeight: 400 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        {galleryPhotos.length > 1 && (
          <section style={{ background: mid, padding: "80px 0 80px clamp(24px,5vw,64px)", overflow: "hidden" }}>
            <h2 className="reveal" style={{ fontWeight: 900, fontSize: "clamp(44px,7vw,100px)", color: brown, lineHeight: 0.9, marginBottom: 44, maxWidth: 1200 }}>Our Work</h2>
            <div className="gallery-scroll">
              {galleryPhotos.map((url, idx) => <img key={idx} src={url} alt={`Work ${idx + 1}`} className="gallery-img" />)}
            </div>
          </section>
        )}

        {/* REVIEWS */}
        <section style={{ background: cream, padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="reveal" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 64 }}>
              <h2 style={{ fontWeight: 900, fontSize: "clamp(48px,8vw,112px)", color: brown, lineHeight: 0.9 }}>{usingRealReviews ? "Real reviews" : "Reviews"}</h2>
              {lead.rating && <div style={{ display: "flex", alignItems: "center", gap: 10, background: mid, padding: "10px 20px", marginBottom: 8 }}><span style={{ color: terra, letterSpacing: 2 }}>{stars(lead.rating)}</span><span style={{ fontWeight: 800, fontSize: 14 }}>{lead.rating}</span></div>}
            </div>
            <div id="review-track" className="review-track">
              {reviews.map((r, i) => (
                <div key={i} className="review-slide" style={{ paddingRight: 48 }}>
                  <div style={{ borderTop: `3px solid ${terra}`, paddingTop: 40 }}>
                    <p style={{ fontWeight: 900, fontSize: "clamp(24px,3.8vw,48px)", color: brown, lineHeight: 1.2, marginBottom: 32 }}>&ldquo;{r.text}&rdquo;</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, background: terra, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: "#fff" }}>{r.author[0]}</div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: brown }}>{r.author}</div>
                        <div style={{ fontSize: 12, color: `${brown}55`, marginTop: 2 }}>{r.time_desc}</div>
                      </div>
                      <div style={{ marginLeft: "auto", color: terra, fontSize: 13, letterSpacing: 2 }}>{"★".repeat(r.rating)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {reviews.length > 1 && (
              <div style={{ display: "flex", gap: 10, marginTop: 36 }}>
                <button className="rev-btn" id="rev-prev">‹</button>
                <div id="rev-dots" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {reviews.map((_, i) => <div key={i} data-dot={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? terra : mid, border: `1px solid ${terra}44`, cursor: "pointer" }} />)}
                </div>
                <button className="rev-btn" id="rev-next">›</button>
              </div>
            )}
          </div>
        </section>

        {/* ABOUT */}
        <section style={{ background: mid, padding: "104px clamp(24px,5vw,64px)" }}>
          <div className="about-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "64px 80px", alignItems: "start" }}>
            <div className="reveal">
              <h2 style={{ fontWeight: 900, fontSize: "clamp(36px,5.5vw,76px)", color: brown, lineHeight: 0.9, marginBottom: 32 }}>{lead.business_name}</h2>
              <p style={{ fontSize: 16, color: `${brown}bb`, lineHeight: 1.9, fontWeight: 400 }}>{about}</p>
            </div>
            <div className="reveal rd2">
              {["Licensed & fully insured", `${yearsEst}+ years in ${lead.city}`, "Background-checked team", "Workmanship warranty", "Free estimates", "5-star on Google"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${terra}22` }}>
                  <div style={{ width: 8, height: 8, background: terra, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: brown, fontWeight: 700 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: brown, padding: "96px clamp(24px,5vw,64px)" }}>
          <h2 className="reveal" style={{ fontWeight: 900, fontSize: "clamp(56px,9vw,128px)", color: "#fff", lineHeight: 0.92, marginBottom: 48, maxWidth: 1200, margin: "0 auto 48px" }}>Ready to get started?</h2>
          <div className="reveal rd1" style={{ display: "flex", gap: 14, flexWrap: "wrap", maxWidth: 1200, margin: "0 auto" }}>
            {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: terra, color: "#fff", fontWeight: 900, fontSize: 15, padding: "16px 44px", textDecoration: "none" }}>Call {lead.phone}</a>}
            <button className="cta-btn" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontWeight: 800, fontSize: 14, padding: "16px 44px", border: "1.5px solid rgba(255,255,255,0.2)" }}>{cta}</button>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, alignSelf: "center", fontWeight: 400 }}>Free estimate · No pressure</span>
          </div>
        </section>

        <footer style={{ background: "#1a0e06", padding: "24px clamp(24px,5vw,64px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.18)" }}>© {new Date().getFullYear()} {lead.business_name}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.12)" }}>{[lead.city, lead.phone].filter(Boolean).join(" · ")}</span>
        </footer>
      </div>
      <script dangerouslySetInnerHTML={{ __html: CAROUSEL_SCRIPT(terra) }} />
    </>
  );
}

// ── V4: CLEAN LIGHT ───────────────────────────────────────────────────────────
// Bolder decisions:
// - Hero split changed to 60/40 — stats live in the left column under the headline (stats ARE part of the hero)
// - Headline at 96px, stats at 72px within hero — enormous number contrast
// - Service section: teal-drench on the heading section, white cards below — section-level color commitment
// - Review text at 44px desktop
// - CTA at 96px

export function CleanLightTemplate(d: TemplateData) {
  const teal = "#0d7377";
  const tealDark = "#084d50";
  const tealLight = "#e0f4f4";
  const { lead, id, headline, tagline, cta, about, services, reviews, heroPhoto, galleryPhotos, yearsEst, usingRealReviews } = d;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .h1{animation:fadeIn .4s ease both;} .h2{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .1s both;}
        .h3{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .22s both;} .h4{animation:fadeUp .65s cubic-bezier(.16,1,.3,1) .36s both;}
        .reveal{opacity:0;transform:translateY(16px);transition:opacity .65s cubic-bezier(.16,1,.3,1),transform .65s cubic-bezier(.16,1,.3,1);}
        .reveal.on{opacity:1;transform:none;} .rd1{transition-delay:.07s;} .rd2{transition-delay:.14s;} .rd3{transition-delay:.21s;}
        .gallery-scroll{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .gallery-scroll::-webkit-scrollbar{display:none;}
        .gallery-img{flex-shrink:0;width:380px;height:272px;object-fit:cover;scroll-snap-align:start;}
        .review-track{display:flex;overflow-x:scroll;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .review-track::-webkit-scrollbar{display:none;}
        .review-slide{flex-shrink:0;width:100%;scroll-snap-align:start;}
        .rev-btn{width:40px;height:40px;background:${tealLight};border:none;color:${teal};font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;}
        .rev-btn:hover{background:${teal};color:#fff;}
        .cta-btn{transition:opacity .15s;cursor:pointer;} .cta-btn:hover{opacity:.85;}
        .svc-card{border:1px solid #e4e4e4;transition:border-color .2s,transform .2s;} .svc-card:hover{border-color:${teal};transform:translateY(-3px);}
        @media(max-width:720px){
          .hero-grid{grid-template-columns:1fr!important;} .hero-photo-clean{display:none!important;}
          .svc-grid{grid-template-columns:1fr!important;} .about-grid{grid-template-columns:1fr!important;}
          .gallery-img{width:300px;height:220px;}
        }
      `}</style>

      <div style={{ fontFamily: "'Epilogue',system-ui,sans-serif", color: "#111", background: "#fff", minHeight: "100vh" }}>

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "0 clamp(24px,5vw,64px)", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#111", letterSpacing: "-0.02em" }}>{lead.business_name}</span>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ background: teal, color: "#fff", fontWeight: 700, fontSize: 14, padding: "9px 24px", textDecoration: "none" }}>{lead.phone}</a>}
        </nav>

        {/* HERO — text + big stats left, photo right */}
        <section style={{ background: "#fff", padding: "0 clamp(24px,5vw,64px)", minHeight: "88vh" }}>
          <div className="hero-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "3fr 2fr", minHeight: "88vh", gap: 40, alignItems: "center" }}>
            <div>
              {lead.rating && (
                <div className="h1" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                  <span style={{ color: "#f59e0b", letterSpacing: 2, fontSize: 13 }}>{stars(lead.rating)}</span>
                  <span style={{ fontSize: 12, color: "#999" }}>{lead.rating} · {lead.review_count} Google reviews</span>
                </div>
              )}
              <h1 className="h2" style={{ fontWeight: 800, fontSize: "clamp(44px,7vw,96px)", lineHeight: 0.95, letterSpacing: "-0.03em", color: "#111", marginBottom: 24 }}>{headline}</h1>
              <p className="h3" style={{ fontSize: "clamp(15px,1.5vw,17px)", color: "#777", lineHeight: 1.75, maxWidth: 420, marginBottom: 40, fontWeight: 400 }}>{tagline}</p>
              <div className="h4" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 64 }}>
                {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: teal, color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 36px", textDecoration: "none" }}>Call Now</a>}
                <button className="cta-btn" style={{ background: tealLight, color: teal, fontWeight: 700, fontSize: 15, padding: "13px 36px", border: "none" }}>{cta}</button>
              </div>
              {/* Stats living in hero — massive numbers */}
              <div className="h4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, borderTop: "1px solid #e8e8e8", paddingTop: 32 }}>
                {[{ n: `${yearsEst}+`, l: "Years" }, { n: lead.review_count ?? "100+", l: "Customers" }, { n: lead.rating ?? "5.0", l: "Rating ★" }].map((s, i) => (
                  <div key={i} style={{ paddingRight: 24 }}>
                    <div style={{ fontWeight: 800, fontSize: "clamp(36px,5vw,72px)", color: teal, letterSpacing: "-0.03em", lineHeight: 0.95 }}>{s.n}</div>
                    <div style={{ fontSize: 11, color: "#aaa", fontWeight: 500, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-photo-clean" style={{ height: 560, overflow: "hidden", position: "relative" }}>
              {heroPhoto ? (
                <img src={heroPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: tealLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 80, color: `${teal}22` }}>{lead.business_name[0]}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SERVICES — teal header, white cards */}
        <section style={{ background: "#fff", padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontWeight: 800, fontSize: "clamp(44px,7vw,96px)", color: "#111", letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: 72 }}>Our services</h2>
            <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {services.map((s, i) => (
                <div key={i} className={`svc-card reveal rd${i + 1}`} style={{ padding: "40px 32px", borderTop: `3px solid ${teal}` }}>
                  <div style={{ fontWeight: 800, fontSize: "clamp(40px,5vw,64px)", color: tealLight, lineHeight: 0.9, marginBottom: 20, letterSpacing: "-0.02em" }}>{`0${i + 1}`}</div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, color: "#111", letterSpacing: "-0.01em", marginBottom: 12 }}>{s.name}</h3>
                  <p style={{ fontSize: 14, color: "#666", lineHeight: 1.75, fontWeight: 400 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        {galleryPhotos.length > 1 && (
          <section style={{ background: "#fafafa", padding: "80px 0 80px clamp(24px,5vw,64px)", overflow: "hidden" }}>
            <h2 className="reveal" style={{ fontWeight: 800, fontSize: "clamp(40px,6vw,88px)", color: "#111", letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: 40, maxWidth: 1200 }}>Our work</h2>
            <div className="gallery-scroll">
              {galleryPhotos.map((url, idx) => <img key={idx} src={url} alt={`Work ${idx + 1}`} className="gallery-img" />)}
            </div>
          </section>
        )}

        {/* REVIEWS */}
        <section style={{ background: tealLight, padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="reveal" style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 64, flexWrap: "wrap" }}>
              <h2 style={{ fontWeight: 800, fontSize: "clamp(44px,7vw,96px)", color: tealDark, letterSpacing: "-0.03em", lineHeight: 0.95 }}>{usingRealReviews ? "Real reviews" : "Reviews"}</h2>
              {lead.rating && <span style={{ fontSize: 12, color: `${tealDark}77`, paddingBottom: 8 }}>{stars(lead.rating)} {lead.rating} on Google</span>}
            </div>
          </div>
          <div id="review-track" className="review-track">
            {reviews.map((r, i) => (
              <div key={i} className="review-slide" style={{ padding: "0 clamp(24px,5vw,64px)" }}>
                <div style={{ maxWidth: 820, margin: "0 auto", background: "#fff", padding: "52px 56px" }}>
                  <p style={{ fontWeight: 700, fontSize: "clamp(22px,3.5vw,44px)", color: "#111", lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 36 }}>&ldquo;{r.text}&rdquo;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, borderTop: "1px solid #e8e8e8", paddingTop: 20 }}>
                    <div style={{ width: 36, height: 36, background: teal, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>{r.author[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{r.author}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{r.time_desc}</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: "#f59e0b", fontSize: 13 }}>{"★".repeat(r.rating)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {reviews.length > 1 && (
            <div style={{ display: "flex", gap: 10, padding: "36px clamp(24px,5vw,64px) 0" }}>
              <button className="rev-btn" id="rev-prev">‹</button>
              <div id="rev-dots" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {reviews.map((_, i) => <div key={i} data-dot={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? teal : "#cce8e8", cursor: "pointer" }} />)}
              </div>
              <button className="rev-btn" id="rev-next">›</button>
            </div>
          )}
        </section>

        {/* ABOUT */}
        <section style={{ background: "#fff", padding: "104px clamp(24px,5vw,64px)" }}>
          <div className="about-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "64px 80px", alignItems: "start" }}>
            <div className="reveal">
              <h2 style={{ fontWeight: 800, fontSize: "clamp(36px,5.5vw,76px)", color: "#111", letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: 28 }}>About {lead.business_name}</h2>
              <p style={{ fontSize: 16, color: "#555", lineHeight: 1.85, fontWeight: 400 }}>{about}</p>
            </div>
            <div className="reveal rd2">
              {["Licensed & fully insured", `${yearsEst}+ years in ${lead.city}`, "Background-checked team", "Workmanship warranty", "Free estimates", "5-star on Google"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 0", borderBottom: "1px solid #e8e8e8" }}>
                  <div style={{ width: 24, height: 24, background: tealLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: teal, fontSize: 11, fontWeight: 800 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: teal, padding: "96px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontWeight: 800, fontSize: "clamp(52px,9vw,120px)", color: "#fff", letterSpacing: "-0.03em", lineHeight: 0.92, marginBottom: 48 }}>Ready to get started?</h2>
            <div className="reveal rd1" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: "#fff", color: teal, fontWeight: 800, fontSize: 15, padding: "16px 44px", textDecoration: "none" }}>Call {lead.phone}</a>}
              <button className="cta-btn" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "16px 44px", border: "1.5px solid rgba(255,255,255,0.3)" }}>{cta}</button>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 400 }}>Free estimate · No obligation</span>
            </div>
          </div>
        </section>

        <footer style={{ background: tealDark, padding: "24px clamp(24px,5vw,64px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.22)" }}>© {new Date().getFullYear()} {lead.business_name}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>{[lead.city, lead.phone].filter(Boolean).join(" · ")}</span>
        </footer>
      </div>
      <script dangerouslySetInnerHTML={{ __html: CAROUSEL_SCRIPT(teal) }} />
    </>
  );
}

// ── V5: PHOTO FORWARD ─────────────────────────────────────────────────────────
// Bolder decisions:
// - Full-viewport photo with headline text at 148px — maximum commitment to the image
// - Service background numbers pushed to 240px — make the composition itself the statement
// - Review quotes at 52px — newspaper pull-quote energy
// - CTA: "Let's get to work." at 136px — only 4 words, maximum weight

export function PhotoForwardTemplate(d: TemplateData) {
  const slate = "#1a2332";
  const blue = "#1d4ed8";
  const blueLight = "#eff6ff";
  const { lead, id, headline, tagline, cta, about, services, reviews, heroPhoto, galleryPhotos, yearsEst, usingRealReviews } = d;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .h1{animation:fadeIn .5s ease both;} .h2{animation:fadeUp .75s cubic-bezier(.16,1,.3,1) .15s both;}
        .h3{animation:fadeUp .75s cubic-bezier(.16,1,.3,1) .28s both;} .h4{animation:fadeUp .75s cubic-bezier(.16,1,.3,1) .42s both;}
        .reveal{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1);}
        .reveal.on{opacity:1;transform:none;} .rd1{transition-delay:.07s;} .rd2{transition-delay:.14s;} .rd3{transition-delay:.21s;}
        .gallery-scroll{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .gallery-scroll::-webkit-scrollbar{display:none;}
        .gallery-img{flex-shrink:0;width:420px;height:300px;object-fit:cover;scroll-snap-align:start;}
        .review-track{display:flex;overflow-x:scroll;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .review-track::-webkit-scrollbar{display:none;}
        .review-slide{flex-shrink:0;width:100%;scroll-snap-align:start;}
        .rev-btn{width:40px;height:40px;background:#f1f5f9;border:none;color:${slate};font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;}
        .rev-btn:hover{background:${blue};color:#fff;}
        .cta-btn{transition:opacity .18s;cursor:pointer;} .cta-btn:hover{opacity:.85;}
        /* Enormous background number in services */
        .svc-bg-num{position:absolute;top:-48px;left:-24px;font-family:'Raleway',sans-serif;font-weight:800;font-size:240px;color:${slate};opacity:.04;line-height:1;pointer-events:none;user-select:none;letter-spacing:-0.04em;}
        @media(max-width:720px){
          .svc-grid{grid-template-columns:1fr!important;} .about-grid{grid-template-columns:1fr!important;}
          .gallery-img{width:300px;height:220px;}
        }
      `}</style>

      <div style={{ fontFamily: "'Raleway',system-ui,sans-serif", color: slate, background: "#fff", minHeight: "100vh" }}>

        {/* NAV — transparent over hero */}
        <nav style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 clamp(24px,5vw,64px)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "0.02em" }}>{lead.business_name}</span>
          {lead.phone && <a href={`tel:${lead.phone}`} style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "9px 24px", border: "1.5px solid rgba(255,255,255,0.3)", textDecoration: "none" }}>{lead.phone}</a>}
        </nav>

        {/* HERO — full viewport, text at bottom */}
        <section style={{ position: "relative", height: "100vh", minHeight: 640, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
          {heroPhoto ? (
            <>
              <img src={heroPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${slate} 30%, rgba(26,35,50,0.35) 65%, transparent 100%)` }} />
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${slate} 0%, #2d4a6e 100%)` }} />
          )}
          <div style={{ position: "relative", zIndex: 2, padding: "0 clamp(24px,5vw,64px) 80px", width: "100%" }}>
            {lead.rating && (
              <div className="h1" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <span style={{ color: "#fbbf24", letterSpacing: 2, fontSize: 13 }}>{stars(lead.rating)}</span>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{lead.rating} · {lead.review_count} reviews</span>
              </div>
            )}
            <h1 className="h2" style={{ fontWeight: 800, fontSize: "clamp(56px,10vw,148px)", lineHeight: 0.9, color: "#fff", letterSpacing: "-0.03em", maxWidth: 900, marginBottom: 24 }}>{headline}</h1>
            <p className="h3" style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(15px,1.5vw,18px)", lineHeight: 1.65, maxWidth: 460, marginBottom: 36, fontWeight: 400 }}>{tagline}</p>
            <div className="h4" style={{ display: "flex", gap: 12 }}>
              {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: blue, color: "#fff", fontWeight: 700, fontSize: 14, padding: "13px 36px", textDecoration: "none" }}>Call Now</a>}
              <button className="cta-btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 600, fontSize: 14, padding: "13px 36px", border: "1.5px solid rgba(255,255,255,0.25)", backdropFilter: "blur(4px)" }}>{cta}</button>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ background: slate }}>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 1200, margin: "0 auto" }}>
            {[{ n: `${yearsEst}+`, l: "Years" }, { n: lead.review_count ? `${lead.review_count}+` : "100+", l: "Customers" }, { n: lead.rating ? `${lead.rating}★` : "5.0★", l: "Rating" }, { n: "24h", l: "Response" }].map((s, i) => (
              <div key={i} style={{ padding: "28px 28px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <div style={{ fontWeight: 800, fontSize: "clamp(40px,6vw,80px)", color: "#fff", lineHeight: 0.95, letterSpacing: "-0.02em" }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES — enormous background numbers */}
        <section style={{ background: "#fff", padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontWeight: 800, fontSize: "clamp(44px,7vw,96px)", color: slate, letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: 72 }}>What we do</h2>
            <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0 48px" }}>
              {services.map((s, i) => (
                <div key={i} className={`reveal rd${i + 1}`} style={{ position: "relative", overflow: "hidden", paddingTop: 80, paddingBottom: 40, borderTop: `2px solid ${blue}` }}>
                  <div className="svc-bg-num">{`0${i + 1}`}</div>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <h3 style={{ fontWeight: 700, fontSize: "clamp(18px,2vw,24px)", color: slate, letterSpacing: "-0.01em", marginBottom: 14 }}>{s.name}</h3>
                    <p style={{ fontSize: 14, color: "#666", lineHeight: 1.8, fontWeight: 400 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        {galleryPhotos.length > 1 && (
          <section style={{ background: "#f8fafc", padding: "80px 0 80px clamp(24px,5vw,64px)", overflow: "hidden" }}>
            <h2 className="reveal" style={{ fontWeight: 800, fontSize: "clamp(40px,6vw,88px)", color: slate, letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: 40, maxWidth: 1200 }}>Work we&apos;re proud of</h2>
            <div className="gallery-scroll">
              {galleryPhotos.map((url, idx) => <img key={idx} src={url} alt={`Work ${idx + 1}`} className="gallery-img" />)}
            </div>
          </section>
        )}

        {/* REVIEWS — pull quote at dramatic scale */}
        <section style={{ background: "#fff", padding: "104px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="reveal" style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 64, flexWrap: "wrap" }}>
              <h2 style={{ fontWeight: 800, fontSize: "clamp(44px,7vw,96px)", color: slate, letterSpacing: "-0.03em", lineHeight: 0.95 }}>{usingRealReviews ? "Real reviews" : "Reviews"}</h2>
              {lead.rating && <span style={{ fontSize: 12, color: "#aaa", paddingBottom: 8 }}>{stars(lead.rating)} {lead.rating} on Google</span>}
            </div>
          </div>
          <div id="review-track" className="review-track">
            {reviews.map((r, i) => (
              <div key={i} className="review-slide" style={{ padding: "0 clamp(24px,5vw,64px)" }}>
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                  <div style={{ width: 48, height: 4, background: blue, marginBottom: 36 }} />
                  <p style={{ fontWeight: 700, fontSize: "clamp(24px,4vw,52px)", color: slate, lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 40 }}>&ldquo;{r.text}&rdquo;</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, background: slate, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff" }}>{r.author[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: slate }}>{r.author}</div>
                      <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{r.time_desc}</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: "#fbbf24", fontSize: 14 }}>{"★".repeat(r.rating)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {reviews.length > 1 && (
            <div style={{ display: "flex", gap: 10, padding: "40px clamp(24px,5vw,64px) 0" }}>
              <button className="rev-btn" id="rev-prev">‹</button>
              <div id="rev-dots" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {reviews.map((_, i) => <div key={i} data-dot={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? blue : "#e2e8f0", cursor: "pointer" }} />)}
              </div>
              <button className="rev-btn" id="rev-next">›</button>
            </div>
          )}
        </section>

        {/* ABOUT */}
        <section style={{ background: "#f8fafc", padding: "104px clamp(24px,5vw,64px)" }}>
          <div className="about-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "3fr 2fr", gap: "64px 80px", alignItems: "start" }}>
            <div className="reveal">
              <h2 style={{ fontWeight: 800, fontSize: "clamp(36px,5.5vw,76px)", color: slate, letterSpacing: "-0.03em", lineHeight: 0.9, marginBottom: 28 }}>About {lead.business_name}</h2>
              <p style={{ fontSize: 16, color: "#555", lineHeight: 1.85, fontWeight: 400 }}>{about}</p>
            </div>
            <div className="reveal rd2">
              {["Licensed & fully insured", `${yearsEst}+ years in ${lead.city}`, "Background-checked team", "Workmanship warranty", "Free estimates", "5-star on Google"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ width: 8, height: 8, background: blue, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: slate, fontWeight: 600 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — 4 words, maximum weight */}
        <section style={{ background: blue, padding: "96px clamp(24px,5vw,64px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 className="reveal" style={{ fontWeight: 800, fontSize: "clamp(56px,10vw,136px)", color: "#fff", letterSpacing: "-0.03em", lineHeight: 0.9, marginBottom: 48 }}>
              Let&apos;s get<br />to work.
            </h2>
            <div className="reveal rd1" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {lead.phone && <a href={`tel:${lead.phone}`} className="cta-btn" style={{ background: "#fff", color: blue, fontWeight: 800, fontSize: 15, padding: "16px 44px", textDecoration: "none" }}>Call {lead.phone}</a>}
              <button className="cta-btn" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: 14, padding: "16px 44px", border: "1.5px solid rgba(255,255,255,0.3)" }}>{cta}</button>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 400 }}>Free estimate · No obligation</span>
            </div>
          </div>
        </section>

        <footer style={{ background: slate, padding: "24px clamp(24px,5vw,64px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.18)" }}>© {new Date().getFullYear()} {lead.business_name}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>{[lead.city, lead.phone].filter(Boolean).join(" · ")}</span>
        </footer>
      </div>
      <script dangerouslySetInnerHTML={{ __html: CAROUSEL_SCRIPT(blue) }} />
    </>
  );
}

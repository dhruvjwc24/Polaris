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
  heroVideo: string | null;
  galleryPhotos: string[];
  yearsEst: number;
  usingRealReviews: boolean;
  nicheTitle: string;
}

export function stars(rating: number) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export const FALLBACK_REVIEWS: ReviewSnippet[] = [
  { author: "James M.", rating: 5, text: "Showed up on time, did the job right, left everything spotless. I will absolutely use them again.", time_desc: "a month ago" },
  { author: "Sarah K.", rating: 5, text: "Called in the morning, they were out by noon. Incredibly professional from start to finish.", time_desc: "2 months ago" },
  { author: "Robert T.", rating: 5, text: "Best experience I've had with a local contractor. Transparent pricing, excellent work, no mess.", time_desc: "3 months ago" },
];

// Shared carousel + scroll reveal script
export const PAGE_SCRIPT = (accentHex: string) => `
(function(){
  // ── Scroll reveal ────────────────────────────────────────────────
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('on'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(function(el){ obs.observe(el); });

  // ── Card deck engine ─────────────────────────────────────────────
  function initDeck(stageId, prevId, nextId, dotsId) {
    var stage = document.getElementById(stageId);
    if (!stage) return;
    var cards = stage.querySelectorAll('.dk-card');
    var n = cards.length;
    if (n === 0) return;
    var idx = 0;

    var POS = ['dk-hid','dk-pm2','dk-pm1','dk-p0','dk-pp1','dk-pp2','dk-hid'];

    function posClass(pos) {
      if (pos ===  0) return 'dk-p0';
      if (pos === -1) return 'dk-pm1';
      if (pos ===  1) return 'dk-pp1';
      if (pos === -2) return 'dk-pm2';
      if (pos ===  2) return 'dk-pp2';
      return 'dk-hid';
    }

    function update() {
      cards.forEach(function(card, i) {
        POS.forEach(function(c){ card.classList.remove(c); });
        var raw = ((i - idx) % n + n) % n;
        var pos = raw > n / 2 ? raw - n : raw;
        card.classList.add(posClass(pos));
      });

      // Update photo counter overlay on the new spotlight card
      var photoCounters = stage.querySelectorAll('.ph-counter');
      photoCounters.forEach(function(el, i){ el.style.display = i === idx ? 'block' : 'none'; });

      // Dots
      var dots = document.querySelectorAll('#' + dotsId + ' [data-dot]');
      dots.forEach(function(d, i) {
        var active = (i === idx);
        d.style.background = active ? '${accentHex}' : 'rgba(253,246,232,0.2)';
        d.style.width = active ? '20px' : '6px';
      });
    }

    function go(dir) {
      idx = (idx + dir + n) % n;
      update();
    }

    var prevBtn = document.getElementById(prevId);
    var nextBtn = document.getElementById(nextId);
    if (prevBtn) prevBtn.addEventListener('click', function(){ go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function(){ go(1); });

    // Click adjacent cards to jump
    cards.forEach(function(card, i) {
      card.addEventListener('click', function(){
        if (i !== idx) { idx = i; update(); }
      });
    });

    // Touch swipe
    var startX = 0;
    stage.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; }, {passive:true});
    stage.addEventListener('touchend', function(e){
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1);
    }, {passive:true});

    // Trackpad horizontal scroll — fires immediately when delta crosses threshold,
    // then locks for 400ms (card transition duration) to prevent double-fire.
    var wheelAcc = 0;
    var wheelLocked = false;
    stage.addEventListener('wheel', function(e){
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelLocked) return;
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) > 15) {
        go(wheelAcc > 0 ? 1 : -1);
        wheelAcc = 0;
        wheelLocked = true;
        setTimeout(function(){ wheelLocked = false; }, 280);
      }
    }, {passive: false});

    // Dot clicks
    var dots = document.querySelectorAll('#' + dotsId + ' [data-dot]');
    dots.forEach(function(d){
      d.addEventListener('click', function(){ idx = parseInt(d.dataset.dot); update(); });
    });

    update();
  }

  initDeck('rv-stage', 'rv-prev', 'rv-next', 'rv-dots');
  initDeck('ph-stage', 'ph-prev', 'ph-next', 'ph-dots');
})();
`;

// ── DESIGN TOKENS (from DESIGN.md) ───────────────────────────────────────────
const T = {
  cream:       "#fdf6e8",
  creamMid:    "#f5edd9",
  creamDeep:   "#eadfc8",
  ink:         "#1e1208",
  inkMid:      "#4a3728",
  inkMuted:    "#8a7060",
  inkGhost:    "#b0998a",
  terra:       "#b85c2a",
  terraMid:    "#d06e36",
  terraLight:  "#fbeadc",
  terraGlow:   "#f5d8c0",
  espresso:    "#1e1208",
  espressoMid: "#2d1c0f",
  espressoDark:"#140e06",
  gold:        "#c9860a",
};

// ── WARM NEIGHBORHOOD TEMPLATE ───────────────────────────────────────────────
// Single flagship design system applied to all mockups.
// Niche adaptation is colour-only (accent hex changes, cream palette stays).

export function WarmNeighborhoodTemplate(d: TemplateData) {
  const {
    lead, id, headline, tagline, cta, about,
    services, reviews, heroPhoto, heroVideo,
    galleryPhotos, yearsEst, usingRealReviews,
  } = d;

  // Niche-adaptive accent — overrides terracotta when a niche matches
  function nicheAccent(niche: string): { accent: string; accentMid: string; accentLight: string } {
    const n = niche.toLowerCase();
    if (/landscape|lawn|garden|tree|turf|irrigation|mow|hardscape/.test(n))
      return { accent: "#2d6b58", accentMid: "#3a8a70", accentLight: "#e0f0ea" };
    if (/dental|medic|health|doctor|clinic|ortho|chiro/.test(n))
      return { accent: "#1a6b7a", accentMid: "#1f8899", accentLight: "#d8f0f4" };
    if (/law|legal|attorney|firm/.test(n))
      return { accent: "#6b4a1a", accentMid: "#8a6020", accentLight: "#f0e4c8" };
    if (/salon|spa|beauty|hair|nail|barber/.test(n))
      return { accent: "#8a4060", accentMid: "#a85070", accentLight: "#f5e0ea" };
    // Default: terracotta (roofers, plumbers, HVAC, cleaners, painters, etc.)
    return { accent: T.terra, accentMid: T.terraMid, accentLight: T.terraLight };
  }

  const { accent, accentMid, accentLight } = nicheAccent(lead.niche);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;500;600&family=Source+Serif+4:ital,wght@1,400&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.cream}; }

        /* ── Animations ─────────────────────────────────── */
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .h1 { animation: fadeIn .5s ease .05s both; }
        .h2 { animation: fadeUp .7s cubic-bezier(.16,1,.3,1) .12s both; }
        .h3 { animation: fadeUp .7s cubic-bezier(.16,1,.3,1) .24s both; }
        .h4 { animation: fadeUp .7s cubic-bezier(.16,1,.3,1) .38s both; }
        .h5 { animation: fadeUp .7s cubic-bezier(.16,1,.3,1) .50s both; }

        .reveal { opacity:0; transform:translateY(16px); transition: opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1); }
        .reveal.on { opacity:1; transform:none; }
        .rd1 { transition-delay: .07s; }
        .rd2 { transition-delay: .14s; }
        .rd3 { transition-delay: .21s; }

        /* ── Service card top accent ─────────────────── */
        .svc-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: ${accent};
          border-radius: 16px 16px 0 0;
        }
        .svc-card { transition: border-color .2s, box-shadow .2s; }
        .svc-card:hover {
          border-color: ${T.terraGlow} !important;
          box-shadow: 0 8px 32px rgba(184,92,42,0.1);
        }

        /* ── Buttons ─────────────────────────────────── */
        .btn-primary { transition: background .2s; }
        .btn-primary:hover { opacity: .9; }
        .btn-ghost   { transition: background .2s, border-color .2s; }
        .btn-ghost:hover { background: rgba(253,246,232,0.12); }

        /* ── Card deck ───────────────────────────────── */
        .dk-stage {
          position: relative;
          overflow: visible;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dk-card {
          position: absolute;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          /* transition handles the spotlight animation */
          transition:
            transform 0.48s cubic-bezier(0.16,1,0.3,1),
            opacity   0.48s ease,
            filter    0.48s ease,
            box-shadow 0.48s ease;
          user-select: none;
          -webkit-user-select: none;
        }

        /* center spotlight */
        .dk-card.dk-p0 {
          transform: translateX(0) scale(1) rotate(0deg);
          opacity: 1;
          filter: none;
          z-index: 20;
          box-shadow: 0 28px 72px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06);
        }
        /* adjacent left */
        .dk-card.dk-pm1 {
          transform: translateX(-148px) scale(0.80) rotate(-5deg);
          opacity: 1;
          filter: brightness(0.38);
          z-index: 14;
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }
        /* adjacent right */
        .dk-card.dk-pp1 {
          transform: translateX(148px) scale(0.80) rotate(5deg);
          opacity: 1;
          filter: brightness(0.38);
          z-index: 14;
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }
        /* far left */
        .dk-card.dk-pm2 {
          transform: translateX(-245px) scale(0.62) rotate(-10deg);
          opacity: 0.55;
          filter: brightness(0.18);
          z-index: 8;
        }
        /* far right */
        .dk-card.dk-pp2 {
          transform: translateX(245px) scale(0.62) rotate(10deg);
          opacity: 0.55;
          filter: brightness(0.18);
          z-index: 8;
        }
        /* beyond ±2 — hidden */
        .dk-card.dk-hid {
          opacity: 0;
          pointer-events: none;
          z-index: 1;
          transform: translateX(0) scale(0.5);
        }

        /* ── Overdrive: film grain + breathing glow ─── */

        /* Warm color grade sits above video, soft-lights into it */
        .warm-grade {
          position: absolute; inset: 0; pointer-events: none;
          background: rgba(184,92,42,0.07);
          mix-blend-mode: soft-light;
        }

        /* Film grain — static SVG noise, position-shifted by animation */
        .grain-overlay {
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.038;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
          background-size: 256px 256px;
          animation: grain-shift 8s steps(10, end) infinite;
        }

        @keyframes grain-shift {
          0%   { background-position:   0%   0%; }
          10%  { background-position:  -5%  -10%; }
          20%  { background-position: -15%   5%; }
          30%  { background-position:   7%  -25%; }
          40%  { background-position:  -5%  25%; }
          50%  { background-position: -15%  10%; }
          60%  { background-position:  15%   0%; }
          70%  { background-position:   0%  15%; }
          80%  { background-position:   3%  35%; }
          90%  { background-position: -10%  10%; }
          100% { background-position:   0%   0%; }
        }

        /* Ambient glow breath — applied to radial gradient layers in dark sections */
        @keyframes breathe {
          0%, 100% { opacity: 1;    }
          50%       { opacity: 2.4; }
        }
        .ambient-glow { animation: breathe 6s ease-in-out infinite; }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .grain-overlay { animation: none; }
          .ambient-glow  { animation: none; }
        }

        /* deck nav button */
        .dk-btn {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(253,246,232,0.07);
          border: 1.5px solid rgba(253,246,232,0.15);
          color: ${T.cream}; font-size: 20px;
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: background .2s, border-color .2s;
        }
        .dk-btn:hover { background: rgba(253,246,232,0.14); border-color: rgba(253,246,232,0.32); }

        /* ── Mobile ──────────────────────────────────── */
        @media (max-width:720px) {
          .svc-grid { grid-template-columns: 1fr !important; }
          .about-grid { grid-template-columns: 1fr !important; }
          .trust-grid { grid-template-columns: repeat(2,1fr) !important; }
          .dual-deck-panels { grid-template-columns: 1fr !important; }
          .dk-card.dk-pm1 { transform: translateX(-110px) scale(0.80) rotate(-5deg); }
          .dk-card.dk-pp1 { transform: translateX(110px)  scale(0.80) rotate(5deg);  }
          .dk-card.dk-pm2 { transform: translateX(-185px) scale(0.62) rotate(-10deg); }
          .dk-card.dk-pp2 { transform: translateX(185px)  scale(0.62) rotate(10deg);  }
        }
      `}</style>

      <div style={{ fontFamily: "'Figtree', system-ui, sans-serif", color: T.ink, background: T.cream, minHeight: "100vh" }}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: `rgba(30,18,8,0.95)`, backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 clamp(20px,4vw,52px)", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 16, color: T.cream, letterSpacing: "-0.01em" }}>
            {lead.business_name}
          </span>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ fontSize: 13, fontWeight: 600, color: accentLight, textDecoration: "none", borderBottom: `1px solid ${accentLight}55` }}>
              {lead.phone}
            </a>
          )}
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section style={{ position: "relative", minHeight: "88vh", background: T.espresso, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
          {/* Video background */}
          {heroVideo ? (
            <video autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
              <source src={heroVideo} type="video/mp4" />
            </video>
          ) : heroPhoto ? (
            <img src={heroPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, opacity: 0.4 }} />
          ) : null}

          {/* Warm color grade — soft-light blend over video */}
          <div className="warm-grade" style={{ zIndex: 1 }} />

          {/* Dark gradient overlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            background: `
              radial-gradient(ellipse at 65% 35%, ${accent}28 0%, transparent 55%),
              linear-gradient(to bottom, rgba(30,18,8,0.15) 0%, rgba(30,18,8,0.88) 70%, ${T.espresso} 100%)
            `,
          }} />

          {/* Film grain overlay */}
          <div className="grain-overlay" style={{ zIndex: 3 }} />

          {/* Hero content — anchored bottom-left */}
          <div style={{ position: "relative", zIndex: 4, padding: "0 clamp(24px,5vw,56px) clamp(52px,7vh,84px)", width: "100%", maxWidth: 820 }}>
            {lead.rating && (
              <div className="h1" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <span style={{ color: T.gold, fontSize: 14, letterSpacing: 2 }}>{stars(lead.rating)}</span>
                <span style={{ fontSize: 13, color: "rgba(253,246,232,0.45)", fontWeight: 400 }}>
                  {lead.rating} · {lead.review_count} reviews on Google
                </span>
              </div>
            )}

            {/* Business name — the pride moment */}
            <h1 className="h2" style={{
              fontFamily: "'Bricolage Grotesque',sans-serif",
              fontWeight: 800,
              fontSize: "clamp(48px, 9vw, 112px)",
              lineHeight: 0.93,
              letterSpacing: "-0.025em",
              color: "#ffffff",
              marginBottom: 14,
            }}>
              {headline}
            </h1>

            {lead.city && (
              <div className="h3" style={{ fontSize: 13, fontWeight: 500, color: accentLight, letterSpacing: "0.04em", marginBottom: 18, opacity: 0.85 }}>
                {lead.city}{lead.niche ? ` · ${d.nicheTitle}` : ""}
              </div>
            )}

            <p className="h3" style={{ fontSize: "clamp(15px,1.5vw,17px)", color: "rgba(253,246,232,0.5)", lineHeight: 1.7, maxWidth: 440, marginBottom: 40, fontWeight: 400 }}>
              {tagline}
            </p>

            <div className="h4" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="btn-primary" style={{
                  background: accent, color: "#fff",
                  fontSize: 14, fontWeight: 600,
                  padding: "14px 32px", borderRadius: 8, textDecoration: "none",
                }}>
                  {lead.phone}
                </a>
              )}
              <a href="#" className="btn-ghost" style={{
                background: "rgba(253,246,232,0.08)", color: "rgba(253,246,232,0.82)",
                fontSize: 14, fontWeight: 500,
                padding: "14px 32px", borderRadius: 8,
                border: "1.5px solid rgba(253,246,232,0.16)", textDecoration: "none",
              }}>
                {cta}
              </a>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
        <section style={{ background: accent }}>
          <div className="trust-grid reveal" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 1200, margin: "0 auto" }}>
            {[
              { n: `${yearsEst}+`, label: `Years in ${lead.city || "business"}` },
              { n: lead.review_count ? `${lead.review_count}+` : "100+", label: "Happy customers" },
              { n: lead.rating ? `${lead.rating} ★` : "5.0 ★", label: "Google rating" },
              { n: "Free", label: "Estimates, always" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "28px 24px", borderRight: i < 3 ? "1px solid rgba(30,18,8,0.12)" : "none" }}>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(28px,4vw,48px)", color: "#fff", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SERVICES ─────────────────────────────────────────────────────── */}
        <section style={{ background: T.cream, padding: "clamp(56px,7vw,88px) clamp(24px,5vw,56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="reveal" style={{ marginBottom: 44 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>What we do</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(26px,3.5vw,44px)", color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                Services you can count on
              </h2>
            </div>
            <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {services.map((s, i) => (
                <div key={i} className={`reveal rd${i + 1}`} style={{
                  background: T.creamMid, borderRadius: 16, padding: "32px 28px",
                  border: `1px solid ${T.creamDeep}`, position: "relative", overflow: "hidden",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 16, letterSpacing: "0.04em" }}>0{i + 1}</div>
                  <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: T.ink, letterSpacing: "-0.01em", marginBottom: 10 }}>{s.name}</h3>
                  <p style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.7, fontWeight: 400 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DUAL CARD DECK: Reviews + Photos ─────────────────────────────── */}
        {(reviews.length > 0 || galleryPhotos.length > 1) && (
          <section style={{ background: T.espresso, padding: "clamp(56px,7vw,96px) clamp(24px,5vw,56px)", overflow: "hidden", position: "relative" }}>
            {/* Ambient warm glow — breathing */}
            <div className="ambient-glow" style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 60%, ${accent}16 0%, transparent 65%)`, pointerEvents: "none" }} />

            {/* Section header */}
            <div className="reveal" style={{ maxWidth: 1200, margin: "0 auto 56px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: `${T.cream}44`, marginBottom: 12 }}>
                {usingRealReviews ? "Real Google Reviews" : "Customer Reviews"}
                {lead.rating && ` · ${lead.rating} stars`}
              </div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(26px,3.5vw,44px)", color: T.cream, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                What clients say & what we do
              </h2>
            </div>

            {/* Two-panel grid */}
            <div className="dual-deck-panels" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: reviews.length > 0 && galleryPhotos.length > 1 ? "1fr 1fr" : "1fr", gap: "clamp(32px,5vw,64px)", alignItems: "start" }}>

              {/* ── LEFT: Reviews card deck ── */}
              {reviews.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${T.cream}55`, marginBottom: 32 }}>What they say</div>

                  {/* Deck stage */}
                  <div id="rv-stage" className="dk-stage" style={{ height: 380 }}>
                    {reviews.map((r, i) => (
                      <div
                        key={i}
                        className={`dk-card${i === 0 ? " dk-p0" : i === 1 ? " dk-pp1" : i === reviews.length - 1 ? " dk-pm1" : " dk-hid"}`}
                        style={{ width: 280, background: T.creamMid, padding: "32px 28px 28px" }}
                      >
                        {/* Open quote */}
                        <div style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: 72, lineHeight: 0.7, color: accent, opacity: 0.6, marginBottom: 8, userSelect: "none" }}>&ldquo;</div>
                        {/* Review text */}
                        <p style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontStyle: "italic", fontSize: "clamp(14px,1.2vw,16px)", color: T.ink, lineHeight: 1.65, fontWeight: 400, marginBottom: 28, minHeight: 120 }}>
                          {r.text.length > 200 ? r.text.slice(0, 200) + "…" : r.text}
                        </p>
                        {/* Attribution */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 20, borderTop: `1px solid ${T.creamDeep}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", flexShrink: 0 }}>
                            {r.author[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.author}</div>
                            <div style={{ fontSize: 11, color: T.inkGhost, marginTop: 2 }}>{r.time_desc}</div>
                          </div>
                          <div style={{ color: T.gold, fontSize: 11, letterSpacing: 1.5, flexShrink: 0 }}>{"★".repeat(r.rating)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nav */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
                    <button id="rv-prev" className="dk-btn" aria-label="Previous review">‹</button>
                    <div id="rv-dots" style={{ display: "flex", gap: 6, flex: 1, justifyContent: "center" }}>
                      {reviews.map((_, i) => (
                        <div key={i} data-dot={i} data-deck="rv" style={{ width: i === 0 ? 20 : 6, height: 6, borderRadius: 3, background: i === 0 ? accent : "rgba(253,246,232,0.2)", transition: "all .28s", cursor: "pointer" }} />
                      ))}
                    </div>
                    <button id="rv-next" className="dk-btn" aria-label="Next review">›</button>
                  </div>
                </div>
              )}

              {/* ── RIGHT: Photos card deck ── */}
              {galleryPhotos.length > 1 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${T.cream}55`, marginBottom: 32 }}>Our work</div>

                  {/* Deck stage */}
                  <div id="ph-stage" className="dk-stage" style={{ height: 380 }}>
                    {galleryPhotos.map((url, i) => (
                      <div
                        key={i}
                        className={`dk-card${i === 0 ? " dk-p0" : i === 1 ? " dk-pp1" : i === galleryPhotos.length - 1 ? " dk-pm1" : i === 2 ? " dk-pp2" : i === galleryPhotos.length - 2 ? " dk-pm2" : " dk-hid"}`}
                        style={{ width: 280, height: 300 }}
                      >
                        <img
                          src={url}
                          alt={`${lead.business_name} work ${i + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                        />
                        {/* Bottom label on spotlight card */}
                        {i === 0 && (
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 20px 16px", background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>
                              {`${i + 1} of ${galleryPhotos.length}`}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Nav */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
                    <button id="ph-prev" className="dk-btn" aria-label="Previous photo">‹</button>
                    <div id="ph-dots" style={{ display: "flex", gap: 5, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
                      {galleryPhotos.map((_, i) => (
                        <div key={i} data-dot={i} data-deck="ph" style={{ width: i === 0 ? 20 : 6, height: 6, borderRadius: 3, background: i === 0 ? accent : "rgba(253,246,232,0.2)", transition: "all .28s", cursor: "pointer" }} />
                      ))}
                    </div>
                    <button id="ph-next" className="dk-btn" aria-label="Next photo">›</button>
                  </div>
                </div>
              )}

            </div>
          </section>
        )}

        {/* ── ABOUT ────────────────────────────────────────────────────────── */}
        <section style={{ background: T.cream, padding: "clamp(56px,7vw,88px) clamp(24px,5vw,56px)" }}>
          <div className="about-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,80px)", alignItems: "start" }}>
            <div className="reveal">
              <div style={{ fontSize: 12, fontWeight: 600, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>About us</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(26px,3.5vw,44px)", color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 20 }}>
                {lead.business_name}
              </h2>
              <p style={{ fontSize: 16, color: T.inkMid, lineHeight: 1.85, fontWeight: 400 }}>{about}</p>
            </div>
            <div className="reveal rd2" style={{ display: "flex", flexDirection: "column" }}>
              {[
                "Licensed & fully insured",
                `${yearsEst}+ years in ${lead.city || "the area"}`,
                "Background-checked team",
                "Workmanship warranty on every job",
                "Free estimates — no obligation",
                "5-star rated on Google",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${T.creamDeep}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section style={{ background: T.espresso, padding: "clamp(64px,9vw,104px) clamp(24px,5vw,56px)", position: "relative", overflow: "hidden" }}>
          <div className="ambient-glow" style={{ position: "absolute", top: 0, right: 0, width: "50%", height: "100%", background: `radial-gradient(ellipse at 80% 50%, ${accent}22 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
            <h2 className="reveal" style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(40px,7vw,88px)", color: T.cream, letterSpacing: "-0.025em", lineHeight: 0.95, marginBottom: 28, maxWidth: 680 }}>
              Ready to get started?
            </h2>
            <p className="reveal rd1" style={{ fontSize: 15, color: "rgba(253,246,232,0.4)", marginBottom: 36, fontWeight: 400 }}>
              Call us or request a free estimate — no pressure, no obligation.
            </p>
            <div className="reveal rd2" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="btn-primary" style={{ background: accentLight, color: accent, fontSize: 14, fontWeight: 700, padding: "14px 32px", borderRadius: 8, textDecoration: "none" }}>
                  Call {lead.phone}
                </a>
              )}
              <a href="#" className="btn-ghost" style={{ background: "rgba(253,246,232,0.08)", color: "rgba(253,246,232,0.75)", fontSize: 14, fontWeight: 500, padding: "14px 32px", borderRadius: 8, border: "1.5px solid rgba(253,246,232,0.16)", textDecoration: "none" }}>
                {cta}
              </a>
              <span style={{ fontSize: 13, color: "rgba(253,246,232,0.28)", fontWeight: 400 }}>Free estimate · No obligation</span>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ background: T.espressoDark, padding: "28px clamp(24px,5vw,56px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(253,246,232,0.2)", letterSpacing: "0.01em" }}>
            © {new Date().getFullYear()} {lead.business_name}
          </span>
          <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(253,246,232,0.12)" }}>
            {[lead.city, lead.phone].filter(Boolean).join(" · ")}
          </span>
        </footer>

      </div>

      <script dangerouslySetInnerHTML={{ __html: PAGE_SCRIPT(accent) }} />
    </>
  );
}

// Re-export under the old variant names so page.tsx import doesn't break.
// All variants now use the single Warm Neighborhood system.
export const DarkPremiumTemplate      = WarmNeighborhoodTemplate;
export const BoldEditorialTemplate    = WarmNeighborhoodTemplate;
export const CleanLightTemplate       = WarmNeighborhoodTemplate;
export const PhotoForwardTemplate     = WarmNeighborhoodTemplate;

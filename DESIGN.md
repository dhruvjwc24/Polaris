# Design System — Polaris Mockup Templates

## Product Context
- **What this is:** Custom landing page mockups for local home service businesses, sent as cold outreach
- **Who it's for:** Business owners 40–65, non-technical, opening on iPhone
- **Space/industry:** Local trades — roofers, plumbers, HVAC, landscapers, cleaners, painters
- **Project type:** Marketing site / brand landing page — the mockup IS the product

## Emotional North Star
**"This is mine — someone actually built this for me."**
Every design decision serves this feeling. Not premium, not aggressive. Personal, specific, crafted.

## Aesthetic Direction
- **Direction:** Warm Neighborhood Editorial
- **Decoration level:** Intentional — warm grain on dark sections, terracotta top borders on cards, italic serif for reviews
- **Mood:** Like a well-made neighborhood magazine, or the menu from a restaurant you trust. Warm, photo-led. A boutique studio made this for a business they care about.
- **Physical object:** A business card you keep because it feels good in your hand. Thick stock, warm color. Not a printout.
- **Anti-references:** Cold tech aesthetic, aggressive contractor billboards, AI-obvious templates, WordPressish cheap local sites

## Typography

- **Display/Hero:** Bricolage Grotesque 700/800 — modern humanist variable font, mixed case (NEVER all-caps). Confident without aggressive. When a business owner sees their name in this, it reads as "someone chose this for me."
- **Body:** Figtree 400/500 — warm geometric sans with slightly rounded terminals. Readable on mobile, approachable, nothing like Inter.
- **Pull Quotes (reviews):** Source Serif 4 400 italic — warm literary serif for review spotlight text only. Creates the "handpicked, not automated" feeling.
- **Loading:** Google Fonts — `family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;500;600&family=Source+Serif+4:ital,wght@1,400`

### Scale
- Hero / business name: `clamp(52px, 9vw, 112px)` — this is the pride moment
- Section headings: `clamp(26px, 3.5vw, 44px)`
- Review pull quote: `clamp(20px, 2.8vw, 34px)` italic
- Body: `16–17px`
- Labels/eyebrows: `12px`, 600 weight, 0.1em letter-spacing, uppercase
- Ratio: ~7:1 hero-to-body (committed scale jump)

### Rules
- Mixed case on ALL headlines — never text-transform: uppercase on display type
- Letter-spacing on headlines: -0.02em to -0.025em (tight, confident)
- Headline line-height: 0.92–1.05 (tight)
- Body line-height: 1.75–1.85

## Color

- **Approach:** Committed warm palette — terracotta as the dominant accent, espresso dark for depth
- **Background (light sections):** `#fdf6e8` — golden cream, not pure white. Pure white screams template.
- **Surface (cards, secondary):** `#f5edd9` — cream tan
- **Surface deep (gallery bg):** `#eadfc8`
- **Ink (primary text):** `#1e1208` — warm espresso brown, not cold black
- **Ink mid (body copy):** `#4a3728`
- **Ink muted (metadata):** `#8a7060`
- **Ink ghost (very subtle):** `#b0998a`
- **Accent (terracotta):** `#b85c2a` — earthy, established, inviting. Used for: trust strip bg, card borders, CTA buttons, credential dots, eyebrow labels, quote marks
- **Accent mid:** `#d06e36`
- **Accent light:** `#fbeadc` — for hover states, light chip backgrounds
- **Accent glow:** `#f5d8c0` — card hover borders
- **Dark sections:** `#1e1208` (hero, CTA) and `#2d1c0f` (review section)
- **Star/gold:** `#c9860a` — rating stars and review stars only

### Niche Adaptation
The terracotta default works for most trades. Niche overrides live in `page.tsx` `getNicheAccent()`. When a niche-specific accent is used, it replaces `--terra` throughout while the cream palette stays constant.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — generous breathing room, not sparse
- **Section padding:** `clamp(56px, 7vw, 88px)` vertical, `clamp(24px, 5vw, 56px)` horizontal
- **Card inner padding:** 32px top/bottom, 28px sides
- **Gap between cards:** 16px
- **Trust strip cells:** 28px vertical, 24px horizontal

## Layout
- **Approach:** Left-aligned throughout. Nothing centered unless it has a specific reason.
- **Hero:** Full-bleed dark (video background), text anchored bottom-left. Business name spans left ~75% of viewport.
- **Content sections:** Max-width 1200px, centered container
- **About section:** 1fr / 1fr grid — story paragraph left, credential list right
- **Services:** 3-column grid on desktop, 1-column mobile
- **Gallery:** Masonry-style 2fr / 1fr / 1fr on desktop
- **Border radius:** Cards 16px, buttons 8px, gallery cells 16px. No border-radius on the frame (sharp edges feel premium on the overall mockup container)

## Motion
- **Approach:** Intentional — scroll reveals for content sections, no entrance theatrics
- **Reveal:** `opacity: 0 → 1`, `translateY(16px → 0)`, 0.65s `cubic-bezier(0.16, 1, 0.3, 1)`, staggered 0.07s per element
- **Hover states:** 0.2s ease on background color, border color. No transform on hover (keeps it calm)
- **Video:** Hero background video plays on loop, muted, `object-fit: cover`. Dark overlay ensures text is always readable.
- **Never:** Bounce easing, elastic, dramatic entrance animations, parallax

## Section Structure (in order)
1. **Sticky Nav** — business name (Bricolage 700, 16px) + phone number (right, terracotta underline link)
2. **Hero** — video bg, business name in Bricolage 800, rating badge, location kicker, tagline, phone CTA (terracotta) + ghost estimate button
3. **Trust Strip** — terracotta bg, 4 stats (years / customers / rating / free estimates), numbers in Bricolage 700
4. **Services** — cream bg, eyebrow + section heading, 3 cards with terracotta top border
5. **Gallery** — cream-mid bg, masonry grid of Google Maps photos (shown only if ≥2 photos)
6. **Review Spotlight** — espresso-mid dark bg, "Real Google Reviews" eyebrow, Source Serif 4 italic pull quote, attribution row
7. **About** — cream bg, 2-column: story paragraph + credential checklist with terracotta dots
8. **CTA** — espresso dark bg, "Ready to get started?" heading, phone CTA + ghost estimate button
9. **Footer** — darkest espresso `#140e06`, business name + city + phone

## Component Tokens

### Buttons
- Primary: `background: #b85c2a`, `color: #fff`, `font-family: Figtree`, `font-size: 14px`, `font-weight: 600`, `padding: 14px 32px`, `border-radius: 8px`
- Ghost: `background: rgba(light, 0.08)`, `color: rgba(light, 0.82)`, `border: 1.5px solid rgba(light, 0.16)`, same padding

### Cards (service)
- `background: #f5edd9`, `border-radius: 16px`, `padding: 32px 28px`, `border: 1px solid #eadfc8`
- Top accent: `border-top: 3px solid #b85c2a` (via `::before` pseudo)
- Hover: `border-color: #f5d8c0`, `box-shadow: 0 8px 32px rgba(184,92,42,0.1)`

### Review Quote
- Container: `background: #2d1c0f`, radial warm glow at top-right
- Eyebrow: 11px, 0.1em tracking, uppercase, `rgba(cream, 0.45)`
- Open quote mark: Source Serif 4, 120px, terracotta, 0.5 opacity
- Quote text: Source Serif 4 italic, `clamp(20px, 2.8vw, 34px)`, cream, line-height 1.55
- Attribution: 44px avatar circle (terracotta bg), name in Figtree 600 cream, time in cream/38%, stars right-aligned amber

### Credential List
- Each item: `display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid #eadfc8`
- Dot: `width: 8px; height: 8px; border-radius: 50%; background: #b85c2a`
- Text: Figtree 500, 14px, `#1e1208`

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-17 | Warm Neighborhood direction approved | Prospect said "this is mine" feeling is the north star. Terracotta + cream + espresso creates warmth without being cheap. Replaces aggressive black/gold/all-caps previous system. |
| 2026-05-17 | Mixed case on all headlines | All-caps reads as "template." Mixed case reads as "designed for this business specifically." |
| 2026-05-17 | Source Serif 4 italic for reviews | Pull quote in italic serif feels handpicked, not automated. Contrast between display grotesque and serif creates editorial quality. |
| 2026-05-17 | Golden cream background (#fdf6e8) | Pure white screams template. Warm cream reads as intentional choice. Every competitor uses white. |
| 2026-05-17 | Terracotta (#b85c2a) as primary accent | Earthy, established, inviting. Works for most home service niches. Replaces cold navy/generic blue defaults. |

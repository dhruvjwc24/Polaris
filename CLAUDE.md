# Polaris: Local Services Website Sales System

## Core Philosophy

Flip the traditional sales playbook for local business services. Instead of lead lists → cold calls → generic templates → weeks of follow-up, build a finished product **first**, then show it to prospects. They decide whether to buy **this specific thing**, not whether to "start a project."

The prospect opens their email and sees a working, branded, custom-built website mockup with a video walkthrough. No imagination required. No discovery calls needed before the first touch.

**Key insight:** The decision shifts from "should we build something?" to "do you want this exact thing?" This changes everything about the conversation dynamics.

---

## The Stack

Four tools, one workflow, entire pre-sales process in an afternoon:

1. **Google Maps** — Find local businesses with outdated/missing websites
2. **Claude** — Personalized outreach copy + site briefs in batch prompts
3. **Lovable** — Build working hosted landing page mockups in ~5 minutes
4. **Higgsfield** — Generate 10-second cinematic vertical demo videos

No AI mentions in outreach. Prospects care about results, not your tools.

---

## Target Niches

**Sweet spot:** Owner-operated, non-technical, website is critical to revenue.

**Best targets:**
- Roofers, landscapers, plumbers, fence installers, chimney repair
- HVAC, dental practices, salons
- Law firms, real estate agents, photographers, event venues

**Avoid:**
- E-commerce, franchises, national chains
- Businesses where the owner is not the decision maker
- Highly competitive/already crushing it online

---

## Lead Generation: The Vetting Pattern

### Finding Leads (Google Maps)

1. **Narrow your search query.** Not "dentists in Austin" → "cosmetic dentists in West Austin"
2. **Skip the top 3-4 results.** Those are crushing it already, no urgency to change.
3. **Look for the sweet spot:**
   - Established: 5+ years on the map
   - Low reviews: <50 reviews
   - Outdated or missing website (or button opens 2014-era site)
   - Solid reviews **despite** bad online presence
4. **These are gold mines.** Owners grinding offline for years, never upgraded online. The gap is dramatic.

### Prospect List Template

For each business, capture:
- Business name
- Current website (or "none")
- Phone number
- Location
- One specific detail (standout review, unique service, profile observation)

**Goal:** 25-30 leads per niche, per city, in one session.

### Enrich with Claude (Prompt)

```
You are a senior local marketing strategist. For each business in 
the list below, add:

- A one-line read on what is wrong with their current online presence
- A unique angle I could use in outreach based on what I noted
- The specific gap a new website would close

Format as a clean markdown table with the original columns plus 
your additions. Keep it sharp, no buzzwords, no fluff.

Here is the list:
[paste your raw list]
```

Output: Structured prospect list with personalized hooks for every business.

---

## Step 2: Generate Personalized Outreach & Site Briefs

### Claude Batch Prompt

```
You are a senior local marketing strategist. For each business in 
the list below, generate three deliverables:

1. Diagnosis (50 words): what is wrong with their current online 
presence and what revenue is leaking because of it. Be concrete, 
no buzzwords.

2. Site brief (100 words): hero angle, key services to highlight, 
tone that fits the industry, the call to action that will convert, 
one design choice that sets them apart from local competitors.

3. Cold message (under 70 words): opens with one specific observation 
about THIS business, references their actual service or location, 
ends with a soft ask to see a mockup. Sound like a real person who 
looked them up. No corporate language. No mention of AI tools.

Format as a clean table I can paste into a CRM.

**Avoid:**
- Buzzwords, corporate language, AI mentions
- Generic observations
- One-size-fits-all copy

Here is the list:
[paste CSV]
```

Output: 70-word cold messages, 100-word site briefs, 50-word diagnoses. One table, ready for CRM.

---

## Step 3: Build Mockups in Lovable (Top 5-8 Leads Only)

**Do NOT build for all 30 leads.** Build only for:
- Leads with most specific diagnoses
- Highest-rated businesses
- Most dramatic before/after potential
- Likely responders

### Lovable Prompt Template

```
Build a landing page for [business name], a [specific business type] 
in [city].

Audience: [describe specifically].
Brand feel: [3 specific adjectives].
Hero focus: [angle from Claude's brief].

Sections in order:
1. Hero with primary CTA
2. Three core services
3. About with credibility positioning
4. Social proof / testimonials placeholder
5. Final CTA section

Design: [specific color palette, not "modern"], generous whitespace, 
mobile-first, subtle scroll animations, no flashy effects.

Tone: [specific to industry].

Avoid: AI-looking gradients, generic stock photos, "Welcome to" 
headlines, "Your trusted partner" copy.
```

**Output:** Live URL, ready to link in outreach.

---

## Step 4: Generate Demo Videos in Higgsfield

Static images get ignored. 10-second vertical video gets replies.

### Video Prerequisites

- Capture 3-5 screenshots from Lovable mockup: hero, services, about, social proof, CTA

### Higgsfield Prompt

```
Create a 10-second cinematic walkthrough using these landing page 
mockup images.

Camera: slow zoom on hero (2 seconds), smooth pan to services, 
gentle ease into about, end on final CTA with soft fade.

Style: premium, cinematic, professional. Subtle motion on text. 
Soft depth of field. Modern editorial feel.

Format: 9:16 vertical, 1080x1920.

Avoid: dramatic zooms, fast cuts, aggressive color grading.
```

**Critical:** Vertical format (9:16). Most prospects open emails on phones. Vertical plays inline like native content. Horizontal feels like an attachment—gets ignored.

---

## Step 5: Outreach & Closing

### The Core Message Format

```
Hey [first name], built you a quick site mockup based on what 
I saw on your Google profile.

[One specific observation that proves you actually looked.]

10-second walkthrough: [Higgsfield video link]
Full preview: [Lovable URL]

If it looks close to what you would want, happy to chat. 
If not, no worries.

[Your name]
```

**Rules:**
- Under 70 words total
- **Never mention AI, Claude, Lovable, or tools used.** Prospect cares about results.
- Open with proof you looked them up (specific review, service detail, location insight)
- Video sells. Link proves you did the work.
- Soft close removes pressure.

### Subject Lines That Work

- "Built something for [business name]"
- "Quick mockup for [business name]"
- "Saw your reviews, made you something"

### Subject Lines That Get Deleted

- "Quick question"
- "Improving your website"
- "Free consultation"

### Channel Selection by Niche

| Niche | Primary Channel | Secondary |
|-------|---|---|
| Contractors, trades, plumbers | SMS | Phone |
| Salons, restaurants, visual | Instagram DM | Email |
| Law firms, financial, B2B | LinkedIn | Email |
| HVAC, cleaners | Phone | SMS |
| Most others | Email | — |

### Follow-Up Sequence

- **Day 0:** Initial outreach (video + link)
- **Day 4:** First follow-up if no reply
  ```
  Write two follow-ups for this prospect, both under 50 words. 
  Message 1: reference a specific gap in their current site. 
  Message 2: reference what a competitor is doing better. 
  Same tone as the original. No AI mentions.
  ```
- **Day 11:** Second follow-up if no reply
- **After Day 11:** Archive the lead if no response

---

## Closing: The Zoom Call

The mockup is the icebreaker. The Zoom call closes.

**When they reply positively:**
1. Get them on a 10-15 minute Zoom
2. Walk through the mockup on screen
3. Ask what they would change
4. Take notes
5. Quote on the spot

**Why it works:** By the Zoom call, they've already imagined themselves with the new site. They're not deciding whether to buy "a website"—they're deciding whether to buy **this specific website**.

**Close rate from positive reply:** 30-50%

---

## The Math

### Send 30 personalized sequences in one weekend:

- Reply rate: 10-15% → 3-4 positive replies
- Close rate: 30-50% of replies
- **Result:** 1-2 closed deals per weekend

### Revenue Models

**Monthly recurring (MRR):**
- Per weekend: $500-1,000 new MRR
- Two weekends/month: $2,000-4,000 new MRR
- Six months: $12,000-24,000 monthly recurring

**One-time deals:**
- Per weekend: $2,500-10,000 cash
- Compounding: repeatable every weekend

---

## Key Principles

1. **Show, don't tell.** Prospect sees a finished product, not a proposal.
2. **Specific beats generic.** Every message references something real about their business.
3. **Tools are invisible.** No mention of AI, automation, or software. Results only.
4. **Quality over volume.** Build mockups only for top 5-8 leads, not all 30.
5. **Vertical video matters.** 9:16 format plays native in email, gets opened, gets watched.
6. **Soft close wins.** Remove pressure. "If not, no worries" outperforms pushy CTA.
7. **Speed is the feature.** Entire pipeline from Google Maps to demo video in one afternoon.
8. **Ask on Zoom, not email.** Price quotes happen on the call, not before.

---

## Implementation Checklist

- [ ] Pick a niche and city
- [ ] Find 25-30 leads on Google Maps (use vetting pattern)
- [ ] Enrich leads with Claude (diagnosis, angle, gap)
- [ ] Generate outreach copy + site briefs for all leads
- [ ] Build Lovable mockups for top 5-8
- [ ] Generate Higgsfield videos (9:16 vertical)
- [ ] Craft cold messages (under 70 words, no AI mention)
- [ ] Send outreach (email, SMS, or DM per channel)
- [ ] Day 4: Follow-up if no reply
- [ ] Day 11: Second follow-up if no reply
- [ ] When reply arrives: Schedule Zoom within 24 hours
- [ ] Zoom: Walk mockup, ask for changes, quote on spot

---

## Success Metrics

- **Reply rate:** 10-15% baseline
- **Close rate:** 30-50% of positive replies
- **Time to first deal:** 1-2 weekends
- **Revenue per weekend:** $500-$10,000+ (depends on model)
- **Repeatability:** Same workflow scales across niches and cities


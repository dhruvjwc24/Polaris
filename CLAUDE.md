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

## Targeting: No-Website Leads Only

**2026-09-21 pivot, supersedes the "outdated site beats no site" scoring rationale below and
in `lib/leads/scoring.ts`.** Cyril looked at real 6-7/10 existing websites some outdated-site
leads had and found they beat the generic mockup template — real businesses add their own
structure/content per-business (extra nav tabs, groupings, specific info) that a template can't
guess or replicate. Businesses that already have a website, at any age/quality, are no longer a
target at all — only no-website businesses are.

**What changed:**
- `pipelineRunner.ts` stage 3 (mockup building) only pulls leads with `website_url IS NULL`.
- Filtering net, part 1 (`lib/leads/reachability.ts` → `deleteHasWebsiteLeads`, runs every
  scheduler tick): any lead that already has a website gets hard-deleted, not archived — it
  should never have become a lead under the new targeting. Ran once manually on 2026-09-21,
  removing 73 of 83 existing leads (including 1 that had already been emailed — accepted loss,
  not worth keeping a thread for a target we no longer pursue).
- Outreach email body now always appends a static (non-AI-generated) line offering to add or
  change anything the business wants — since the mockup is now a generic template, not
  tailored to what that specific business already had on their old site.

**Scoring rubric, settled 2026-09-22** (`lib/leads/scoring.ts`) — website presence/age is gone
from scoring entirely now (it's a pure in/out filter elsewhere, not a point spread). Two layers:

1. **`isLeadEligible()` — hard cutoffs, checked before a lead is even scored.** Fails any of
   these → never becomes a lead (discovery/import skip it) or gets hard-deleted if one slips
   through (`deleteIneligibleLeads`, every scheduler tick): **≤15 reviews** (lowered from 20 on
   2026-09-22 — most rejected leads were failing on review count specifically, not rating, and
   companies under ~50 reviews correlated strongly with having no website at all, so 20 was
   excluding good candidates), no/zero rating, or under 6 months established.
2. **`scoreLead()` — spread among leads that already passed #1**, base 5: reviews `16-50 → +1`,
   `51+ → +2` (the 15 in #1 stays the only exclusion cutoff — this is a bonus tier on top of it,
   confirmed 2026-09-22 after briefly being collapsed to a flat +1); rating `<3 → -1`, `3.x →
   +0`, `4+ → +1`; tenure `≥1yr → +1` (else +0). Search position (confirmed keep 2026-09-22 —
   a no-website business still ranking near the top of Places search is a well-known,
   well-trafficked business, more likely to actually want a site) adds up to +2 more. Floor is
   5 (worst eligible combo), but 5 itself is excluded too — **`deleteLowScoreLeads` deletes
   anything under 6, only 6+ gets built.**

**Data freshness (`lib/leads/refreshLeadData.ts`), added 2026-09-22 — real bug found and
fixed:** a lead showed 19 reviews in the DB; Cyril checked it live on Google Maps and it was
actually 13. Live Places API confirmed 13 too — the stored number had simply gone stale (Google
review counts drift over time as reviews get added/purged), and nothing ever re-checked a lead
after discovery day. `refreshLeadData()` now runs first thing every scheduler tick, before any
filtering-net decision: re-fetches review_count/rating/website_url from Places for every active
`source='google_places'` lead and recomputes `priority_score` off the fresh numbers (search
position is persisted at discovery in `search_position` — migration
`015_search_position.sql` — specifically so a refresh can reuse it instead of silently zeroing
that bonus out every 15 minutes).

**Known gap: tenure (`years_established`) is currently always null for Google-Places-discovered
leads** — Places has no such field and nothing computes an estimate. It's only ever populated
via manual CSV import (`importService.ts`), and those rows are `source='manual'`, already
exempt from all three filtering nets (see below). `deleteIneligibleLeads`'s SQL deliberately
omits the tenure check for this reason (also: `leads.years_established` is an `int` column,
can't hold the 0.5-year/6-month cutoff without applying `supabase/migrations/014_years_established_numeric.sql`
first — not urgent given the above, but needed if a real tenure source for automated leads ever
gets built). `isLeadEligible`/`scoreLead` still handle it correctly (null = unknown, never
excludes or penalizes) for when that data does exist.

**Pitching the multi-page capability** — Cyril found a real competitor site
(woodbridgeroofers.com) with nav tabs for Services/Materials/Financing/Service Areas/Blog, each
a distinct page with real (if AI-generated-looking) per-page content. The generic mockup
template can't replicate that automatically since it doesn't know what a specific business
wants, so: (1) outreach emails and follow-ups (`gmailService.ts`, `followUpService.ts`) always
append a static line offering to add pages like that; (2) `/examples` is a small page Cyril
maintains himself (`reference_examples` table, migration `016_reference_examples.sql`) to pull
up live on a call/Zoom as "I can build you this too"; (3) **mention this verbally in every
call/meeting too** — it's not just an email line, Cyril should say it out loud when presenting a
mockup, since the generic look is the one honest weakness of the template approach and this is
the answer to it.

**All three filtering-net functions (`lib/leads/reachability.ts`: `deleteHasWebsiteLeads`,
`deleteLowScoreLeads`, `deleteIneligibleLeads`) exclude `source='manual'` leads** — those are
Cyril's own hand-picked "Create Website Request" cold-call entries, a deliberate human override
of the automated qualification rules, often with no review_count/rating filled in at all. Never
apply these nets to manual-source leads.

One-time retroactive cleanup ran 2026-09-21: deleted 73 has-website leads (of 83), then 6 more
that failed the new eligibility bar, leaving 2 real automated leads (Direct Roofing Company,
GLS Tech Electrical Contractor, both rescored to 7 under the new formula) plus 2 manual-source
fixtures (`Reply Detection Test`, `TEMPLATE PREVIEW Roofing Co` — a template reference lead,
not a real prospect) that are exempt from all nets regardless of score.

**Already built and unaffected by this pivot:** the Kanban view (`components/KanbanBoard.tsx`)
already groups leads into New → Building → Outreach → Replied → Closed, matching what Cyril
described wanting — no changes were needed there.

## Contact Data Requirement

Every lead must carry a phone number if it has no email — a lead with neither is flagged
`needs_contact_review` (`lib/leads/reachability.ts`, run on every pipeline tick), never
archived/deleted automatically, so any lead still active in the pipeline is guaranteed to have
at least one. Google Places nearly always returns a phone, so this holds naturally today; if a
future contact-discovery path can produce a lead with no email and no phone captured, fix that
at the source rather than relying only on the flag-after-the-fact backstop.

**Needs Contact Info tab** (`/leads/needs-review`): leads with neither email nor phone. Has a
"Search Again" button (`discoverContacts`) that also picks up Facebook/Instagram links as a
byproduct even when it doesn't find email/phone — those now show as columns in the table. If a
re-search still finds nothing at all (no email, phone, or social), the lead is deleted
automatically (`app/api/leads/recheck-contact/route.ts`) rather than sitting there forever.
Otherwise it's Cyril's call: fill something in, delete it, or (if social was found) message the
business on Facebook/Instagram himself — never automate DMs to cold prospects there; sending
from his own account with his own hands is what keeps that channel spam-risk-free.

## Manual Outreach Pile — Phone-Only Leads

Leads with a phone but no email (`status='video_ready'`, `email IS NULL`, `phone IS NOT NULL`)
never go through automated outreach at all — deliberately no automated SMS sender was built.
Cold/automated texting a number sourced from Google Places (no prior consent) is TCPA
territory in the US (statutory damages per text), a materially different risk than the Gmail
warm-up concern above, so this stays 100% manual: Cyril calls/texts these himself from his own
phone, then marks each one contacted.

- `/leads/manual-outreach` — the pile, sorted by `priority_score` desc; score ≥8 is flagged
  "do first" but everything in this list is manual regardless of score.
- "Mark Contacted" button sets `manual_contact_done=true` (and `status='outreach_sent'`) so a
  handled lead drops out instead of nagging forever.

**When a session opens Polaris:** run `npm run manual-pile:status` alongside the video-queue
check below. If it prints a number greater than 0, remind Cyril: "There are N leads waiting in
your manual outreach pile (phone only, no email) — want the list?" before proceeding. If 0,
skip this prompt entirely.

## DB Migrations

All migrations through `017_opted_out.sql` are applied and confirmed live (verified directly
against the DB 2026-09-22 — this section previously said 013-017 were pending, which was stale;
013-016 had actually been applied earlier, and 017 was applied same-day as it was written). This
environment has no `supabase` CLI or direct Postgres connection — any future migration file
needs Cyril to apply it himself in the Supabase SQL editor, one at a time, in order.

**When a session opens Polaris and adds a new migration file:** don't assume it's applied just
because the file exists in the repo — verify directly against the DB (a query against the new
column/table erroring "does not exist" means it's still pending) rather than trusting this
section's prose, which has gone stale before.

## Video Queue

Every "Generate Video" click (and the campaign auto-pipeline's video step) writes to a
`video_generation_queue` table instead of generating inline. A background worker started
from `instrumentation.ts` (`lib/video/queueWorker.ts`) drains it one job at a time, whenever
the Next.js server process is actually running — that's the only real "online" signal
available, since a Claude Code session has no way to broadcast its own liveness to the app.
The UI (`components/VideoQueuePanel.tsx`, `LeadActions.tsx`) shows worker status, per-job ETA,
and a "Claude is currently offline" toast (auto-dismisses after 6s) when a video is queued
while the worker is offline — the job still queues regardless, it's purely informational.

**When a session opens Polaris:** before doing anything else, run `npm run queue:status`,
`npm run manual-pile:status` (see "Manual Outreach Pile" above), and `npm run gmail:check`. If
the video queue prints a number greater than 0, ask: "There are N videos queued to have their
walkthrough video generated — should I start with this first?" before proceeding. If it prints
0, skip this prompt entirely and continue normally. Starting the dev server (`npm run dev`)
brings the worker online and it will drain the queue on its own — no manual per-video action
needed once the server is up. If `gmail:check` prints `DEAD: ...` instead of `OK`, tell Cyril
immediately and offer to run `npm run gmail:reauth` (needs him to open a URL and log in, so wait
for him before running it) — but also treat it as worth investigating now, not an expected
weekly chore: the OAuth app was moved to "In production" 2026-09-22 specifically to stop the
7-day expiry (see "OAuth `invalid_grant` — Fixed" above), so a fresh `DEAD` after that date
means something else broke, not the old known issue.

## Outreach Rate Limiting — Built, Live

`lib/outreach/rateLimiter.ts` caps all outbound email (cold outreach, follow-ups, Calendly
booking emails) against one shared daily budget, ramping ~5/day to start up to ~20/day after
about a week (`OUTREACH_RAMP_*` env vars, defaults in the file). Cyril considers getting the
sending account (`polarisoutreach.co@gmail.com`) flagged as spam or banned by Gmail **the
single biggest risk in this project**, so this cap is a hard requirement, not a nice-to-have —
don't raise the ramp defaults or bypass `canSendOutreachEmail()` without his explicit go-ahead.

As of 2026-09-21 the `manual_outreach_only` blanket pause has been **lifted** on all leads
(82 leads), so the scheduler's cold-outreach stage is now live and rate-limited rather than
paused. He also plans to build the sending account's general legitimacy himself (ordinary
signups/personal email use, not just cold outreach) — that part is on him, not automated.
See the `project-polaris-email-deliverability-warmup` memory for full detail.

**Send-spreading, added 2026-09-22:** the daily cap alone still let every eligible lead send
back-to-back within one scheduler tick — a burst pattern that's a spam signal independent of
the daily total (deliverability research finding). `pipelineRunner.ts` stage 8 now pulls only
`.limit(1)` lead per tick, so a day's sends spread across many 15-minute ticks instead of firing
at once. **Cold outreach email body is also down to one link** (`gmailService.ts`) — the mockup
preview only, video walkthrough link dropped, per the same research (multiple links hurts
deliverability).

## `lovable_url` Resolves to localhost — Not a Blocker, By Design

**Found 2026-09-22, initially misread as a hard blocker — it isn't. Corrected same day.**
`NEXT_PUBLIC_APP_URL` is never set, and the scheduler calls `runPipeline()` with no `baseUrl`
(`lib/pipeline/scheduler.ts`), so every mockup's `lovable_url` resolves to
`http://localhost:3000/mockups/...` — inaccessible to anyone outside Cyril's own machine.

**This is fine as-is.** The intended flow (Cyril, 2026-09-22): the cold email only ever needs
to carry the **video** (`video_url`, hosted on Supabase storage — a real public link, works for
any recipient). `lovable_url` is never meant to be clicked by the prospect directly from a cold
email at all — it's for Cyril himself, live, sharing his own screen on a Google Meet once
someone replies interested, where `localhost:3000` works fine because it's his own machine.
`gmailService.ts`'s `buildBody()` now sends only `video_url`, never `lovable_url` — see its
comment. **Do not "fix" this by switching the email back to `lovable_url`, and do not treat
deploying Polaris publicly as urgent for this reason** — it isn't, given this flow. Deploying it
would still be a nice-to-have longer-term (e.g. if the flow ever changes to "here's a link to
explore on your own"), but it's not blocking anything today.

## OAuth `invalid_grant` — Fixed 2026-09-22, Separate from the Workspace Decision

**This was originally written up as one problem needing the Workspace migration to fix. It
turned out to split into two independent problems, and the urgent one is now resolved without
Workspace.**

The Google Cloud OAuth app (`GMAIL_CLIENT_ID`) was stuck in **"Testing" publishing status**,
which hard-expires refresh tokens every 7 days — that's what caused the 2026-09-21
`invalid_grant` break, not a one-off glitch. **Fixed 2026-09-22:** Cyril published the app to
**"In production"** (External, unverified — Google's own UI confirmed this doesn't require
verification unless the app exceeds 10 authorized domains, has a logo, or Google specifically
demands it later). Required two supporting static pages, now live and hosted in a **new,
separate repo** (`github.com/CyrilKafle/polaris-legal`, deliberately not the portfolio
repo/site — Cyril didn't want this mixed with his personal site):
- `https://cyrilkafle.github.io/polaris-legal/` (homepage)
- `https://cyrilkafle.github.io/polaris-legal/privacy.html` (privacy policy)

`cyrilkafle.github.io` was added to Authorized domains. A fresh token was then issued under the
new Production status (`scripts/get-gmail-token.js`, applied to `.env.local`,
**confirmed working via `npm run gmail:check` 2026-09-22**). **The 7-day expiry should no
longer recur** — if `gmail:check` ever does print `DEAD` again going forward, treat it as a
genuinely new problem worth investigating, not the expected weekly chore it was before this fix.

**Still separately pending, deliberately deferred to end of testing** (Cyril doesn't want a
12-month billing commitment before the approach is validated) — buying a real domain and
Google Workspace Business Starter (**$7/user/month, 12-month commitment**, confirmed 2026-09-22
on Google's pricing page). This is now about **deliverability only** (SPF/DKIM/DMARC control,
escaping shared `@gmail.com` reputation, 2,000/day vs. 500/day ceiling) — **not** about the
OAuth expiry, which is already fixed. Also would unlock "Internal" OAuth app status (skips the
"unverified app" warning screen), but that's a nice-to-have now, not a fix for anything broken.

Once Cyril does that account-level setup (domain, Workspace, new OAuth client under the new
Cloud project), the remaining work is code-side and this environment can do it: new
`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN` in `.env.local`. Deploying Polaris
itself publicly is a separate, non-urgent nice-to-have — see "`lovable_url` Resolves to
localhost" above for why it isn't blocking anything today.

## CAN-SPAM Compliance

Added 2026-09-22 after an audit flagged two legally required elements missing from every
outreach email: a physical mailing address and a clear opt-out mechanism. Both now apply to
all three send paths (`gmailService.ts` cold outreach, `followUpService.ts`, `schedulingService.ts`
scheduling replies) — commercial email requires this on every message in a thread, not just the
first.

- **`lib/outreach/canSpamFooter.ts`** — shared footer appended to every outbound body: the
  address from `OUTREACH_MAILING_ADDRESS` (`.env.local`) plus a plain-language opt-out
  instruction ("reply unsubscribe"). **Throws if the env var is unset**, so a missing address
  fails the send loudly instead of shipping a non-compliant email. Needs a real PO Box / UPS
  Store address filled in before `PAUSE_OUTREACH` ever comes off — ask Cyril if it's still blank.
- **Opt-out enforcement, not just the ask**: `leads.opted_out` (migration `017_opted_out.sql`)
  is checked before every send in all three paths — `gmailService.ts` and `schedulingService.ts`
  return early on an opted-out lead, `followUpService.ts` filters it out of the query directly.
  `replyMonitor.ts`'s AI classifier gained a fifth intent, `unsubscribe` (any request to stop
  emails, however phrased) — a reply classified that way sets `opted_out=true` and archives the
  lead immediately, on the next scheduler tick, well inside the legal 10-business-day window.
- Test coverage: `lib/outreach/canSpamFooter.test.ts` (throws when unset, includes address +
  opt-out language when set).

## Simulation / Test Mode

Added 2026-09-22 to run a full pipeline dry run (discovery → enrich → mockup → video → "send")
without ever touching a real business's inbox or discovering more leads than intended for a
short test. Three independent env vars, all meant to be temporary and reverted after testing:

- **`DISCOVERY_MAX_LEADS`** (`lib/leads/discoveryService.ts`) — overrides the normal
  **unlimited** discovery run (no cap by default since 2026-09-22, per Cyril — discovery finding
  a lot of leads is fine, it's the outreach send rate that gates real-world volume). Set low
  (e.g. `5`) for a controlled test so it doesn't burn through Google Places quota or hand
  enrichment a big batch. **Remove/reset after testing.**
- **`DISABLE_PIPELINE_SCHEDULER`** (`lib/pipeline/scheduler.ts`) — when `true`, skips starting
  the always-on 15-minute scheduler tick entirely, so pipeline stages only run when explicitly
  triggered via `POST /api/pipeline`. Lets a test run be driven and observed one step at a time
  instead of an unattended interval also firing mid-test. **Remove after testing** — the
  scheduler is meant to be always-on in real operation.
- **`OUTREACH_TEST_MODE` + `OUTREACH_TEST_EMAIL`** (`lib/outreach/testMode.ts`) — when test mode
  is on, all three send paths (`gmailService.ts`, `followUpService.ts`, `schedulingService.ts`)
  call `resolveSendTarget()` (the single shared helper — recipient, subject, thread-suppression,
  and the `[TEST MODE] Redirecting...` log line all live there once, not duplicated per file) to
  unconditionally redirect the recipient to `OUTREACH_TEST_EMAIL` instead of the lead's real
  email. Subject line gets a `[TEST]` prefix plus the real lead's email inline, so a test send is
  unmistakable and still tells you who it would have gone to. `canSendOutreachEmail()`
  (`lib/outreach/rateLimiter.ts`) itself checks `isTestMode()` first and returns `true`
  immediately — the bypass is centralized in the one shared gate function, not repeated at each
  call site (a fourth send path added later can't forget it).
  **Critically: a test-mode send must NOT touch the lead's real DB state.** Each of the three
  send functions checks `target.testMode` after the (redirected) Gmail send and returns/continues
  before writing to `outreach_messages` or updating the lead's `status`. Found live 2026-09-22 —
  an earlier version let a test send advance a real lead (`GLS Tech Electrical Contractor`) to
  `outreach_sent` even though the email only reached Cyril's inbox; once test mode was turned
  back off, the real business no longer matched any status filter and would never have gotten a
  real send without a manual DB reset. Don't reintroduce this — a test send is a dry run of
  content and delivery only, never of pipeline progress.
  **This is a bypass of the gate, not a weakening of it** — `PAUSE_OUTREACH` stays `true`
  throughout a test run as a second independent layer: if `OUTREACH_TEST_MODE` were ever
  accidentally off, the outreach stage falls back to being fully blocked, never to sending for
  real. If test mode is on but `OUTREACH_TEST_EMAIL` is unset, `testRecipient()` throws rather
  than guessing — same fail-loud pattern as `canSpamFooter()`. **Remove after testing.**

## Live Since 2026-09-22 — Testing/Building Phase Is Over

Cyril confirmed go-live 2026-09-22, after a successful controlled dry run (see git history /
memory for that session). `PAUSE_ENRICHMENT` and `PAUSE_OUTREACH` are both `false` in
`.env.local` — the always-on scheduler enriches new leads and sends real cold outreach,
follow-ups, and scheduling replies automatically, unattended, every 15-minute tick. There is no
more standing per-batch confirmation gate.

**What's still protecting the sending account:** `lib/outreach/rateLimiter.ts`'s warm-up ramp
(~5/day rising to ~20/day, see that file) is unchanged and still the single choke point all
three send paths share via `canSendOutreachEmail()`. Cyril explicitly chose to keep this on
when he approved go-live — his stated #1 project risk is `polarisoutreach.co@gmail.com` getting
flagged as spam or banned by Gmail. Don't raise the ramp defaults or bypass this gate without
his explicit go-ahead, same as before.

**What's still protecting recipients:** the CAN-SPAM footer (mailing address + opt-out, see
"CAN-SPAM Compliance" above) and opt-out enforcement (`leads.opted_out`) are unconditional on
every send regardless of live/test status — nothing about go-live touches those.

If a reason ever comes up to safely dry-run the pipeline again without real sends, see
"Simulation / Test Mode" above — those env vars are commented out in `.env.local`, ready to
uncomment for another controlled run. Re-adding a standing `PAUSE_OUTREACH`-style gate for
day-to-day operation would need a fresh conversation with Cyril, not just uncommenting.

## Success Metrics

- **Reply rate:** 10-15% baseline
- **Close rate:** 30-50% of positive replies
- **Time to first deal:** 1-2 weekends
- **Revenue per weekend:** $500-$10,000+ (depends on model)
- **Repeatability:** Same workflow scales across niches and cities


# Polaris — Contact Discovery Update

This folder contains everything needed to add contact discovery to Polaris.
Contact discovery automatically finds emails, social media pages, and queues
SMS for every lead before outreach — so no lead gets stuck because of a
missing email.

---

## What This Update Does

Adds a new step to the pipeline (runs first, before Claude enrichment):

1. Scrapes the business's own website for email + social links (free)
2. Web searches for their email if scraping fails
3. Web searches for their Facebook and Instagram pages
4. Queries the Facebook Pages API to confirm/find their FB page
5. If nothing is found, marks the lead for SMS outreach (phone is always in Google Maps)

---

## Files in This Folder

| File | What to do with it |
|---|---|
| `new/lib/leads/contactDiscoveryService.ts` | Copy to `lib/leads/` in your Polaris project |
| `new/supabase/migrations/003_add_contact_discovery.sql` | Copy to `supabase/migrations/` |
| `modified/lib/types.ts` | Replace your existing `lib/types.ts` |
| `modified/lib/pipeline/pipelineRunner.ts` | Replace your existing `lib/pipeline/pipelineRunner.ts` |
| `modified/.env.local.example` | Replace your existing `.env.local.example` |

---

## Setup Steps

### 1. Run the database migration
After copying the SQL file, run:
```
supabase db push
```
This adds 4 new columns to the leads table:
- `facebook_url`
- `instagram_url`
- `linkedin_url`
- `sms_queued`

### 2. Add API keys to your .env.local

Choose ONE search provider (Bing is free):

**Tavily Search (FREE, 1,000 queries/month — recommended)**
- No credit card required
- Go to tavily.com → sign up → Dashboard → API Keys → copy your key
- Add to .env.local: `TAVILY_API_KEY=your_key`

**Brave Search (optional fallback, $5/month)**
- Go to api.search.brave.com → sign up → API Keys → Generate
- Add to .env.local: `BRAVE_SEARCH_API_KEY=your_key`

**Meta / Facebook (free — just needs a developer app)**
- Go to developers.facebook.com → Create App → Business type
- From your app dashboard, get your App ID and App Secret
- Open this URL in your browser (replace values):
  https://graph.facebook.com/oauth/access_token?client_id=APP_ID&client_secret=APP_SECRET&grant_type=client_credentials
- Copy the access_token from the response
- Add to .env.local: `META_APP_ACCESS_TOKEN=your_token`

### 3. SMS (optional — message template coming separately)
When ready, add to .env.local:
```
SMS_MESSAGE_TEMPLATE=Hey {name}, I built you a quick site mockup — want to take a look?
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

---

## How It Plugs Into the Pipeline

Before this update, the pipeline skipped leads with no email.
After this update:

```
Google Maps → leads (name + phone)
     ↓
[NEW] Contact Discovery → finds email, Facebook, Instagram, or queues SMS
     ↓
Claude Enrichment → diagnosis, cold message, site brief
     ↓
Lovable Mockup → website preview
     ↓
Higgsfield Video → 10-second walkthrough
     ↓
Gmail → sends to leads with email (unchanged)
     ↓  (social DM and SMS sending — coming in next update)
```

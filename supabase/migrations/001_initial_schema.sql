-- Lead status enum
create type lead_status as enum (
  'new', 'enriched', 'brief_ready',
  'mockup_building', 'mockup_ready',
  'video_building', 'video_ready',
  'outreach_sent', 'followed_up_1', 'followed_up_2',
  'replied', 'positive', 'call_scheduled',
  'closed', 'archived'
);

create type lead_source as enum ('google_places', 'manual');
create type outreach_channel as enum ('email', 'sms', 'linkedin');
create type call_outcome as enum ('no_show', 'not_interested', 'follow_up', 'closed');

-- Campaigns
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  city text not null,
  created_at timestamptz not null default now()
);

-- Leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,
  business_name text not null,
  website_url text,
  phone text,
  email text,
  location text,
  city text not null,
  niche text not null,
  google_maps_id text unique,
  review_count int,
  rating numeric(2,1),
  years_established int,
  source lead_source not null default 'manual',
  diagnosis text,
  outreach_angle text,
  gap_analysis text,
  site_brief text,
  cold_message text,
  lovable_url text,
  screenshot_paths text[],
  video_url text,
  status lead_status not null default 'new',
  priority_score int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on leads(status);
create index leads_campaign_idx on leads(campaign_id);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger leads_updated_at before update on leads
  for each row execute function set_updated_at();

-- Outreach messages
create table outreach_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  channel outreach_channel not null default 'email',
  subject text,
  body text not null,
  follow_up_number int not null default 0,
  gmail_thread_id text,
  gmail_message_id text,
  sent_at timestamptz not null default now()
);

create index outreach_lead_idx on outreach_messages(lead_id);

-- Call logs
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  scheduled_at timestamptz,
  outcome call_outcome,
  deal_value int,
  notes text,
  created_at timestamptz not null default now()
);

-- The "Request a Free Estimate" form on every mockup site previously just
-- showed a fake success message and discarded the input. This captures real
-- submissions so Cyril actually sees them.
create table estimate_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  zip text,
  address text,
  heard_about text,
  service_needed text,
  sms_info_consent boolean not null default false,
  sms_promo_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create index estimate_requests_lead_idx on estimate_requests(lead_id);

-- Real prospect PII (name/email/phone/address) submitted from a public,
-- unauthenticated mockup page. The app only ever reads/writes this via the
-- service_role key (which bypasses RLS regardless), so this has no effect on
-- app functionality — it just stops the public anon key from being able to
-- read it directly through Supabase's REST API.
alter table estimate_requests enable row level security;

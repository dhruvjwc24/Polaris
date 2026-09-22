-- Example websites (competitors' or otherwise) worth showing a prospect
-- during a call as proof of what Polaris can add — e.g. multi-page nav
-- (Services/Materials/Financing/Service Areas/Blog tabs), per Cyril
-- 2026-09-22 looking at woodbridgeroofers.com. Just a reference list Cyril
-- curates himself, not part of the lead pipeline.
create table reference_examples (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  note text,
  created_at timestamptz not null default now()
);

-- Only the server (service_role key, which bypasses RLS) reads/writes this —
-- same reasoning as estimate_requests in migration 009.
alter table reference_examples enable row level security;

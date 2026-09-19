-- Leads created via the manual "Create" flow (cold-call sourced) build a mockup + video
-- like any other lead, but must never be auto-emailed — Cyril reaches out himself.
alter table leads add column manual_outreach_only boolean not null default false;

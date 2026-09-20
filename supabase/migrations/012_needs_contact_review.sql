-- A lead with neither email nor phone after every automated search attempt
-- gets flagged here instead of archived/deleted — Cyril reviews (or bulk
-- deletes) these himself in a separate UI tab. Not a pipeline stage, so it's
-- a flag alongside `status`, not a new lead_status enum value.
alter table leads add column needs_contact_review boolean not null default false;

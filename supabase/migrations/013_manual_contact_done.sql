-- Phone-only leads (no email) never go through automated outreach at all --
-- Cyril calls/texts them himself from his own phone. This flag lets him mark
-- one as handled so it drops out of the manual-outreach pile instead of
-- nagging him forever. Not a new lead_status enum value for the same reason
-- needs_contact_review isn't: it's a flag alongside status, not a pipeline stage.
alter table leads add column manual_contact_done boolean not null default false;

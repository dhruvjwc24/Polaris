-- CAN-SPAM compliance: track leads who replied asking to stop receiving
-- outreach emails. Checked before every send (cold outreach, follow-ups,
-- scheduling replies) so an opt-out is honored on the very next scheduler
-- tick rather than merely within the 10-business-day legal minimum.
alter table leads add column opted_out boolean not null default false;

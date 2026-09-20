-- Records how lib/leads/websiteAge.ts classified a lead's existing site
-- (via Wayback Machine history) at discovery time, so the reasoning behind a
-- lead's priority_score is visible later, not just baked into a number.
-- Null means the lead has no website at all (website_url is also null then).
alter table leads add column website_age_status text
  check (website_age_status in ('outdated', 'modern', 'unknown'));

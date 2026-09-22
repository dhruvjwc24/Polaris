-- The 2026-09-21 scoring rubric needs 6-month (0.5-year) granularity for
-- tenure (isLeadEligible/scoreLead in lib/leads/scoring.ts), but this column
-- was `int`. Not urgent to apply — years_established is currently only ever
-- populated via manual CSV import (lib/leads/importService.ts), and those
-- leads are exempt from the automated filtering net anyway — but needed if a
-- real tenure data source for automated (google_places) leads ever gets
-- built.
alter table leads alter column years_established type numeric;

-- Position in the Places textsearch results at discovery time (see
-- lib/leads/discoveryService.ts, lib/leads/scoring.ts). Previously computed
-- and used once, then thrown away — needed persisted now so
-- lib/leads/refreshLeadData.ts can recompute priority_score on a refresh
-- without silently dropping the search-position bonus every time.
alter table leads add column search_position int;

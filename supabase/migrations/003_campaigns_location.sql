alter table campaigns add column if not exists state text;
alter table campaigns add column if not exists cities jsonb;

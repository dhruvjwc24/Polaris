alter table leads add column if not exists facebook_url text;
alter table leads add column if not exists instagram_url text;
alter table leads add column if not exists linkedin_url text;
alter table leads add column if not exists sms_queued boolean not null default false;

-- Video generation used to run synchronously inside the "Generate Video"
-- request (and inside the campaign auto-pipeline), which only ever worked
-- while a dev session happened to have the server running. This queue makes
-- every video request durable: it's written to the database first, and a
-- background worker (started when the Next.js server boots — see
-- lib/video/queueWorker.ts) drains it one job at a time, whether the request
-- came from a manual click or the campaign pipeline.
create table video_generation_queue (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  business_name text not null,
  screenshot_paths text[] not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  error text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index video_generation_queue_status_idx on video_generation_queue(status, queued_at);
create index video_generation_queue_lead_idx on video_generation_queue(lead_id);

-- Only the server (service_role key, which bypasses RLS) reads/writes this —
-- same reasoning as estimate_requests in migration 009.
alter table video_generation_queue enable row level security;

-- Singleton row the worker touches every few seconds so the app can tell
-- whether a server process is actually alive to work the queue ("online") or
-- not ("offline" — e.g. no dev/prod server currently running).
create table worker_heartbeat (
  id smallint primary key default 1,
  last_seen timestamptz not null default now(),
  constraint worker_heartbeat_singleton check (id = 1)
);

insert into worker_heartbeat (id, last_seen) values (1, now())
  on conflict (id) do nothing;

alter table worker_heartbeat enable row level security;

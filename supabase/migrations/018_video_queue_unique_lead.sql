-- lib/video/queue.ts's enqueueVideoJob() does a check-then-insert (select for
-- an existing queued/processing job, insert only if none found) with no
-- transaction/locking between the two — a real TOCTOU race if two calls for
-- the same lead land close together (e.g. a manual "Generate Video" click
-- overlapping a scheduler tick's own auto-enqueue for the same lead), which
-- would insert two rows and record the same video twice. A partial unique
-- index closes the gap at the DB level regardless of application-layer
-- timing; enqueueVideoJob() now catches the resulting unique-violation and
-- falls back to reading the row that won the race.
create unique index video_generation_queue_active_lead_idx
  on video_generation_queue(lead_id)
  where status in ('queued', 'processing');

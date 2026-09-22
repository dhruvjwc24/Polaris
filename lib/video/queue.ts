import { db } from "@/lib/db/supabase";

// A server process is "offline" once it stops sending heartbeats — see
// queueWorker.ts, which writes one every HEARTBEAT_INTERVAL_MS. Give it a
// couple of missed beats of slack before calling it offline.
const ONLINE_THRESHOLD_MS = 15_000;
const DEFAULT_JOB_SECONDS = 75; // matches the approved template's ~60-65s pacing plus encoding overhead
const RECENT_JOBS_FOR_AVERAGE = 5;

export interface QueueItem {
  id: string;
  leadId: string;
  businessName: string;
  status: "queued" | "processing";
  queuedAt: string;
  startedAt: string | null;
  etaSeconds: number;
}

export interface QueueStatus {
  workerOnline: boolean;
  items: QueueItem[];
}

async function averageJobSeconds(): Promise<number> {
  const { data } = await db
    .from("video_generation_queue")
    .select("started_at, completed_at")
    .eq("status", "done")
    .order("completed_at", { ascending: false })
    .limit(RECENT_JOBS_FOR_AVERAGE);

  if (!data?.length) return DEFAULT_JOB_SECONDS;

  const durations = data
    .filter((row) => row.started_at && row.completed_at)
    .map((row) => (new Date(row.completed_at!).getTime() - new Date(row.started_at!).getTime()) / 1000);

  if (!durations.length) return DEFAULT_JOB_SECONDS;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

export async function isWorkerOnline(): Promise<boolean> {
  const { data } = await db.from("worker_heartbeat").select("last_seen").eq("id", 1).maybeSingle();
  if (!data?.last_seen) return false;
  return Date.now() - new Date(data.last_seen).getTime() < ONLINE_THRESHOLD_MS;
}

// Adds a lead's video job to the durable queue instead of generating inline.
// Safe to call more than once for the same lead (e.g. a manual click landing
// while the campaign pipeline already queued it) — returns the existing job.
//
// The check-then-insert below has a TOCTOU gap on its own (two near-
// simultaneous calls for the same lead could both see no existing job and
// both insert) — closed at the DB level by a partial unique index on
// lead_id for active statuses (migration 018_video_queue_unique_lead.sql).
// If this call loses that race, the insert fails with a unique-violation
// (Postgres code 23505); fall back to reading whichever row actually won.
export async function enqueueVideoJob(
  leadId: string,
  businessName: string,
  screenshotPaths: string[]
): Promise<{ id: string; position: number; etaSeconds: number; workerOnline: boolean }> {
  const { data: existing } = await db
    .from("video_generation_queue")
    .select("id")
    .eq("lead_id", leadId)
    .in("status", ["queued", "processing"])
    .maybeSingle();

  let jobId = existing?.id;

  if (!jobId) {
    const { data: inserted, error: insertError } = await db
      .from("video_generation_queue")
      .insert({ lead_id: leadId, business_name: businessName, screenshot_paths: screenshotPaths })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code !== "23505") throw insertError;
      // Lost the race — another call already inserted the active job for
      // this lead. Read the winner instead of failing the whole request.
      const { data: winner } = await db
        .from("video_generation_queue")
        .select("id")
        .eq("lead_id", leadId)
        .in("status", ["queued", "processing"])
        .maybeSingle();
      jobId = winner?.id;
    } else {
      jobId = inserted?.id;
    }
  }

  if (!jobId) throw new Error("Failed to queue video job");

  const status = await getQueueStatus();
  const index = status.items.findIndex((item) => item.id === jobId);
  const item = index >= 0 ? status.items[index] : null;

  return {
    id: jobId,
    position: index >= 0 ? index + 1 : status.items.length,
    etaSeconds: item?.etaSeconds ?? (await averageJobSeconds()),
    workerOnline: status.workerOnline,
  };
}

// Live queue snapshot for the UI: worker online/offline plus every queued or
// in-progress job with a running ETA (processing job's remaining time first,
// then one average job length per queued job ahead of it).
export async function getQueueStatus(): Promise<QueueStatus> {
  const [{ data: rows }, workerOnline, avgSeconds] = await Promise.all([
    db
      .from("video_generation_queue")
      .select("id, lead_id, business_name, status, queued_at, started_at")
      .in("status", ["queued", "processing"])
      .order("queued_at", { ascending: true }),
    isWorkerOnline(),
    averageJobSeconds(),
  ]);

  let cumulativeSeconds = 0;
  const items: QueueItem[] = (rows ?? []).map((row) => {
    let etaSeconds: number;
    if (row.status === "processing" && row.started_at) {
      const elapsed = (Date.now() - new Date(row.started_at).getTime()) / 1000;
      etaSeconds = Math.max(Math.round(avgSeconds - elapsed), 5);
    } else {
      cumulativeSeconds += avgSeconds;
      etaSeconds = Math.round(cumulativeSeconds);
    }
    return {
      id: row.id,
      leadId: row.lead_id,
      businessName: row.business_name,
      status: row.status as "queued" | "processing",
      queuedAt: row.queued_at,
      startedAt: row.started_at,
      etaSeconds,
    };
  });

  return { workerOnline, items };
}

import { db } from "@/lib/db/supabase";
import { screenRecordingProvider } from "@/lib/video/screenRecording";

const HEARTBEAT_INTERVAL_MS = 5_000;
const STALE_PROCESSING_MS = 10 * 60 * 1000; // a job stuck "processing" this long means the server died mid-recording

// Next.js dev mode can call instrumentation's register() more than once per
// process (hot reload). Guard with a global so only one worker loop ever
// runs per actual OS process.
const globalForWorker = globalThis as unknown as { __polarisVideoWorkerStarted?: boolean };

async function sendHeartbeat(): Promise<void> {
  await db.from("worker_heartbeat").update({ last_seen: new Date().toISOString() }).eq("id", 1);
}

async function requeueStaleJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  await db
    .from("video_generation_queue")
    .update({ status: "queued", started_at: null })
    .eq("status", "processing")
    .lt("started_at", cutoff);
}

async function processNextJob(): Promise<void> {
  const { data: job } = await db
    .from("video_generation_queue")
    .select("id, lead_id, screenshot_paths")
    .eq("status", "queued")
    .order("queued_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) return;

  await db
    .from("video_generation_queue")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", job.id);

  try {
    await screenRecordingProvider.generate(job.lead_id, job.screenshot_paths ?? []);
    await db
      .from("video_generation_queue")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", job.id);
  } catch (err) {
    console.error(`Video queue job ${job.id} (lead ${job.lead_id}) failed:`, err);
    await db
      .from("video_generation_queue")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", job.id);
    // screenRecordingProvider.generate already flips the lead to
    // "video_building" before it starts — undo that on failure so it's
    // eligible to be rebuilt/re-queued instead of stuck.
    await db.from("leads").update({ status: "mockup_ready" }).eq("id", job.lead_id);
  }
}

export function startVideoQueueWorker(): void {
  if (globalForWorker.__polarisVideoWorkerStarted) return;
  globalForWorker.__polarisVideoWorkerStarted = true;

  let busy = false;

  requeueStaleJobs().catch((err) => console.error("Video queue stale-job recovery failed:", err));

  setInterval(() => {
    sendHeartbeat().catch((err) => console.error("Video queue heartbeat failed:", err));

    if (busy) return;
    busy = true;
    processNextJob()
      .catch((err) => console.error("Video queue worker tick failed:", err))
      .finally(() => {
        busy = false;
      });
  }, HEARTBEAT_INTERVAL_MS);

  console.log("Video queue worker started.");
}

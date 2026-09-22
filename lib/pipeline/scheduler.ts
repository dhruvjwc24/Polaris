import { runPipeline } from "@/lib/pipeline/pipelineRunner";

const TICK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// runPipeline() (contact discovery -> enrichment -> mockups -> video queueing
// -> outreach send -> follow-ups -> reply-checking -> scheduling emails) used
// to only ever run when something POSTed /api/pipeline by hand. Follow-ups
// and reply-checks are time-based (day 4, day 7) but nothing was re-triggering
// them — they silently never fired without a human hitting that endpoint.
// This keeps the whole pipeline moving on its own, the same way
// lib/video/queueWorker.ts keeps video generation moving.

// Next.js dev mode can call instrumentation's register() more than once per
// process (hot reload). Guard with a global so only one scheduler loop ever
// runs per actual OS process.
const globalForScheduler = globalThis as unknown as { __polarisPipelineSchedulerStarted?: boolean };

export function startPipelineScheduler(): void {
  // Escape hatch for controlled test runs (e.g. simulating the pipeline via
  // manual POST /api/pipeline calls) where an unattended 15-minute auto-tick
  // would run stages outside the window being deliberately observed. Unset
  // (or "false") in normal operation — the scheduler is meant to be
  // always-on. See CLAUDE.md "Simulation / Test Mode".
  if (process.env.DISABLE_PIPELINE_SCHEDULER === "true") {
    console.log("Pipeline scheduler disabled (DISABLE_PIPELINE_SCHEDULER=true).");
    return;
  }
  if (globalForScheduler.__polarisPipelineSchedulerStarted) return;
  globalForScheduler.__polarisPipelineSchedulerStarted = true;

  let busy = false;

  setInterval(() => {
    if (busy) return;
    busy = true;
    runPipeline()
      .then(() => console.log("Pipeline scheduler tick complete."))
      .catch((err) => console.error("Pipeline scheduler tick failed:", err))
      .finally(() => {
        busy = false;
      });
  }, TICK_INTERVAL_MS);

  console.log("Pipeline scheduler started.");
}

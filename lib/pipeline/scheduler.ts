import { runPipeline, sendNextOutreach } from "@/lib/pipeline/pipelineRunner";
import { processReplyFlow } from "@/lib/pipeline/replyFlow";
import { processMeetingReminders } from "@/lib/pipeline/meetingFlow";

const TICK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
// Replies, builds, scheduling and meeting reminders run on their own loop
// (Cyril, 2026-09-30: every 15 minutes is enough).
const REPLY_LOOP_INTERVAL_MS = 15 * 60 * 1000;
const OUTREACH_MIN_GAP_MS = 3 * 60 * 1000;
const OUTREACH_MAX_GAP_MS = 8 * 60 * 1000;

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

  // Cold outreach runs on its own jittered timer instead of the fixed tick:
  // a random 3-8 minute gap between sends (Cyril, 2026-09-30) so the sending
  // pattern isn't a metronome. sendNextOutreach still goes through the
  // shared PAUSE_OUTREACH + daily-cap gate, so this can never exceed 10/day.
  let outreachBusy = false;
  const scheduleNextOutreach = () => {
    const delayMs = OUTREACH_MIN_GAP_MS + Math.random() * (OUTREACH_MAX_GAP_MS - OUTREACH_MIN_GAP_MS);
    console.log(`Next outreach send check in ${(delayMs / 60000).toFixed(1)} min.`);
    setTimeout(async () => {
      if (!outreachBusy) {
        outreachBusy = true;
        try {
          await sendNextOutreach();
        } catch (err) {
          console.error("Jittered outreach send failed:", err);
        } finally {
          outreachBusy = false;
        }
      }
      scheduleNextOutreach();
    }, delayMs);
  };
  scheduleNextOutreach();

  let replyBusy = false;
  const runReplyLoop = () => {
    if (replyBusy) return;
    replyBusy = true;
    processReplyFlow()
      .catch((err) => console.error("Reply loop failed:", err))
      .finally(() => {
        replyBusy = false;
      });
  };
  setInterval(runReplyLoop, REPLY_LOOP_INTERVAL_MS);
  setTimeout(runReplyLoop, 60 * 1000);

  // Meeting reminders (Discord at ~70 min, lead email at ~1 hr) are a cheap DB
  // check, so they run every minute instead of waiting on the 15-minute loop.
  let reminderBusy = false;
  setInterval(() => {
    if (reminderBusy) return;
    reminderBusy = true;
    processMeetingReminders()
      .catch((err) => console.error("Meeting reminder loop failed:", err))
      .finally(() => {
        reminderBusy = false;
      });
  }, 60 * 1000);

  setInterval(() => {
    if (busy) return;
    busy = true;
    runPipeline(undefined, undefined, { skipOutreach: true })
      .then(() => console.log("Pipeline scheduler tick complete."))
      .catch((err) => console.error("Pipeline scheduler tick failed:", err))
      .finally(() => {
        busy = false;
      });
  }, TICK_INTERVAL_MS);

  console.log("Pipeline scheduler started.");
}

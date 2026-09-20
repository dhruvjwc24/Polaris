export async function register() {
  // Playwright/Node-only work — must not run in the Edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startVideoQueueWorker } = await import("@/lib/video/queueWorker");
    startVideoQueueWorker();

    const { startPipelineScheduler } = await import("@/lib/pipeline/scheduler");
    startPipelineScheduler();
  }
}

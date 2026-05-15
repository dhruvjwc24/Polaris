import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db/supabase";
import type { VideoProvider, VideoResult } from "./types";

const SESSION_PATH = path.join(process.cwd(), "playwright/sessions/higgsfield.json");

const VIDEO_PROMPT = `Create a 10-second cinematic walkthrough using these landing page mockup images.

Camera: slow zoom on hero (2 seconds), smooth pan to services, gentle ease into about, end on final CTA with soft fade.

Style: premium, cinematic, professional. Subtle motion on text. Soft depth of field. Modern editorial feel.

Format: 9:16 vertical, 1080x1920.

Avoid: dramatic zooms, fast cuts, aggressive color grading.`;

export const higgsFieldProvider: VideoProvider = {
  async generate(leadId, screenshotPaths): Promise<VideoResult> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(
      fs.existsSync(SESSION_PATH)
        ? { storageState: SESSION_PATH }
        : {}
    );
    const page = await context.newPage();

    try {
      await db.from("leads").update({ status: "video_building" }).eq("id", leadId);

      await page.goto("https://higgsfield.ai", { waitUntil: "networkidle" });

      // Navigate to video creation
      const createBtn = page.locator('button:has-text("Create"), a:has-text("Create"), [data-testid="create"]').first();
      await createBtn.click();
      await page.waitForLoadState("networkidle");

      // Upload screenshots
      for (const screenshotPath of screenshotPaths) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(screenshotPath);
        await page.waitForTimeout(1000);
      }

      // Enter prompt
      const promptArea = page.locator('textarea, [contenteditable="true"]').first();
      await promptArea.fill(VIDEO_PROMPT);

      // Set format to 9:16 if option exists
      const verticalBtn = page.locator('button:has-text("9:16"), button:has-text("Vertical"), [data-ratio="9:16"]').first();
      if (await verticalBtn.isVisible()) await verticalBtn.click();

      // Generate
      const generateBtn = page.locator('button:has-text("Generate"), button[type="submit"]').first();
      await generateBtn.click();

      // Wait for render (can take several minutes)
      await page.waitForSelector('[data-testid="video-ready"], video, a[download]', { timeout: 300000 });

      // Extract video URL
      const videoEl = page.locator('video source, video').first();
      const videoSrc = await videoEl.getAttribute("src") ?? "";

      // Try download link as fallback
      const downloadLink = page.locator('a[download], a:has-text("Download")').first();
      const videoUrl = videoSrc || (await downloadLink.getAttribute("href")) || "";

      await db
        .from("leads")
        .update({ video_url: videoUrl, status: "video_ready" })
        .eq("id", leadId);

      await context.storageState({ path: SESSION_PATH });

      return { url: videoUrl };
    } finally {
      await browser.close();
    }
  },
};

export async function saveHiggsFieldSession(): Promise<void> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://higgsfield.ai/login");
  console.log("Log in to Higgsfield, then press Enter here...");
  await new Promise((resolve) => process.stdin.once("data", resolve));
  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
  await context.storageState({ path: SESSION_PATH });
  await browser.close();
  console.log("Session saved to", SESSION_PATH);
}

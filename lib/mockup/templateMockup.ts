import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db/supabase";
import type { MockupProvider, MockupResult } from "./types";

const SCREENSHOTS_DIR = path.join(process.cwd(), "playwright/screenshots");
const SECTIONS = ["hero", "services", "reviews", "about", "cta"];

export const templateProvider: MockupProvider = {
  async build(leadId, _brief, _businessName, baseUrl): Promise<MockupResult> {
    const appUrl = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const mockupUrl = `${appUrl}/mockups/${leadId}`;

    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    await db
      .from("leads")
      .update({ lovable_url: mockupUrl, status: "mockup_building" })
      .eq("id", leadId);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });

    const screenshotDir = path.join(SCREENSHOTS_DIR, leadId);
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPaths: string[] = [];

    try {
      await page.goto(mockupUrl, { waitUntil: "networkidle", timeout: 30000 });

      for (const section of SECTIONS) {
        const el = await page.$(`[data-section="${section}"]`);
        if (!el) continue;
        const screenshotPath = path.join(screenshotDir, `${section}.png`);
        await el.screenshot({ path: screenshotPath });
        screenshotPaths.push(screenshotPath);
      }

      // If the template page loaded but none of the known sections were
      // found (e.g. a render/hydration error left the page effectively
      // blank), persisting status "mockup_ready" anyway leaves the lead
      // permanently stuck: both pipelineRunner's video-queue stage and the
      // manual /api/leads/[id]/build route gate on
      // `screenshot_paths?.length`, so an empty array here means the lead
      // silently never gets a video queued and nothing ever retries it.
      // Throwing instead lets the existing caller-side catch blocks (both
      // already reset status back to "brief_ready" on a thrown error) treat
      // this the same as any other build failure.
      if (!screenshotPaths.length) {
        throw new Error(
          `Mockup build for lead ${leadId} found none of the expected sections (${SECTIONS.join(", ")}) — page likely failed to render`
        );
      }

      const { error: updateError } = await db
        .from("leads")
        .update({
          lovable_url: mockupUrl,
          screenshot_paths: screenshotPaths,
          status: "mockup_ready",
        })
        .eq("id", leadId);

      if (updateError) {
        // Must be loud: the mockup was actually built (screenshots exist on
        // disk), but a silent failure here leaves the lead stuck at
        // "mockup_building" forever with no visible cause, and the real
        // work done above is lost on the next attempt.
        throw new Error(`Failed to save mockup result for lead ${leadId}: ${updateError.message}`);
      }

      return { url: mockupUrl, screenshotPaths };
    } finally {
      await browser.close();
    }
  },
};

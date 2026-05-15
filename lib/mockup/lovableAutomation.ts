import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db/supabase";
import type { MockupProvider, MockupResult } from "./types";

const SESSION_PATH = path.join(process.cwd(), "playwright/sessions/lovable.json");
const SCREENSHOTS_DIR = path.join(process.cwd(), "playwright/screenshots");

// Sections to capture in order
const SCREENSHOT_SECTIONS = ["hero", "services", "about", "social-proof", "cta"];

export const lovableProvider: MockupProvider = {
  async build(leadId, brief, businessName, _baseUrl?): Promise<MockupResult> {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext(
      fs.existsSync(SESSION_PATH)
        ? { storageState: SESSION_PATH }
        : {}
    );
    const page = await context.newPage();

    try {
      await db.from("leads").update({ status: "mockup_building" }).eq("id", leadId);

      // Navigate to Lovable and create new project
      await page.goto("https://lovable.dev", { waitUntil: "networkidle" });

      // If not logged in, session needs to be saved first via saveSession()
      const newProjectBtn = page.locator('[data-testid="new-project"], button:has-text("New project"), button:has-text("Start building")').first();
      await newProjectBtn.click();

      // Enter the brief in the prompt area
      const promptArea = page.locator('textarea, [contenteditable="true"]').first();
      await promptArea.waitFor({ timeout: 15000 });
      await promptArea.fill(brief);

      const submitBtn = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Build")').first();
      await submitBtn.click();

      // Wait for build to complete (Lovable shows a loading state then reveals the preview)
      await page.waitForURL(/\/projects\//, { timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 120000 });

      // Extract the live preview URL from iframe or share button
      const shareBtn = page.locator('button:has-text("Share"), button:has-text("Publish"), [data-testid="share"]').first();
      await shareBtn.click();
      const urlInput = page.locator('input[readonly], input[type="url"]').first();
      const liveUrl = await urlInput.inputValue();

      // Take screenshots of key sections
      const screenshotPaths: string[] = [];
      const screenshotBase = path.join(SCREENSHOTS_DIR, leadId);
      fs.mkdirSync(screenshotBase, { recursive: true });

      for (let i = 0; i < SCREENSHOT_SECTIONS.length; i++) {
        const screenshotPath = path.join(screenshotBase, `${SCREENSHOT_SECTIONS[i]}.png`);
        // Scroll to approximate section position
        await page.evaluate((fraction) => {
          window.scrollTo(0, document.body.scrollHeight * fraction);
        }, i / (SCREENSHOT_SECTIONS.length - 1));
        await page.waitForTimeout(500);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        screenshotPaths.push(screenshotPath);
      }

      await db
        .from("leads")
        .update({ lovable_url: liveUrl, screenshot_paths: screenshotPaths, status: "mockup_ready" })
        .eq("id", leadId);

      // Save session for reuse
      await context.storageState({ path: SESSION_PATH });

      return { url: liveUrl, screenshotPaths };
    } finally {
      await browser.close();
    }
  },
};

// Run this once manually to save your Lovable login session
export async function saveLovableSession(): Promise<void> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://lovable.dev/login");
  console.log("Log in to Lovable, then press Enter here...");
  await new Promise((resolve) => process.stdin.once("data", resolve));
  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
  await context.storageState({ path: SESSION_PATH });
  await browser.close();
  console.log("Session saved to", SESSION_PATH);
}

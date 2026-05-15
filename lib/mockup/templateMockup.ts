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

      await db
        .from("leads")
        .update({
          lovable_url: mockupUrl,
          screenshot_paths: screenshotPaths,
          status: "mockup_ready",
        })
        .eq("id", leadId);

      return { url: mockupUrl, screenshotPaths };
    } finally {
      await browser.close();
    }
  },
};

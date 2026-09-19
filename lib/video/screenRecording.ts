import { chromium, type Page, type Locator } from "playwright";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { db } from "@/lib/db/supabase";
import type { VideoProvider, VideoResult } from "./types";

const execFileAsync = promisify(execFile);
const BUCKET = "pictures";
// Laptop-sized, not a phone crop — the site is meant to be seen at normal
// desktop scale, not stretched into a 9:16 portrait frame.
const VIEWPORT = { width: 1440, height: 900 };

// Hostname allowlist for the mockup URL the recorder navigates to — a pathname
// check alone doesn't stop a crafted host (e.g. an internal/metadata address
// with a matching /mockups/{id} path). Configurable for when this deploys off
// localhost; defaults to what this app actually runs on today.
const ALLOWED_MOCKUP_HOSTS = new Set(
  (process.env.MOCKUP_ALLOWED_HOSTS ?? "localhost,127.0.0.1").split(",").map((h) => h.trim()).filter(Boolean)
);

async function scrollToSelector(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: "start" });
  }, selector);
}

// Moves the real mouse to the element in visible, stepped motion (not a
// teleport) before clicking. The mockup page has its own custom cursor (a dot
// + ring that tracks mousemove events) — without a real move-then-pause-then-
// click sequence, that cursor snaps around disconnected from what's actually
// happening, which is what made earlier recordings feel unsynced. The pause
// before the click also telegraphs the action so a viewer can follow along.
async function moveAndClick(
  page: Page,
  locator: Locator,
  opts: { pauseBefore?: number; pauseAfter?: number } = {}
): Promise<boolean> {
  const el = locator.first();
  if (!(await el.count().catch(() => 0))) return false;
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const box = await el.boundingBox().catch(() => null);
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 30 });
  await page.waitForTimeout(opts.pauseBefore ?? 500);
  await page.mouse.click(x, y).catch(() => {});
  await page.waitForTimeout(opts.pauseAfter ?? 800);
  return true;
}

// Dismisses an app-open / login-nag interstitial some sites show immediately
// on load, so the real page content is what's visible when the recording
// lingers there. These show up in more than one shape (a "Not Now" banner, or
// a modal with an X/close icon and no "Not Now" text at all), so several
// dismissal strategies are tried in order.
async function dismissOverlay(page: Page): Promise<void> {
  const notNow = page.getByText(/not now/i).first();
  if (await notNow.count().catch(() => 0)) {
    await notNow.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    return;
  }

  const closeButton = page.locator('[aria-label*="close" i]').first();
  if (await closeButton.count().catch(() => 0)) {
    await closeButton.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    return;
  }

  await page.keyboard.press("Escape").catch(() => {});
}

// Moves to a link, clicks it (visibly, for the cursor-sync), then navigates
// THIS SAME recording to its destination instead of capturing a separate
// popup tab. Popup tabs get their own separate video file that can only be
// read once closed — concatenating those after the fact put every one of
// them (Maps, each social) at the very end of the video regardless of when
// they actually happened, which is wrong. Navigating in place keeps
// everything in one continuous recording in correct chronological order.
async function moveClickAndVisit(
  page: Page,
  locator: Locator,
  opts: { pauseBefore?: number; viewMs?: number } = {}
): Promise<void> {
  const el = locator.first();
  if (!(await el.count().catch(() => 0))) return;
  const href = await el.getAttribute("href").catch(() => null);
  if (!href) return;

  await el.scrollIntoViewIfNeeded().catch(() => {});
  const box = await el.boundingBox().catch(() => null);
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y, { steps: 30 });
  await page.waitForTimeout(opts.pauseBefore ?? 600);

  // The real link opens target="_blank" — catch and discard that background
  // tab (we don't want two divergent recordings), then drive this page to
  // the same destination for real.
  const popupPromise = page.context().waitForEvent("page", { timeout: 5000 }).catch(() => null);
  await page.mouse.click(x, y).catch(() => {});
  const strayPopup = await popupPromise;
  if (strayPopup) await strayPopup.close().catch(() => {});

  try {
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(1200);
    await dismissOverlay(page);
    await page.waitForTimeout(opts.viewMs ?? 3000);
  } catch {
    // destination unreachable — skip silently, caller navigates back regardless
  }
}

// Opens the custom dropdown (real DOM, not a native <select> — see the
// template's own comment on why) and clicks a real option in it. Because the
// option list is genuinely part of the page, it actually shows up on video,
// unlike a native select's OS-rendered popup.
async function moveOpenAndPickDropdown(page: Page, wrapperSelector: string, optionIndex = 0): Promise<void> {
  const trigger = page.locator(`${wrapperSelector} .custom-select-trigger`);
  if (!(await trigger.count().catch(() => 0))) return;
  await trigger.scrollIntoViewIfNeeded().catch(() => {});
  const box = await trigger.boundingBox().catch(() => null);
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
  await page.waitForTimeout(400);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
  await page.waitForTimeout(900); // let the option list actually render and be seen, open

  const option = page.locator(`${wrapperSelector} .custom-select-option`).nth(optionIndex);
  const obox = await option.boundingBox().catch(() => null);
  if (obox) {
    await page.mouse.move(obox.x + obox.width / 2, obox.y + obox.height / 2, { steps: 15 });
    await page.waitForTimeout(350);
    await page.mouse.click(obox.x + obox.width / 2, obox.y + obox.height / 2).catch(() => {});
  }
  await page.waitForTimeout(400);
}

// Waits for the hero's GSAP entrance animation to actually finish (words,
// subtitle, buttons fully faded/slid in) instead of guessing a fixed delay —
// the GSAP script loads from a CDN, so a flat timeout risks moving on while
// the headline is still mid-animation.
async function waitForHeroReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const words = document.querySelectorAll(".hero-word");
    const btns = document.querySelector(".hero-btns");
    if (!words.length || !btns) return false;
    const wordsReady = Array.from(words).every((w) => parseFloat(getComputedStyle(w).opacity) > 0.95);
    const btnsReady = parseFloat(getComputedStyle(btns).opacity) > 0.95;
    return wordsReady && btnsReady;
  }, { timeout: 8000 }).catch(() => {});
}

async function backToMockup(page: Page, mockupUrl: string): Promise<void> {
  await page.goto(mockupUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
}

// General principle: try to interact with every real, interactive part of
// the page — the reviews-to-Maps link, the CTA button, both card decks, the
// hamburger nav, every form field including both dropdowns, and every social
// link present, not just the first. Each step is individually guarded
// (returns silently if the element isn't there), so a business's site
// missing one of these things (no socials, no dropdown options) just skips
// it and moves on — nothing here assumes every site has every element.
async function performInteractions(page: Page, mockupUrl: string): Promise<void> {
  await waitForHeroReady(page);
  await page.waitForTimeout(1400); // pause so the headline actually gets read, not skipped past — walking pace, not a crawl

  // Intro beat: the star-rating/review-count line links straight to this
  // business's real Google Maps listing — visit it first, as verification
  // that the site is actually wired to the correct real company.
  await moveClickAndVisit(page, page.locator(".review-link"), { pauseBefore: 500, viewMs: 2200 });
  await backToMockup(page, mockupUrl);

  // Demonstrate a real CTA button (e.g. "Book a Campus Tour") actually leads
  // to the contact section, before the fuller top-to-bottom tour. The pause
  // before the click is deliberate — telegraphs the click before it happens.
  await moveAndClick(page, page.locator(".hero-btns a.btn-ghost"), { pauseBefore: 600, pauseAfter: 1300 });

  await scrollToSelector(page, "#services-section");
  await page.waitForTimeout(1700);

  await scrollToSelector(page, "#reviews-section");
  await page.waitForTimeout(1000); // let it settle before swiping
  await moveAndClick(page, page.locator("#rv-next"), { pauseAfter: 1300 });
  await moveAndClick(page, page.locator("#rv-next"), { pauseAfter: 1300 });
  await moveAndClick(page, page.locator("#ph-next"), { pauseAfter: 1300 });
  await moveAndClick(page, page.locator("#ph-next"), { pauseAfter: 1300 });

  await scrollToSelector(page, "#about-section");
  await page.waitForTimeout(1500);

  // Hamburger menu — open it and let the menu options actually sit visible
  // for a moment before navigating anywhere, then go to Contact through it.
  await moveAndClick(page, page.locator("#hamburger"), { pauseAfter: 1600 });
  await moveAndClick(page, page.locator('[data-nav="contact-section"]'), { pauseAfter: 1200 });

  // Actually type into the estimate form, open both dropdowns and pick a
  // real option in each, then check the consent boxes too.
  const nameInput = page.locator('#estimate-form input[name="name"]');
  if (await nameInput.count().catch(() => 0)) {
    await moveAndClick(page, nameInput, { pauseBefore: 300, pauseAfter: 150 });
    await nameInput.type("Jane Smith", { delay: 55 });
    await page.waitForTimeout(350);

    const emailInput = page.locator('#estimate-form input[name="email"]');
    await moveAndClick(page, emailInput, { pauseBefore: 300, pauseAfter: 150 });
    await emailInput.type("jane@example.com", { delay: 55 });
    await page.waitForTimeout(500);

    await moveOpenAndPickDropdown(page, '[data-select="heard"]');
    await moveOpenAndPickDropdown(page, '[data-select="service"]');

    for (const name of ["sms_info", "sms_promo", "accept_terms"]) {
      await moveAndClick(page, page.locator(`#estimate-form input[name="${name}"]`), { pauseBefore: 250, pauseAfter: 350 });
    }
    await page.waitForTimeout(900); // let the filled-out form sit visible
  }

  // Visit every real social link present, proving each one goes to the
  // actual account — not just the first. Re-navigate to the contact section
  // before each so every icon gets its own clearly telegraphed cursor-click,
  // rather than jumping straight from one destination to the next.
  const socialCount = await page.locator(".social-link").count().catch(() => 0);
  for (let i = 0; i < socialCount; i++) {
    await scrollToSelector(page, "#contact-section");
    await page.waitForTimeout(600);
    await moveClickAndVisit(page, page.locator(".social-link").nth(i), { pauseBefore: 500, viewMs: 2200 });
    await backToMockup(page, mockupUrl);
  }
}

async function convertToMp4(webmPath: string): Promise<string> {
  const mp4Path = webmPath.replace(/\.webm$/, ".mp4");
  // +faststart moves the moov atom to the front of the file — without it,
  // some players/preview panes refuse to open the file until it's fully
  // downloaded, or fail outright.
  await execFileAsync("ffmpeg", ["-y", "-i", webmPath, "-vcodec", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Path]);
  return mp4Path;
}

export const screenRecordingProvider: VideoProvider = {
  async generate(leadId, _screenshotPaths): Promise<VideoResult> {
    const { data: lead } = await db.from("leads").select("lovable_url").eq("id", leadId).maybeSingle();
    if (!lead?.lovable_url) throw new Error("No mockup URL to record — build the mockup first");

    // lovable_url is read from the DB, then handed to a real headless browser to
    // navigate — validate it actually points at this lead's own mockup page
    // before doing that, so a corrupted/tampered value can't make the recorder
    // fetch an arbitrary internal address.
    let mockupUrl: URL;
    try {
      mockupUrl = new URL(lead.lovable_url);
    } catch {
      throw new Error("lovable_url is not a valid URL");
    }
    if (mockupUrl.protocol !== "http:" && mockupUrl.protocol !== "https:") {
      throw new Error("lovable_url must be http(s)");
    }
    if (mockupUrl.pathname !== `/mockups/${leadId}`) {
      throw new Error("lovable_url does not point to this lead's own mockup page — refusing to navigate");
    }
    if (!ALLOWED_MOCKUP_HOSTS.has(mockupUrl.hostname.toLowerCase())) {
      throw new Error(`lovable_url host "${mockupUrl.hostname}" is not in the allowed mockup hosts list`);
    }

    await db.from("leads").update({ status: "video_building" }).eq("id", leadId);

    const videoDir = fs.mkdtempSync(path.join(os.tmpdir(), "polaris-video-"));
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: videoDir, size: VIEWPORT },
    });
    const page = await context.newPage();

    try {
      await page.goto(mockupUrl.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
      await performInteractions(page, mockupUrl.toString());
    } finally {
      await context.close();
      await browser.close();
    }

    const webmPath = await page.video()?.path();
    if (!webmPath) throw new Error("Recording failed — no video file produced");

    const mp4Path = await convertToMp4(webmPath);
    const buffer = fs.readFileSync(mp4Path);
    const storagePath = `leads/${leadId}/walkthrough.mp4`;

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: "video/mp4", upsert: true });

    fs.rmSync(videoDir, { recursive: true, force: true });

    if (uploadError) throw new Error(`Video upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = db.storage.from(BUCKET).getPublicUrl(storagePath);
    const videoUrl = publicUrlData.publicUrl;

    await db.from("leads").update({ video_url: videoUrl, status: "video_ready" }).eq("id", leadId);

    return { url: videoUrl };
  },
};

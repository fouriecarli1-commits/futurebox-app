/**
 * The iOS startup pictures, one per screen in `app/lib/splash.ts`, drawn by
 * the app itself: the real launch screen (`LaunchMark`) photographed in
 * Chromium at each phone's size and pixel density, so the picture the
 * system shows before the page is up is the picture the page then shows.
 *
 *   npm run build && node scripts/splash.mjs
 *
 * The launch mark only shows in standalone display mode, which Playwright
 * cannot emulate, so it is forced on and its fade-out switched off for the
 * photograph; nothing else on the page is touched.
 */
import { chromium } from 'playwright';
import { SCREENS, splashFile } from '../app/lib/splash.ts';
import { launchOptions, serve } from '../audit/where.mjs';

const server = await serve('3410');
const browser = await chromium.launch(launchOptions());
try {
  for (const one of SCREENS) {
    const page = await browser.newPage({ viewport: { width: one.w, height: one.h }, deviceScaleFactor: one.dpr });
    await page.goto(`${server.url}/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '[data-launchmark]{display:flex !important;animation:none !important;opacity:1 !important;visibility:visible !important}' });
    await page.locator('[data-launchmarktile] img').evaluate((img) => (img.complete ? undefined : new Promise((r) => { img.onload = r; img.onerror = r; })));
    await page.waitForTimeout(300);
    const out = `public${splashFile(one)}`;
    await page.screenshot({ path: out });
    console.log(`${out} — ${one.what}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}

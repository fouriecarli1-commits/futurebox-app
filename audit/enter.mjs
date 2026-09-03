/** Sign in, open the studio, and report what is there. Shared by every audit. */
import { chromium } from 'playwright';

/** The sandbox has no route to the open internet; those are not app faults. */
const OFFSITE = /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED/;
/** A fetch cancelled because the component unmounted is the design, not a fault. */
const ABORTED = /ERR_ABORTED/;

export async function enter({ width = 1280, height = 900 } = {}) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage({ viewport: { width, height } });
  const problems = [];
  const note = (s) => { if (!problems.includes(s)) problems.push(s); };
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && !OFFSITE.test(text)) note(`console: ${text.slice(0, 240)}`);
  });
  page.on('pageerror', (e) => note(`pageerror: ${String(e).slice(0, 240)}`));
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText ?? '';
    if (OFFSITE.test(why) || ABORTED.test(why)) return;
    note(`request failed: ${r.url().replace('http://localhost:3000', '')} — ${why}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith('http://localhost:3000')) {
      note(`HTTP ${r.status()}: ${r.url().replace('http://localhost:3000', '')}`);
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  // The first load after a restart compiles the route, so give the call to
  // action time to exist rather than assuming it is there on arrival.
  const cta = page.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await page.waitForTimeout(600);
  await page.locator('input[type="email"]').first().fill('audit@futurebox.test');
  const pw = page.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('audit-password-1234');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1800);
  return { browser, page, problems };
}

/** The studio overlay, which is the room you work in. */
export async function studio(page) {
  await page.locator('header button').filter({ hasText: /Creator Studio/i }).first().click();
  await page.waitForTimeout(1500);
  return page.locator('div.fixed.inset-0.z-50').first();
}

/** Sign in, open the studio, and report what is there. Shared by every audit. */
import { chromium } from 'playwright';
import { launchOptions } from './where.mjs';

/** The sandbox has no route to the open internet; those are not app faults. */
const OFFSITE = /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED/;
/** A fetch cancelled because the component unmounted is the design, not a fault. */
const ABORTED = /ERR_ABORTED/;

export async function enter({ width = 1280, height = 900 } = {}) {
  const browser = await chromium.launch(launchOptions());
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

  await dismissDoor(page);
  return { browser, page, problems };
}

/**
 * The welcome page, out of the way.
 *
 * Signing in lands on it and it covers the header, so every probe that went
 * straight for the studio button started timing out against a door rather than
 * against a fault — and a probe that cannot get in reports nothing at all,
 * which is worse than one that fails.
 *
 * Waited for rather than checked once: it draws after two fetches settle, so
 * asking whether it is there the instant the form is submitted gets "no" and
 * then it appears half a second later, under the next click.
 */
export async function dismissDoor(page) {
  /* Found by its own button rather than by a class. A Tailwind arbitrary value
     has to be escaped twice to survive both this file and the selector parser,
     and getting that wrong fails silently as "no door" — which is exactly the
     answer that put the door back under the next click. */
  const notNow = page.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  try {
    await notNow.waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    return; // Not every route through the app opens it.
  }
  await notNow.click({ timeout: 5000 }).catch(() => undefined);
  await notNow.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(400);
}

/** The studio overlay, which is the room you work in. */
export async function studio(page) {
  await dismissDoor(page);
  /* The header button was called "Creator Studio" and is now called "Studio".
     Both are matched, because a probe that silently stops finding its way in
     reports every room as clean — which is what this one did until somebody
     noticed it had been passing without visiting anything. */
  await page.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await page.waitForTimeout(1500);
  return page.locator('div.fixed.inset-0.z-50').first();
}

/**
 * Into a room, the way a person gets there.
 *
 * Rooms used to be reached from a dropdown on a phone and a rail on a desk,
 * and every probe drove the dropdown. There is no dropdown now: a phone has
 * one green button back to the studio's front door, and the door carries a
 * button for every room under the same stage headings the rail uses.
 *
 * So this presses the door and then the room, which is what somebody does.
 * On a desk the rail is right there and the door is not in the way, so the
 * rail is used when it is visible.
 */
export async function toRoom(page, name) {
  /** A room's own button on the door, matched on its first line.
   *
   *  The hint under each one holds room names too — "Podcast" appears in the
   *  video desk's — so matching the whole button opened the wrong room. */
  const onDoor = async () => {
    const buttons = page.locator('div.fixed.inset-0.z-\\[55\\] button');
    const many = await buttons.count();
    for (let i = 0; i < many; i += 1) {
      const first = ((await buttons.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
      if (first.toLowerCase().startsWith(name.toLowerCase())) return buttons.nth(i);
    }
    return null;
  };

  /* The door may already be open — the studio opens on it — in which case
     reaching for the way back clicks through an overlay and times out. */
  let button = await onDoor();
  if (!button) {
    /* The rail inside the studio, not the feed's tab strip behind it.

       `nav button` found the landing page's tabs — which Playwright calls
       visible, because visibility does not account for being covered by a
       full-screen overlay — and then spent thirty seconds retrying a click
       that the studio kept intercepting. */
    const rail = page.locator('div.fixed.inset-0.z-50 nav button').filter({ hasText: name }).first();
    if ((await rail.count()) && (await rail.isVisible().catch(() => false))) {
      await rail.click();
      await page.waitForTimeout(900);
      return;
    }
    const back = page.locator('button').filter({ hasText: /All rooms|Alle kamers/ }).first();
    if (await back.count()) {
      await back.click();
      /* The door fades in. Reading it the instant the press lands finds an
         empty overlay and reports a room as unreachable. */
      await page.locator('div.fixed.inset-0.z-\\[55\\] button').first()
        .waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }
    button = await onDoor();
  }
  if (!button) throw new Error(`no way into ${name}`);
  await button.click();
  await page.waitForTimeout(1100);
}

/**
 * The phone's own Back button, kept inside the app.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * This app is one route: rooms, the front door, the search and the account
 * panel are overlays on the same page. That is right for how it works and
 * wrong for the hardware button under everybody's thumb — as far as the
 * browser was concerned nothing had been navigated to, so Back from anywhere
 * in the studio left the site. Carli: "die actual foon se back knoppie maak
 * dat die hele app uit gaan en dan moet jy van voor af in log."
 *
 * ── What is asserted ─────────────────────────────────────────────────────
 *
 * That Back walks out one layer at a time — a room to the door, the door to
 * the feed — and only leaves the app from the feed, where there is nothing
 * further in to come back from.
 *
 * And the part that is easy to get wrong and impossible to notice by reading:
 * closing a layer with a button has to *consume* the history entry it pushed,
 * or the next Back re-opens the thing somebody just dismissed and the app
 * appears to go forwards when they press back.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { launchOptions } from './where.mjs';

const PORT = process.argv[2] || '3083';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch(launchOptions());
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('back@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('back-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  /* The welcome door, waited for and then gone.
     `count()` once was the fault: the door draws after two fetches settle, so
     asking the instant the bar appears gets "no", and half a second later it is
     there — over the header, under the next press. `bringsong` timed out on
     exactly that. `enter.mjs` has said it in a comment since the day it was
     written; the probes with their own way in never got the lesson. */
  await dismissDoor(p);
  await p.waitForTimeout(900);

  const bar = p.locator('nav[aria-label]').first();
  const press = async (name) => {
    await bar.locator('button').filter({ hasText: name }).first().click();
    await p.waitForTimeout(1100);
  };
  const back = async () => {
    await p.goBack();
    await p.waitForTimeout(1100);
  };
  const where = async () =>
    p.evaluate(() => {
      const lit = document.querySelector('nav[aria-label] button[aria-current="page"]');
      return {
        tab: lit ? lit.innerText.trim() : '(none)',
        door: !!document.querySelector('div.fixed.inset-0.z-\\[55\\]'),
        studio: !!document.querySelector('div.fixed.inset-0.z-50'),
        signedIn: !!document.querySelector('nav[aria-label]'),
      };
    });

  /* ── A room, out one layer at a time ────────────────────────────────── */
  await press('Make');
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  check('the door is open', (await door.count()) > 10);

  const many = await door.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^The Booth/i.test(first)) {
      await door.nth(i).click();
      break;
    }
  }
  await p.waitForTimeout(1300);
  check('and a room is open', (await door.count()) === 0 && (await where()).studio);

  await back();
  const atDoor = await where();
  check('Back from a room lands on the door, not off the site',
    atDoor.door && atDoor.signedIn, JSON.stringify(atDoor));

  await back();
  const atFeed = await where();
  check('Back from the door lands on the feed, still signed in',
    !atFeed.door && !atFeed.studio && atFeed.signedIn, JSON.stringify(atFeed));

  /* ── The account panel, and the entry a button has to consume ───────── */
  await press('You');
  check('the account panel is open',
    (await p.locator('div[role="dialog"][aria-modal="true"]').count()) === 1);
  await back();
  check('Back closes it rather than leaving',
    (await p.locator('div[role="dialog"][aria-modal="true"]').count()) === 0 &&
      (await where()).signedIn);

  /* ── Deep, then all the way out ─────────────────────────────────────── */
  await press('Make');
  await press('Library');
  await press('You');
  await back();
  const oneOut = await where();
  check('Back from the account panel over a room closes the panel',
    (await p.locator('div[role="dialog"][aria-modal="true"]').count()) === 0 && oneOut.studio,
    JSON.stringify(oneOut));
  await back();
  const twoOut = await where();
  check('and again lands on the door with every room on it',
    twoOut.door && twoOut.signedIn, JSON.stringify(twoOut));
  await back();
  const threeOut = await where();
  check('and again on the feed', !threeOut.door && !threeOut.studio && threeOut.signedIn,
    JSON.stringify(threeOut));

  /* ── Closed with a button, and the entry that has to go with it ─────── */
  await press('You');
  await p.locator('div[role="dialog"] button[aria-label]').first().click();
  await p.waitForTimeout(1200);
  check('closing it with its own button closes it',
    (await p.locator('div[role="dialog"][aria-modal="true"]').count()) === 0);
  await back();
  check('and Back after that does not re-open what was dismissed',
    (await p.locator('div[role="dialog"][aria-modal="true"]').count()) === 0);
  /* Which leaves it at the feed with nothing open, and Back there does what
     Back has always done: it leaves. That is deliberate — there is nowhere
     further in to come back from — and it is asserted rather than left to be
     discovered, because it is the one press that still takes somebody out. */
  check('Back from the feed leaves the app, as it should', !(await where()).signedIn);

} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nBack walks out of the app one layer at a time, and only leaves from the feed.');

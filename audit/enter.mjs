/** Sign in, open the studio, and report what is there. Shared by every audit. */
import { chromium } from 'playwright';
import { launchOptions } from './where.mjs';

/** The sandbox has no route to the open internet; those are not app faults. */
const OFFSITE = /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED/;
/** A fetch cancelled because the component unmounted is the design, not a fault. */
const ABORTED = /ERR_ABORTED/;

/**
 * @param at  where the app is. Defaults to :3000 because twenty-six older
 *            probes assume it; a probe that starts its own server passes
 *            `serve()`'s url instead, which is what makes it able to run on a
 *            machine where nobody has left a server lying around.
 * @param args extra Chromium switches. A probe that has to sing needs a
 *            microphone — `--use-fake-device-for-media-stream` and its
 *            companion — and this is the only way in for one that walks the
 *            app from the front door rather than opening a probe page.
 */
/**
 * @param lang   'af' to arrive in Afrikaans. Set before the first paint rather
 *               than clicked afterwards: a probe that switches language on
 *               screen has already measured one page in English, and the
 *               interesting failures — a missing translation, a line that no
 *               longer fits — are on the first paint.
 * @param before called with the page after it exists and before it is pointed
 *               at the app. This is where a probe registers its `page.route`
 *               stubs: registering them after `enter()` returns is too late
 *               for anything the app fetches on mount, and reloading to fix
 *               that signs the tab out again on a deployment with no accounts.
 */
export async function enter({
  width = 1280, height = 900, at = 'http://localhost:3000', args = [], touch = false,
  lang = null, before = null,
} = {}) {
  const browser = await chromium.launch(launchOptions(args.length ? { args } : {}));
  /* `touch` is not a detail on a phone-sized run.

     `app/globals.css` keeps a whole block behind `@media (pointer: coarse)` —
     the forty-four pixel minimums and the rule that sizes a link for a thumb.
     Playwright's desktop Chromium reports a *fine* pointer whatever viewport
     it is handed, so a probe that only shrinks the window is measuring the app
     with those rules switched off. That is how the share sheet passed three
     rounds of measurement while Carli was holding a photograph of it failing. */
  const page = await browser.newPage({ viewport: { width, height }, ...(touch ? { hasTouch: true } : {}) });
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
    note(`request failed: ${r.url().replace(at, '')} — ${why}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(at)) {
      note(`HTTP ${r.status()}: ${r.url().replace(at, '')}`);
    }
  });

  if (lang) {
    await page.addInitScript((one) => {
      try {
        window.localStorage.setItem('futurebox.lang.v1', one);
      } catch {
        /* Storage off. The probe will find English and say so. */
      }
    }, lang);
  }
  if (before) await before(page);

  await page.goto(at, { waitUntil: 'networkidle' });
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

  /* Waited for, not slept through.

     This was `waitForTimeout(1800)`, and 1800ms is how long signing in took on
     an idle laptop. On a loaded machine it is sometimes not enough, and the
     probe then measures the signed-out page while believing it is signed in —
     which is not a probe failing, it is a probe answering a different question
     and reporting the answer as a fault. `firstscreen` failed exactly that way
     on the desk header: signed out, the page draws a different header, and the
     probe read `static` where it expected `sticky`.

     The bottom bar is the signal because it exists on every screen the app
     shows a signed-in person and on none that it shows a signed-out one. */
  await page
    .locator('nav[aria-label]')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);

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
  /** The one button among these whose FIRST LINE is the room's name.
   *
   *  The hint under each one holds room names too — "Podcast" appears in the
   *  video desk's, and so does "Adverts" — so matching the whole button opens
   *  the wrong room. Playwright's `hasText` searches the whole subtree, which
   *  is why this is a loop rather than a filter.
   *
   *  Shared by the door and the rail. It was written for the door only, and
   *  the rail kept its `filter({ hasText: name })` — so `toRoom(page,
   *  'Adverts')` from inside a room walked into the Video desk, whose hint
   *  reads "Adverts, podcasts, social". The probe then measured the wrong room
   *  and reported the Adverts screen as missing. Found the first time
   *  `audit/addon.mjs` was ever run. */
  const firstLineIs = async (buttons) => {
    const many = await buttons.count();
    for (let i = 0; i < many; i += 1) {
      const first = ((await buttons.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
      if (first.toLowerCase().startsWith(name.toLowerCase())) return buttons.nth(i);
    }
    return null;
  };

  const onDoor = () => firstLineIs(page.locator('div.fixed.inset-0.z-\\[55\\] button'));

  /* The door may already be open — the studio opens on it — in which case
     reaching for the way back clicks through an overlay and times out. */
  let button = await onDoor();
  if (!button) {
    /* The rail inside the studio, not the feed's tab strip behind it.

       `nav button` found the landing page's tabs — which Playwright calls
       visible, because visibility does not account for being covered by a
       full-screen overlay — and then spent thirty seconds retrying a click
       that the studio kept intercepting. */
    const rail = await firstLineIs(page.locator('div.fixed.inset-0.z-50 nav button'));
    if (rail && (await rail.isVisible().catch(() => false))) {
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

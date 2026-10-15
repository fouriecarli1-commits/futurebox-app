/**
 * The kids room: can a grown-up find it, and does the door let them through?
 *
 * Carli, 12 October 2026, three messages in a row: *"Ek sien nerens die kids
 * room nie, waar kry ek dit?"* — *"die kids room kan nie weggesteek word nie,
 * dit moet 'n highlight wees"* — *"Wel die kids room gaan nie verder as die
 * parental page nie."*
 *
 * Three findings, three measurements:
 *
 *   1. Inside the app there is no door to `/kids` (14 October 2026: only
 *      the welcome page opens it); the address still lands there.
 *   2. Giving an allowance takes the door away and shows the child's room.
 *      The API is stubbed, so this measures the page and not her database.
 *   3. Every way the press can fail ends in a sentence: the server refusing
 *      (a table not created yet), and nobody signed in — which is how she
 *      reached it, from the sign-in screen's link. Before today both were
 *      silent, and silence was the whole report.
 *
 *   4. "Daar is kinders wat kan tik": the child's own words. Typing in the
 *      box puts the words into the sentence; pressing the microphone, with
 *      the browser's recogniser faked to hear "a cat in a hat", puts those
 *      words into the box. No real microphone, no server: the recogniser is
 *      the browser's own.
 *
 * Mutation that proved it: with the POST stub answering `open: false` the
 * second finding fails ("the child's room is not shown"); with the sign-in
 * box's selector removed the third fails; with the fake recogniser's words
 * changed the fourth fails.
 */
import { chromium } from 'playwright';
import { enter, studio } from './enter.mjs';
import { launchOptions, serve, shot } from './where.mjs';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const PORT = process.argv[2] || '3261';
const server = await serve(PORT);

const OPEN = { open: true, allowance: 20, spent: 0, left: 20, minutes: null, secondsLeft: null };

/** `/api/kids`, answered here. `onPost` decides what an allowance gets back. */
async function stubKids(page, onPost) {
  let state = { open: false };
  await page.route('**/api/kids', async (route) => {
    const how = route.request().method();
    if (how === 'GET') return route.fulfill({ json: state });
    if (how === 'POST') {
      const answer = onPost();
      if (answer.status) return route.fulfill({ status: answer.status, json: answer.json });
      state = answer.json;
      return route.fulfill({ json: state });
    }
    return route.fulfill({ json: state });
  });
  /* The monthly kids pack lives on Paystack; the walk has none standing. */
  await page.route('**/api/kids/pack', (route) => route.fulfill({ json: { monthly: [] } }));
}

/* ── 1 + 2. Signed in: find it, and go through it ────────────────────── */
{
  const { browser, page, problems: entering } = await enter({ width: 1280, height: 900, at: server.url });
  await stubKids(page, () => ({ json: OPEN }));
  /* A recogniser that hears one thing. Installed before the kids page
     loads, so the room finds it where a phone's browser would have one. */
  await page.addInitScript(() => {
    class Heard {
      start() {
        setTimeout(() => this.onresult?.({ results: [[{ transcript: 'a cat in a hat' }]] }), 60);
        setTimeout(() => this.onend?.(), 120);
      }
      stop() { this.onend?.(); }
    }
    window.SpeechRecognition = Heard;
  });
  /* Into the studio, where the rail is. `studio()` is the place, not the
     press — see enter.mjs. */
  await studio(page);

  /* Carli, 14 October 2026: "Die kids room met sy aparte credits moet net
     van die welcoming page af geaccess kan word. Dit moenie binne die app
     geaccess kan word nie." So inside the app there is no door at all —
     not on the rail, not on the greeting, not in the profile — and the one
     way in is the banner on the signed-out welcome page, which section 3b
     measures. A grown-up who is signed in still gets through by the address. */
  check('the rail has no door to the kids room', (await page.locator('[data-railkids]').count()) === 0);
  check('  nor the greeting', (await page.locator('[data-kidsdoorhome]').count()) === 0);
  check('  nor anything else in the app that links there', (await page.locator('a[href="/kids"]').count()) === 0);
  await page.screenshot({ path: shot('kids-door-home.png'), fullPage: false });

  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  check('the address still lands on the kids page', /\/kids$/.test(page.url()), page.url());

  /* The kids room's own prices (14 October 2026): three packs to buy on
     the parents page, and a press that goes to the till for the one that
     was pressed. The till is stubbed to send the browser straight back, as
     Paystack does, and the page must then say the payment went through
     rather than show the old balance as if nothing had happened. */
  await page.locator('[data-kidspacks]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  check('the parents page sells the three kids packs', (await page.locator('[data-kidsbuy]').count()) === 3);
  let tillAsked = null;
  await page.route('**/api/checkout', async (route) => {
    tillAsked = route.request().postDataJSON();
    return route.fulfill({ json: { url: `${server.url}/kids?paid=1` } });
  });
  await page.locator('[data-kidsbuy="kids-try"]').click();
  await page.waitForURL(/paid=1/, { timeout: 15000 }).catch(() => undefined);
  check('  and a press asks the till for that pack', tillAsked?.kind === 'kids' && tillAsked?.pack === 'kids-try', JSON.stringify(tillAsked));
  await page.locator('[data-kidspaid]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  check('  and coming back says the payment went through', await page.locator('[data-kidspaid]').isVisible().catch(() => false));
  /* A pack chosen on the welcome page arrives as `?buy=` and goes straight
     on to the till once somebody is signed in (Carli, 15 October 2026:
     "Maak ook seker dit vat jou na die payment system toe"). */
  tillAsked = null;
  await page.goto(`${server.url}/kids?buy=kids-month`, { waitUntil: 'networkidle' });
  await page.waitForURL(/paid=1/, { timeout: 15000 }).catch(() => undefined);
  check('a pack chosen on the welcome page goes straight on to the till for it',
    tillAsked?.kind === 'kids' && tillAsked?.pack === 'kids-month', JSON.stringify(tillAsked));
  await page.unroute('**/api/checkout');
  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });

  const door = page.locator('[data-kidsdoor]');
  await door.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  check("the grown-up's page is the first thing there", await door.isVisible().catch(() => false));
  check('  with no sign-in step, because somebody is signed in', (await page.locator('[data-kidssignin]').count()) === 0);

  await page.locator('[data-kidsstep]').first().click();
  const room = page.locator('[data-kidsroom]');
  await room.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  check("giving an allowance shows the child's room", await room.isVisible().catch(() => false));
  check('  and takes the door away', (await door.count()) === 0);
  check('  with nothing said about a failure', (await page.locator('[data-kidsfail]').count()) === 0);

  /* ── 4. The child's own words ─────────────────────────────────────── */
  /* Since 13 October 2026 the room opens on six doors, and the box to type
     in is behind the music one. */
  await page.locator('[data-kidsroomdoor="music"]').first().click();
  await page.waitForTimeout(600);
  const box = page.locator('[data-kidstype]');
  check('the room has a box to type in', (await box.count()) === 1);
  await box.fill('a dog on the moon');
  await page.waitForTimeout(200);
  const sentence = (await page.locator('[data-kidssentencetopic]').textContent().catch(() => '')) ?? '';
  check('  and typing puts the words into the sentence', sentence.includes('a dog on the moon'), sentence);
  await page.locator('[data-kidsclearwords]').click();
  await page.waitForTimeout(150);
  check('  and the words can be cleared again', (await box.inputValue()) === '');
  const mic = page.locator('[data-kidsspeak]');
  check('  and there is a button to say it instead, where the browser can listen', (await mic.count()) === 1);
  await mic.click();
  await page.waitForTimeout(500);
  check('  and what is said lands in the box', (await box.inputValue()).includes('a cat in a hat'), await box.inputValue());
  check('  and in the sentence', ((await page.locator('[data-kidssentencetopic]').textContent().catch(() => '')) ?? '').includes('a cat in a hat'));
  check('  and listening stops by itself', (await page.locator('[data-kidslistening]').count()) === 0);
  /* Words and a sound are enough: the make button comes on without a topic bubble. */
  await page.locator('[data-kidssounds] button').first().click();
  await page.waitForTimeout(200);
  check('  and words plus a sound are enough to make a song', await page.locator('[data-kidsmake]').isEnabled());
  await page.screenshot({ path: shot('kids-door-through.png'), fullPage: false });
  check('the way in threw nothing', entering.length === 0, entering.join(' | '));
  await browser.close();
}

/* ── 3a. The server refusing: a sentence, not silence ────────────────── */
{
  const { browser, page } = await enter({ width: 1280, height: 900, at: server.url });
  const why = 'The kids room is not in the database yet: run supabase/kinders.sql and supabase/skermtyd.sql.';
  await stubKids(page, () => ({ status: 503, json: { message: why } }));
  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsdoor]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  await page.locator('[data-kidsstep]').first().click();
  const fail = page.locator('[data-kidsfail]');
  await fail.waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
  const said = (await fail.textContent().catch(() => '')) ?? '';
  check('a refused allowance says why, under the buttons', said.includes('kinders.sql'), said.slice(0, 120));
  check('  and the door stays, so the press can be made again', (await page.locator('[data-kidsdoor]').count()) === 1);
  check('  and no child’s room is drawn', (await page.locator('[data-kidsroom]').count()) === 0);
  await browser.close();
}

/* ── 3b. Nobody signed in, on a phone: the step is to sign in ────────── */
{
  const browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(server.url, { waitUntil: 'networkidle' });
  /* The pricing section prices the kids room on its own. */
  check('the welcome page prices the kids room apart, three packs',
    (await page.locator('[data-landingkidsprices] [data-landingkidspack]').count()) === 3);
  /* The three packs are presses now, one chosen at a time, and the button
     carries the chosen one to the kids page. */
  await page.locator('[data-landingkidspack="kids-plus"]').click().catch(() => undefined);
  check('  a pack can be chosen there',
    (await page.locator('[data-landingkidspack="kids-plus"]').getAttribute('aria-pressed').catch(() => null)) === 'true');
  check('  and the button carries it to the kids page',
    (await page.locator('[data-landingkidsbuy]').getAttribute('href').catch(() => '')) === '/kids?buy=kids-plus');
  check('  and says nothing about families or how many children',
    !/famil|three children|drie kinders/i.test((await page.locator('[data-landingkidsprices]').textContent().catch(() => '')) ?? ''));
  const banner = page.locator('[data-authkids]');
  check('the welcome page has the one door into the kids room', (await banner.count()) === 1);
  await banner.scrollIntoViewIfNeeded().catch(() => undefined);
  await banner.click({ timeout: 10000 }).catch(() => undefined);
  await page.waitForURL(/\/kids$/, { timeout: 15000 }).catch(() => undefined);
  check('  and pressing it lands on the kids page', /\/kids$/.test(page.url()), page.url());
  const signin = page.locator('[data-kidssignin]');
  await signin.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  check('signed out, the door says to sign in first', await signin.isVisible().catch(() => false));
  const steps = page.locator('[data-kidsstep]');
  const disabled = await steps.evaluateAll((all) => all.length > 0 && all.every((one) => one.disabled));
  check('  and every allowance button is switched off', disabled);
  /* Signed in HERE (Carli, 14 October 2026: "ek kry nie daar in gelog nie").
     It used to send her back to the welcome page, which is where she had
     come from — a circle with no sign-in on it. */
  check('  and signs in right here, without going anywhere',
    (await signin.locator('[data-kidssigninemail]').count()) === 1
    && (await signin.locator('[data-kidssigninpassword]').count()) === 1
    && (await signin.locator('[data-kidssigningo]').count()) === 1);
  await signin.locator('[data-kidssigninemail]').fill('ouer@example.com').catch(() => undefined);
  await signin.locator('[data-kidssigninpassword]').fill('verkeerd').catch(() => undefined);
  await signin.locator('[data-kidssigningo]').click().catch(() => undefined);
  await page.locator('[data-kidssigninproblem]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  check('  and a sign-in that cannot work says why, rather than doing nothing',
    (await page.locator('[data-kidssigninproblem]').count()) === 1);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  check('  and the page fits a phone sideways', fits);
  await page.screenshot({ path: shot('kids-door-signedout.png'), fullPage: false });
  check('the page threw nothing', errors.length === 0, errors.join(' | '));
  await browser.close();
}

server.stop();
if (problems.length) {
  console.error(`\ncheck:kidsdoor — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:kidsdoor — the kids room can be found, the door lets a grown-up through, and every failure is a sentence.');

/**
 * Coming back from the till, into the room she paid in.
 *
 * ── Why this is walked and not read ──────────────────────────────────────
 *
 * Carli asked for this twice in two days:
 *
 *   *"Kyk na die redirect na betalings. Met die album art wanneer die
 *    betaling terug kom is dit nie in dieselfde kamer nie. Ek betaal die R50
 *    om die bid te begin, maar dan gebeur daar niks nie. Daar is nie 'n
 *    countdown nie en nie 'n teen bid button nie."*
 *
 * `check:paidback` reads the source and proves the parts are wired: the till
 * names a room, the studio reads the flag, the wall takes `paid`. Every one
 * of those can be true while the thing still does nothing, because what
 * actually has to happen is a sequence across a page load — the studio's
 * first render reads a query string, resolves a room, opens it, and hands a
 * value to a component that has not mounted yet. Nothing in the source can
 * show that it lands.
 *
 * She has asked twice. A second "it is fixed" that turns out not to be is
 * worse than not answering, so this presses the actual address Paystack
 * sends her to and reads the room.
 *
 * ── What is stubbed, and what is not ─────────────────────────────────────
 *
 * The gallery's own read, because an unattended project has nothing hanging
 * and the whole point is to look at a piece she can bid on. Everything
 * downstream of it is real: the query string, the resolve, the move, the
 * hand-off waiting for a room that has not mounted, the second read, and the
 * sentence on the screen. The count of reads is the assertion that matters
 * most — one read is the wall from BEFORE the payment, which is the same
 * nothing she reported with a shorter walk.
 */
import { chromium } from 'playwright';
import { agreeAndSubmit, launchOptions, serve, shot } from './where.mjs';
import { dismissDoor } from './enter.mjs';

const PORT = Number(process.argv[2] || 3134);

const server = await serve(PORT);
const b = await chromium.launch(launchOptions());
/* The screen she holds. The room is a full-screen overlay on a phone and a
   column on a desk, and the sentence below lands in a different element at
   the two widths. */
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

/* A wall with one piece on it, and the bidding already open, so the
   countdown and the bid button are both things that can be looked for.
   `mineToBid` flips on the second read — which is exactly what the R50
   buys, and the reason the room has to read itself again. */
const ENDS = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
let reads = 0;
const piece = (mine) => ({
  id: 'work-1',
  title: 'Stof oor die Karoo',
  rand: 200,
  top: 260,
  bids: 3,
  next: 280,
  endsAt: ENDS,
  started: true,
  over: false,
  wonByMe: false,
  mineToBid: mine,
  leadingMe: false,
  artist: 'artist-1',
  by: 'Elmarie Nel',
  url: null,
});
await p.route('**/api/artmarket', async (route) => {
  if (route.request().method() !== 'GET') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  }
  reads += 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      owing: null,
      artists: [{ id: 'artist-1', name: 'Elmarie Nel', note: '', works: 1, sold: 0 }],
      everyArtist: null,
      bidderRand: 50,
      noOwner: false,
      /* The first read is the wall before the payment; every read after it
         is the wall she paid for. The webhook lands while the browser is
         still being redirected, so this is the real timing. */
      wall: [piece(reads > 1)],
      bought: [],
      asBuyer: [],
      asArtist: [],
      asHouse: null,
      me: null,
    }),
  });
});
await p.route('**/api/taste*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"taste":[],"ready":true}' }));

try {
  await p.goto(server.url, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('paidback@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('paidback-password-1234');
  await agreeAndSubmit(p);
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 60000 });
  await dismissDoor(p);

  /* ── The address Paystack actually sends her to ───────────────────── */
  const before = reads;
  await p.goto(`${server.url}/?paid=1&room=albumart&piece=work-1`, { waitUntil: 'domcontentloaded' });
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 60000 });
  await p.waitForTimeout(3000);

  /* ── The door, BEFORE anything takes it down ───────────────────────────
   *
   * Carli, 22 September 2026, third time: *"Na betaling gooi hy my uit die
   * kamer."* And this probe passed every time she said it.
   *
   * Because the line here used to be `await dismissDoor(p)` — before the
   * assertions. The room was always chosen correctly; the door was landing
   * on top of it, put there by the session restore resolving after the paid
   * effect. The probe took the door down and then reported that nothing was
   * covering the room.
   *
   * So the door is now the FIRST thing asserted, and it is not dismissed
   * until after. A probe that tidies the screen before measuring it is a
   * probe that measures its own tidying.
   *
   * Read from `data-atdoor` on the studio shell. The first version of this
   * rule counted buttons saying "Not now" — which is the GREETING's skip
   * button and a copilot button, neither of which is the door. It failed on
   * a screen that was correct, which is the same mistake wearing the other
   * hat. */
  const door = await p.locator('[data-atdoor]').count();
  check('coming back from the till does not put her at the door', door === 0,
    'the room was chosen and then covered — from the outside that is being thrown out of it');

  const room = await p.locator('[data-copilot]').first().getAttribute('data-copilot').catch(() => null);
  check('paying puts her in the room she paid in', room === 'albumart', String(room));

  /* And on the piece, not just the wall: the bid button lives inside the
     opened sheet, so a room with everything shut still says no. */
  const sheet = await p.locator('[data-artsheet], [role="dialog"]').first().count();
  check('  and on the piece she paid against, not the wall', sheet > 0,
    'she paid to bid on one picture and got a grid with nothing open');

  await dismissDoor(p);

  const words = await p.locator('body').innerText();
  check('  and the room says the money came through',
    /payment came through|betaling het deurgekom/i.test(words),
    'she was sent out to a till and back; silence is what she reported');

  check('  and the wall was read again after the payment, not only before it',
    reads - before >= 2,
    `${reads - before} read(s) — one read is the wall from before she paid`);

  /* ── And the two things she said were missing ─────────────────────── */
  check('the countdown is on the piece', /\d+u \d+m|\d+m (left|oor)/i.test(words),
    words.replace(/\s+/g, ' ').slice(0, 160));

  /* The sheet is already open — the till carried the piece back and the room
     opened it, which is the whole of her second complaint. So this no longer
     clicks the sleeve to open it: clicking a tile that is already covered by
     its own sheet times out, which is how this step first failed after the
     fix landed. It reads what is on screen. */
  const onSheet = await p.locator('body').innerText();
  check('the bid button is there, not the R50 pass again',
    /R280/.test(onSheet) && !/R50/.test(onSheet),
    onSheet.replace(/\s+/g, ' ').slice(0, 200));

  /* ── The address is cleaned, so a refresh is a refresh ────────────── */
  const url = p.url();
  check('the address no longer says a payment just landed',
    !/paid=1/.test(url) && !/room=albumart/.test(url), url);

  await p.screenshot({ path: shot('paidback.png') });
} catch (error) {
  problems.push(`threw: ${String(error).slice(0, 200)}`);
} finally {
  await b.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:paidwalk — ${problems.length} problem(s):`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('\nWalked the address Paystack sends her to: the gallery opened, read itself again, said the money landed, and the piece offered a bid rather than the pass.');

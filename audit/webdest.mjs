/**
 * The website, ticked in the advert room — and in what leaves the browser.
 *
 * ── What was asked ───────────────────────────────────────────────────────
 *
 * Carli, 11 September 2026: "Ek wil ook vra dat ons die web ook 'n opsie moet
 * maak waar advertensies gepost gaan word. Dit moet ook daar wees om te kan
 * tick."
 *
 * ── What `check:socialformats` cannot reach ──────────────────────────────
 *
 * The source check counts `DESTINATIONS` against the translation table and
 * reads Campaign.tsx for the two lines that draw and send them. Both are
 * true of a button that is drawn under another panel, or that shares its
 * ticked state with TikTok, or that is ticked and then dropped on the way to
 * the writer because the request is assembled somewhere the regex did not
 * look. Every one of those is the feature not existing.
 *
 * ── The assertion that matters ───────────────────────────────────────────
 *
 * The last one. `/api/campaign` is intercepted and the *request* read — not
 * stubbed and then asked what the screen shows. A tick box that does not
 * change the body of the request is decoration, and that is precisely the
 * shape of fault this app has shipped before: a marketing plan that rendered
 * nothing for a fortnight because the route replied with the plan bare and
 * the screen read `said.plan`.
 *
 * The reply is canned, because what is under test is what the browser sent.
 */
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { dismissDoor, studio, toRoom } from './enter.mjs';

const PORT = Number(process.argv[2] || 3118);
const af = process.argv[3] === 'af';

const server = await serve(PORT);
const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
/* The detail is the explanation of the FAILURE, so it is printed only when
   there is one. The first run of this file printed it either way, and every
   passing line came out as "ok — nothing was posted to /api/campaign" —
   output that has to be re-read against the source to be believed is output
   nobody reads. */
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch { /* storage off */ } }, af ? 'af' : 'en');

/* What the browser sent, kept rather than answered. */
let sent = null;
await p.route('**/api/campaign', async (route) => {
  sent = route.request().postDataJSON();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ads: [{ angle: 'The near one', hook: 'Two streets away', body: 'Bread at six.', cta: 'Come past', hashtags: [] }],
    }),
  });
});

try {
  await p.goto(server.url, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('webdest@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('webdest-password-1234');
  await p.locator('button[type="submit"]').first().click();
  /* Waited for, not slept through — the bottom bar is on every signed-in
     screen and no signed-out one, so it is the honest signal that the app is
     there. A fixed pause is how a probe measures the signed-out page and
     reports a working room as broken. */
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 60000 });
  await dismissDoor(p);

  await studio(p);
  await toRoom(p, af ? 'Advertensies' : 'Adverts');
  await p.waitForTimeout(1400);

  const room = p.locator('div.fixed.inset-0.z-50').first();

  /* Found by its own name, in the language under test. A button matched by
     position in the row would pass while sitting in the wrong card. */
  const web = room.locator('button[aria-pressed]')
    .filter({ hasText: af ? /Jou eie webwerf/ : /Your own website/ }).first();
  await web.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  check('the advert room offers the web as somewhere to post',
    await web.isVisible().catch(() => false),
    'DESTINATIONS renders, but not where anybody can press it');

  if (await web.isVisible().catch(() => false)) {
    await web.scrollIntoViewIfNeeded();

    /* Beside the platforms, not in a card of its own further down. "Dit moet
       ook daar wees om te kan tick" is about the row, not about the list. */
    const tiktok = room.locator('button[aria-pressed]').filter({ hasText: /TikTok/ }).first();
    const near = await web.evaluate((one, other) => one.parentElement === other.parentElement,
      await tiktok.elementHandle());
    check('  in the same row as the accounts', near,
      'it is drawn in a separate list, so it reads as a different question');

    check('  and it says what shape fits a page',
      /16:9|vierkant|square/.test(await web.innerText()),
      await web.innerText());

    /* Off to begin with. The row starts on TikTok and Instagram, and a
       website ticked by default would post a plan somebody never chose. */
    check('  off until it is ticked', (await web.getAttribute('aria-pressed')) === 'false');

    await web.click();
    await p.waitForTimeout(300);
    check('  ticking it turns it on', (await web.getAttribute('aria-pressed')) === 'true');

    /* The shared-state failure: two lists ticking into one array of ids, and
       one button switching another off. Nothing throws; the row is just
       wrong, and `check:socialformats` can only rule out the id collision
       that causes it, never the behaviour. */
    check('  and does not switch an account off',
      (await tiktok.getAttribute('aria-pressed')) === 'true',
      'ticking the website unticked TikTok');

    await p.screenshot({ path: shot(`webdest-${af ? 'af' : 'en'}.png`) });

    /* ── And it reaches the writer ─────────────────────────────────── */
    await room.locator('#ads-what').fill(af ? 'n Bakkery in Bellville' : 'A bakery in Bellville');
    await p.waitForTimeout(200);
    const write = room.locator('button').filter({ hasText: af ? /Skryf die advertensies/ : /Write the adverts/ }).first();
    await write.click();
    await p.waitForTimeout(2500);

    check('the brief actually left the browser', sent !== null,
      'nothing was posted to /api/campaign');
    check('  and it carries the website among the places',
      typeof sent?.fit === 'string' && /website|webwerf/i.test(sent.fit),
      `fit: ${String(sent?.fit).slice(0, 400)}`);
    /* The one that is easy to get wrong and invisible on screen. `at most 0
       hashtags` reads to a model as an instruction to count, not as none. */
    check('  and asks for no hashtags rather than at most zero',
      typeof sent?.fit === 'string' && !/at most 0 hashtags/.test(sent.fit),
      `fit: ${String(sent?.fit).slice(0, 400)}`);
    check('  while still carrying the accounts that were ticked',
      typeof sent?.fit === 'string' && /TikTok/.test(sent.fit),
      `fit: ${String(sent?.fit).slice(0, 400)}`);
  }
} finally {
  await b.close();
  server.stop();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log(`\nThe web is in the row, ticks on its own, and reaches the writer with no hashtags asked for.`);

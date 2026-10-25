/**
 * Several versions of the one song, in one press.
 *
 * The owner, 24 October 2026: *"2-4 weergawes … dan kan die mense tussen die
 * opsie van die een liedjie kies"*, with a bundle price. What is checked is
 * what she sees and what leaves the app: four chips that each say the whole
 * price of their run; the Make button carrying the bundle price of the chip
 * that is pressed; one request per version going out with its number and the
 * run's id; the takes waiting to be listened to; and Keep saving exactly one.
 *
 * The music engine is stood in for, as `makesong.mjs` stands it in: a probe
 * that needs a paid key is a probe nobody runs.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3402';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
/* Read with no wait: a locator's `innerText()` on nothing waits thirty
   seconds before it throws. */
const text = async (where) => {
  if ((await where.count()) === 0) return '';
  return (await where.first().innerText({ timeout: 2000 }).catch(() => '')) || '';
};
const BUNDLE = { 1: 1, 2: 1.75, 3: 2.4, 4: 3 };

const server = await serve(PORT);
const { browser, page: p } = await enter({ at: server.url, lang: 'en', width: 390, height: 844, touch: true });
const thrown = [];
p.on('pageerror', (e) => thrown.push(String(e).slice(0, 160)));

/* The engine, stood in for. Every request on the way past is kept. */
const sent = [];
await p.route('**/api/music', async (route) => {
  if (route.request().method() === 'GET') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
    return;
  }
  sent.push(JSON.parse(route.request().postData() ?? '{}'));
  await route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg', 'X-Music-Model': 'Stand-in engine' },
    body: Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  });
});

try {
  await studio(p);
  await toRoom(p, 'Make a song');
  await unfold(p);
  const room = p.locator('div.fixed.inset-0.z-50').first();

  /* ── Four chips, each with the whole price of its run ──────────────── */
  const chips = room.locator('[data-makeversion]');
  check('the room offers one to four versions', (await chips.count()) === 4, `${await chips.count()} chips`);
  const priceOn = async (n) => Number(((await text(room.locator(`[data-makeversion="${n}"]`))).match(/(\d+)\s*credits/i) ?? [])[1] ?? NaN);
  const single = await priceOn(1);
  check('  and one version costs what a song costs', Number.isFinite(single) && single > 0, `${single}`);
  for (const n of [2, 3, 4]) {
    const want = Math.round(single * BUNDLE[n]);
    check(`  ${n} versions are priced as a bundle: ${want} credits`, (await priceOn(n)) === want, `chip says ${await priceOn(n)}`);
  }
  check('  one is pressed to begin with', (await room.locator('[data-makeversion="1"]').getAttribute('aria-pressed')) === 'true');

  /* ── The button carries the bundle price of the chip pressed ───────── */
  await room.locator('[data-makeversion="3"]').click();
  await p.waitForTimeout(300);
  check('pressing 3 keeps it pressed', (await room.locator('[data-makeversion="3"]').getAttribute('aria-pressed')) === 'true');
  const go = room.locator('[data-makego]');
  const onButton = Number(((await text(go)).match(/(\d+)\s*credits/i) ?? [])[1] ?? NaN);
  const three = Math.round(single * BUNDLE[3]);
  /* Plus the cover's own price when the cover tick is on: the tick's label
     says what it costs, and the button is the sum of the two. */
  const coverBox = room.locator('[data-covertoo] input[type="checkbox"]');
  const coverOn = (await coverBox.count()) > 0 && (await coverBox.isChecked());
  const coverCost = coverOn ? Number(((await text(room.locator('[data-covertoo]'))).match(/(\d+)\s*credits/i) ?? [])[1] ?? NaN) : 0;
  check('  and the Make button says the bundle price, plus the cover when it is ticked', Number.isFinite(onButton) && onButton === three + coverCost,
    `button ${onButton}, bundle ${three}, cover ${coverCost}`);

  /* ── One press, three requests, three takes to choose from ─────────── */
  const wordsBox = room.locator('[data-makewords] textarea').first();
  await wordsBox.fill('[Verse]\nDrie keer dieselfde lied\n[Chorus]\nEn ek kies die een');
  const name = room.locator('#song-name');
  if (await name.count()) await name.fill('Drie');
  await p.waitForTimeout(400);
  await go.click();
  for (let waited = 0; waited < 60 && sent.length < 3; waited += 1) await p.waitForTimeout(500);
  check('pressing Make sends one request per version', sent.length === 3, `${sent.length} request(s)`);
  check('  each saying how many versions and which take this is',
    sent.length === 3 && sent.every((one, i) => one.versions === 3 && one.take === i), JSON.stringify(sent.map((one) => [one.versions, one.take])));
  check('  under one run id, so the server can bill the bundle and hold each take to the one before it',
    sent.length === 3 && typeof sent[0].bundle === 'string' && sent[0].bundle.length >= 6 && sent.every((one) => one.bundle === sent[0].bundle),
    JSON.stringify(sent.map((one) => one.bundle)));

  const picking = room.locator('[data-makepicking]');
  await picking.waitFor({ timeout: 15000 }).catch(() => undefined);
  const rows = room.locator('[data-makeversionrow]');
  check('the takes wait to be listened to, one row each', (await picking.count()) === 1 && (await rows.count()) === 3, `${await rows.count()} row(s)`);
  check('  each with a player and a Keep button', (await rows.locator('audio').count()) === 3 && (await room.locator('[data-makekeep]').count()) === 3);
  check('  and a way to drop them all', (await room.locator('[data-makedropall]').count()) === 1);

  /* ── Keep saves one, and only one ──────────────────────────────────── */
  const before = sent.length;
  await room.locator('[data-makekeep="2"]').click();
  for (let waited = 0; waited < 40 && (await picking.count()) > 0; waited += 1) await p.waitForTimeout(500);
  check('Keep takes the choice off the table', (await picking.count()) === 0);
  check('  without asking the engine for anything more', sent.length === before, `${sent.length - before} more request(s)`);
  const said = (await text(room)).replace(/\s+/g, ' ');
  check('  and the room says the song is made', /made|saved|ready|library|channel/i.test(said), said.slice(0, 160));

  check('no page errors', thrown.length === 0, thrown.join(' | '));
} catch (error) {
  problems.push(`threw: ${String(error).slice(0, 200)}`);
  console.log(`  NOT  threw: ${String(error).slice(0, 400)}`);
} finally {
  await browser.close();
  server.stop();
}

if (problems.length) {
  console.log(`check:versions — ${problems.length} problem(s):`);
  for (const one of problems) console.log(`  · ${one}`);
  process.exit(1);
}
console.log('check:versions — two to four versions of a song come from one press at a bundle price, each request carries its take and the run, and Keep saves exactly one.');

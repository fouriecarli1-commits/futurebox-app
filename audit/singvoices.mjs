/**
 * The singing-voice picker, with faces in it.
 *
 * `docs/KITS-KAART.md` §5 called this the emptiest screen in the app: a
 * hundred rows of grey text, and a choice between "Male Pop" and "Male Pop 2"
 * made on the strength of a number, while `imageUrl` sat on every record and
 * was read by nothing.
 *
 * What only a browser can settle:
 *
 *   · every row is the same shape whether Kits has a picture or not. A list
 *     where some rows carry an image and some do not is a ragged list, and
 *     that is invisible in any assertion about the data.
 *   · a picture that fails to load falls back to the letter rather than
 *     leaving a broken-image icon, which is the one outcome worse than no
 *     picture at all.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3201';
const PROBE = 'app/singvoices/page.probe.tsx';
const LIVE = 'app/singvoices/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 430, height: 950 }, hasTouch: true });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  /* The pictures come through the app rather than off Kits' host — the whole
     point of `/api/kits/face` — so the probe answers that route: a real PNG
     for two voices, and a 404 for the one whose fall-back is being tested. */
  const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.route('**/api/kits/face*', async (route) => {
    const model = new URL(route.request().url()).searchParams.get('model');
    if (model === 's4') return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
  });

  await page.goto(`${server.url}/singvoices`, { waitUntil: 'networkidle' });
  /* The broken one has to be given time to fail before its row is measured. */
  await page.waitForTimeout(2500);

  /** Every voice row, with its tile. */
  const rows = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[data-probe="picker"] button[aria-pressed]'));
    return buttons.map((one) => {
      const box = one.getBoundingClientRect();
      const tile = one.firstElementChild;
      const tileBox = tile ? tile.getBoundingClientRect() : null;
      /* A picture that *loaded*, not an `<img>` that exists.

         The first version of this asked `querySelector('img')`, which is true
         for an element that has failed, is still loading, or was never going
         to load at all — so it reported a picture on the row whose whole
         purpose is to have none, and reported two successes it had not
         checked. `naturalWidth` is zero until real pixels arrive. */
      const img = tile ? tile.querySelector('img') : null;
      return {
        name: (one.textContent || '').trim().slice(0, 20),
        h: box.height,
        tileW: tileBox ? Math.round(tileBox.width) : 0,
        tileH: tileBox ? Math.round(tileBox.height) : 0,
        img: Boolean(img && img.complete && img.naturalWidth > 0),
        pending: Boolean(img && !img.complete),
        letter: tile ? (tile.textContent || '').trim() : '',
      };
    });
  });

  check('every voice is a row', rows.length === 5, String(rows.length));
  /* Nothing may still be in flight when the rest is measured, or a row that
     is about to fail counts as a row that succeeded. */
  check('every picture has settled', rows.every((one) => !one.pending),
    rows.filter((one) => one.pending).map((one) => one.name).join(', '));
  /* The thing an assertion about the data cannot see: the rows are the same
     shape whether there is a picture or not. */
  check('every row is the same height', new Set(rows.map((one) => Math.round(one.h))).size === 1,
    rows.map((one) => Math.round(one.h)).join(', '));
  check('and every tile is the same size',
    new Set(rows.map((one) => `${one.tileW}x${one.tileH}`)).size === 1,
    rows.map((one) => `${one.tileW}x${one.tileH}`).join(' '));
  check('a tile is big enough to be a face', rows[0] && rows[0].tileW >= 32, String(rows[0]?.tileW));

  const withFace = rows.filter((one) => one.img);
  const withLetter = rows.filter((one) => !one.img && one.letter);
  check('the voices Kits has a picture for show it', withFace.length === 2,
    withFace.map((one) => one.name).join(', '));
  /* Three: the trained voice with no picture, the opera one with none, and
     the one whose picture failed. */
  check('and the rest carry their first letter', withLetter.length === 3,
    withLetter.map((one) => `${one.name}:${one.letter}`).join(', '));
  /* `startsWith` was wrong here, and wrong in a way that only looked like a
     failing feature: the tile's own letter is inside the button, so the row's
     text begins "BBroken Picture" and not "Broken". */
  const brokenRow = rows.find((one) => /Broken/.test(one.name));
  check('a picture that will not load becomes a letter, not a broken icon',
    Boolean(brokenRow && !brokenRow.img && brokenRow.letter === 'B'),
    JSON.stringify(brokenRow));

  /* Still a thumb-sized target after the tile went in front of the text. */
  check('every row is still big enough for a thumb', rows.every((one) => one.h >= 44),
    rows.map((one) => Math.round(one.h)).join(', '));

  await page.screenshot({ path: shot('singvoices.png'), fullPage: false });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nall clear');
process.exit(problems.length ? 1 : 0);

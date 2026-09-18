/**
 * The words block is the same height whatever the line says.
 *
 * ── The report ───────────────────────────────────────────────────────────
 *
 * Carli, 17 September 2026: *"Die record skerm in Probooth moet hard wees en
 * nie beweeg nie. Huidiglik hop alles rond."* That was answered once, by
 * taking a forty-word paragraph out of the row above the words, and
 * `check:recordroom` holds it. That check ends by saying what it does not
 * claim: *"'Alles hop rond' may have more than this one cause. This is the
 * one she named and the one that is measurable from the source; a probe that
 * watched the words' position through a real take would be worth more."*
 *
 * A day later: *"Hierdie skerm is nogsteeds nie hard nie. Die skerm spring
 * rond soos wat die woorde meer en minder is."*
 *
 * So this is that probe, and the thing it measures is the thing she named.
 *
 * ── How it can fail, which is the only reason to believe it ──────────────
 *
 * Every scene is the same block at a different moment of the same song: the
 * first line with nothing above it, a line long enough to wrap at phone
 * width, a one-word line, the last line with nothing below it, the gap
 * between two lines, the run-up bar showing, and the count-in. Before the
 * fix these came out at seven different heights. The assertion is that they
 * are now one height, and that the marker underneath — standing in for the
 * "Listening…" strip — is at one pixel in all seven.
 *
 * It also checks that the long line really does wrap. Seven identical
 * heights would be worth nothing if nothing in the set had ever needed two
 * rows, and that is the way this probe could quietly stop measuring
 * anything: somebody shortens the test lyric and it passes forever.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3319';
const PROBE = 'app/probe-sungwords/page.probe.tsx';
const LIVE = 'app/probe-sungwords/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let browser;
let server;
try {
  cpSync(PROBE, LIVE);
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());
  /* One viewport for every frame, because the size of the line being sung is
     `clamp(1.35rem, 5.2vh, 3rem)` — it is a fraction of the WINDOW, so two
     frames measured at two window heights would differ for a reason that has
     nothing to do with the words. */
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  await page.goto(`${server.url}/probe-sungwords`, { waitUntil: 'domcontentloaded' });
  await page.locator('#ready').waitFor({ timeout: 30000 });
  /* Fonts decide how a line wraps, so measuring before they have loaded
     measures a fallback face nobody will ever see. */
  await page.evaluate(() => document.fonts.ready);

  const found = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-frame]')).map((frame) => {
      const words = frame.querySelector('[data-words]');
      const below = frame.querySelector('[data-below]');
      const sung = frame.querySelector('[data-slot="sung"]');
      const text = sung?.querySelector('p');
      const top = frame.getBoundingClientRect().top;
      return {
        id: frame.dataset.frame,
        wordsHeight: words ? Math.round(words.getBoundingClientRect().height * 100) / 100 : -1,
        belowTop: below ? Math.round((below.getBoundingClientRect().top - top) * 100) / 100 : -1,
        slotHeight: sung ? Math.round(sung.getBoundingClientRect().height * 100) / 100 : -1,
        textHeight: text ? Math.round(text.getBoundingClientRect().height * 100) / 100 : -1,
        lineHeight: text ? Math.round(parseFloat(getComputedStyle(text).lineHeight) * 100) / 100 : -1,
      };
    });
  });

  check('every scene drew', found.length === 7, `${found.length}`);
  for (const one of found) {
    console.log(
      `        ${one.id.padEnd(9)} block ${String(one.wordsHeight).padStart(7)}`
      + `  marker at ${String(one.belowTop).padStart(7)}`,
    );
  }

  const heights = [...new Set(found.map((one) => one.wordsHeight))];
  check(
    'the block is one height in every state of the song',
    heights.length === 1,
    `${heights.length} different heights: ${heights.join(', ')}`,
  );

  const tops = [...new Set(found.map((one) => one.belowTop))];
  check(
    'and what sits under it never moves',
    tops.length === 1,
    `${tops.length} different positions: ${tops.join(', ')}`,
  );

  /* The reason to believe the two assertions above. */
  const long = found.find((one) => one.id === 'long');
  const short = found.find((one) => one.id === 'short');
  check(
    'the long line really does take two rows',
    Boolean(long) && long.textHeight > long.lineHeight * 1.5,
    long ? `${long.textHeight} against one row of ${long.lineHeight}` : 'missing',
  );
  check(
    '  and the one-word line takes one',
    Boolean(short) && short.textHeight < short.lineHeight * 1.5,
    short ? `${short.textHeight} against one row of ${short.lineHeight}` : 'missing',
  );
  check(
    '  so the set really does span a change the old block could not absorb',
    Boolean(long) && Boolean(short) && long.textHeight > short.textHeight,
  );

  /* Reserved, not merely clamped: the slot must be big enough for the two
     rows it promises, or a long line is cut off inside it. */
  check(
    'the reserved space holds the two rows it reserves',
    found.every((one) => one.slotHeight >= one.lineHeight * 2 - 1),
    found.map((one) => `${one.id} ${one.slotHeight}/${one.lineHeight}`).join(', '),
  );
  check(
    '  and the longest line fits inside it',
    Boolean(long) && long.textHeight <= long.slotHeight + 1,
    long ? `${long.textHeight} in ${long.slotHeight}` : 'missing',
  );

  await page.screenshot({ path: shot('wordsteady.png'), fullPage: true });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(
  problems.length
    ? `\ncheck:wordsteady — ${problems.length} problem(s):\n- ${problems.join('\n- ')}`
    : '\ncheck:wordsteady — the words block is one height from the first line to the last, so nothing under it moves while somebody is reading it.',
);
process.exit(problems.length ? 1 : 0);

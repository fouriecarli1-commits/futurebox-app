/**
 * The stave, looked at.
 *
 * `check:notation` proves the engraving — which letter, which accidental,
 * which value. This is the half only looking can prove:
 *
 *   · the clef is a *shape*, not a missing font character. Unicode's musical
 *     symbols need a music font, and on a phone without one they come out as
 *     a box. A stave whose clef is a box is not a stave, which is the whole
 *     reason `Staff.tsx` draws paths.
 *   · the noteheads are at different heights, in the order the notes go. A
 *     bug that put them all on one line would pass every assertion in
 *     `check:notation`, because that file never draws anything.
 *   · ledger lines exist for the notes off the ends of the stave.
 *   · a key signature is drawn once at the front rather than on every note.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3171';
const PROBE = 'app/staff/page.probe.tsx';
const LIVE = 'app/staff/page.tsx';

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
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  await page.goto(`${server.url}/staff`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  /** Everything drawn inside one stave, by tag. */
  const parts = (which) => page.evaluate((sel) => {
    /* `svg[role="img"]`, not the first svg in the box.

       The `?` beside the heading is a lucide icon, which is an svg, and it
       comes first in the DOM — so the moment one was added every measurement
       here was taken of a question mark. Three assertions went red at once
       and none of them said why, which is what a selector that matches the
       wrong element looks like from the outside. */
    const svg = document.querySelector(`[data-probe="${sel}"] svg[role="img"]`);
    if (!svg) return null;
    const heads = Array.from(svg.querySelectorAll('ellipse')).map((one) => ({
      x: Number(one.getAttribute('cx')), y: Number(one.getAttribute('cy')),
      filled: one.getAttribute('fill') !== 'none',
    }));
    return {
      heads,
      lines: svg.querySelectorAll('line').length,
      paths: svg.querySelectorAll('path').length,
      texts: Array.from(svg.querySelectorAll('text')).map((one) => (one.textContent || '').trim()),
    };
  }, which);

  const g = await parts('g');
  check('there is a stave', g !== null);
  /* Five stave lines are five <line>s before any stem or ledger. A clef is a
     <path> — and it has to be, because a font glyph would be a box on a phone
     with no music font. */
  check('the clef is drawn rather than typed', g && g.paths >= 1, g ? String(g.paths) : '');
  check('every note is a notehead', g && g.heads.length === 12, g ? String(g.heads.length) : '');
  /* A scale up and back. If every head were on one line — the failure that
     `check:notation` cannot see, because it draws nothing — this is the only
     thing that would catch it. */
  const ys = g ? g.heads.map((one) => one.y) : [];
  check('the noteheads are at different heights', new Set(ys).size >= 7, `${new Set(ys).size} heights`);
  check('and they go up and then come down',
    ys.length === 12 && ys[0] > ys[7] && ys[11] > ys[7], ys.join(','));
  check('and they run left to right in time',
    g && g.heads.every((one, i) => i === 0 || one.x > g.heads[i - 1].x));

  /* One sharp at the front, and not one on every F. This is the difference
     between a readable stave and what somebody who has never engraved
     anything produces. */
  check('G major draws its sharp once, at the front',
    g && g.texts.filter((one) => one === '♯').length === 1,
    g ? g.texts.join('') : '');

  /* Where the key signature actually sits.

     A sharp belongs *on* the line it alters — the treble F sharp on the top
     line — and a glyph positioned by its text baseline does not land there by
     itself. Measured rather than eyeballed: the first screenshot had it
     floating above the stave and every assertion above was green. */
  const signaturePlace = await page.evaluate(() => {
    const svg = document.querySelector('[data-probe="g"] svg[role="img"]');
    if (!svg) return null;
    const mark = Array.from(svg.querySelectorAll('text')).find((one) => one.textContent.trim() === '♯');
    const line = svg.querySelector('line');
    if (!mark || !line) return null;
    const box = mark.getBBox();
    return { centre: box.y + box.height / 2, top: Number(line.getAttribute('y1')) };
  });
  check('the key signature sharp sits on the line it alters',
    signaturePlace && Math.abs(signaturePlace.centre - signaturePlace.top) <= 2,
    signaturePlace ? `centre ${signaturePlace.centre.toFixed(1)} vs line ${signaturePlace.top}` : 'not found');

  const natural = await parts('natural');
  /* One natural, on the note that needs it, and the key's own sharp still
     only at the front. An engraving that drops this draws F sharp and is
     silently a different tune. */
  check('an F natural in G major is marked', natural && natural.texts.includes('♮'),
    natural ? natural.texts.join('') : '');
  check('and the key signature is still drawn once',
    natural && natural.texts.filter((one) => one === '♯').length === 1,
    natural ? natural.texts.join('') : '');

  const eb = await parts('eb');
  check('E flat major draws three flats', eb && eb.texts.filter((one) => one === '♭').length === 3,
    eb ? eb.texts.join('') : '');
  check('and no sharps', eb && !eb.texts.includes('♯'), eb ? eb.texts.join('') : '');

  const wide = await parts('wide');
  /* Seven notes: seven heads, plus stems, plus the five stave lines, plus the
     ledger lines the outliers need. A stave with no ledger lines leaves A3
     and C6 floating where nobody can read them. */
  check('a wide line gets its ledger lines', wide && wide.lines > 5 + 7, wide ? String(wide.lines) : '');
  /* Held notes are hollow, short ones filled. Drawing them all the same makes
     a waltz and a march look identical. */
  check('long notes are hollow and short ones are filled',
    wide && wide.heads.some((one) => !one.filled) && wide.heads.some((one) => one.filled),
    wide ? wide.heads.map((one) => (one.filled ? '●' : '○')).join('') : '');

  const low = await parts('low');
  check('a bass line is drawn too', low && low.heads.length === 8, low ? String(low.heads.length) : '');

  const none = (await page.locator('[data-probe="none"]').innerText()).trim();
  check('a take nothing could be read from draws nothing', none === '', none.slice(0, 60));

  await page.screenshot({ path: shot('staff.png'), fullPage: false });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nall clear');
process.exit(problems.length ? 1 : 0);

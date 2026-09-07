/**
 * The share sheet, on the phone she uses.
 *
 * Carli, with a photograph: "kyk hoe lyk dit wanneer ek 'n liedjie wil share.
 *  die bars is oor al oor mekaar gedruk." And a day later, with another one:
 * "wanneer ek druk op post it lyk dit nogsteeds so."
 *
 * The second photograph is the important one. The first round of this probe
 * measured every button's rectangle at one size and found nothing wrong,
 * because at that size nothing was wrong — and a probe that passes while she
 * is holding a photograph of the failure is a probe measuring the wrong thing.
 *
 * ── What was actually wrong ──────────────────────────────────────────────
 *
 * Two things, and neither is visible in a rectangle at one size:
 *
 * 1. **`flex flex-wrap` with pills of twelve different widths.** The rows are
 *    packed by whatever fits, so the layout is different at every text size
 *    and every width, and the only way to know it holds is to try all of them.
 *    Six of the ten platform links were also under the forty-four pixel
 *    minimum — thirty pixels tall at the default text size.
 * 2. **`backdrop-blur-sm` on a scrim with a scrolling sheet inside it.** The
 *    blur is a compositing layer over content that moves under it, which is
 *    the arrangement Android browsers leave stale paint behind on. Ghost rows
 *    of buttons at old scroll positions is exactly what "oor al oor mekaar"
 *    is a picture of, and it is not something a rectangle can be asked about:
 *    every box is where it should be and the screen is wrong anyway.
 *
 * So: a grid of equal cells, which cannot stagger at any size, and no blur.
 * And this probe now runs at three sizes rather than one, asserts the grid is
 * a grid, and asserts the sheet has no backdrop filter on it.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3090';
const PROBE = 'app/sharesheet/page.probe.tsx';
const LIVE = 'app/sharesheet/page.tsx';

/**
 * Her phone, and two others, because the fault only showed at some of them.
 *
 * The first version ran at 390x844 with the default text size and found
 * nothing while her photograph plainly showed the buttons on top of each
 * other. The difference is the conditions: the screenshot is Samsung's in-app
 * browser — a URL bar at the top eating the height — with the system text
 * scaled up, which is how most people over forty have their phone set. 360 is
 * the width most Samsungs report, not 390.
 *
 * A sheet that only breaks on a short window with big text is not a sheet that
 * works; it is one nobody has looked at properly.
 */
const SIZES = [
  { width: 390, height: 844, root: 16, why: 'the comfortable one' },
  { width: 360, height: 640, root: 20, why: 'her phone, text scaled up' },
  { width: 360, height: 600, root: 24, why: 'text scaled up hard' },
];

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
let fell = false;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());

  for (const size of SIZES) {
    const at = `${size.width}x${size.height} at ${size.root}px`;
    console.log(`\n— ${at} · ${size.why}`);
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript((root) => {
      const style = document.createElement('style');
      style.textContent = `html { font-size: ${root}px !important; }`;
      document.addEventListener('DOMContentLoaded', () => document.head.append(style));
    }, size.root);
    await page.goto(`${server.url}/sharesheet`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    /* Open it the way she does. */
    const opener = page.locator('button').filter({ hasText: /Post it|Share|Plaas/ }).first();
    check(`${at} · there is a way to open the share sheet`, (await opener.count()) > 0);
    await opener.click();
    await page.waitForTimeout(700);

    /** Every button and link inside the sheet, with its rectangle and its text. */
    const boxes = await page.evaluate(() => {
      const sheet = document.querySelector('[data-share-sheet]');
      if (!sheet) return null;
      return Array.from(sheet.querySelectorAll('button, a[href]')).map((one) => {
        const box = one.getBoundingClientRect();
        return {
          /* The tag and its first class as well as the words in it: the two
             things that failed this had no text at all — a close cross and a
             question mark — and "" 32px names nothing. */
          text: (one.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24)
            || `${one.tagName.toLowerCase()}.${(one.className || '').toString().split(' ')[0]}`,
          x: box.x, y: box.y, w: box.width, h: box.height,
        };
      }).filter((one) => one.w > 0 && one.h > 0);
    });
    check(`${at} · the sheet is on the screen and marked`, boxes !== null && boxes.length > 3,
      boxes === null ? 'no [data-share-sheet] found' : `${boxes.length} things to press`);
    if (!boxes) throw new Error('no sheet');

    /* ── Nothing printed on top of anything else ────────────────────────── */
    const over = [];
    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        const one = boxes[a];
        const two = boxes[b];
        const across = Math.min(one.x + one.w, two.x + two.w) - Math.max(one.x, two.x);
        const down = Math.min(one.y + one.h, two.y + two.h) - Math.max(one.y, two.y);
        /* A pixel of touching is rounding; anything more is one button drawn
           on another. */
        if (across > 1 && down > 1) {
          over.push(`"${one.text}" over "${two.text}" by ${Math.round(across)}x${Math.round(down)}`);
        }
      }
    }
    check(`${at} · no button is printed on top of another`,
      over.length === 0, over.slice(0, 4).join(' · '));

    /* ── The row of platforms is a grid, and stays one ───────────────────

       The rule that makes the assertion above hold at sizes nobody thought to
       try. `flex-wrap` packs by whatever fits, so it is a different layout at
       every width and every text size and there is no arrangement to assert;
       a grid of equal cells is the same shape everywhere, and two columns is
       the whole of it on a phone. */
    const grid = await page.evaluate(() => {
      const sheet = document.querySelector('[data-share-sheet]');
      const link = sheet?.querySelector('a[href]');
      const row = link?.parentElement;
      if (!row) return null;
      const style = getComputedStyle(row);
      const widths = Array.from(row.children).map((one) => Math.round(one.getBoundingClientRect().width));
      const lefts = Array.from(row.children).map((one) => Math.round(one.getBoundingClientRect().x));
      return {
        display: style.display,
        columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
        widest: Math.max(...widths),
        narrowest: Math.min(...widths),
        distinctLefts: new Set(lefts).size,
        count: widths.length,
      };
    });
    check(`${at} · the platform buttons are laid out as a grid`,
      grid !== null && grid.display === 'grid' && grid.columns === 2,
      grid ? `display ${grid.display}, ${grid.columns} column(s)` : 'no row found');
    check(`${at} · every cell is the same width, so no row can stagger`,
      grid !== null && grid.widest - grid.narrowest <= 1 && grid.distinctLefts === 2,
      grid ? `${grid.narrowest}–${grid.widest}px wide, ${grid.distinctLefts} column position(s)` : '');

    /* ── Every one of them is thumb-sized ───────────────────────────────

       Six of the ten platform links were thirty pixels tall: they were the
       only pressable things on the sheet without a minimum height on them,
       and being a link rather than a button is not a reason a thumb misses
       less often. */
    const small = boxes.filter((one) => one.h < 44 - 0.5);
    check(`${at} · nothing on the sheet is smaller than a thumb`,
      small.length === 0,
      small.slice(0, 4).map((one) => `"${one.text}" ${Math.round(one.h)}px`).join(' · '));

    /* ── And every one of them can actually be pressed ──────────────────

       What is on top at the middle of each button, rather than whether its
       rectangle is below some line. The first version compared each button's
       bottom edge against the tab bar's top and called anything past it
       hidden — which stayed red after the sheet was raised above the bar,
       because the geometry had not changed and the answer had. A button drawn
       over the bar overlaps it and is perfectly pressable.

       `elementFromPoint` is the question a thumb asks. It catches the bar on
       top, another button on top, and a scrim on top, all with one
       measurement, and it cannot be argued with. */
    const blocked = await page.evaluate(async () => {
      const sheet = document.querySelector('[data-share-sheet]');
      if (!sheet) return [];
      const out = [];
      const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      for (const one of sheet.querySelectorAll('button, a[href]')) {
        if (!(one.getBoundingClientRect().width > 0)) continue;
        const label = (one.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20);

        /* Scrolled to first. The sheet scrolls, so a button below the fold is
           reachable and reporting it as hidden is measuring the fold rather
           than the app — which is what the version before this one did, on
           four buttons that were perfectly fine. */
        one.scrollIntoView({ block: 'center' });
        await settle();

        const box = one.getBoundingClientRect();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        if (y < 0 || y > window.innerHeight) {
          out.push(`"${label}" cannot be scrolled into view`);
          continue;
        }
        const top = document.elementFromPoint(x, y);
        if (!top || !(one.contains(top) || top.contains(one))) {
          const what = top ? `${top.tagName.toLowerCase()}.${(top.className || '').toString().split(' ')[0]}` : 'nothing';
          out.push(`"${label}" is under ${what}`);
        }
      }
      return out;
    });
    check(`${at} · every button can be pressed rather than sitting under something`,
      blocked.length === 0, blocked.slice(0, 4).join(' · '));

    /* ── And at the foot of the sheet, which is where she was ────────────

       Scrolling a button to the middle of the screen lifts it off the bar, so
       the check above passes even when the bar is painted over the sheet — it
       answers "can this be reached at all", which is the weaker question. The
       one she asked is what the bottom of the sheet looks like when you have
       scrolled to it, because that is where the platform buttons are. */
    const atTheEnd = await page.evaluate(async () => {
      const sheet = document.querySelector('[data-share-sheet]');
      if (!sheet) return [];
      sheet.scrollTop = sheet.scrollHeight;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const window_ = sheet.getBoundingClientRect();
      const out = [];
      for (const one of sheet.querySelectorAll('button, a[href]')) {
        const box = one.getBoundingClientRect();
        if (box.width <= 0) continue;
        const y = box.y + box.height / 2;
        /* Only what is inside the sheet's own visible box at this scroll
           position. The sheet clips what has scrolled past its top edge, and
           the rectangle of a clipped button is still up there with the scrim
           behind it — so measuring against the viewport called "Post to Live"
           buried when it had simply scrolled out of the sheet. */
        if (y < window_.top + 1 || y > Math.min(window_.bottom, window.innerHeight) - 1) continue;

        /* Five points, not one.

           The middle of a button can be perfectly clear while its bottom two
           centimetres are behind an opaque bar — which is a button with its
           label sliced in half, and is what she photographed. A centre-only
           test called that fine, and could not tell the sheet painted under
           the bar from the sheet painted over it, because the geometry is
           identical either way and only the stacking differs. */
        const points = [
          [box.x + box.width / 2, y],
          [box.x + 2, box.y + 2],
          [box.x + box.width - 2, box.y + 2],
          [box.x + 2, box.y + box.height - 2],
          [box.x + box.width - 2, box.y + box.height - 2],
        ];
        for (const [px, py] of points) {
          if (py < window_.top || py > Math.min(window_.bottom, window.innerHeight)) continue;
          const top = document.elementFromPoint(px, py);
          if (!top || !(one.contains(top) || top.contains(one))) {
            const label = (one.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20);
            const what = top ? `${top.tagName.toLowerCase()}.${(top.className || '').toString().split(' ')[0]}` : 'nothing';
            out.push(`"${label}" is under ${what}`);
            break;
          }
        }
      }
      return out;
    });
    check(`${at} · scrolled to the foot of the sheet, nothing is buried there either`,
      atTheEnd.length === 0, atTheEnd.slice(0, 4).join(' · '));

    /* ── The sheet's own bottom edge ────────────────────────────────────

       The band between the bar's top and the bottom of the screen is dead
       space if the bar is painted over the sheet, and what lands in it depends
       on how much content the sheet happens to have. In this probe it is the
       closing paragraph; on her phone it was the last row of platform buttons.
       Testing only the buttons made that a coin toss — it passed here and she
       was looking at a photograph of it failing.

       So the rule is about the sheet rather than about what happens to be in
       it: a sheet with its own scrim is modal, and nothing may be painted over
       any part of it. One point, just inside its bottom edge. */
    const foot = await page.evaluate(() => {
      const sheet = document.querySelector('[data-share-sheet]');
      if (!sheet) return 'no sheet';
      const box = sheet.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.bottom - 8);
      if (!top) return 'nothing';
      return sheet.contains(top) || top === sheet
        ? 'the sheet'
        : `${top.tagName.toLowerCase()}.${(top.className || '').toString().split(' ')[0]}`;
    });
    check(`${at} · the foot of the sheet itself is not painted over`,
      foot === 'the sheet',
      `the bottom edge of the sheet is under ${foot}`);

    /* ── No blur over moving content ────────────────────────────────────

       Not a matter of taste. A `backdrop-filter` is a compositing layer that
       has to be re-rasterised against whatever is behind it, and behind this
       one is a sheet that scrolls. Android browsers leave stale paint there —
       ghost rows of buttons at old scroll positions, which is what she
       photographed and what no rectangle in this file could ever have caught,
       because every rectangle was right and the screen was wrong anyway.

       The scrim does its job with a plain colour, and a plain colour cannot
       ghost. */
    const blurred = await page.evaluate(() => {
      const sheet = document.querySelector('[data-share-sheet]');
      const found = [];
      for (let one = sheet; one && one !== document.documentElement; one = one.parentElement) {
        const style = getComputedStyle(one);
        const filter = style.backdropFilter || style.webkitBackdropFilter || 'none';
        if (filter && filter !== 'none') found.push(`${one.tagName.toLowerCase()}: ${filter}`);
      }
      return found;
    });
    check(`${at} · nothing blurs what is behind the scrolling sheet`,
      blurred.length === 0, blurred.join(' · '));

    const offScreen = boxes.filter((one) => one.x < -1 || one.x + one.w > size.width + 1);
    check(`${at} · none of them runs off the side`,
      offScreen.length === 0,
      offScreen.slice(0, 3).map((one) => `"${one.text}" to ${Math.round(one.x + one.w)}`).join(' · '));

    /* Labels that are cut in half are the thing she photographed. A button
       whose text is wider than the button is a button nobody can read. */
    const clipped = await page.evaluate(() => {
      const sheet = document.querySelector('[data-share-sheet]');
      if (!sheet) return [];
      return Array.from(sheet.querySelectorAll('button, a[href]'))
        .filter((one) => one.scrollWidth > one.clientWidth + 2)
        .map((one) => (one.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20));
    });
    check(`${at} · no label is cut off inside its own button`,
      clipped.length === 0, clipped.slice(0, 5).join(' · '));

    await page.screenshot({ path: shot(`sharesheet-${size.width}x${size.height}.png`), fullPage: false });
    await page.close();
  }
} catch (problem) {
  fell = true;
  console.error(`  FAIL the probe itself fell over — ${String(problem).slice(0, 240)}`);
} finally {
  if (browser) await browser.close();
  if (server) await server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

if (problems.length || fell) {
  console.error(`\ncheck:sharesheet — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:sharesheet — at three sizes: a grid that cannot stagger, nothing under a thumb, and no blur over it.');

/**
 * The safe-zone overlay, measured against the frame it is drawn on.
 *
 * ── Why geometry and not "the divs are there" ────────────────────────────
 *
 * A bar in the wrong place is worse than no bar. It tells somebody their
 * subject is safe while a caption is about to land on it, and they find out
 * after posting. So what is asserted is where the shading actually falls, in
 * pixels off the rendered page, against the frame's own box.
 *
 * ── How it gets a page to measure ────────────────────────────────────────
 *
 * `app/safezoneprobe/page.probe.tsx` mounts the component on a box of known
 * size. It is a `.probe.tsx`, so Next does not serve it; this run copies it to
 * `page.tsx`, builds, measures, and removes it again — the app never ships a
 * route that exists for a test.
 *
 * The frame is a plain box rather than a video on purpose. The question is
 * where the bars land against their container, and a video element sizing
 * itself differently is a separate argument that would mask this one.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3025';
const af = process.argv[3] === 'af';
const PROBE = 'app/safezoneprobe/page.probe.tsx';
const LIVE = 'app/safezoneprobe/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

let server = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch(`http://localhost:${PORT}/safezoneprobe`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 900, height: 950 } });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
  await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');
  await p.goto(`http://localhost:${PORT}/safezoneprobe`, { waitUntil: 'networkidle' });

  const tall = p.locator('[data-probe="tall"]');
  const wide = p.locator('[data-probe="wide"]');

  const names = await tall.locator('button[aria-pressed]').allInnerTexts();
  check('every platform is offered, and an off',
    names.length === 5 && names.some((n) => /TikTok/.test(n)) && names.some((n) => /Shorts/.test(n)),
    names.join(','));

  check('nothing is shaded until one is chosen',
    (await tall.locator('[aria-hidden="true"] .bg-black\\/55').count()) === 0);

  /* Shorts: the deepest bottom of the three, so the one worth measuring.
     180/1920 of the top and 390/1920 of the bottom, on a 480px frame. */
  await tall.locator('button[aria-pressed]').filter({ hasText: /Shorts/ }).first().click();
  await p.waitForTimeout(400);

  const geometry = await p.evaluate(() => {
    const root = document.querySelector('[data-probe="tall"]');
    const frame = root.querySelector('[data-frame]').getBoundingClientRect();
    const bars = [...root.querySelectorAll('[aria-hidden="true"] > div')].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        top: box.top - frame.top,
        left: box.left - frame.left,
        width: box.width,
        height: box.height,
        dashed: getComputedStyle(el).borderStyle === 'dashed',
      };
    });
    return { frame: { w: frame.width, h: frame.height }, bars };
  });

  const shaded = geometry.bars.filter((one) => !one.dashed);
  const safe = geometry.bars.find((one) => one.dashed);
  const near = (got, want, slack = 2) => Math.abs(got - want) <= slack;

  check('the frame is the size the probe asked for',
    near(geometry.frame.w, 270) && near(geometry.frame.h, 480),
    `${geometry.frame.w}x${geometry.frame.h}`);
  check('four strips are shaded and one box is outlined',
    shaded.length === 4 && Boolean(safe), `${shaded.length} shaded`);

  const top = shaded.find((one) => near(one.top, 0) && near(one.width, geometry.frame.w));
  const bottom = shaded.find((one) => near(one.top + one.height, geometry.frame.h) && near(one.width, geometry.frame.w));
  check(`the top strip is Shorts' 180/1920 of the frame (${top?.height.toFixed(1)}px of 45.0)`,
    Boolean(top) && near(top.height, (180 / 1920) * 480), String(top?.height));
  check(`the bottom strip is its 390/1920 (${bottom?.height.toFixed(1)}px of 97.5)`,
    Boolean(bottom) && near(bottom.height, (390 / 1920) * 480), String(bottom?.height));

  check('the safe box sits exactly between them',
    Boolean(safe) && near(safe.top, top.height) && near(safe.height, geometry.frame.h - top.height - bottom.height),
    safe ? `top ${safe.top.toFixed(1)} h ${safe.height.toFixed(1)}` : 'none');
  check('and is inset from both sides',
    Boolean(safe) && near(safe.left, (60 / 1080) * 270) &&
      near(geometry.frame.w - safe.left - safe.width, (120 / 1080) * 270),
    safe ? `left ${safe.left.toFixed(1)} right ${(geometry.frame.w - safe.left - safe.width).toFixed(1)}` : 'none');

  const words = await p.locator('body').innerText();
  check('it says how much of the frame is left', /59%/.test(words), words.match(/\d+%/g)?.join(',') || 'none');
  check('and that it is a guide rather than a specification',
    af ? /nie 'n spesifikasie nie/.test(words) : /not a specification/.test(words));

  // "All three" must be the worst of each side, not an average.
  await tall.locator('button[aria-pressed]').filter({ hasText: af ? /Al drie/ : /All three/ }).first().click();
  await p.waitForTimeout(400);
  const all = await p.evaluate(() => {
    const root = document.querySelector('[data-probe="tall"]');
    const frame = root.querySelector('[data-frame]').getBoundingClientRect();
    const box = [...root.querySelectorAll('[aria-hidden="true"] > div')]
      .find((el) => getComputedStyle(el).borderStyle === 'dashed')
      .getBoundingClientRect();
    return { top: box.top - frame.top, height: box.height, frame: frame.height };
  });
  check('all three is the deepest margin, not an average',
    near(all.top, (180 / 1920) * 480) && near(all.frame - all.top - all.height, (390 / 1920) * 480),
    `top ${all.top.toFixed(1)} bottom ${(all.frame - all.top - all.height).toFixed(1)}`);

  /* ── The wide clip, which used not to be drawn at all ─────────────────

     The overlay was mounted only on 9:16 clips, on the reasoning that these
     are 9:16 platforms. The effect was that anybody working wide never saw it
     and did not know it existed — while having the larger version of the same
     problem, because a wide clip posted to a tall feed loses its sides to the
     crop before a caption covers anything.

     So the same component is asked about a 16:9 frame here, and what is
     measured is that it draws the crop in the right place: a 9:16 column,
     centred, with the platform's furniture inside *that* column rather than
     inside the whole frame. Getting this wrong would draw a caption bar
     across a part of the picture that is not even in the post. */
  check('a wide clip gets the overlay too, not only a tall one',
    (await wide.locator('button[aria-pressed]').count()) === 5,
    String(await wide.locator('button[aria-pressed]').count()));

  await wide.locator('button[aria-pressed]').filter({ hasText: /Shorts/ }).first().click();
  await p.waitForTimeout(400);

  const w = await p.evaluate(() => {
    const root = document.querySelector('[data-probe="wide"]');
    const frame = root.querySelector('[data-wide]').getBoundingClientRect();
    const parts = [...root.querySelectorAll('[aria-hidden="true"] > div')].map((el) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        top: box.top - frame.top,
        left: box.left - frame.left,
        width: box.width,
        height: box.height,
        /* Tailwind's preflight sets `border-style: solid` on every element,
           so the style alone says nothing — an outline is a style *and* a
           width. This cost a run: four zero-height crop strips all claimed to
           be solid-bordered and the first one was picked as the column. */
        border: style.borderStyle,
        borderWidth: parseFloat(style.borderTopWidth) || 0,
        shade: style.backgroundColor,
      };
    });
    return { frame: { w: frame.width, h: frame.height }, parts };
  });

  const safeBox = w.parts.find((one) => one.borderWidth > 0 && one.border.startsWith('dashed'));
  const column = w.parts.find((one) => one.borderWidth > 0 && one.border.startsWith('solid'));
  // Two shades, and the darker one is the crop: it is gone, not covered.
  const cropShade = w.parts.filter((one) => /0\.75/.test(one.shade));
  const coverShade = w.parts.filter((one) => /0\.55/.test(one.shade));

  check('the wide frame is the size the probe asked for',
    near(w.frame.w, 480) && near(w.frame.h, 270), `${w.frame.w}x${w.frame.h}`);
  check('the crop and the furniture are shaded differently — one is gone, one is covered',
    cropShade.length === 4 && coverShade.length === 4,
    `${cropShade.length} crop, ${coverShade.length} cover`);

  /* 480 × 270 is 16:9. A 9:16 post out of it is 270 × (9/16) = 151.9 wide,
     centred, so it starts at 164.1. */
  check(`the kept column is a 9:16 crop of the frame (${column?.width.toFixed(1)}px of 151.9)`,
    Boolean(column) && near(column.width, 270 * (9 / 16)) && near(column.height, 270),
    column ? `${column.width.toFixed(1)}x${column.height.toFixed(1)}` : 'none');
  check(`and it is centred (${column?.left.toFixed(1)}px of 164.1)`,
    Boolean(column) && near(column.left, (480 - 270 * (9 / 16)) / 2), String(column?.left));

  /* The one that matters: the caption bar belongs inside the column, not
     inside the frame. Drawn against the frame it would mark a part of the
     picture that is not in the post at all. */
  check('the safe box is inset inside that column, not inside the whole frame',
    Boolean(safeBox) && near(safeBox.left, column.left + (60 / 1080) * column.width) &&
      near(safeBox.width, (1 - 180 / 1080) * column.width),
    safeBox ? `left ${safeBox.left.toFixed(1)} w ${safeBox.width.toFixed(1)}` : 'none');
  check("and its top and bottom are Shorts' own, on the frame's full height",
    Boolean(safeBox) && near(safeBox.top, (180 / 1920) * 270) &&
      near(w.frame.h - safeBox.top - safeBox.height, (390 / 1920) * 270),
    safeBox ? `top ${safeBox.top.toFixed(1)} bottom ${(w.frame.h - safeBox.top - safeBox.height).toFixed(1)}` : 'none');

  const wideWords = await wide.innerText();
  check('it says how little of a wide clip survives — 19%, against 59% for a tall one',
    /19%/.test(wideWords), wideWords.match(/\d+%/g)?.join(',') || 'none');
  check('and says plainly that the sides are cropped off',
    af ? /kante word afgesny/.test(wideWords) : /sides are cropped off/.test(wideWords));

  await p.screenshot({ path: shot(`safezones-${af ? 'af' : 'en'}.png`), fullPage: true });
  await b.close();
} finally {
  if (server?.pid) {
    try { process.kill(-server.pid); } catch { /* already gone */ }
  }
  if (existsSync(LIVE)) rmSync(LIVE);
}

console.log('problems:', problems.join(' ;; ') || 'none');
process.exit(problems.length ? 1 : 0);

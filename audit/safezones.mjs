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

  const names = await p.locator('button[aria-pressed]').allInnerTexts();
  check('every platform is offered, and an off',
    names.length === 5 && names.some((n) => /TikTok/.test(n)) && names.some((n) => /Shorts/.test(n)),
    names.join(','));

  check('nothing is shaded until one is chosen',
    (await p.locator('[aria-hidden="true"] .bg-black\\/55').count()) === 0);

  /* Shorts: the deepest bottom of the three, so the one worth measuring.
     180/1920 of the top and 390/1920 of the bottom, on a 480px frame. */
  await p.locator('button[aria-pressed]').filter({ hasText: /Shorts/ }).first().click();
  await p.waitForTimeout(400);

  const geometry = await p.evaluate(() => {
    const frame = document.querySelector('[data-frame]').getBoundingClientRect();
    const bars = [...document.querySelectorAll('[aria-hidden="true"] > div')].map((el) => {
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
  await p.locator('button[aria-pressed]').filter({ hasText: af ? /Al drie/ : /All three/ }).first().click();
  await p.waitForTimeout(400);
  const all = await p.evaluate(() => {
    const frame = document.querySelector('[data-frame]').getBoundingClientRect();
    const box = [...document.querySelectorAll('[aria-hidden="true"] > div')]
      .find((el) => getComputedStyle(el).borderStyle === 'dashed')
      .getBoundingClientRect();
    return { top: box.top - frame.top, height: box.height, frame: frame.height };
  });
  check('all three is the deepest margin, not an average',
    near(all.top, (180 / 1920) * 480) && near(all.frame - all.top - all.height, (390 / 1920) * 480),
    `top ${all.top.toFixed(1)} bottom ${(all.frame - all.top - all.height).toFixed(1)}`);

  await p.screenshot({ path: `audit/safezones-${af ? 'af' : 'en'}.png`, fullPage: true });
  await b.close();
} finally {
  if (server?.pid) {
    try { process.kill(-server.pid); } catch { /* already gone */ }
  }
  if (existsSync(LIVE)) rmSync(LIVE);
}

console.log('problems:', problems.join(' ;; ') || 'none');
process.exit(problems.length ? 1 : 0);

/**
 * The Pro Booth with the phone turned on its side.
 *
 * ── The report ───────────────────────────────────────────────────────────
 *
 * Carli, 16 September 2026: *"die scroll op die timeline werk nie reg in die
 * probooth wanneer mens die foon dwars swaai."*
 *
 * Landscape is not an edge case in this room. It is the orientation somebody
 * records in, because it is the one where the words and the lanes both fit
 * across. Every other probe of this room runs at 1280x900 or at 390 wide and
 * tall, so a fault that only appears at 844x390 had nowhere to be caught.
 *
 * ── What it measures, and why these two ──────────────────────────────────
 *
 * **`touch-action` on a lane.** The decisive one. The lane row carried
 * `touch-none` unconditionally, which is the browser being told this element
 * owns every touch gesture on it — so a finger dragged up the lanes never
 * scrolled. It was added for the region marker, which genuinely needs the
 * gesture, and taken for free the rest of the time. A computed style is worth
 * more here than a synthetic drag: Playwright's touch emulation does not
 * honour `touch-action` the way a phone does, so a drag test would pass
 * against a room that cannot be scrolled by a thumb.
 *
 * **Whether the bottom of the timeline is on the screen.** The second half of
 * the same report. `min-h-[40vh]` is a floor, and on a 390-tall viewport it
 * insists on 156 pixels that the header, the transport and the dock have
 * already spent — so the column cannot shrink, and the last lanes sit under
 * the edge of the screen with no way to reach them.
 */
import { execSync, spawn } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3121';
const PROBE = 'app/proboothprobe/page.probe.tsx';
const LIVE = 'app/proboothprobe/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
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
      const r = await fetch(`http://localhost:${PORT}/proboothprobe`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  const b = await chromium.launch(launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  /* A phone on its side, with a coarse pointer. 844x390 is an iPhone 14
     turned; `hasTouch` matters because globals.css keeps the forty-four
     pixel minimums behind `@media (pointer: coarse)`. */
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);

  const timeline = p.locator('[data-timeline]').first();
  check('the timeline is on the sideways screen', (await timeline.count()) > 0);

  if (await timeline.count()) {
    const box = await timeline.boundingBox();
    check(
      'and its bottom is above the fold rather than under it',
      box !== null && box.y + box.height <= 390 + 1,
      box ? `bottom at ${Math.round(box.y + box.height)} of 390` : 'no box',
    );

    /* The lane rows: grid column 2, one per lane. Read off the computed
       style, because that is what a phone's compositor actually consults. */
    const lanes = await p.evaluate(() => {
      const root = document.querySelector('[data-timeline]');
      if (!root) return [];
      return [...root.querySelectorAll('div')]
        .filter((one) => getComputedStyle(one).gridColumnStart === '2' && one.style.height)
        .slice(0, 6)
        .map((one) => getComputedStyle(one).touchAction);
    });
    check('and there is at least one lane to scroll past', lanes.length > 0, `${lanes.length} found`);
    check(
      'and a finger dragged up a lane scrolls rather than marking',
      lanes.length > 0 && lanes.every((one) => one !== 'none'),
      lanes.join(', ') || 'none found',
    );
  }

  await p.screenshot({ path: shot('boothsideways.png') });
  await b.close();
} finally {
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  rmSync(LIVE, { force: true });
  console.log('putting the ordinary build back…');
  try { execSync('npx next build', { stdio: 'ignore' }); } catch { console.error('run `npx next build`'); }
}

if (problems.length) {
  console.error(`\ncheck:boothsideways — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:boothsideways — sideways, the lanes scroll and the timeline ends on the screen.');

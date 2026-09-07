/**
 * Choosing a song, and dragging the piece of it a video is cut against.
 *
 * Carli: "Die video desk het nie 'n opsie om liedjies te kies vir 'n musiek
 *  video nie. as op die music video kies, dan moet hy vir my dadelik opsies op
 *  pop van my liedjie, en 'n knoppie om een te kan upload. Dan moet die liedjie
 *  in 'n sound bar gesit word met twee dragging lines wat gecap word op die
 *  lengte wat die video lengte opsie gekies word en dan moet daardie lyn gedrag
 *  word na die gedeelte van die liedjie wat in die video gebruik moet word."
 *
 * Six claims, and every one of them is about behaviour rather than markup:
 *
 *   1. the songs are there to press, as buttons rather than behind a dropdown
 *   2. and a file can be brought in
 *   3. choosing one draws a bar with two lines on it
 *   4. dragging moves the window, and the window stays exactly as long as the
 *      video
 *   5. changing the video's length changes the window's, keeping the start
 *   6. and neither line can be dragged off the end of the song
 *
 * Read out of the component's own output rather than off the screen: the probe
 * page prints what `onChange` handed it into a data attribute, so what is
 * measured is the value the desk would use, not a pixel position that happens
 * to look right. A window drawn in the correct place while reporting the wrong
 * seconds would make a video against the wrong part of the song and look
 * perfect doing it.
 */
import { cpSync, rmSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3172';
const PROBE = 'app/songwindow/page.probe.tsx';
const LIVE = 'app/songwindow/page.tsx';
/* The probe's song: 40 seconds at 96 BPM, so a beat is 0.625s. */
const BEAT = 60 / 96;
const LONG = 40;

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
let failed = false;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/songwindow`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch(launchOptions());
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  await page.goto(`http://localhost:${PORT}/songwindow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  /** What the component last handed up: {songId, from, to}. */
  const cut = async () => {
    const raw = await page.locator('[data-cut]').getAttribute('data-cut');
    if (!raw || raw === 'none') return null;
    const [songId, from, to] = raw.split('|');
    return { songId, from: Number(from), to: Number(to) };
  };

  /* ── 1. The songs, pressable ─────────────────────────────────────────── */
  const planned = page.locator('button', { hasText: 'Karoo pad' });
  const brought = page.locator('button', { hasText: 'Van my foon af' });
  check('both songs are on the screen as buttons',
    (await planned.count()) === 1 && (await brought.count()) === 1,
    `${await planned.count()} + ${await brought.count()}`);
  /* Explicitly not a dropdown. Every other choice in this app was taken off
     one, and a select here would be the same mistake in the room she reported
     it in. */
  check('and not behind a dropdown',
    (await page.locator('select').count()) === 0,
    `${await page.locator('select').count()} select(s)`);

  /* ── 2. And a file can be brought in ─────────────────────────────────── */
  check('there is a button to bring a file in',
    (await page.locator('button', { hasText: 'Bring one in' }).count()) === 1);
  check('with a file input behind it that takes audio',
    (await page.locator('input[type="file"][accept="audio/*"]').count()) === 1);

  /* ── 3. Choosing one draws the bar ───────────────────────────────────── */
  await planned.first().click();
  await page.waitForTimeout(2500);
  const bar = page.locator('[data-song-bar]');
  check('choosing a song draws a bar', (await bar.count()) === 1);
  check('with two lines on it, one at each end',
    (await page.locator('[data-song-handle="from"]').count()) === 1
      && (await page.locator('[data-song-handle="to"]').count()) === 1);
  /* Drawn from the file, not decoration: the columns only exist once the
     audio has been decoded, and a flat bar would mean it never was. */
  const columns = await page.evaluate(() => {
    const found = document.querySelectorAll('[data-song-bar] > div:first-child > span');
    const highs = new Set(Array.from(found).map((one) => one.style.height));
    return { count: found.length, shapes: highs.size };
  });
  check('and the bar is the shape of the song rather than a block',
    columns.count > 100 && columns.shapes > 3,
    `${columns.count} columns, ${columns.shapes} different heights`);

  const first = await cut();
  check('the window opens at the start of the song, five seconds long',
    first !== null && first.from === 0 && Math.abs(first.to - 5) < 0.01,
    JSON.stringify(first));

  /* The sections are named, because dragging to "Chorus" beats dragging to
     0:24 and the plan is the only thing that knows where it is. */
  const says = ((await page.locator('body').innerText()) ?? '').replace(/\s+/g, ' ');
  /* Case-insensitively, because the labels are uppercased by CSS and the
     first version of this line matched "Chorus" against a screen that said
     CHORUS — a red check over working code, which is the failure mode that
     wastes a fix on the wrong thing. */
  check('a song with a plan has its sections named along the bar',
    /intro/i.test(says) && /chorus/i.test(says),
    (says.match(/INTRO[^·]{0,30}/i) ?? ['nothing'])[0]);

  /** Drag one of the lines, or the middle, to a fraction along the bar. */
  const dragTo = async (what, fraction) => {
    const box = await bar.boundingBox();
    const grip = await page.locator(`[data-song-${what === 'body' ? 'window' : 'handle'}${
      what === 'body' ? '' : `="${what}"`}]`).boundingBox();
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * fraction, grip.y + grip.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  /* ── 4. Dragging moves it, and the length holds ──────────────────────── */
  /* 0.53 of a 40-second bar is 21.2s, and a beat at 96 BPM is 0.625s — so the
     nearest beat is 21.25 and an unsnapped drag lands 0.05s off it.

     The first version dragged to 0.5, which is 20.000s, which is exactly 32
     beats. The beat assertion below passed on that number whether the snapping
     ran or not: a check that cannot tell the feature from its absence. */
  await dragTo('from', 0.53);
  const mid = await cut();
  check('dragging the first line moves the window down the song',
    mid !== null && mid.from > 15,
    JSON.stringify(mid));
  check('and the window is still exactly as long as the video',
    mid !== null && Math.abs((mid.to - mid.from) - 5) < 0.01,
    mid ? (mid.to - mid.from).toFixed(3) : 'none');
  /* On a beat, which at 96 BPM is a multiple of 0.625 — a number that divides
     neither five nor a whole second, so landing on it cannot be rounding. */
  const off = mid ? Math.abs(mid.from / BEAT - Math.round(mid.from / BEAT)) : 1;
  check('and it lands on a beat, because the song says what its tempo is',
    off < 0.001, mid ? `${mid.from.toFixed(3)}s is ${(mid.from / BEAT).toFixed(3)} beats` : 'none');

  /* ── 5. The video's length is the cap ────────────────────────────────── */
  await page.locator('[data-length="10"]').click();
  await page.waitForTimeout(400);
  const longer = await cut();
  check('choosing a ten-second video makes the window ten seconds',
    longer !== null && Math.abs((longer.to - longer.from) - 10) < 0.01,
    longer ? (longer.to - longer.from).toFixed(3) : 'none');
  check('and keeps the part of the song that was dragged to',
    longer !== null && mid !== null && Math.abs(longer.from - mid.from) < 0.01,
    `${mid?.from.toFixed(3)} → ${longer?.from.toFixed(3)}`);

  /* ── 6. And it cannot be dragged off the end ─────────────────────────── */
  await dragTo('to', 1.4);
  const end = await cut();
  check('the window cannot be dragged past the end of the song',
    end !== null && end.to <= LONG + 0.01 && end.from >= LONG - 10 - 0.01,
    JSON.stringify(end));
  await dragTo('from', -0.4);
  const start = await cut();
  check('or before the start of it',
    start !== null && start.from === 0 && Math.abs(start.to - 10) < 0.01,
    JSON.stringify(start));

  /* A song brought in from a file has no plan and no tempo, and still works —
     that is the case the old picker could not serve at all. */
  await brought.first().click();
  await page.waitForTimeout(2500);
  const other = await cut();
  check('a song with no plan and no tempo can still be chosen and dragged',
    other !== null && other.songId === 'songwindow-brought' && Math.abs(other.to - other.from - 10) < 0.01,
    JSON.stringify(other));

  await page.screenshot({ path: shot('songwindow.png'), fullPage: true });
} catch (problem) {
  /* Thrown, not exited: the cleanup below is the only thing that removes the
     probe page from the working tree, and an exit inside the try skips it. */
  failed = true;
  console.error(`  FAIL the probe itself fell over — ${String(problem).slice(0, 300)}`);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  try { rmSync(LIVE); } catch { /* never made it */ }
}

if (problems.length || failed) {
  console.error(`\ncheck:songwindow — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:songwindow — the songs are there to press, and the window drags onto the part she wants.');

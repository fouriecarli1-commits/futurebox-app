/**
 * How much reading each room asks for before you can do anything.
 *
 * ── Why this is measured rather than eyeballed ───────────────────────────
 *
 * "Dit moet net soos in hierdie prente eenvoudiger verpak word." The
 * screenshots Carli sent are of an app whose Create screen is a box and a
 * button; ours explains itself under every field. Both of those are opinions
 * until somebody counts the characters.
 *
 * Twice before, "too much writing" was fixed by deleting features. That is the
 * wrong lever and it is why four working things disappeared once already. The
 * right lever is: keep the sentence, put it behind the mark this app already
 * has, and count what is left on the glass.
 *
 * ── What counts as writing ───────────────────────────────────────────────
 *
 * A paragraph — a leaf that is prose rather than a label. Sixty characters is
 * the line: "What should it sound like?" is a label and a question, and
 * anything longer than a short sentence is something being explained. Buttons
 * are excluded, because a button's words are the thing you press rather than
 * something to read first.
 *
 * ── And what is actually on the glass ────────────────────────────────────
 *
 * The first version of this counted `textContent`, and it was wrong by a
 * factor of three. `Note` already folds a sentence to one clipped line and a
 * mark on a phone — the words are still in the DOM, they are just not on the
 * screen. Counting them called a room that had already been packed properly
 * the worst one in the app.
 *
 * So: how tall the prose actually is, in pixels, plus the characters that fit
 * inside their own box. A clipped line is sixteen pixels and about forty
 * characters however long the sentence behind it is. Height is the number that
 * matters — it is the scrolling somebody does before they reach the button.
 *
 * Per room, at 390 pixels, on the screen a room opens on. That is the moment
 * somebody decides whether this app is for them.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions } from './where.mjs';

const PORT = process.argv[2] || '3170';
/**
 * How many pixels of prose a room may open with. Only ever comes down.
 *
 * Seven hundred, which is where the worst room sits after this pass: the
 * collab radar, and almost all of it is the verdicts — "3 shared topics and a
 * comparable audience, this is a real pitch". That is not an explanation to
 * fold away, it is the answer the room exists to give.
 *
 * Where it started: 3,766 pixels across thirteen rooms, with the advert desk
 * at 1,003 of them, most of which was a sales panel for the marketing add-on
 * standing in front of a tool for writing an advert. 3,008 now, and the desk
 * is 391.
 */
const CEILING = Number(process.argv[3] || 700);
/** Longer than this is prose rather than a label. */
const PROSE = 60;

const ROOMS = [
  'Make a song', 'Studio', 'The Booth', 'Your voice', 'Soundboard', 'Music video',
  'Video desk', 'Hooks', 'Channel', 'Live', 'Podcast', 'Adverts', 'Collab Radar',
];

const problems = [];
let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch(launchOptions());
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('writing@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('writing-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);

  const bar = p.locator('nav[aria-label]').first();
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const intoRoom = async (name) => {
    await bar.locator('button').filter({ hasText: 'Make' }).first().click();
    await p.waitForTimeout(1100);
    const many = await door.count();
    for (let i = 0; i < many; i += 1) {
      const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
      if (first.toLowerCase().startsWith(name.toLowerCase())) {
        await door.nth(i).click();
        await p.waitForTimeout(1700);
        return true;
      }
    }
    return false;
  };

  /** Every paragraph on the glass: what it says, how tall it is, what is read. */
  const prose = (least) =>
    p.evaluate((floor) => {
      const out = [];
      const room = document.querySelector('div.fixed.inset-0.z-50');
      if (!room) return out;
      for (const el of room.querySelectorAll('p, span, li')) {
        if (el.children.length > 0) continue;
        if (el.closest('button, a, label')) continue;
        const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text.length < floor) continue;
        const box = el.getBoundingClientRect();
        if (box.width < 2 || box.height < 2) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        /* Clipped to one line by `Note` on a phone: the sentence is in the DOM
           and about forty characters of it are on the screen. Counted by what
           fits rather than by what is there. */
        const clipped = el.scrollWidth > el.clientWidth + 2;
        const shown = clipped
          ? Math.max(1, Math.round((text.length * el.clientWidth) / Math.max(1, el.scrollWidth)))
          : text.length;
        out.push({ text, shown, tall: Math.round(box.height), clipped });
      }
      return out;
    }, least);

  let worst = { room: '', total: 0 };
  let all = 0;
  const rows = [];
  for (const room of ROOMS) {
    if (!(await intoRoom(room))) {
      problems.push(`${room}: no way in`);
      continue;
    }
    const found = await prose(PROSE);
    const total = found.reduce((sum, one) => sum + one.tall, 0);
    const chars = found.reduce((sum, one) => sum + one.shown, 0);
    all += total;
    const sorted = found.slice().sort((a, b) => b.tall - a.tall);
    rows.push({ room, count: found.length, total, chars, all: sorted });
    if (total > worst.total) worst = { room, total };
  }

  rows.sort((a, b) => b.total - a.total);
  console.log('\n  pixels of prose on the glass, before a single press:\n');
  for (const row of rows) {
    console.log(
      `  ${String(row.total).padStart(5)}px  ${String(row.count).padStart(2)} paragraphs  ` +
        `${String(row.chars).padStart(4)} readable chars  ${row.room}`,
    );
    if (process.argv[4] === 'all') {
      for (const one of row.all) {
        console.log(`          ${String(one.tall).padStart(3)}px${one.clipped ? ' clipped' : '        '} "${one.text.slice(0, 74)}"`);
      }
    } else if (row.all[0]) {
      console.log(`          ${row.all[0].tall}px "${row.all[0].text.slice(0, 76)}"`);
    }
  }
  console.log(`\n  ${all}px across ${rows.length} rooms; the worst is ${worst.room} at ${worst.total}px.\n`);

  const over = rows.filter((row) => row.total > CEILING);
  console.log(`${over.length === 0 ? '  ok  ' : '  FAIL'} no room opens with more prose than the ceiling (${CEILING}px)` +
    `${over.length ? ` — ${over.map((one) => `${one.room} ${one.total}px`).join(', ')}` : ''}`);
  if (over.length) problems.push('a room is over the ceiling');
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:writing — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('check:writing — every room opens with less to read than the ceiling allows.');

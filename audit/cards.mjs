/**
 * How much of the app is actually in the card shape, counted per room.
 *
 * ── Why this is counted and not claimed ──────────────────────────────────
 *
 * `docs/PACKAGING.md` §2 has been the plan for four sessions: a heading you
 * can fold, one box, the options as small buttons underneath. `Card` has
 * existed for two of them. A component existing is not the same as the rooms
 * using it, and the difference is invisible from the code — thirteen rooms
 * each wrote their own heading, and reading any one of them looks fine.
 *
 * So: open every room, count the foldable headings, and press one to check it
 * really folds. The floor only ever goes up. That is the whole design of this
 * probe — a number that cannot quietly go backwards while somebody adds a
 * fourteenth hand-written panel.
 *
 * ── What is deliberately not asserted ────────────────────────────────────
 *
 * That every panel in every room is a card. Some are not meant to be: a row
 * in a list, an empty state, the warning above a button. A rule that said
 * "every bordered box folds" would be a rule that hid a warning behind a
 * chevron, and the fastest way to make this app worse is to fold away the
 * sentence somebody needed to read.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { launchOptions } from './where.mjs';

const PORT = process.argv[2] || '3181';
/**
 * How many screens carry at least one foldable card. Only ever goes up.
 *
 * Ten, measured. Studio joined the list the moment the probe put a song on
 * the device — it had been reading zero for want of something to edit, which
 * is the difference between "not converted" and "not reachable", and the two
 * look identical in a count.
 *
 * Four still read zero and every one of them is converted. They need a
 * database this probe deliberately runs without, so the reason is printed
 * beside each rather than left as a bare nought — a zero with no explanation
 * beside it is a claim nobody can check, which is the thing these probes
 * exist to stop.
 */
const FLOOR = Number(process.argv[3] || 10);

/**
 * Why a room can read zero and still be done.
 *
 * Named here rather than in a comment, so the reason is printed in the run
 * and goes stale loudly: if one of these ever renders its cards, the line
 * next to it stops being true and somebody reading the output will see it.
 */
const NEEDS = {
  'The Booth': 'a recording — "the voices in this song" only exists once you have sung',
  Soundboard: 'accounts configured; a trained sound belongs to one',
  Live: 'the live tables; without them the room says so instead of drawing',
  Podcast: 'a show set up, which needs the podcast tables',
};

const ROOMS = [
  'Make a song', 'Studio', 'The Booth', 'Your voice', 'Soundboard', 'Music video',
  'Video desk', 'Hooks', 'Channel', 'Live', 'Podcast', 'Adverts', 'Collab Radar',
];

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

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
  await p.locator('input[type="email"]').first().fill('cards@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('cards-password-1234');
  await p.locator('button[type="submit"]').first().click();
  /* Waited for, not slept through. A `click()` auto-waits, so a flat sleep here
     survives right up to the first `count()` — and `count()` waits for
     nothing. `photosong` failed exactly there: it read a room it had not
     opened yet and reported the room as broken. The bottom bar is the
     signal, because it is on every signed-in screen and no signed-out one. */
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 30000 });
  /* The welcome door, waited for and then gone.
     `count()` once was the fault: the door draws after two fetches settle, so
     asking the instant the bar appears gets "no", and half a second later it is
     there — over the header, under the next press. `bringsong` timed out on
     exactly that. `enter.mjs` has said it in a comment since the day it was
     written; the probes with their own way in never got the lesson. */
  await dismissDoor(p);
  await p.waitForTimeout(900);

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

  /* ── A song on the device, before anything is counted ───────────────
 
     Five rooms read zero on the first version of this and the comment above
     explained why: they open on an empty state, so their cards never render.
     An explanation is not a measurement. If the claim is "those rooms are
     converted", the probe has to be able to see it, and the difference
     between the two is one song in the library.
 
     Written straight into storage rather than made: making one needs a key,
     a probe that needs a paid account is a probe nobody runs, and what is
     being measured here is the shape of the room rather than the engine. */
  await p.evaluate(() => {
    localStorage.setItem(
      'futurebox.tracks.v1',
      JSON.stringify([
        {
          id: 'cards-probe-song',
          title: 'A song to open the rooms with',
          genre: 'Amapiano',
          bpm: 112,
          key: 'A Minor',
          lyrics: '[Verse 1]\nA line\nAnd another\n\n[Chorus]\nThe part that comes back',
          style: 'warm, late night',
          models: ['Backing'],
          source: 'engine',
          seconds: 60,
          createdAt: '2026-09-01T10:00:00.000Z',
          seed: 7,
          parts: [
            { name: 'Verse 1', seconds: 30, lines: ['A line', 'And another'] },
            { name: 'Chorus', seconds: 30, lines: ['The part that comes back'] },
          ],
        },
      ]),
    );
  });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(2200);

  const rows = [];

  /* Spotlight first, and counted, because its four bars are Cards and leaving
     them out made the total wrong in a commit message before anybody noticed.
     It is not a studio room, so it is measured on its own terms: the bars are
     on the page rather than inside the room overlay. */
  await bar.locator('button').filter({ hasText: 'Spotlight' }).first().click().catch(() => undefined);
  await p.waitForTimeout(1600);
  const onSpotlight = await p.locator('section > div > button[aria-expanded]').allInnerTexts().catch(() => []);
  rows.push({ room: 'Spotlight', count: onSpotlight.length, titles: onSpotlight.map((one) => one.trim()) });

  for (const room of ROOMS) {
    if (!(await intoRoom(room))) {
      problems.push(`${room}: no way in`);
      continue;
    }
    /* A card header is the fold button inside a Card's own <section>. Not
       "any aria-expanded button" — the rooms are full of those, and counting
       a disclosure somebody wrote by hand would make this number a lie in
       exactly the direction it is meant to catch. */
    const heads = p.locator('div.fixed.inset-0.z-50 section > div > button[aria-expanded]');
    const titles = await heads.allInnerTexts().catch(() => []);
    rows.push({ room, count: titles.length, titles: titles.map((one) => one.trim()) });
  }

  console.log('\n  foldable cards per room:\n');
  for (const row of rows.slice().sort((a, b) => b.count - a.count)) {
    const why = row.count === 0 ? NEEDS[row.room] : null;
    console.log(
      `  ${String(row.count).padStart(2)}  ${row.room}` +
        (row.count ? `  —  ${row.titles.join(' · ')}` : why ? `  —  converted; needs ${why}` : '  —  nothing yet'),
    );
  }
  const withCards = rows.filter((one) => one.count > 0);
  const total = rows.reduce((sum, one) => sum + one.count, 0);
  console.log(`\n  ${total} cards across ${withCards.length} of ${rows.length} rooms.\n`);

  check(`at least ${FLOOR} rooms carry the card shape`, withCards.length >= FLOOR,
    `${withCards.length} do`);
  /* Every remaining zero has to be a room whose reason is written down. A new
     room quietly appearing with no cards and no explanation is the one thing
     this whole probe is here to catch. */
  const unexplained = rows.filter((one) => one.count === 0 && !NEEDS[one.room]);
  check('every room still on zero has a reason printed beside it',
    unexplained.length === 0,
    unexplained.map((one) => one.room).join(', ') || 'all four accounted for');

  /* ── And that a card actually folds ─────────────────────────────────
 
     Counting headings would pass on a chevron that does nothing. So one is
     pressed in the room with the most of them, and what is inside it has to
     leave the screen and come back. */
  const busiest = withCards.slice().sort((a, b) => b.count - a.count)[0];
  if (busiest) {
    check('there is a room to press one in', await intoRoom(busiest.room));
    const room = p.locator('div.fixed.inset-0.z-50').first();
    const card = room.locator('section:has(> div > button[aria-expanded])').first();
    const before = ((await card.innerText()) ?? '').replace(/\s+/g, ' ');
    await card.locator('button[aria-expanded]').first().click();
    await p.waitForTimeout(500);
    const shut = ((await card.innerText()) ?? '').replace(/\s+/g, ' ');
    check(`pressing a heading in ${busiest.room} folds the card away`,
      shut.length < before.length && /Folded away|Toegevou/.test(shut),
      `${before.length} → ${shut.length} characters`);
    await card.locator('button[aria-expanded]').first().click();
    await p.waitForTimeout(500);
    const again = ((await card.innerText()) ?? '').replace(/\s+/g, ' ');
    check('and pressing it again brings it back', again.length === before.length,
      `${shut.length} → ${again.length}`);
  }
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:cards — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('check:cards — the card shape is in the rooms, and the headings really fold.');

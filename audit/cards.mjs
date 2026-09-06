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

const PORT = process.argv[2] || '3181';
/**
 * How many rooms carry at least one foldable card. Only ever goes up.
 *
 * Eight, after this pass: Your voice (3), Collab Radar (3 + the room's 2 and
 * the invite's 1), Podcast (1 + the two-hosts panel), Live (1). Make a song
 * has had its two since the shape was written.
 */
const FLOOR = Number(process.argv[3] || 6);

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

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
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
  await p.waitForTimeout(2600);
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
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

  const rows = [];
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
    console.log(`  ${String(row.count).padStart(2)}  ${row.room}${row.count ? `  —  ${row.titles.join(' · ')}` : ''}`);
  }
  const withCards = rows.filter((one) => one.count > 0);
  const total = rows.reduce((sum, one) => sum + one.count, 0);
  console.log(`\n  ${total} cards across ${withCards.length} of ${rows.length} rooms.\n`);

  check(`at least ${FLOOR} rooms carry the card shape`, withCards.length >= FLOOR,
    `${withCards.length} do`);

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

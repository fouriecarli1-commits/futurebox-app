/**
 * No room may be wider than the phone it is on.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * "Al die bladsye skuif ook links en regs" was reported once, fixed in the
 * places it was noticed, and reported again — "Collab se window skuif
 * nogsteeds links en regs". That is the signature of a bug being chased by
 * eye: it is found where somebody happened to look, and it comes back
 * somewhere else.
 *
 * `overflow-x: clip` on the page means the app no longer slides sideways
 * under a thumb, which is what made it stop being *obvious* — and it is
 * exactly why it needs measuring instead. The content is still too wide; it
 * is now silently cut off at the right edge, so a card's last 25 pixels, a
 * score, or a button simply is not there.
 *
 * ── What is measured ─────────────────────────────────────────────────────
 *
 * Every element in every room, against the width of the viewport. Anything
 * whose box reaches past the right edge or starts left of zero is named, with
 * its classes and its first words, so the offender is identified rather than
 * the symptom. A grid track that has grown to its item's min-content is the
 * usual cause and the report says which element it was.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = process.argv[2] || '3091';
const WIDTH = Number(process.argv[3] || 390);
/** A pixel of slack for sub-pixel rounding, which is not a layout fault. */
const SLACK = 2;

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

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const p = await browser.newPage({ viewport: { width: WIDTH, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('wide@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('wide-password-1234');
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
        await p.waitForTimeout(1800);
        return true;
      }
    }
    return false;
  };

  const tooWide = () =>
    p.evaluate((slack) => {
      const vw = document.documentElement.clientWidth;
      const seen = [];
      for (const el of document.querySelectorAll('div.fixed.inset-0.z-50 *')) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right <= vw + slack && r.left >= -slack) continue;
        seen.push({
          over: Math.round(Math.max(r.right - vw, -r.left)),
          what: `${el.tagName}.${(el.className || '').toString().slice(0, 46)}`,
          says: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34),
        });
      }
      /* The outermost offender only. Everything inside an element that is too
         wide is also too wide, and a report of sixty-six lines describing one
         fault is a report nobody reads. */
      return { vw, worst: seen.sort((a, b) => b.over - a.over).slice(0, 3), count: seen.length };
    }, SLACK);

  for (const room of ROOMS) {
    if (!(await intoRoom(room))) {
      problems.push(`${room}: no way in`);
      console.log(`  FAIL ${room} — no way in`);
      continue;
    }
    /* Every sub-view, not just the one a room opens on. The radar's widest
       card was on a tab nobody had thought to check.

       Only `aria-pressed` buttons are pressed: that marks a toggle, and a
       probe that clicked every button in a room would spend money. */
    let found = await tooWide();
    const tabs = p.locator('div.fixed.inset-0.z-50 button[aria-pressed]');
    const howMany = Math.min(await tabs.count(), 8);
    for (let i = 0; i < howMany && found.count === 0; i += 1) {
      await tabs.nth(i).click().catch(() => undefined);
      await p.waitForTimeout(700);
      found = await tooWide();
    }
    const ok = found.count === 0;
    console.log(
      `${ok ? '  ok  ' : '  FAIL'} ${room.padEnd(13)} ${
        ok ? 'fits' : `${found.count} over — ${found.worst.map((one) => `+${one.over}px ${one.what} "${one.says}"`).join(' | ')}`
      }`,
    );
    if (!ok) problems.push(`${room}: ${found.worst[0].what} over by ${found.worst[0].over}px`);
  }
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} room(s) wider than the phone:\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log(`\nevery room fits inside ${WIDTH}px. Nothing is cut off at the right edge.`);

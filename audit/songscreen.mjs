/**
 * One song, the whole screen, and the next one a swipe away.
 *
 * ── What was asked for ───────────────────────────────────────────────────
 *
 * "wanneer ek op die liedjie click moet dit in 'n volle screen oop maak soos
 * 'n tiktok, en kan scroll na die volgende liedjie, en ek moet op liedjie
 * sonder videos die lirieke kan sien op die skerm, die lirieke moet beweeg en
 * highlight soos die liedjie beweeg."
 *
 * ── What is proved, and how ──────────────────────────────────────────────
 *
 * Against two real songs made in the browser, because a full-screen player
 * over a song that will not play is a screen that never moves — which is the
 * one thing this view has to be measured doing.
 *
 * The assertion that matters is the last one: that the line on screen
 * **changes as the song plays**. Everything else here is arrangement. A lyric
 * view that shows the first line and sits there is the failure this feature
 * exists to avoid, and it looks identical to a working one in a screenshot.
 *
 * The second song has words and no composition plan — the shape a song
 * brought in from a file has — so the fallback that spreads them evenly is
 * exercised, and the sentence admitting it is a fallback is checked. A screen
 * that quietly presented a guess as timing would be worse than one with no
 * words at all.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3093';
const PROBE = 'app/songfull/page.probe.tsx';
const LIVE = 'app/songfull/page.tsx';

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
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/songfull`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));
  await p.goto(`http://localhost:${PORT}/songfull`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);

  /* ── Every song has the button, not only the ones with a plan ───────── */
  const cards = p.locator('article');
  check('both songs are in the channel', (await cards.count()) === 2, `${await cards.count()}`);
  const lyricButtons = p.locator('button').filter({ hasText: /^Lyrics$/ });
  check('every song carries the words button — including the one with no plan',
    (await lyricButtons.count()) === 2, `${await lyricButtons.count()} of 2`);

  /* ── Tapping the picture opens it full screen ───────────────────────── */
  await p.locator('button[aria-label^="Open"]').first().click();
  await p.waitForTimeout(2200);
  const full = p.locator('div.fixed.inset-0.z-\\[80\\]');
  check('tapping a song opens it full screen', (await full.count()) === 1);

  const panels = full.locator('section[data-at]');
  check('with one panel per song, stacked to swipe through',
    (await panels.count()) === 2, `${await panels.count()}`);

  const box = await panels.first().boundingBox();
  check('and a panel is the whole screen',
    Boolean(box) && box.height > 800 && box.width > 380,
    box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'none');

  /* ── The words move ─────────────────────────────────────────────────── */
  const bigLine = async () =>
    ((await full.locator('p.text-2xl').first().innerText().catch(() => '')) ?? '').trim();

  const first = await bigLine();
  check('the words are on the screen', first.length > 0, JSON.stringify(first));
  await p.screenshot({ path: shot('songscreen.png') });

  /* Played for long enough to cross a line boundary. The probe song is twelve
     seconds with four lines, so a line lasts three. */
  let moved = first;
  for (let waited = 0; waited < 12 && moved === first; waited += 1) {
    await p.waitForTimeout(1000);
    moved = await bigLine();
  }
  check('and they move as the song plays — this is the whole feature',
    moved !== first && moved.length > 0, `"${first}" → "${moved}"`);

  /* ── Swipe to the next song ─────────────────────────────────────────── */
  await full.locator('> div').first().evaluate((el) => {
    el.scrollTo({ top: el.clientHeight, behavior: 'auto' });
  });
  await p.waitForTimeout(2500);
  /* Not "the second title is somewhere on the page" — every panel is in the
     DOM, so that passes while the screen is still sitting on song one. The
     honest question is which panel the player thinks it is on, and the only
     thing that answers it is something rendered for the current panel alone. */
  const said = ((await full.innerText()) ?? '').replace(/\s+/g, ' ');
  const onSecond = await full.locator('section[data-at="1"] p.text-2xl').count();
  check('scrolling lands on the next song — its words, not just its title',
    onSecond === 1, `${onSecond} big line(s) on panel two`);

  /* ── And it is honest about the words it guessed ────────────────────── */
  check('a song with no plan says its words are only spread evenly',
    /spread evenly over its length/.test(said),
    (said.match(/.{0,40}spread evenly.{0,30}/) ?? ['(not said)'])[0]);
  await p.screenshot({ path: shot('songscreen-broughtin.png') });

  const second = await bigLine();
  check('and that song shows its words too', second.length > 0, JSON.stringify(second));
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  if (existsSync(LIVE)) rmSync(LIVE);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\na song opens full screen, the next one is a swipe away, and the words move with it.');

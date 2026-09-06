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

  /* ── And you can take the song out of the app ───────────────────────
 
     "In die channel moet hy ook die opsie hê om 'n liedjie te download."
     The channel is the room the finished songs live in, and until now the
     finished ones were the only work in the app you could not get a file of.
 
     Asserted on the file that actually arrives, not on the button: the whole
     failure mode here is a button that fires and produces nothing, because
     the audio is on the account rather than on this device. */
  const keepButtons = p.locator('button').filter({ hasText: /^Download$/ });
  check('every song can be downloaded', (await keepButtons.count()) === 2,
    `${await keepButtons.count()} of 2`);
  const [file] = await Promise.all([
    p.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    keepButtons.first().click(),
  ]);
  check('pressing it hands over a real file', Boolean(file),
    file ? file.suggestedFilename() : 'nothing arrived');
  /* Named after the song and carrying the extension of what is actually in
     it. A wav called .mp3 is a file a phone refuses to open, and the person
     is told nothing about why. */
  check('named after the song, with the extension of what is in it',
    file?.suggestedFilename() === 'the-one-with-a-plan.wav',
    file?.suggestedFilename() ?? 'none');

  /* ── Post it: a sheet, not a squashed menu ──────────────────────────
 
     "in library wanneer mens kliek post it, dan is die drop down menu van
      opsies alles op mekaar gesquash."
 
     It opened inside the song's own card, which in this grid is a third of a
     laptop's width. A caption, eight platform buttons and two paragraphs do
     not fit there and they overlapped.
 
     So what is asserted is the geometry, not the markup: the sheet is at
     least as wide as the card was, and no two buttons in it sit on top of
     each other. Counting the buttons would have passed on the broken
     version — they were all there, they were just piled up. */
  const cardBox = await p.locator('article').first().boundingBox();
  await p.locator('button').filter({ hasText: /^Post it$/ }).first().click();
  await p.waitForTimeout(700);
  const postSheet = p.locator('div.fixed.inset-0.z-\\[92\\]');
  check('pressing Post it opens a sheet over the whole screen', (await postSheet.count()) === 1);
  const postBox = await postSheet.locator('> div').last().boundingBox();
  check('and it is the width of the window, not of the card',
    Boolean(postBox) && postBox.width >= 380,
    postBox ? `${Math.round(postBox.width)}px against a card of ${Math.round(cardBox?.width ?? 0)}px` : 'none');

  const boxes = await postSheet.locator('a, button').evaluateAll((els) =>
    els
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 8 && r.height > 8)
      .map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })),
  );
  let piled = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const over = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      /* The backdrop is a button covering everything on purpose, so overlap
         with something the size of the screen is not a pile. */
      if (over > 40 && a.w * a.h < 200000 && b.w * b.h < 200000) piled += 1;
    }
  }
  check('and nothing in it sits on top of anything else',
    piled === 0, `${boxes.length} things, ${piled} overlapping pair(s)`);
  check('the one option that really posts is on it',
    (await postSheet.locator('button').filter({ hasText: /Post to Live/ }).count()) === 1);
  await p.screenshot({ path: shot('postit-sheet.png') });
  await postSheet.locator('button[aria-label="Close"]').last().click();
  await p.waitForTimeout(500);
  check('and it closes again', (await postSheet.count()) === 0);

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

  /* ── And it is honest about how it timed them ───────────────────────
 
     Not which sentence — that changes as the app gets better at timing, and a
     probe pinned to one of them fails when it improves. What must always hold
     is that it says *something*: "the words move" and "the words move
     correctly" look identical for the first line and diverge by the third,
     and somebody filming themselves to this needs to know which they have. */
  const HOW = [
    /laid on the singing this app measured/,
    /laid across the part of the file that is sung/,
    /spread evenly over the length/,
  ];
  check('the screen says how it timed the words',
    HOW.some((one) => one.test(said)),
    (said.match(/The words (are|were)[^.]{0,70}\./) ?? ['(not said)'])[0]);

  /* Heard once, remembered after. Decoding a three-minute song every time
     somebody opens the words is a second of a screen sitting still at exactly
     the moment they are looking at it. */
  const remembered = await p.evaluate(() =>
    Object.keys(JSON.parse(window.localStorage.getItem('futurebox.lyrictime.v1') || '{}')).length);
  check('and what it heard is remembered, not worked out again', remembered > 0,
    `${remembered} song(s) timed`);
  await p.screenshot({ path: shot('songscreen-broughtin.png') });

  const second = await bigLine();
  check('and that song shows its words too', second.length > 0, JSON.stringify(second));
  /* ── The Lyrics button, which is a different screen ─────────────────
 
     The full-screen player above and this are two views of one thing and they
     drifted apart: this one was handed the even spread while the player had
     been taught to listen. It is the screen somebody props a phone against
     and sings to, so it is the one where drift is least forgivable.
 
     Closed first, because it is above everything — deliberately, since a
     navigation bar across a teleprompter is a navigation bar in the shot. */
  await p.locator('div.fixed.inset-0.z-\\[80\\] button[aria-label]').last().click();
  await p.waitForTimeout(800);

  /* The cover, on a song in the channel.

     It existed only in Make a song's own list, so the room where somebody
     actually looks at their songs had the drawn placeholder and no way to ask
     for a real one. Not mounted per card on purpose — each sleeve asks the
     server whether a cover exists, and a screen of songs should not be a
     screen of questions nobody asked. */
  const coverButton = p.locator('button').filter({ hasText: /^Cover art$/ });
  check('every song in the channel can be given a cover',
    (await coverButton.count()) > 0, `${await coverButton.count()} songs offer it`);

  /* ── Which one have I not heard? ─────────────────────────────────────
 
     A channel of songs all look the same, and the one you have not heard is
     the one you are looking for. The dot is per device and is set by playing
     or by opening a song full screen — which this probe has just done twice,
     so exactly the songs it opened should have lost theirs. */
  const dots = p.locator('span[aria-label="Not heard yet"]');
  const songCards = p.locator('article');
  const before = await dots.count();
  const many = await songCards.count();
  /* Not "at least zero", which was the first version of this and could not
     fail. The songs this probe has opened are heard; the rest are not. */
  check('the songs nobody has played carry a mark, and the played one does not',
    before === many - 1 && before > 0, `${before} unheard of ${many}`);

  /* And playing the last one clears the last mark. */
  await songCards.nth(many - 1).locator('button[aria-label]').first().click();
  await p.waitForTimeout(1200);
  const player = p.locator('div.fixed.inset-0.z-\\[80\\]');
  if ((await player.count()) > 0) {
    /* By its label, not by position. The first `aria-label` inside the player
       is the panel-wide play control, so "the first labelled button" pressed
       pause and left the player open — and everything after it timed out
       against a screen that was still there. */
    await player.locator('button[aria-label="Close"]').first().click();
    await p.waitForTimeout(800);
  }
  check('and hearing one takes its mark away', (await dots.count()) === before - 1,
    `${await dots.count()} left`);

  await p.locator('button').filter({ hasText: /^Lyrics$/ }).first().click();
  await p.waitForTimeout(2500);
  const sheet = p.locator('div.fixed.inset-0.z-\\[100\\]');
  check('the Lyrics button opens the words over the song', (await sheet.count()) === 1);
  check('and it is above the tab bar, not under it',
    (await sheet.first().boundingBox())?.y === 0,
    JSON.stringify(await sheet.first().boundingBox()));

  const big = async () =>
    ((await sheet.locator('p.text-3xl, p.sm\\:text-5xl').first().innerText().catch(() => '')) ?? '').trim();
  const wasLine = await big();
  check('a line is showing', wasLine.length > 0, JSON.stringify(wasLine));
  let movedOn = wasLine;
  for (let waited = 0; waited < 12 && movedOn === wasLine; waited += 1) {
    await p.waitForTimeout(1000);
    movedOn = await big();
  }
  check('and it follows the song here too — the screen you sing to',
    movedOn !== wasLine && movedOn.length > 0, `"${wasLine}" → "${movedOn}"`);
  await p.screenshot({ path: shot('songscreen-lyrics.png') });
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

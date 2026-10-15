/**
 * Simple, or everything — and the difference between hiding and switching off.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli, with nine screenshots of a competitor: "Dit is wat ek wil hê vir ons
 * app, net met al ons ekstra oulike goed by. Die oulike goed waaraan ons
 * gewerk het moenie wegval nie." Simpler, and nothing lost.
 *
 * We have been trying to solve "too much on screen" by taking things away,
 * and that is how four working features got hidden once already — a wrapper
 * put around a waveform also swallowed the words read off a recording, the
 * microphone level, the guide vocal and the voice controls, and it took
 * somebody using the app to find them missing. A mode is the lever that does
 * not have that failure: the knobs go one press away, in the same place, and
 * they are still there.
 *
 * ── What is asserted ─────────────────────────────────────────────────────
 *
 * That Simple is shorter — measured in pixels, not asserted. That the three
 * things a song actually needs are on it. That every control it hides is one
 * press away and comes back with the value it had, which is the claim "not
 * deleted" actually means. And the one that matters most: that a setting made
 * in Everything and then hidden by Simple is **named on the screen**, because
 * a control out of sight that still changes what gets made is worse than a
 * crowded page.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { agreeAndSubmit, launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3086';

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
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('simple@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('simple-password-1234');
  await agreeAndSubmit(p);
  await p.waitForTimeout(2600);
  /* The welcome door, waited for and then gone.
     `count()` once was the fault: the door draws after two fetches settle, so
     asking the instant the bar appears gets "no", and half a second later it is
     there — over the header, under the next press. `bringsong` timed out on
     exactly that. `enter.mjs` has said it in a comment since the day it was
     written; the probes with their own way in never got the lesson. */
  await dismissDoor(p);
  await p.waitForTimeout(900);

  const bar = p.locator('nav[aria-label]').first();
  await bar.locator('button').filter({ hasText: 'Make' }).first().click();
  await p.waitForTimeout(1300);
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const many = await door.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^Make a song/i.test(first)) {
      await door.nth(i).click();
      break;
    }
  }
  await p.waitForTimeout(1600);

  const room = p.locator('div.fixed.inset-0.z-50').first();
  const says = async () => ((await room.innerText()) ?? '').replace(/\s+/g, ' ');

  /* ── One box, around the copilot ─────────────────────────────────────

     Carli, 15 October 2026: *"die simple en everything wegvat en net so box
     rondom copilot bou wat alles in het, selfs 'n button wat uit pop om die
     weirdness te verstel. … Dan onder daardie boks kom die woorde uit, en
     onder die woorde moet die finale clear wees 'make the song'."* This probe
     walked Simple and Everything; it walks the box now. */
  check('Simple and Everything are gone', (await room.locator('[data-makemode]').count()) === 0
    && (await room.locator('button').filter({ hasText: /^(Simple|Everything)$/ }).count()) === 0);
  const box = room.locator('[data-makebox]');
  check('there is one song box', (await box.count()) === 1);
  check('  with the copilot inside it', (await box.locator('[data-copilot="make"], [data-makecopilot] input, [data-makecopilot] textarea').count()) > 0);
  check('  and Easy and Extensive along its top',
    (await box.locator('[data-makewaypick="easy"]').count()) === 1
    && (await box.locator('[data-makewaypick="extensive"]').count()) === 1);
  await p.screenshot({ path: shot('songbox.png') });

  /* ── Where the words and the button are ──────────────────────────────── */
  const top = async (sel) => room.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const button = room.locator('button').filter({ hasText: /Make the song/ }).first();
  check('the button says "Make the song"', (await button.count()) === 1);
  const boxTop = await top('[data-makebox]');
  const wordsTop = await top('[data-makewords]');
  const buttonTop = await button.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  check('the words come out under the box', wordsTop > boxTop, `${boxTop} then ${wordsTop}`);
  check('  and the button is under the words', buttonTop > wordsTop, `${wordsTop} then ${buttonTop}`);

  /* ── The weirdness pops out of a button on the box ───────────────────── */
  check('the weirdness is not lying open on the page', (await room.locator('#make-weirdness').count()) === 0);
  await box.locator('[data-maketool="feel"]').click();
  await p.waitForTimeout(400);
  check('  pressing Feel pops it out', await room.locator('#make-weirdness').isVisible().catch(() => false));
  await room.locator('#make-weirdness').evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, '60');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(300);
  /* Shut by pressing somewhere else, as a menu is. */
  await room.locator('[data-makewords] label').first().click();
  await p.waitForTimeout(400);
  check('  it goes away again when somewhere else is pressed', (await room.locator('#make-weirdness').count()) === 0);
  check('  and the button says what it is set to, so nothing applies out of sight',
    /60%/.test((await box.locator('[data-maketool="feel"]').innerText()) ?? ''));

  /* ── Hidden is not switched off ─────────────────────────────────────── */
  await box.locator('[data-maketool="more"]').click();
  await p.waitForTimeout(400);
  await room.locator('#make-bpm').evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, '140');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(300);
  await box.locator('[data-maketool="more"]').click();
  await p.waitForTimeout(300);
  check('the tempo, set and put away, is still named on its button',
    /140/.test((await box.locator('[data-maketool="more"]').innerText()) ?? ''));
  await box.locator('[data-maketool="more"]').click();
  await p.waitForTimeout(300);
  check('  and the value itself is untouched', (await room.locator('#make-bpm').inputValue()) === '140');
  await box.locator('[data-maketool="more"]').click();

  /* ── The length, with its price ──────────────────────────────────────── */
  await box.locator('[data-maketool="length"]').click();
  await p.waitForTimeout(300);
  const lengths = room.locator('[data-makelength]');
  check('the length button offers real lengths, each with its price',
    (await lengths.count()) >= 3 && /\d+ credits/.test((await lengths.first().innerText()) ?? ''));
  await lengths.nth(1).click();
  await p.waitForTimeout(300);
  check('  and picking one puts it away and prices the box',
    (await room.locator('[data-makelength]').count()) === 0
    && /\d+ credits/.test((await box.locator('[data-makecost]').innerText()) ?? ''));

  /* ── The plus ───────────────────────────────────────────────────────── */
  await box.locator('[data-makeplus]').click();
  await p.waitForTimeout(400);
  const picker = room.locator('[data-makepicker]');
  check('the plus pops out a list to start from', (await picker.count()) === 1);
  check('  with a search box and feelings to pick from',
    (await picker.locator('[data-pickersearch]').count()) === 1 && (await picker.locator('[data-shelf]').count()) >= 8);
  await picker.locator('[data-shelf="road"]').click();
  await p.waitForTimeout(300);
  const rows = picker.locator('[data-start]');
  check('  a feeling narrows it to songs to start from', (await rows.count()) >= 2
    && (await picker.locator('[data-sound]').count()) === 0);
  const firstTitle = ((await rows.first().innerText()) ?? '').split('\n')[0].trim();
  await rows.first().click();
  await p.waitForTimeout(500);
  check('  and pressing one fills the name, the words and the sound in',
    (await room.locator('#song-name').inputValue()) === firstTitle
    && (await room.locator('[data-makewords] textarea').first().inputValue()).length > 10
    && (await room.locator('textarea[placeholder*="afro house"]').inputValue()).length > 5,
    firstTitle);
  check('  then gets out of the way', (await room.locator('[data-makepicker]').count()) === 0);

  await box.locator('[data-makeplus]').click();
  await p.waitForTimeout(400);
  await room.locator('[data-makepicker] [data-pickerbring]').first().click();
  await p.waitForTimeout(400);
  check('the plus also starts from a song of your own',
    (await room.locator('[data-makepicker] input[type="file"]').count()) >= 1);
  await p.screenshot({ path: shot('songbox-plus.png') });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  /* ── Extensive is verse by verse ─────────────────────────────────────── */
  await box.locator('[data-makewaypick="extensive"]').click();
  await p.waitForTimeout(500);
  check('Extensive writes it verse by verse, saying what each part is for',
    (await box.locator('[data-makeverses]').count()) === 1 && /Verse 1/.test(await says()));
  const remembered = await p.evaluate(() => window.localStorage.getItem('futurebox.make.way.v1'));
  check('  and the choice is written down for next time', remembered === 'extensive', String(remembered));
  await box.locator('[data-makewaypick="easy"]').click();
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nOne song box around the copilot; every setting pops out of it and says what it is set to.');

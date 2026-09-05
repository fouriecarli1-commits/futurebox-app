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
import { shot } from './where.mjs';

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
  await p.locator('input[type="email"]').first().fill('simple@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('simple-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
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
  const mode = async (which) => {
    await room.locator('button').filter({ hasText: new RegExp(`^${which}$`) }).first().click();
    await p.waitForTimeout(800);
  };
  /** How tall the form is, which is the only honest measure of "simpler". */
  const formHeight = async () =>
    room.locator('div.rounded-2xl.border.border-zinc-800').first().evaluate((el) => Math.round(el.scrollHeight));
  const says = async () => ((await room.innerText()) ?? '').replace(/\s+/g, ' ');

  check('the room offers both', /Simple/.test(await says()) && /Everything/.test(await says()));

  await mode('Simple');
  const simpleTall = await formHeight();
  const simpleWords = await says();
  await p.screenshot({ path: shot('simple-mode.png') });

  /* The three things a song needs. Named by their own labels rather than
     counted, so a field renamed out of existence fails rather than passes. */
  for (const want of ['What is it called?', 'The words', 'What should it sound like?']) {
    check(`Simple still asks: ${want.toLowerCase()}`, simpleWords.includes(want), '');
  }
  check('and it still has the button that makes it', simpleWords.includes('Make my song'));

  /* What it puts away. */
  const HIDDEN = ['I will sing it myself', 'The voice', 'Speed', 'Mood', 'How long?'];
  const stillThere = HIDDEN.filter((one) => simpleWords.includes(one));
  check('and it puts the rest away', stillThere.length === 0, stillThere.join(', ') || 'all of it');

  await mode('Everything');
  const allTall = await formHeight();
  const allWords = await says();
  await p.screenshot({ path: shot('everything-mode.png') });

  const missing = HIDDEN.filter((one) => !allWords.includes(one));
  check('every one of them is one press away', missing.length === 0, missing.join(', ') || 'all back');
  check(`and Simple is genuinely shorter`, simpleTall < allTall * 0.7,
    `${simpleTall}px against ${allTall}px`);

  /* ── Hidden is not switched off ─────────────────────────────────────
 
     A setting made here and then put away by Simple still goes to the engine,
     so Simple has to say so. This is the assertion the whole design rests on. */
  const speed = room.locator('input[type="range"]').first();
  await speed.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, '140');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(600);
  const setTo = await room.innerText();
  check('the speed moved', /140/.test(setTo.replace(/\s+/g, ' ')), '');

  await mode('Simple');
  const nowSays = await says();
  check('Simple names what is still set from Everything',
    /Still set from Everything/.test(nowSays) && /140/.test(nowSays),
    (nowSays.match(/Still set from Everything:[^·]*·?[^A-Z]{0,40}/) ?? ['(not said)'])[0]);

  await mode('Everything');
  await p.waitForTimeout(600);
  const back = await room.locator('input[type="range"]').first().inputValue();
  check('and the value itself came back untouched', back === '140', back);

  /* ── The choice is remembered ───────────────────────────────────────── */
  await p.evaluate(() => window.localStorage.getItem('futurebox.make.mode.v1'));
  const remembered = await p.evaluate(() => window.localStorage.getItem('futurebox.make.mode.v1'));
  check('the mode is written down, so nobody hunts for the controls twice',
    remembered === 'advanced', String(remembered));
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nSimple is shorter, everything is one press away, and nothing applies in silence.');

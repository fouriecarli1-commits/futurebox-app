/**
 * The Pro Booth, pressed.
 *
 * `check:tempo`, `check:mix` and `check:tone` pin the arithmetic and
 * `audit/mixdown.mjs` pins the audio. None of them can tell you that the room
 * renders, that its controls are reachable, that changing a lane marks the
 * master reading stale, or that a count-in with the click switched off says so
 * — which is the difference between a feature and a screen somebody can use.
 *
 * It owns its loop: copies the probe page in, builds, presses, removes.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3057';
const af = process.argv[3] === 'af';
const PROBE = 'app/proboothprobe/page.probe.tsx';
const LIVE = 'app/proboothprobe/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
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

  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 160)));
  await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');
  await p.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  const words = () => p.locator('body').innerText();

  // ── The room, and the song in it as a lane ──────────────────────────
  check('the room opens with the song already in it',
    /A test song/.test(await words()), (await words()).slice(0, 120).replace(/\n/g, ' / '));

  /* ── The clock reads in bars ─────────────────────────────────────────
     Not seconds. A musician setting up a take reads bars, and the whole
     tempo strip is pointless if the transport does not. */
  check('the transport reads in bars and beats', /001 01/.test(await words()),
    (await words()).match(/\d{3} \d{2}/)?.[0] ?? 'no bar reading');

  // ── Tempo and time signature are there and settable ─────────────────
  const bpm = p.locator('input[type="number"]').first();
  await bpm.fill('90');
  await p.waitForTimeout(300);
  check('the tempo can be set', (await bpm.inputValue()) === '90', await bpm.inputValue());

  /* A tempo of zero must not divide by zero into a frozen page. The field
     is clamped on its way in rather than trusted. */
  await bpm.fill('0');
  await bpm.blur();
  await p.waitForTimeout(300);
  const afterZero = Number(await bpm.inputValue());
  check('a tempo of zero is refused rather than dividing by nothing',
    afterZero >= 20, String(afterZero));
  await bpm.fill('120');
  await p.waitForTimeout(200);

  /* ── The count-in that cannot be heard ───────────────────────────────
     Two bars of silence and then a recording that has already started reads
     as the button not working. The room says so instead. */
  const countIn = p.locator(`select[aria-label="${af ? 'Tel in' : 'Count in'}"]`);
  await countIn.selectOption('2');
  await p.waitForTimeout(400);
  check('a count-in with no click says so rather than being silent',
    af ? /Die intel het niks om mee te tel nie/.test(await words())
       : /nothing to count with/.test(await words()),
    'somebody gets two bars of silence and no explanation');

  // Switching the click on takes the warning away and offers the division.
  await p.locator(`button:has-text("${af ? 'Klik' : 'Click'}")`).first().click();
  await p.waitForTimeout(400);
  check('switching the click on clears the warning',
    !(af ? /niks om mee te tel/ : /nothing to count with/).test(await words()));
  check('and offers how often it should click',
    await p.locator(`select[aria-label="${af ? 'Hoe dikwels dit klik' : 'How often it clicks'}"]`).isVisible());

  /* ── The master says when its reading is out of date ─────────────────
     A measurement about a mix that no longer exists is worse than none. */
  check('before it is measured the master says it is doing nothing',
    af ? /doen die meester niks nie/.test(await words()) : /the master does nothing at all/.test(await words()));

  await p.locator(`button:has-text("${af ? 'Meet die mengsel' : 'Measure the mix'}")`).first().click();
  await p.waitForTimeout(2500);
  const measured = await words();
  check('measuring gives a peak and an average in decibels',
    /-?\d+\.\d dB/.test(measured), (measured.match(/-?\d+\.\d dB/g) || ['none']).join(' | '));
  check('and the "not measured yet" line is gone',
    !(af ? /doen die meester niks nie/ : /the master does nothing at all/).test(measured));

  // Now move something, and the reading has to admit it is stale.
  const pan = p.locator(`input[aria-label="${af ? 'Waar dit sit, links na regs' : 'Where it sits, left to right'}"]`).first();
  await pan.fill('40');
  await p.waitForTimeout(500);
  check('changing a lane marks the reading out of date',
    af ? /meet dit weer/.test(await words()) : /measure it again/.test(await words()),
    'a stale number is left on screen as though it were current');

  /* ── Tone ────────────────────────────────────────────────────────────
     And the sentence that keeps it honest: a guitarist reading "amp
     modeller" and hearing a tone stack would be right to be annoyed. */
  await p.locator(`button[aria-label="${af ? 'Toon' : 'Tone'}"]`).first().click();
  await p.waitForTimeout(400);
  const tone = await words();
  check('the tone drawer opens', af ? /Dryf/.test(tone) : /Drive/.test(tone));
  check('and says it is not a model of a named amplifier',
    af ? /nie ’n model van ’n benoemde versterker nie/.test(tone)
       : /not a model of a named amplifier/.test(tone),
    'the room implies it is modelling somebody else’s amp');

  // ── Nothing costs anything unless it says so ────────────────────────
  check('the split control names its price',
    Boolean(await p.locator('[aria-label*="plit"], [aria-label*="kei"]').first().getAttribute('title')),
    'a paid button with no price on it');

  await p.screenshot({ path: shot(`probooth-${af ? 'af' : 'en'}.png`), fullPage: false });

  /* ── Nothing overlaps, at either size ────────────────────────────────
     The first version of this row fitted on a desktop and had the pan
     slider sitting on top of the start-time field at 1280 px — which is
     not a narrow screen, and which no assertion about text would ever
     have caught. Boxes are compared, not looked at. */
  for (const width of [1280, 390]) {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(500);
    const boxes = await p.locator('input[type="range"], input[type="number"]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, w: box.width, h: box.height };
      }),
    );
    let overlap = null;
    for (let i = 0; i < boxes.length && !overlap; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const c = boxes[j];
        /* Four pixels, not one. Two controls sitting flush against each
           other come back overlapping by a tenth of a pixel — sub-pixel
           layout, invisible to anybody. A threshold of one reported that as
           a defect, which is the kind of false alarm that gets a check
           switched off. */
        const across = a.x < c.x + c.w - 4 && c.x < a.x + a.w - 4;
        const down = a.y < c.y + c.h - 4 && c.y < a.y + a.h - 4;
        if (across && down) { overlap = `${JSON.stringify(a)} over ${JSON.stringify(c)}`; break; }
      }
    }
    check(`at ${width}px no two controls sit on top of each other`, !overlap, overlap ?? '');

    const wide = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`at ${width}px the room does not run off the side`, wide <= 1, `${wide}px over`);
  }
  /* ── And that it wraps rather than squeezes ──────────────────────────
     The phone is the point. A row that stays one line on a 390 px screen has
     not fitted, it has crushed every control in it to something nobody can
     hit. Taller on a phone than on a desktop is the shape of having wrapped. */
  const heightAt = async (width) => {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(400);
    return p.locator('canvas').first().evaluate((node) => {
      const row = node.closest('div.flex-wrap');
      return row ? row.getBoundingClientRect().height : 0;
    });
  };
  const onDesktop = await heightAt(1280);
  const onPhone = await heightAt(390);
  check('the lane row wraps on a phone instead of crushing itself',
    onPhone > onDesktop, `${onPhone}px on a phone, ${onDesktop}px on a desktop`);

  await p.setViewportSize({ width: 1280, height: 900 });
  await b.close();
} finally {
  if (server?.pid) {
    try { process.kill(-server.pid); } catch { /* already gone */ }
    try { server.kill('SIGKILL'); } catch { /* already gone */ }
  }
  if (existsSync(LIVE)) rmSync(LIVE);
}

console.log('problems:', problems.join(' ;; ') || 'none');
process.exit(problems.length ? 1 : 0);

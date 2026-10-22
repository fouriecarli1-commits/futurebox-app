/**
 * The Pro Booth as a studio, pressed: the transport, markers, copy and
 * paste, the mixer, the playhead, the hum read onto a roll, and the rigs.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026: *"Die probooth moet dan ook fyn nagegaan word,
 * sodat dit presies werk soos 'n DAW studio werk en lyk … AL die funksies
 * moet daar wees. Gaan die Hum funksie na, as daardie baie fyn, genuanseerd,
 * en baie baie goed verfyn word … dan kan dit ons selling point word."*
 *
 * `check:humpitch` proves the reading on synthesised hums and `check:pedals`
 * the pedals' arithmetic. Neither can say that a person, in a browser, can
 * hum into the microphone and see the notes they hummed. So this does exactly
 * that: Chromium's fake microphone plays a hum written here — a known tune,
 * hummed legato and a third of a semitone sharp, with vibrato on the long
 * notes — and the roll is read back against the tune.
 *
 * It owns its loop, as `check:probooth` does: copies the probe page in,
 * builds, presses, removes.
 */
import { cpSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve } from './where.mjs';

const PORT = process.argv[2] || '3126';
const PROBE = 'app/proboothprobe/page.probe.tsx';
const LIVE = 'app/proboothprobe/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

/* ── The hum the microphone will hear ─────────────────────────────────── */

const TUNE = [[57, 0.5], [60, 0.4], [64, 0.4], [62, 0.8], [60, 0.4], [59, 0.4], [57, 1.0]];
function humWav() {
  const rate = 48_000;
  const seconds = 8;
  const data = new Float32Array(rate * seconds);
  let at = 0.6;
  let phase = 0;
  for (const [midi, len] of TUNE) {
    const from = Math.round(at * rate);
    for (let i = 0; i < Math.round(len * rate); i += 1) {
      const t = i / rate;
      /* Vibrato on the long notes, and the whole tune a third of a
         semitone sharp, the way a person humming alone usually is. */
      const wobble = len > 0.6 ? 0.5 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.3) : 0;
      phase += (2 * Math.PI * 440 * 2 ** ((midi + 0.3 + wobble - 69) / 12)) / rate;
      const env = Math.max(0, Math.min(1, t / 0.03, (len - t) / 0.03));
      data[from + i] = 0.35 * env * (Math.sin(phase) + 0.3 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase));
    }
    /* Legato pairs: a short breath between notes, not a silence. */
    at += len + 0.12;
  }
  const bytes = Buffer.alloc(44 + data.length * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + data.length * 2, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i += 1) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  const dir = mkdtempSync(join(tmpdir(), 'boothstudio-'));
  const path = join(dir, 'hum.wav');
  writeFileSync(path, bytes);
  return path;
}

let server = null;
let browser = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  const wav = humWav();
  browser = await chromium.launch(launchOptions({
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${wav}`,
    ],
  }));

  for (const width of [1440, 375]) {
    /* A context each, so the phone does not open the session the desk
       saved — the room keeps its lanes on the device by design. */
    const context = await browser.newContext({ viewport: { width, height: width > 600 ? 900 : 780 } });
    const p = await context.newPage();
    /** Open a lane's controls, whether or not it was open already. */
    const pickFirst = async () => {
      const name = p.locator('[data-lanename]').first();
      if ((await name.getAttribute('aria-pressed')) !== 'true') await name.click();
      await p.waitForTimeout(250);
    };
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    await p.goto(`${server.url}/proboothprobe`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const at = `at ${width}px`;
    const key = (k) => p.locator(`[data-transport-key="${k}"]`);

    /* ── The transport row ───────────────────────────────────────────── */
    check(`${at} the transport has back-to-start, stop, record, loop and click over the lanes`,
      (await Promise.all(['start', 'stop', 'record', 'loop', 'click'].map((k) => key(k).isVisible()))).every(Boolean));
    const keyBoxes = await p.locator('[data-transport-key]').evaluateAll((els) => els
      .filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, right: r.right }; }));
    check(`${at} every transport key is a thumb's size and on the screen`,
      keyBoxes.every((b) => b.w >= 43.5 && b.h >= 43.5 && b.right <= width + 0.5),
      JSON.stringify(keyBoxes.filter((b) => b.w < 43.5 || b.h < 43.5 || b.right > width + 0.5)));
    check(`${at} the page never scrolls sideways`,
      !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));

    /* ── The playhead glides, and the room is not re-worked every frame ── */
    await p.evaluate(() => {
      window.__long = [];
      new PerformanceObserver((list) => { for (const one of list.getEntries()) window.__long.push(one.duration); })
        .observe({ entryTypes: ['longtask'] });
    });
    await p.keyboard.press('Space');
    await p.waitForTimeout(300);
    const lefts = [];
    for (let i = 0; i < 12; i += 1) {
      await p.waitForTimeout(60);
      lefts.push(await p.locator('[data-playline]').evaluate((e) => parseFloat(e.style.left)));
    }
    const backwards = lefts.filter((v, i) => i > 0 && v < lefts[i - 1] - 0.01).length;
    check(`${at} the playhead moves forward while playing and never jumps back`,
      lefts[lefts.length - 1] > lefts[0] && backwards === 0, lefts.map((v) => v.toFixed(2)).join(','));
    const long = await p.evaluate(() => window.__long.filter((d) => d > 120).length);
    check(`${at} playing does not block the page`, long === 0, `${long} tasks over 120 ms`);
    await key('stop').click();
    await p.waitForTimeout(250);
    check(`${at} stop goes back to where play began`,
      (await p.locator('[data-playline]').evaluate((e) => parseFloat(e.style.left))) < 0.5);

    /* ── Loop, click, markers ────────────────────────────────────────── */
    await key('loop').click();
    await p.waitForTimeout(300);
    check(`${at} loop with nothing marked marks bars from the line and goes round`,
      (await key('loop').getAttribute('aria-pressed')) === 'true' && (await p.locator('[data-regionloop]').count()) === 1);
    await key('loop').click();
    await key('stop').click();
    await key('click').click();
    check(`${at} the click switches on from the transport`, (await key('click').getAttribute('aria-pressed')) === 'true');
    await key('click').click();
    await key('marker').click();
    await p.waitForTimeout(200);
    check(`${at} a marker set at the line is drawn on the ruler`, (await p.locator('[data-marker]').count()) === 1);
    await key('marker').click();
    await p.waitForTimeout(200);
    check(`${at}   and pressed again where it stands, it is taken away`, (await p.locator('[data-marker]').count()) === 0);

    /* ── Copy, paste, duplicate, and the mixer ───────────────────────── */
    await pickFirst();
    await key('duplicate').click();
    await p.waitForTimeout(300);
    await key('copy').click();
    await key('paste').click();
    await p.waitForTimeout(300);
    check(`${at} duplicate and paste each make a lane`, (await p.locator('[data-lanename]').count()) === 3,
      `${await p.locator('[data-lanename]').count()} lanes`);
    await key('mixer').click();
    await p.waitForTimeout(400);
    check(`${at} the mixer has a strip for every lane`, (await p.locator('[data-strip]').count()) === 3);
    const strips = await p.locator('[data-strip]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right));
    check(`${at}   and none of them is off past the edge`, strips.every((r) => r <= width + 0.5));
    await p.locator('[data-stripfader]').first().evaluate((e) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(e, '50');
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await p.waitForTimeout(200);
    check(`${at}   and a fader moved there moves the lane`, /-6\.0 dB/.test(await p.locator('[data-strip]').first().innerText()));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);

    /* ── The hum, read onto the roll ─────────────────────────────────── */
    if (width === 1440) {
      await p.locator('button[aria-label^="Stems"]').first().click();
      await p.waitForTimeout(500);
      await p.locator('[data-humrecord]').click();
      await p.waitForTimeout(8600);
      await p.locator('[data-humstop]').click();
      await p.waitForTimeout(2500);
      await p.locator('[data-humread]').click();
      await p.waitForTimeout(1500);
      const notes = await p.locator('[data-rollnote]').evaluateAll((els) => els.map((e) => e.getAttribute('data-rollnote')));
      const want = TUNE.map(([midi]) => String(midi));
      check('a tune hummed into the microphone, legato and sharp, comes back as its notes on the roll',
        want.every((one, i) => notes[i] === one), `${notes.join(' ')} against ${want.join(' ')}`);
      check('  and the card says it heard the key and allowed for the singer being sharp',
        /heard in A Minor/.test(await p.locator('[data-humsummary]').innerText())
        && /sharp/.test(await p.locator('[data-humsummary]').innerText()),
        await p.locator('[data-humsummary]').innerText());
      await p.locator('[data-rollnote]').first().click();
      await p.locator('[data-rolltool="up"]').click();
      await p.waitForTimeout(200);
      check('  and a note moved up on the roll is moved',
        (await p.locator('[data-rollnote]').first().getAttribute('data-rollnote')) === '58');
      await p.locator('[data-humundo]').click();
      await p.waitForTimeout(200);
      check('  and the roll\'s own undo puts it back',
        (await p.locator('[data-rollnote]').first().getAttribute('data-rollnote')) === '57');
      const lanesBefore = await p.locator('[data-prosaveone]').count();
      await p.locator('[data-humgo]').click();
      await p.waitForTimeout(1500);
      check('  and "Put it on a lane" puts the corrected notes on a lane',
        (await p.locator('[data-prosaveone]').count()) === lanesBefore + 1);
      await p.locator('[data-humretake]').click();
      await p.waitForTimeout(3000);
      await p.locator('[data-humstop]').click();
      await p.waitForTimeout(2500);
      check('a retake keeps the take before it, to choose between', (await p.locator('[data-humtake]').count()) === 2);
      await p.locator('[data-hummodel]').scrollIntoViewIfNeeded();
      check('  and the studio-model hand-off says its price before it is pressed',
        /\d+ credits/.test(await p.locator('[data-hummodel]').innerText()));
      await p.keyboard.press('Escape');
    }

    /* ── The rigs ────────────────────────────────────────────────────── */
    await pickFirst();
    await p.locator('button[aria-label^="Audio effects"]').first().click();
    await p.waitForTimeout(500);
    check(`${at} the rack offers the guitar and bass rigs`, (await p.locator('[data-rig]').count()) >= 8);
    await p.locator('[data-rig="highGain"]').click();
    await p.waitForTimeout(300);
    check(`${at}   and a rig switches its pedals and amp on`,
      (await p.locator('button[aria-pressed="true"]', { hasText: 'ON' }).count()) >= 3);
    await p.keyboard.press('Escape');
    await p.keyboard.press('Space');
    await p.waitForTimeout(600);
    await p.keyboard.press('Space');
    check(`${at} nothing threw`, errors.length === 0, errors.join(' | '));
    await context.close();
  }
} catch (error) {
  problems.push(String(error).slice(0, 300));
} finally {
  await browser?.close().catch(() => {});
  server?.stop();
  rmSync(LIVE, { force: true });
}

if (problems.length) {
  console.log(`\ncheck:boothstudio — ${problems.length} problem(s):`);
  problems.forEach((one) => console.log(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:boothstudio — the booth works as a studio: transport, markers, mixer, the hum on a roll, the rigs.');

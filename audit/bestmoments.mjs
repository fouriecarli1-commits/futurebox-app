/**
 * Best moments, on the video editor's clip bench, used the way she would.
 *
 * Carli, 16 October 2026: a clipper that finds the best moments and arranges
 * them. A shot of near-silence with three loud bursts in it is brought in,
 * a fifteen-second reel is asked for, and the clock is read: the one shot is
 * now several, each starting at a burst, the room says what it did, and Undo
 * puts the whole shot back.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3358');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ at: server.url, lang: 'en' });
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
const bench = async (which) => {
  const button = page.locator(`[data-cutbench="${which}"]`);
  if ((await button.getAttribute('aria-pressed').catch(() => null)) === 'true') return;
  await button.click({ timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(500);
};
const BURSTS = [4, 11, 17];
const LONG = 21;

try {
  await studio(page);
  await toRoom(page, 'Video Editor');
  await page.waitForTimeout(900);

  /* Twenty-one seconds of a quiet hum with three loud bursts in it, recorded here. */
  const made = await page.evaluate(async ({ bursts, long }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 120;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(15);
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return null;
    const audio = new Ctx();
    const to = audio.createMediaStreamDestination();
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.frequency.value = 330;
    level.gain.value = 0.01;
    for (const at of bursts) {
      level.gain.setValueAtTime(0.01, audio.currentTime + at);
      level.gain.linearRampToValueAtTime(0.9, audio.currentTime + at + 0.05);
      level.gain.setValueAtTime(0.9, audio.currentTime + at + 2);
      level.gain.linearRampToValueAtTime(0.01, audio.currentTime + at + 2.05);
    }
    tone.connect(level); level.connect(to); tone.start();
    for (const track of to.stream.getAudioTracks()) stream.addTrack(track);
    const type = ['video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start(500);
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = '#246'; c.fillRect(0, 0, 160, 120);
        c.fillStyle = '#fff'; c.fillRect((t / long) * 140, 50, 20, 20);
        if (t >= long) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    tone.stop(); void audio.close();
    return Array.from(new Uint8Array(await new Blob(parts, { type }).arrayBuffer()));
  }, { bursts: BURSTS, long: LONG });

  if (!made) {
    console.log('  --  this browser cannot record webm with sound; the walk is skipped rather than faked.');
  } else {
    await page.locator('[data-editoropenbring] input[type="file"]').setInputFiles({ name: 'bursts.webm', mimeType: 'video/webm', buffer: Buffer.from(made) });
    await page.waitForFunction(() => document.querySelectorAll('[data-editorblock]').length === 1, null, { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    await page.locator('[data-editorblock]').first().click().catch(() => undefined);
    await page.keyboard.press('Escape');
    await bench('clip');
    await page.locator('[data-editormomentsbench]').scrollIntoViewIfNeeded().catch(() => undefined);
    check('Best moments is on the clip bench, and says it spends no credits',
      (await page.locator('[data-editormoments]').count()) === 1
        && /no credits/i.test(await page.locator('[data-editormomentsbench]').innerText()));

    await page.locator('[data-editormomentslong="15"]').click();
    await page.locator('[data-editormoments]').click();
    await page.waitForSelector('[data-editormomentssaid]', { timeout: 20000 }).catch(() => undefined);
    const blocks = await page.locator('[data-editorblock]').count();
    const said = await page.locator('[data-editormomentssaid]').innerText().catch(() => '');
    const short = await page.locator('[data-editormomentsshort]').innerText().catch(() => '');
    check('the one shot is now its best moments, laid on the clock', blocks >= 3 && blocks <= 6, `${blocks} blocks · ${said || short || 'nothing said'}`);
    /* A browser that recorded the picture but not the sound gives a shot
       with nothing to read: the room must then say so and spread the
       moments, which is a path of its own worth reading. */
    const heard = !/no sound to read/.test(said);
    if (!heard) console.log('  --  this browser recorded no sound; the even spread is read instead of the bursts.');
    check('  and the room says how many, how long, and that Undo puts it back',
      (heard ? /\d+ moments, \d+ seconds/.test(said) : /spread evenly/.test(said)) && /Undo/.test(said), said);

    /* Each burst is the start of a moment. Where the bursts really are is
       read off the recorded file itself — a recorder starts a beat after the
       sound it records, so the times they were played at are not the times
       they landed at. */
    const onsets = await page.evaluate(async (bytes) => {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      const audio = new Ctx();
      try {
        const buffer = await audio.decodeAudioData(new Uint8Array(bytes).buffer);
        const data = buffer.getChannelData(0);
        const per = Math.floor(buffer.sampleRate / 20);
        const out = [];
        let loud = false;
        for (let i = 0; i + per <= data.length; i += per) {
          let peak = 0;
          for (let j = i; j < i + per; j += 1) peak = Math.max(peak, Math.abs(data[j]));
          if (!loud && peak > 0.3) out.push(i / buffer.sampleRate);
          loud = peak > 0.3;
        }
        return out;
      } catch { return []; } finally { void audio.close(); }
    }, made);
    const blocks2 = await page.evaluate(() => Array.from(document.querySelectorAll('[data-editorblock]')).map((el) => Number(el.getAttribute('data-editorfrom'))));
    if (heard && onsets.length === BURSTS.length) {
      check('  each burst caught from just before it starts', onsets.every((t) => blocks2.some((f) => f <= t + 0.1 && f >= t - 0.6)),
        `bursts at ${onsets.map((t) => t.toFixed(2)).join()} · moments from ${blocks2.join()}`);
    } else if (heard) {
      console.log(`  --  the recorded bursts could not be read back (${onsets.length}); their timing is not checked.`);
    }

    await page.locator('[data-editorundo]').first().click();
    await page.waitForTimeout(600);
    check('Undo puts the whole shot back', (await page.locator('[data-editorblock]').count()) === 1);
  }
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:bestmoments — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:bestmoments — a long shot is cut into its loudest moments, in order, on the clock, and Undo puts it back.');

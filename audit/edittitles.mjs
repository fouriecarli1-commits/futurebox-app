/**
 * The words on a film: the subtitle looks, the lower thirds and the new
 * motions, put on a shot and read off the picture.
 *
 * Carli, 16 October 2026, screenshots of a title library — subtitles in a
 * column of looks, lower thirds left, middle and right, and titles that flip,
 * scale, scramble, spin, glitch and flicker in. All of it lives in the
 * cutting room's Templates, under Subtitles and Motion.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3331');
const problems = [];
const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en', width: 1280, height: 900 });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
const bench = async (which) => {
  const button = p.locator(`[data-cutbench="${which}"]`);
  if ((await button.getAttribute('aria-pressed').catch(() => null)) === 'true') return;
  await button.click({ timeout: 10000 }).catch(() => undefined);
  await p.waitForTimeout(500);
};
const sample = () => p.locator('[data-editormotionsample]').first();

try {
  await studio(p);
  await toRoom(p, 'Video Editor');
  await unfold(p);
  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    /* ── With a real sound in it, and a sound that CHANGES ──────────────

       A canvas stream carries pictures only, so until now the clip this probe
       made was silent — and a silent clip draws a flat line on the sound lane,
       correctly. The assertion that the wave is a picture of a sound rather
       than a texture had nothing to measure, and said so.

       A tone whose level swings is the smallest fixture that makes the lane's
       job visible: if the drawn wave does not change height along a clip whose
       loudness does, the wave is not coming from the audio. */
    let shut = null;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (Ctx) {
        const audio = new Ctx();
        const to = audio.createMediaStreamDestination();
        const tone = audio.createOscillator();
        const level = audio.createGain();
        tone.frequency.value = 220;
        /* Swinging between near-silent and loud about twice a second, so a few
           hundred columns of wave have obvious peaks and troughs in them. */
        const swing = audio.createOscillator();
        const depth = audio.createGain();
        swing.frequency.value = 2.2;
        depth.gain.value = 0.48;
        level.gain.value = 0.5;
        swing.connect(depth); depth.connect(level.gain);
        tone.connect(level); level.connect(to);
        tone.start(); swing.start();
        for (const track of to.stream.getAudioTracks()) stream.addTrack(track);
        shut = () => { try { tone.stop(); swing.stop(); void audio.close(); } catch { /* done */ } };
      }
    } catch { /* No audio here; the clip is silent and the wave is a line. */ }
    const type = ['video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = '#2b6'; c.fillRect(0, 0, 320, 240);
        c.fillStyle = '#fff'; c.fillRect((t / 2) * 280, 100, 40, 40);
        if (t >= 2) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    shut?.();
    const blob = new Blob(parts, { type });
    const buf = await blob.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  });
  if (!made) throw new Error('this browser cannot record webm');
  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles({
    name: 'a-take.webm', mimeType: 'video/webm', buffer: Buffer.from(made),
  });
  await p.waitForTimeout(2500);
  check('a clip is on the clock', (await p.locator('[data-editorblock]').count()) === 1);
  await p.locator('[data-editorblock]').first().click();
  await p.waitForTimeout(400);

  await bench('film');
  await p.locator('[role="tab"]').filter({ hasText: /Subtitles/ }).first().click().catch(() => undefined);
  await p.waitForTimeout(400);
  check('the templates have a Subtitles tab', (await p.locator('[data-editorcaptions]').count()) === 1);
  check('  with the subtitle looks and lower thirds', (await p.locator('[data-editorcaption]').count()) >= 20,
    `${await p.locator('[data-editorcaption]').count()} styles`);

  /* Black on white: words on the picture, on a white box that is SOLID. */
  await p.locator('[data-editorcaption="blackOnWhite"]').click();
  await p.waitForTimeout(800);
  const look = await p.locator('[data-editorwordsdrag]').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { text: el.textContent, color: s.color, back: s.backgroundColor };
  }).catch(() => null);
  check('  and black on white puts the words on a solid white box',
    Boolean(look && /Subtitle/.test(look.text ?? '') && /rgb\(0, 0, 0\)/.test(look.color) && /rgba?\(2(4[2-9]|5\d), 2(4[2-9]|5\d), 2(4[2-9]|5\d)(, 1)?\)/.test(look.back)),
    JSON.stringify(look));

  /* A lower third sits low and to the left. */
  await p.locator('[data-editorcaption="lowerLeft"]').click();
  await p.waitForTimeout(900);
  const placed = await p.evaluate(() => {
    const el = document.querySelector('[data-editorwordsdrag]');
    const words = el?.getBoundingClientRect();
    const frame = el?.parentElement?.getBoundingClientRect();
    return words && frame ? { x: (words.left + words.width / 2 - frame.left) / frame.width, y: (words.top + words.height / 2 - frame.top) / frame.height } : null;
  });
  check('  and a left lower third sits low on the left', Boolean(placed && placed.x < 0.45 && placed.y > 0.7), JSON.stringify(placed));

  /* The motions: the simulator plays the new ones. */
  await p.locator('[role="tab"]').filter({ hasText: /Motion/ }).first().click().catch(() => undefined);
  await p.waitForTimeout(300);
  check('the motions include the new ones', (await p.locator('[data-editormotion]').count()) >= 22,
    `${await p.locator('[data-editormotion]').count()} motions`);
  await p.locator('[data-editormotion="write"]').click();
  await p.waitForTimeout(300);
  const early = await sample().innerText().catch(() => '');
  await p.waitForTimeout(1000);
  const late = await sample().innerText().catch(() => '');
  check('  and random write on scrambles the letters, then settles them', early.trim() !== late.trim() && /Your words here/.test(late),
    `${early} → ${late}`);
  await p.locator('[data-editormotion="spin"]').click();
  await p.waitForTimeout(250);
  const turning = await sample().evaluate((el) => getComputedStyle(el).transform).catch(() => '');
  check('  and spin twist really turns the words', /matrix\(/.test(turning) && !/matrix\(1, 0, 0, 1,/.test(turning), turning);
  await p.screenshot({ path: shot('edittitles.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 300)}`);
} finally {
  await b.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:edittitles — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:edittitles — the subtitle looks and lower thirds land on the picture as they look in the list, and the new motions move.');

/**
 * Subtitles from what is said, the word being said lit (`lib/subtitles.ts`,
 * docs/VIDEO-EDITOR-ROADMAP.md gap 2).
 *
 * Walked with a clip that has sound in it, and the transcription route
 * answered here with known words at known times — the route itself is held
 * by its own checks; this walks the room: the price on the button, the voice
 * file it sends, the lines that come back, and the lit word on the film.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3501');
const problems = [];
const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en', width: 1280, height: 900 });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

let sent = null;
await p.route('**/api/transcribe', async (route) => {
  const body = route.request().postDataBuffer();
  sent = { bytes: body ? body.length : 0, wav: body ? body.includes(Buffer.from('WAVE')) : false };
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ words: [
      { text: 'Hello', start: 0.1, end: 0.5 }, { text: 'neon', start: 0.55, end: 0.9 }, { text: 'world.', start: 0.95, end: 1.3 },
      { text: 'Second', start: 1.5, end: 1.8 }, { text: 'line', start: 1.85, end: 1.95 },
    ] }),
  });
});

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
  await p.locator('[data-cutbench="words"]').click({ timeout: 10000 }).catch(() => undefined);
  await p.waitForTimeout(500);
  const go = p.locator('[data-editorsubsgo]');
  check('the Words panel offers subtitles from what is said', (await go.count()) === 1);
  const label = (await go.textContent()) ?? '';
  check('  with its price on the button', /credits?/i.test(label) && /\d/.test(label), label);
  await go.click();
  await p.waitForFunction(() => Boolean(document.querySelector('[data-editorsubssaid]')), null, { timeout: 20000 }).catch(() => undefined);
  const said = (await p.locator('[data-editorsubssaid]').textContent().catch(() => '')) ?? '';
  check('the film\'s speech is sent as one small voice file', Boolean(sent?.wav) && sent.bytes > 1000 && sent.bytes < 400000, JSON.stringify(sent));
  check('  and the words come back as lines of subtitles', /2 lines/.test(said), said);
  /* To 0.7 s on the clock: "neon" is being said. */
  const track = p.locator('[data-editortrack]');
  const perSecond = Number(await track.getAttribute('data-persecond')) || 40;
  await track.click({ position: { x: perSecond * 0.7, y: 30 } });
  await p.waitForTimeout(500);
  const up = (await p.locator('[data-editorsubnow]').textContent().catch(() => '')) ?? '';
  check('the line being said is on the film', /Hello\s*neon\s*world/.test(up), up);
  const lit = (await p.locator('[data-editorsubword="lit"]').textContent().catch(() => '')) ?? '';
  check('  with the word being said lit', lit === 'neon', lit);
  await p.locator('[data-editorsubslit="#ff2bd6"]').click();
  await p.waitForTimeout(300);
  const colour = await p.locator('[data-editorsubword="lit"]').evaluate((el) => getComputedStyle(el).color).catch(() => '');
  check('  in the colour chosen', /255, 43, 214/.test(colour), colour);
  await p.screenshot({ path: shot('subtitlewalk.png') });
  await p.locator('[data-editorsubsoff]').click();
  await p.waitForTimeout(300);
  check('and they come off again', (await p.locator('[data-editorsubnow]').count()) === 0);
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 300)}`);
} finally {
  await b.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:subtitlewalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:subtitlewalk — the film\'s speech is read once, at the price on the button, and comes back as lines with the word being said lit.');

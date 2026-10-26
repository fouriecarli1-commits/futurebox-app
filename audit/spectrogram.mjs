/**
 * The spectrogram switch in both rooms, pressed the way she would.
 *
 * The owner, 26 October 2026: *"Kan ons ook 'n spectogram in ons probooth
 * en video editor in bou?"* What is checked is that the switch exists in
 * both rooms, that pressing it repaints the lane as a picture with many
 * colours in it rather than one-colour bars, that the picture is of the
 * sound (a tone paints a band, not a wash), and that the choice is kept.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3403';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const server = await serve(PORT);
const { browser, page: p } = await enter({ at: server.url, lang: 'en', width: 390, height: 844, touch: true, scale: 3, args: ['--autoplay-policy=no-user-gesture-required'] });
const thrown = [];
p.on('pageerror', (e) => thrown.push(String(e).slice(0, 160)));

/* A tone with a swing, so the picture has a band and a beat in it. */
const wav = () => p.evaluate(() => {
  const rate = 22050, seconds = 6, n = rate * seconds; const buf = new ArrayBuffer(44 + n * 2); const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) { const t = i / rate; const s = Math.sin(2 * Math.PI * 440 * t) * 0.6 * (0.5 + 0.5 * Math.sin(t * 4)); v.setInt16(44 + i * 2, s * 32767, true); }
  return Array.from(new Uint8Array(buf));
});
/* How many distinct colours a canvas holds, and whether its colour is mostly
   in one horizontal band (a tone) rather than everywhere (a wash). */
const read = (el) => {
  const g = el.getContext('2d'); if (!g || !el.width || !el.height) return null;
  const px = g.getImageData(0, 0, el.width, el.height).data; const colours = new Set(); const rows = new Float64Array(el.height);
  for (let y = 0; y < el.height; y += 1) for (let x = 0; x < el.width; x += 2) { const i = (y * el.width + x) * 4; if (px[i + 3] === 0) continue; colours.add(((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3)); rows[y] += px[i] + px[i + 1] + px[i + 2]; }
  let hot = 0, total = 0, best = 0; for (let y = 0; y < el.height; y += 1) { total += rows[y]; if (rows[y] > best) best = rows[y]; }
  for (let y = 0; y < el.height; y += 1) if (rows[y] > best * 0.5) hot += 1;
  return { colours: colours.size, hotRows: hot, rows: el.height, lit: total > 0 };
};
try {
  await studio(p); await toRoom(p, 'Video Editor', { folded: true }); await p.waitForTimeout(800);
  /* A clip with a tone on it, like the one `editor.mjs` makes. */
  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240; const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30); const audio = new AudioContext(); const to = audio.createMediaStreamDestination(); const tone = audio.createOscillator(); tone.frequency.value = 440; const level = audio.createGain(); level.gain.value = 0.4; tone.connect(level); level.connect(to); tone.start();
    for (const t of to.stream.getAudioTracks()) stream.addTrack(t);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' }); const parts = []; rec.ondataavailable = (e) => parts.push(e.data); const done = new Promise((r) => { rec.onstop = r; }); rec.start();
    const t0 = performance.now(); while (performance.now() - t0 < 3000) { c.fillStyle = `hsl(${(performance.now() / 10) % 360} 80% 50%)`; c.fillRect(0, 0, 320, 240); await new Promise((r) => requestAnimationFrame(r)); }
    rec.stop(); await done; tone.stop(); await audio.close(); return Array.from(new Uint8Array(await new Blob(parts, { type: 'video/webm' }).arrayBuffer()));
  });
  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles({ name: 'a.webm', mimeType: 'video/webm', buffer: Buffer.from(made) });
  await p.waitForTimeout(2500);
  await p.locator('[data-cutbench="sound"]').click(); await p.waitForTimeout(600);
  const views = p.locator('[data-editorview]');
  check('the video editor’s sound bench offers waveform and spectrogram', (await views.count()) === 2 && (await p.locator('[data-editorview="wave"]').getAttribute('aria-pressed')) === 'true');
  const waveBefore = await p.locator('[data-editorshotlane] canvas[data-wave="wave"]').first().evaluate(read).catch(() => null);
  await p.locator('[data-editorview="spectrum"]').click(); await p.waitForTimeout(2500);
  const lane = p.locator('[data-editorshotlane] canvas[data-wave="spectrum"]').first();
  check('pressing Spectrogram repaints the shot lane as one', (await lane.count()) === 1);
  const got = await lane.evaluate(read).catch(() => null);
  check('  with many colours in it, not one-colour bars', Boolean(got && got.lit && got.colours > 12), JSON.stringify({ before: waveBefore?.colours, after: got?.colours }));
  check('  and the tone paints a band, not a wash', Boolean(got && got.hotRows > 0 && got.hotRows <= Math.max(3, got.rows * 0.45)), JSON.stringify(got));
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  check('  and the choice is kept on this device', (await p.evaluate(() => window.localStorage.getItem('futurebox.editor.view'))) === 'spectrum');
  await p.evaluate(() => window.localStorage.removeItem('futurebox.editor.view'));

  /* ── ProBooth ──────────────────────────────────────────────────────── */
  await p.goto(server.url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await studio(p); await toRoom(p, 'ProBooth', { folded: true }); await p.waitForTimeout(800);
  await p.locator('input[type=file][accept="audio/*"]').first().setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: Buffer.from(await wav()) });
  await p.waitForTimeout(3500); await p.locator('button').filter({ hasText: /Pro DAW Studio/ }).first().click(); await p.waitForTimeout(3000);
  const bviews = p.locator('[data-boothview]');
  check('the booth offers the same two views above its lanes', (await bviews.count()) === 2 && (await p.locator('[data-boothview="wave"]').getAttribute('aria-pressed')) === 'true');
  await p.locator('[data-boothview="spectrum"]').click(); await p.waitForTimeout(2000);
  const blane = p.locator('canvas[data-lanewave="spectrum"]').first();
  check('pressing it repaints every lane as a spectrogram', (await blane.count()) >= 1 && (await p.locator('canvas[data-lanewave="wave"]').count()) === 0);
  const bgot = await blane.evaluate(read).catch(() => null);
  check('  with the tone as a band in it', Boolean(bgot && bgot.lit && bgot.colours > 12 && bgot.hotRows > 0 && bgot.hotRows <= Math.max(3, bgot.rows * 0.45)), JSON.stringify(bgot));
  check('  and the choice is kept on this device', (await p.evaluate(() => window.localStorage.getItem('futurebox.booth.view'))) === 'spectrum');
  await p.locator('[data-boothview="wave"]').click(); await p.waitForTimeout(800);
  check('  and Waveform brings the waves back', (await p.locator('canvas[data-lanewave="wave"]').count()) >= 1);
  check('no page errors', thrown.length === 0, thrown.join(' | '));
} catch (e) { problems.push(`threw: ${String(e).slice(0, 200)}`); console.log(`  NOT  threw: ${String(e).slice(0, 400)}`); }
finally { await browser.close(); server.stop(); }
if (problems.length) { console.log(`check:spectrogramwalk — ${problems.length} problem(s):`); for (const one of problems) console.log(`  · ${one}`); process.exit(1); }
console.log('check:spectrogramwalk — both rooms switch their lanes to a spectrogram that is a picture of the sound, and remember the choice.');

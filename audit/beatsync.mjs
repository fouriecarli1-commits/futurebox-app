/**
 * On the beat: the song's beat heard, marked on the music lane, and every cut
 * landed on it (`lib/beatgrid.ts`, docs/VIDEO-EDITOR-ROADMAP.md gap 1).
 *
 * The owner, 31 October 2026: *"Dit moet al die features hê en ons slim AI
 * intergrations."* Walked with a click track at a known tempo, so the room
 * must say that tempo, draw a mark every half second, and move a 2-second
 * shot's end onto a beat.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3500');
const problems = [];
const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en', width: 1280, height: 900 });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

try {
  await studio(p);
  await toRoom(p, 'Video Editor');
  await unfold(p);
  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const type = ['video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
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
        c.fillStyle = '#245'; c.fillRect(0, 0, 320, 240);
        c.fillStyle = '#fff'; c.fillRect((t / 2) * 280, 100, 40, 40);
        if (t >= 2) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    return Array.from(new Uint8Array(await new Blob(parts, { type }).arrayBuffer()));
  });
  if (!made) throw new Error('this browser cannot record webm');
  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles({
    name: 'a-take.webm', mimeType: 'video/webm', buffer: Buffer.from(made),
  });
  await p.waitForTimeout(2500);
  check('a clip is on the clock', (await p.locator('[data-editorblock]').count()) === 1);
  await p.locator('[data-editorblock]').first().click();
  await p.waitForTimeout(400);
  await p.locator('[data-cutbench="sound"]').click({ timeout: 10000 }).catch(() => undefined);
  await p.waitForTimeout(500);
  /* A click track at 120 BPM, its first beat at 0.25 s, eight seconds. */
  const song = await p.evaluate(() => {
    const rate = 22050;
    const n = rate * 8;
    const bytes = new ArrayBuffer(44 + n * 2);
    const view = new DataView(bytes);
    const put = (at, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
    put(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); put(8, 'WAVE');
    put(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    put(36, 'data'); view.setUint32(40, n * 2, true);
    const wave = new Float32Array(n);
    for (let at = 0.25; at < 8; at += 0.5) {
      const s = Math.round(at * rate);
      for (let j = 0; j < 500 && s + j < n; j += 1) wave[s + j] += 0.9 * Math.exp(-j / 90) * Math.sin(j * 0.8);
    }
    for (let i = 0; i < n; i += 1) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, wave[i])) * 30000), true);
    return Array.from(new Uint8Array(bytes));
  });
  await p.locator('[data-editorunder] input[type="file"]').setInputFiles({ name: 'clicks.wav', mimeType: 'audio/wav', buffer: Buffer.from(song) });
  await p.waitForFunction(() => /BPM|No steady/.test(document.querySelector('[data-editorbeatbpm]')?.textContent ?? ''), null, { timeout: 15000 }).catch(() => undefined);
  const bpm = (await p.locator('[data-editorbeatbpm]').textContent().catch(() => '')) ?? '';
  check('the room hears the song\'s tempo', /(^|\D)(120|60|240)(\.0)? BPM/.test(bpm), bpm);
  if (/(^|\D)(60|240)/.test(bpm)) await p.locator(/60/.test(bpm) ? '[data-editorbeatdouble]' : '[data-editorbeathalf]').click();
  await p.waitForTimeout(300);
  const marks = await p.locator('[data-editorbeatmark]').count();
  check('  and marks the beat on the music lane (4 in a 2-second film)', marks === 4, String(marks));
  const firstAt = await p.evaluate(() => {
    const m = [...document.querySelectorAll('[data-editorbeatmark]')].map((el) => parseFloat(el.style.left));
    return m.length > 1 ? m[0] / (m[1] - m[0]) : -1;
  });
  check('  the first mark where the first beat falls (half a beat in)', Math.abs(firstAt - 0.5) < 0.08, firstAt.toFixed(3));

  /* The clip is 2 s long; its end should go back to the beat at 1.75 s, the nearest one it can reach. */
  const blockWide = async () => (await p.locator('[data-editorblock]').first().boundingBox())?.width ?? 0;
  const before = await blockWide();
  await p.locator('[data-editoronbeat]').click();
  await p.waitForTimeout(800);
  const said = (await p.locator('[data-editorbeatsaid]').textContent().catch(() => '')) ?? '';
  check('one press lands the cuts on the beat, and says so', /onto the beat/.test(said), said);
  const after = await blockWide();
  check('  the shot\'s end moved onto a beat (1.75 s of 2 s)', after > 0 && Math.abs(after / before - 0.875) < 0.05, `${Math.round(before)} → ${Math.round(after)}`);
  await p.locator('[data-editorbeatbox]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: shot('beatsync.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 300)}`);
} finally {
  await b.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:beatsync — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:beatsync — the song\'s tempo is heard, the beat is marked on the music lane, and one press lands the cuts on it.');

/**
 * Every action on a marked piece, pressed, and each one does something.
 *
 * The owner, 28 October 2026: *"Helfte AI magic se functions werk nie."* A
 * piece of the song is marked and each action in the AI magic sheet is
 * pressed on a fresh page, one at a time. Each must change the session (a
 * step that can be put back, a new lane, a voice panel) or say in words why
 * it cannot. The two paid engines are answered here: cleaning returns the
 * piece as it came, so what is tested is this room, not the supplier.
 *
 *   node audit/boothmagic.mjs [port]
 */
import { chromium } from 'playwright';
import { cpSync, rmSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';

const PORT = process.argv[2] || '3478';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

/* A short WAV of a tone, as the cleaning engine would answer. */
function toneWav(seconds = 2, rate = 22050) {
  const n = rate * seconds;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 330 * i) / rate) * 12000), 44 + i * 2);
  return buf;
}

const ACTIONS = [
  { title: /^Smooth the transition/, what: 'smooth' },
  { title: /^Clean it with AI/, what: 'clean' },
  { title: /^Sing it in another voice/, what: 'change' },
  { title: /^Play it as instruments/, what: 'hum' },
  { title: /^Cut this piece out/, what: 'cut' },
  { title: /^Keep only this piece/, what: 'keep' },
  { title: /^Play it twice/, what: 'repeat' },
  { title: /^Fade up across it/, what: 'fadein' },
  { title: /^Fade down across it/, what: 'fadeout' },
];

cpSync('app/proboothprobe/page.probe.tsx', 'app/proboothprobe/page.tsx');
let server;
let b;
try {
  if (!process.env.SKIP_BUILD) execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let i = 0; i < 40; i += 1) { await new Promise((r) => setTimeout(r, 2000)); try { if ((await fetch(`http://localhost:${PORT}/proboothprobe`)).ok) break; } catch { /* not up yet */ } }

  for (const action of ACTIONS.filter((one) => !process.env.ONLY || one.what === process.env.ONLY)) {
    /* A fresh context each time: the booth keeps its session and its marker
       on the device, and the last action's leftovers are not this one's. */
    b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const room = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await room.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    await p.addInitScript(() => { try { localStorage.setItem('futurebox.lang.v1', 'en'); } catch { /* */ } });
    await p.route('**/api/voice/clean', (route) => route.fulfill({ status: 200, contentType: 'audio/wav', body: toneWav() }));
    /* The booth's own tools charge first (the owner, 28 October 2026:
       "Niks 1 credit nie. Altyd 2"); answered here and counted. */
    let charged = 0;
    await p.route('**/api/boothtool', (route) => { charged += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, credits: 2 }) }); });
    await p.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(2000);

    const lane = p.locator('[data-lanename]').first();
    if ((await lane.getAttribute('aria-pressed')) !== 'true') { await lane.click(); await p.waitForTimeout(250); }
    await p.locator('[data-mark]').first().click();
    await p.waitForTimeout(250);
    const ruler = await p.locator('[data-axis]').first().boundingBox();
    const clip = await p.locator('[aria-label*="Drag this sound"]').first().boundingBox();
    const x = (part) => (clip ? clip.x + clip.width * part : ruler.x + ruler.width * part);
    await p.mouse.move(x(0.3), ruler.y + ruler.height / 2);
    await p.mouse.down();
    await p.mouse.move(x(0.6), ruler.y + ruler.height / 2, { steps: 12 });
    await p.mouse.up();
    await p.waitForTimeout(350);
    if (process.env.SHOT) await p.screenshot({ path: `${process.env.SHOT}/magic-${action.what}.png` });
    await p.locator('[data-regiontools]').first().click();
    await p.waitForTimeout(400);

    const lanesBefore = await p.locator('[data-lanename]').count();
    const button = p.locator('button').filter({ hasText: action.title }).first();
    if (!(await button.count())) { check(`${action.what}: is in the AI magic sheet`, false, 'not found'); await room.close(); await b.close(); b = null; continue; }
    await button.click();
    await p.waitForTimeout(action.what === 'clean' || action.what === 'hum' ? 2500 : 900);

    const undo = p.locator('[data-undo]').first();
    const undoSays = (await undo.getAttribute('title').catch(() => '')) ?? '';
    const undoOn = await undo.isEnabled().catch(() => false);
    const lanesAfter = await p.locator('[data-lanename]').count();
    const text = await p.locator('body').innerText();
    const panel = action.what === 'change' && /voice model number|Choose a voice|another voice/i.test(text);
    const said = /Choose an instrument first|Nothing could be read|Nothing was heard/.test(text);
    const did = undoOn || lanesAfter !== lanesBefore || panel || said;
    check(`${action.what}: does something, or says why not`, did,
      `undo "${undoSays}" ${undoOn}, lanes ${lanesBefore}→${lanesAfter}`);
    /* The hum is charged only once notes were heard; "Nothing was heard" is said for free. */
    if (action.what === 'smooth' || (action.what === 'hum' && !said)) {
      check(`  ${action.what}: is charged before it is done`, charged === 1, String(charged));
    }
    check(`  ${action.what}: no page errors`, errors.length === 0, errors.join(' | '));
    await room.close();
    await b.close();
    b = null;
  }
} finally {
  if (b) await b.close();
  rmSync('app/proboothprobe/page.tsx', { force: true });
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* gone */ } }
}

if (problems.length) {
  console.error(`\naudit/boothmagic — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/boothmagic — every action on a marked piece does something, or says why not.');

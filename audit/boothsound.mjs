/**
 * The booth makes sound, and says why when it does not.
 *
 * The owner, 28 October 2026: *"Geen geen geen klank in die probooth nie."*
 * Play is pressed on a test song and the sound leaving for the speakers is
 * measured; then every lane is muted and the booth must say so in words
 * rather than play silence.
 *
 *   node audit/boothsound.mjs [port]
 */
import { chromium } from 'playwright';
import { cpSync, rmSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
const PORT = process.argv[2] || '3477';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
cpSync('app/proboothprobe/page.probe.tsx', 'app/proboothprobe/page.tsx');
let server;
try {
  if (!process.env.SKIP_BUILD) execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let i = 0; i < 40; i += 1) { await new Promise((r) => setTimeout(r, 2000)); try { if ((await fetch(`http://localhost:${PORT}/proboothprobe`)).ok) break; } catch {} }
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await p.addInitScript(() => {
    window.__starts = 0; window.__gains = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) { window.__starts += 1; return start.apply(this, a); };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...rest) {
      if (dest instanceof AudioDestinationNode) {
        const ctx = dest.context;
        if (!ctx.__ear) { ctx.__ear = ctx.createAnalyser(); window.__ear = ctx.__ear; window.__ctx = ctx; }
        connect.call(this, ctx.__ear);
        if (this instanceof GainNode) window.__gains.push(this.gain.value);
      }
      return connect.call(this, dest, ...rest);
    };
  });
  await p.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const play = p.locator('button[aria-label="Play"]').first();
  await play.click();
  await p.waitForTimeout(1500);
  const heard = await p.evaluate(() => {
    const ear = window.__ear; if (!ear) return { ear: false };
    const data = new Float32Array(ear.fftSize); ear.getFloatTimeDomainData(data);
    let sum = 0; for (const v of data) sum += v * v;
    return { ear: true, rms: Math.sqrt(sum / data.length), state: window.__ctx.state, starts: window.__starts };
  });
  check('Play sends the song to the speakers', heard.ear && heard.rms > 0.01 && heard.state === 'running', JSON.stringify(heard));
  check('  and the booth does not cry wolf while it plays', !(await p.locator('body').innerText()).includes('nothing is reaching your speakers'));
  await p.locator('button[aria-label="Pause"]').first().click().catch(() => {});
  await p.waitForTimeout(400);

  /* Every lane muted: the booth must say so. */
  await p.locator('button').filter({ hasText: /^M$/ }).first().click();
  await p.waitForTimeout(300);
  await play.click();
  await p.waitForTimeout(1800);
  const said = await p.locator('body').innerText();
  check('with every lane muted, it says why there is no sound', /Every lane is muted/.test(said), said.slice(0, 200));
  check('no page errors', errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  await b.close();
} finally {
  rmSync('app/proboothprobe/page.tsx', { force: true });
  if (server) try { process.kill(-server.pid); } catch {}
}

if (problems.length) {
  console.error(`\naudit/boothsound — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/boothsound — Play is heard, and silence says why.');

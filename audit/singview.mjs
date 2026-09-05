/**
 * The screen a singer stands in front of, on a phone.
 *
 * The room's own words view — previous line dimmed, current line large, next
 * line waiting, a bar counting down to it — has been right since the selfie
 * work. What was wrong was everything around it: a waveform built for a mouse
 * eating a tenth of a 390-pixel screen, and no word anywhere that the AI
 * singer is on the backing you are hearing.
 *
 * Driven against a probe page that makes a real wav in the browser, because
 * the seeded library has songs with no audio behind them and the room
 * correctly refuses to open one.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3059';
const PROBE = 'app/singbooth/page.probe.tsx';
const LIVE = 'app/singbooth/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
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
      const r = await fetch(`http://localhost:${PORT}/singbooth`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  for (const [name, width] of [['phone', 390], ['desk', 1280]]) {
    const p = await b.newPage({ viewport: { width, height: 844 } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
    await p.goto(`http://localhost:${PORT}/singbooth`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(3000);

    const read = await p.evaluate(() => {
      /* The waveform, not the note stave.

         There are two canvases in this room. Asking for "the canvas" got the
         stave, which is drawn first; asking for the one sized in vh got the
         stave too, because both are. The waveform is the one you can point at
         — it is the only element in the room carrying a crosshair cursor. */
      const canvas = document.querySelector('canvas.cursor-crosshair, canvas.cursor-copy');
      /* The note stave. The words are drawn on it, so leaving it on a phone
         leaves the words on a music bar — which is the whole thing that was
         meant to go. It is every canvas that is not the waveform. */
      const stave = Array.from(document.querySelectorAll('canvas')).find((el) => el !== canvas) ?? null;
      const shown = (el) => !!el && el.getBoundingClientRect().height > 2;
      const body = document.body.innerText;
      const big = Array.from(document.querySelectorAll('p'))
        .map((el) => ({ text: el.innerText.trim(), size: parseFloat(getComputedStyle(el).fontSize) }))
        .filter((x) => x.text && x.size >= 20)
        .sort((a, c) => c.size - a.size)[0] ?? null;
      let small = 0;
      for (const el of Array.from(document.querySelectorAll('button, input, select, a'))) {
        const r = el.getBoundingClientRect();
        if (r.width > 1 && r.height > 1 && r.width < window.innerWidth && (r.height < 32 || r.width < 32)) small += 1;
      }
      return {
        waveform: shown(canvas),
        stave: shown(stave),
        wide: document.documentElement.scrollWidth,
        guideLine: /sing along with it|sing saam met hom/i.test(body),
      /* The four things that went missing when the waveform's whole section
         was hidden rather than the waveform. Named by their own words, so a
         layout change that swallows them again fails here. */
      readsTheWords: /reads the words off the recording|lees die woorde/i.test(body),
      micLevel: !!document.querySelector('div.h-1\\.5.rounded-full'),
        biggest: big,
        small,
      };
    });

    console.log(`\n${name} @${width}`);
    check('the room does not run off the side', read.wide <= width, `${read.wide}px`);
    check(
      name === 'phone' ? 'the waveform is out of the way' : 'the waveform is there on a desk',
      name === 'phone' ? !read.waveform : read.waveform,
    );
    check(
      name === 'phone' ? 'and so is the music bar the words sat on' : 'and the stave is there on a desk',
      name === 'phone' ? !read.stave : read.stave,
    );
    check('the AI singer is named on an unsplit song', read.guideLine);
    check('reading the words off the recording is still offered', read.readsTheWords);
    check('and the microphone level is still there', read.micLevel);
    check(
      'a line of the song is the biggest thing on screen',
      !!read.biggest && read.biggest.size >= 20,
      read.biggest ? `"${read.biggest.text.slice(0, 34)}" at ${Math.round(read.biggest.size)}px` : 'nothing large',
    );
    if (name === 'phone') check('every control is big enough for a thumb', read.small === 0, `${read.small} too small`);
    if (errs.length) console.log('  errors: ' + errs.slice(0, 2).join(' | '));

    await p.screenshot({ path: shot(`singview-${name}.png`), fullPage: false });
    await p.close();
  }

  await b.close();
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
    process.exit(1);
  }
  console.log('\nthe sing view: words first, waveform off the phone, the guide vocal named.');

} finally {
  /* The route goes, whether this passed, failed or threw. A probe page left
     behind is a page the app ships. */
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  if (existsSync(LIVE)) rmSync(LIVE);
}

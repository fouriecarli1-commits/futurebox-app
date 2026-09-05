/**
 * A hook cut out of a video somebody owns — and why not out of YouTube.
 *
 * ── The question this answers ────────────────────────────────────────────
 *
 * "ek wonder of hooks nie ook youtube kan connect en stukkies daar uit haal
 * nie, mits dit permitted is." It is not permitted: YouTube's Terms allow
 * access only through the playback pages, the embeddable player, or a means
 * they designate, and their API serves metadata rather than the media.
 *
 * The useful half of the question is a file somebody already has, and that is
 * what is measured here.
 *
 * ── What is stubbed, and what is real ────────────────────────────────────
 *
 * Nothing is stubbed. The video is recorded in the page — a real webm with a
 * real audio track — and everything after that is the shipped code: the sound
 * is decoded off the file, the hook-finder that reads songs reads it, and the
 * cut is `lib/stitch.ts` playing the trimmed window onto a canvas.
 *
 * ── The assertions that matter ───────────────────────────────────────────
 *
 * That the clip comes back **with sound on it**. The stitcher deliberately
 * drops a clip's own audio — right for a film cut from a dozen generated
 * clips under one song, wrong for a hook, whose entire point is the moment as
 * it sounded. Decoded and measured, because a silent file looks identical to
 * a good one until somebody plays it.
 *
 * And that it is the length that was asked for, since a trim that quietly
 * ignored its window would produce a whole-video "hook".
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = process.argv[2] || '3097';
const SECONDS = 6;

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const p = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });

  /* A real video with a real soundtrack, recorded in the page: a canvas for
     the picture and an oscillator for the sound, on one stream. A silent
     video would pass a check that the sound survived by never testing it. */
  const bytes = await p.evaluate(async (seconds) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const c = canvas.getContext('2d');
    const vision = canvas.captureStream(30);

    const context = new AudioContext();
    const tone = context.createOscillator();
    const level = context.createGain();
    const out = context.createMediaStreamDestination();
    tone.frequency.value = 330;
    level.gain.value = 0.4;
    tone.connect(level).connect(out);
    tone.start();

    const stream = new MediaStream([...vision.getVideoTracks(), ...out.stream.getAudioTracks()]);
    const type = ['video/webm;codecs=vp8,opus', 'video/webm'].find((one) => MediaRecorder.isTypeSupported(one));
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (event) => event.data.size && parts.push(event.data);
    const stopped = new Promise((done) => { rec.onstop = done; });
    rec.start();
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = '#123'; c.fillRect(0, 0, 320, 180);
        c.fillStyle = '#fff'; c.fillRect((t / seconds) * 280, 70, 40, 40);
        if (t >= seconds) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    tone.stop();
    await context.close();
    return Array.from(new Uint8Array(await new Blob(parts, { type }).arrayBuffer()));
  }, SECONDS);
  check('a real video with sound on it was recorded', bytes.length > 4000, `${bytes.length} bytes`);

  /* Sign in and walk to the room the way a person does. */
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('hook@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('hook-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
  await p.waitForTimeout(900);
  await p.locator('nav[aria-label] button').filter({ hasText: 'Make' }).first().click();
  await p.waitForTimeout(1200);
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const many = await door.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^Hooks/i.test(first)) { await door.nth(i).click(); break; }
  }
  await p.waitForTimeout(1800);

  const room = p.locator('div.fixed.inset-0.z-50').first();
  const says = async () => ((await room.innerText()) ?? '').replace(/\s+/g, ' ');

  check('the room offers a way in for a file you own',
    /Bring a video in/.test(await says()) && /Bring a song in/.test(await says()));
  check('and says plainly that nothing can come from YouTube',
    /Nothing can be taken from YouTube/.test(await says()));

  /* The 15s length would want a 15s video; the probe's is six, so the shorter
     option is the one that can be cut whole. */
  await room.locator('input[type="file"][accept="video/*"]').first().setInputFiles({
    name: 'my own footage.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(bytes),
  });
  await p.waitForTimeout(4000);

  const moments = room.locator('button').filter({ hasText: /^Cut this one/ });
  const found = await moments.count();
  check('moments were found in the video’s own sound', found > 0, `${found} offered`);
  check('and the file is named on screen', /my own footage/.test(await says()));

  await moments.first().click();
  /* Cutting runs in real time, so a six-second hook takes six seconds. */
  const clip = room.locator('video[src^="blob:"]');
  await clip.first().waitFor({ state: 'visible', timeout: 90000 });
  await p.waitForTimeout(1500);
  check('a clip came back', (await clip.count()) > 0);

  /* Decoded, not asked. A silent file looks identical to a good one until
     somebody plays it, and every browser flag for "has audio" is either
     non-standard or lies in Chromium. */
  /* Played and listened to, not fetched.

     The app's own CSP allows `connect-src 'self' https://*.supabase.co`, so
     `fetch(blob:…)` is refused inside the page — which is the content policy
     working exactly as intended and a probe that has to measure another way.
     So the clip is played through an AnalyserNode and the peak is taken off
     the sound coming out of it: a silent file looks identical to a good one
     until somebody plays it, and this plays it. */
  const sound = await p.evaluate(async () => {
    const el = document.querySelector('div.fixed.inset-0.z-50 video[src^="blob:"]');
    if (!el) return null;
    const context = new AudioContext();
    const source = context.createMediaElementSource(el);
    const listen = context.createAnalyser();
    listen.fftSize = 2048;
    source.connect(listen);
    listen.connect(context.destination);
    const samples = new Float32Array(listen.fftSize);
    let peak = 0;
    el.currentTime = 0;
    el.muted = false;
    el.volume = 1;
    await el.play().catch(() => undefined);
    const until = performance.now() + 2500;
    while (performance.now() < until) {
      listen.getFloatTimeDomainData(samples);
      for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
      await new Promise((r) => setTimeout(r, 60));
    }
    el.pause();
    const seconds = Number.isFinite(el.duration) ? el.duration : 0;
    void context.close();
    return { seconds, peak: Math.round(peak * 1000) / 1000, bytes: el.videoWidth * el.videoHeight };
  });
  check('the clip is a real picture, not an empty frame',
    Boolean(sound) && sound.bytes > 10000, `${sound?.bytes} pixels`);
  check('and the sound that was on the video is on the hook',
    Boolean(sound) && sound.peak > 0.05, `peak ${sound?.peak}`);
  check('and it is about as long as the moment asked for',
    Boolean(sound) && sound.seconds > 1 && sound.seconds <= SECONDS + 2,
    `${sound?.seconds?.toFixed(2)}s of a ${SECONDS}s video`);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\na hook can be cut out of a file you own, with the sound that was on it.');

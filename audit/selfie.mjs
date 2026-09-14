/**
 * Actually film a take, in a browser, and watch the light go out.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `app/singcheck/page.probe.tsx` has said since the selfie work that the
 * camera and the recorder are the parts worth exercising in a real browser,
 * because no amount of reading the code proves the tracks were released. It
 * named a probe that was never written. So nothing ran it, and the sentence
 * was a promise rather than a test — the same shape as every other bug found
 * today: the thing was built and the wiring that makes it reachable was not.
 *
 * ── What it proves that a source check cannot ────────────────────────────
 *
 * `check:singmix` asserts the rule and the shape of the code. It cannot
 * assert that a browser hands back a file, that the graph is in the path, or
 * that a camera stops. This does, by wrapping the two browser APIs involved
 * before the page loads and then reading what they were actually given:
 *
 *   the recorded stream carried one picture and one sound, never two sounds
 *     — the camera stream has its own microphone track and the graph carries
 *       that same microphone again, and both on one file doubles every word
 *       she sings. Silent until somebody plays the take back.
 *
 *   the sound was the graph's and not the camera's, by track id
 *     — the only way to tell from outside that the song is really on the
 *       file. Both are audio tracks; only the id says which one it is.
 *
 *   every track ended when the camera was switched off
 *     — the light. The worst bug this feature could have.
 *
 * Chromium's fake devices make it runnable anywhere: a rolling pattern and a
 * tone, granted without a prompt. `singview` already launches this way.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3072';
const PROBE = 'app/singcheck/page.probe.tsx';
const LIVE = 'app/singcheck/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/* Wrapped before anything on the page runs, so the component's own calls go
   through it. Observing the real APIs rather than replacing them: the page is
   doing exactly what it does in front of a person. */
const WATCH = () => {
  window.__seen = { handed: [], recorded: [] };

  const media = navigator.mediaDevices;
  const realGet = media.getUserMedia.bind(media);
  media.getUserMedia = async (wanted) => {
    const got = await realGet(wanted);
    window.__seen.handed.push(got);
    return got;
  };

  const RealRecorder = window.MediaRecorder;
  class Watched extends RealRecorder {
    constructor(source, options) {
      super(source, options);
      window.__seen.recorded.push(
        source.getTracks().map((one) => ({ kind: one.kind, id: one.id })),
      );
      /* The recorder's own state, kept where the probe can read it.
 
         A Pause button that changes to "Carry on" and does nothing to the
         recorder looks exactly like one that works — this is the difference,
         and it is the only thing that can tell them apart from outside. */
      window.__rec = this;
      const mark = () => { window.__recState = this.state; };
      mark();
      for (const name of ['start', 'pause', 'resume', 'stop']) {
        const was = this[name].bind(this);
        this[name] = (...args) => { const out = was(...args); mark(); return out; };
      }
    }
  }
  Watched.isTypeSupported = (type) => RealRecorder.isTypeSupported(type);
  window.MediaRecorder = Watched;
};

/* `serve()` and not a spawn of its own. It kills the whole process group —
   `next start` forks, and killing only the parent leaves the worker holding
   the port — and it registers that on process exit, so a probe that throws on
   its first assertion still gives the port back. The inline version this was
   copied from does neither, and two deliberately-failed runs of this probe
   left servers behind that answered the next run with the build from before. */
let server = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);

  const browser = await chromium.launch(
    launchOptions({
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    }),
  );

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.addInitScript(WATCH);
  await page.goto(`${server.url}/singcheck`, { waitUntil: 'networkidle' });
  /* `attached`, not visible. The words screen portals into document.body —
     it has to, because a fixed overlay inside a transformed ancestor stops
     being full screen — so the wrapper this waits on is correctly empty. */
  await page.waitForSelector('#mounted[data-ready="yes"]', { state: 'attached' });

  /* Can she read the line she is meant to sing?
     
     The one property this screen exists for, and the one nothing measured.
     `text-white` is remapped onto `--fb-ink` — near-black, the ink colour for
     a light page — so over the scrim the sung line measured a contrast ratio
     of 1.02 and was invisible, while the lines she is *not* singing use a
     remapped `zinc` that lands light and measured 8.79. The screen therefore
     looked like it was working, with only the middle line missing.
     
     Measured rather than eyeballed: on a screenshot a 1.02 on near-black is a
     smudge that reads as a design choice. */
  const readable = await page.evaluate(() => {
    const lum = (colour) => {
      const [r, g, b] = colour.match(/\d+/g).slice(0, 3).map(Number).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const behind = (el) => {
      let at = el;
      while (at) {
        const bg = getComputedStyle(at).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        at = at.parentElement;
      }
      return 'rgb(255, 255, 255)';
    };
    const ratio = (el) => {
      const a = lum(getComputedStyle(el).color);
      const b = lum(behind(el));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const lines = Array.from(document.querySelectorAll('p')).filter((el) => el.innerText.trim());
    const sung = lines
      .map((el) => ({ el, size: parseFloat(getComputedStyle(el).fontSize) }))
      .sort((a, b) => b.size - a.size)[0];
    if (!sung) return null;
    return {
      text: sung.el.innerText.trim(),
      ratio: Math.round(ratio(sung.el) * 100) / 100,
      others: lines.filter((el) => el !== sung.el).map((el) => Math.round(ratio(el) * 100) / 100),
    };
  });

  check(
    'the line being sung can actually be read',
    Boolean(readable) && readable.ratio >= 4.5,
    readable ? `contrast ${readable.ratio} on "${readable.text.slice(0, 28)}"` : 'no line found',
  );
  check(
    'and it is the most readable thing on the screen, not the least',
    Boolean(readable) && readable.others.every((one) => one <= readable.ratio),
    readable ? `sung ${readable.ratio} against ${readable.others.join(', ')}` : 'no line found',
  );

  /* ── And can she read the CONTROLS, which is the half nobody measured ──
   
     The block above has measured the sung line since #76 and stopped there.
     It looks at `p` elements, so every button on the screen was outside it —
     and the buttons were still written in the palette, which is the exact
     thing #76 proved you cannot do on this screen.
   
     `bg-scrim` is dark in every theme by design. `zinc` is remapped onto the
     surface family, and a light surface family inverts the ramp, so the low
     zinc numbers — the dark-theme spelling of "bright label" — come out
     near-black. On 14 September 2026 Carli photographed both buttons of the
     no-words screen: boxed, green-washed, pressable, and their words almost
     gone.
   
     Composited, not just read. `getComputedStyle().backgroundColor` on these
     buttons is `rgb(… / 0.09)` — the wash `globals.css` paints on anything
     bordered — and taking that colour at face value measures a solid green
     nothing is painted in. Each layer is blended onto the one behind it up
     the tree, which is what an eye sees. */
  const CONTRAST = () => {
    const chan = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const parse = (colour) => {
      const bits = (colour.match(/[\d.]+/g) || []).map(Number);
      return { r: bits[0] ?? 0, g: bits[1] ?? 0, b: bits[2] ?? 0, a: bits[3] ?? 1 };
    };
    const over = (top, under) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    const lum = (c) => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
    /* Every background from the element up to the root, blended bottom-up. */
    const behind = (el) => {
      const stack = [];
      for (let at = el; at; at = at.parentElement) {
        const c = parse(getComputedStyle(at).backgroundColor);
        if (c.a > 0) stack.push(c);
      }
      let out = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = stack.length - 1; i >= 0; i -= 1) out = over(stack[i], out);
      return out;
    };
    const worst = [];
    for (const el of document.querySelectorAll('button, p, span')) {
      const said = (el.innerText || '').trim();
      /* Its own words, not its children's, so a button is not counted twice
         through the span inside it. */
      if (!said || el.getBoundingClientRect().width === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.opacity === '0') continue;
      const ink = parse(style.color);
      const bg = behind(el);
      const a = lum(over(ink, bg));
      const b = lum(bg);
      worst.push({
        text: said.replace(/\s+/g, ' ').slice(0, 34),
        ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100,
      });
    }
    return worst.sort((one, two) => one.ratio - two.ratio);
  };

  const controls = await page.evaluate(CONTRAST);
  const faint = controls.filter((one) => one.ratio < 4.5);
  check(
    'every word on the screen clears AA against what is behind it',
    faint.length === 0,
    faint.length
      ? faint.map((one) => `${one.ratio} on "${one.text}"`).join(' · ')
      : `${controls.length} measured, worst ${controls[0]?.ratio}`,
  );

  /* The screen she actually photographed: a song with no words written down,
     which is its own panel with its own button and is not reachable from the
     one above. */
  await page.goto(`${server.url}/singcheck?words=none`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mounted[data-ready="yes"]', { state: 'attached' });
  await page.getByRole('button', { name: /write the words out/ }).waitFor();
  const bare = (await page.evaluate(CONTRAST)).filter((one) => one.ratio < 4.5);
  check(
    'including on a song with no words, where the two buttons are all there is',
    bare.length === 0,
    bare.length ? bare.map((one) => `${one.ratio} on "${one.text}"`).join(' · ') : 'all clear',
  );
  await page.screenshot({ path: shot('selfie-nowords.png'), fullPage: false });
  await page.goto(`${server.url}/singcheck`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#mounted[data-ready="yes"]', { state: 'attached' });

  const film = page.getByRole('button', { name: 'Film yourself' });
  await film.click();

  const record = page.getByRole('button', { name: 'Record', exact: true });
  await record.waitFor();

  /* The question stands in front of the button. Until it is answered nobody
     — the person or this probe — knows what would end up on the file. */
  check('the record button waits until the question is answered', await record.isDisabled());

  const gotStream = await page.evaluate(() => window.__seen.handed.length);
  check('the camera came on', gotStream === 1, `${gotStream} stream(s) handed out`);

  await page.getByRole('button', { name: 'I have headphones in' }).click();
  check('and answering it lets her record', await record.isEnabled());

  await page.screenshot({ path: shot('selfie-ready.png'), fullPage: false });

  await record.click();
  await page.waitForTimeout(1200);

  /* ── A take can be held, and cannot be walked away from ──────────────
 
     Carli, 13 September 2026, on the channel's "Film yourself to it":
     "1. Jy kan nie pause nie. 2. Jy kan na 'n volgende liedjie scroll
     terwyl jy film. Dit recording van jouself moet vas wees binne in een
     liedjie."
 
     Three things have to hold together or the take comes back out of step —
     the recorder, the song on the mix's own audio graph, and the shared
     element the words are read from — so the recorder's own state is what
     is asked here rather than the button's label. */
  const hold = page.getByRole('button', { name: 'Pause', exact: true });
  check('a take can be paused', await hold.isVisible().catch(() => false));
  if (await hold.isVisible().catch(() => false)) {
    await hold.click();
    await page.waitForTimeout(400);
    check('  and the recorder really is holding, not just the button',
      (await page.evaluate(() => window.__recState ?? null)) === 'paused',
      String(await page.evaluate(() => window.__recState ?? 'unknown')));
    const on = page.getByRole('button', { name: 'Carry on', exact: true });
    check('  and it can carry on', await on.isVisible().catch(() => false));
    await on.click();
    await page.waitForTimeout(400);
    check('  which puts the recorder back to work',
      (await page.evaluate(() => window.__recState ?? null)) === 'recording',
      String(await page.evaluate(() => window.__recState ?? 'unknown')));
  }

  /* Locked to this song while it runs: no gesture can reach what is behind,
     and the way out stops the take rather than leaving with it half made. */
  const locked = await page.evaluate(() => {
    const o = document.querySelector('div.fixed.inset-0.z-\\[100\\]');
    if (!o) return null;
    const style = getComputedStyle(o);
    return { touch: style.touchAction, chain: style.overscrollBehaviorY };
  });
  check('nothing can be panned past while a take runs',
    locked?.touch === 'none' && locked?.chain === 'contain',
    JSON.stringify(locked));

  const stillThere = await page.evaluate(() => {
    const o = document.querySelector('div.fixed.inset-0.z-\\[100\\]');
    o?.querySelector('button')?.click();
    return !!document.querySelector('div.fixed.inset-0.z-\\[100\\]');
  });
  check('and the way out stops the take rather than leaving mid-film', stillThere);
  await page.waitForTimeout(400);

  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  if (await stop.isVisible().catch(() => false)) await stop.click();

  /* The take came back as a file. `Save the take` only draws when the
     recorder handed a blob to `onstop`. */
  const saved = page.getByRole('button', { name: 'Save the take' });
  await saved.waitFor({ timeout: 5000 }).catch(() => undefined);
  check('a take comes back as a file', await saved.isVisible().catch(() => false));

  const what = await page.evaluate(() => {
    const [first] = window.__seen.recorded;
    const camera = window.__seen.handed[0];
    return {
      recorded: first ?? null,
      cameraAudio: camera ? camera.getAudioTracks().map((one) => one.id) : [],
      cameraVideo: camera ? camera.getVideoTracks().map((one) => one.id) : [],
    };
  });

  const kinds = (what.recorded ?? []).map((one) => one.kind).sort().join(',');
  check('the recorder was given one picture and one sound', kinds === 'audio,video', `got ${kinds || 'nothing'}`);

  const sound = (what.recorded ?? []).filter((one) => one.kind === 'audio');
  check(
    'the microphone is not on the take a second time',
    sound.length === 1,
    `${sound.length} audio track(s) on the file`,
  );
  check(
    'and the sound is the mix, not the bare microphone',
    sound.length === 1 && !what.cameraAudio.includes(sound[0].id),
    sound.length !== 1
      ? `${sound.length} audio tracks, so there is no single answer`
      : what.cameraAudio.includes(sound[0].id)
        ? 'it is the camera’s own track, so the song never reached the file'
        : 'a track the camera never handed out',
  );

  const picture = (what.recorded ?? []).filter((one) => one.kind === 'video');
  check(
    'while the picture is the camera itself',
    picture.length === 1 && what.cameraVideo.includes(picture[0].id),
    `${picture.length} video track(s), from the camera`,
  );

  /* And the light. Every track the browser ever handed this page has to be
     stopped when the camera is switched off — which is also what closing the
     screen does. */
  await page.getByRole('button', { name: 'Camera off' }).click();
  await page.waitForTimeout(400);
  const alive = await page.evaluate(() =>
    window.__seen.handed
      .flatMap((one) => one.getTracks())
      .filter((one) => one.readyState !== 'ended')
      .map((one) => one.kind),
  );
  check(
    'the camera light goes out',
    alive.length === 0,
    alive.length ? `still live: ${alive.join(', ')}` : 'every track ended',
  );

  if (errs.length) console.log('  errors: ' + errs.slice(0, 2).join(' | '));
  await page.screenshot({ path: shot('selfie-done.png'), fullPage: false });
  await page.close();
  await browser.close();

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
    /* `exitCode`, not `exit`. `process.exit` inside a try block ends the
       process immediately and the finally below never runs — so a *failing*
       probe would leave its `next start` holding the port and its probe page
       sitting in `app/`, which is the one thing that finally exists to
       prevent. Found by failing this probe on purpose twice: the second run
       could not mount, because the first run's server was still answering on
       the port with the build from before. */
    process.exitCode = 1;
  } else {
    console.log('\nthe selfie take: a real file, the song on it once, and the camera off after.');
  }

} finally {
  /* The route goes, whether this passed, failed or threw. A probe page left
     behind is a page the app ships. */
  server?.stop();
  if (existsSync(LIVE)) rmSync(LIVE);
}

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

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();

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

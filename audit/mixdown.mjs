/**
 * The mix, as audio rather than as arithmetic.
 *
 * `check:mix` pins what `trimFor` answers. It cannot answer the question that
 * decides whether any of it is true: does the file that comes out actually
 * have those properties. A pan that is applied to the wrong node, a trim
 * applied to one channel, a render that differs from the last one — none of
 * those change a number in a unit test and all of them change the file
 * somebody posts.
 *
 * So this runs the real `mixSession` in a real browser, on tones whose numbers
 * can be worked out by hand, and reads the samples back.
 *
 * It owns the whole loop, as `videocover.mjs` does: copies the probe page in,
 * builds, measures, and removes it again — whether it passed, failed or threw.
 * The app never ships a route that exists for a test.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions } from './where.mjs';

const PORT = process.argv[2] || '3051';
const PROBE = 'app/mixprobe/page.probe.tsx';
const LIVE = 'app/mixprobe/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
const near = (a, b, slack) => Math.abs(a - b) <= slack;

let server = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch(`http://localhost:${PORT}/mixprobe`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  const b = await chromium.launch(launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${PORT}/mixprobe`, { waitUntil: 'networkidle' });
  await p.locator('[data-probe="run"]').click();
  await p.locator('[data-probe="out"]').filter({ hasText: '{' }).first().waitFor({ timeout: 60000 });
  const said = JSON.parse(await p.locator('[data-probe="out"]').innerText());
  console.log(JSON.stringify(said));

  /* ── Pan ──────────────────────────────────────────────────────────────
     Hard right must be silent on the left. A pan wired to the wrong node
     still makes sound, which is why this is measured per channel rather
     than looked at. */
  check('hard right is silent on the left', said.rightChannelLeft < 0.01,
    String(said.rightChannelLeft));
  check('and present on the right', said.rightChannelRight > 0.4,
    String(said.rightChannelRight));
  check('centre reaches both channels equally',
    near(said.centreLeft, said.centreRight, 0.02) && said.centreLeft > 0.3,
    `${said.centreLeft} / ${said.centreRight}`);

  /* ── The pan law, pinned rather than assumed ──────────────────────────
     A mono lane in the centre comes out at 1/√2 in each channel, not at
     full level in both. That is equal-power panning and it is what every
     desk does: the two channels together carry the power the mono lane had,
     so moving a lane across the stereo field does not change how loud it
     is. The alternative — full level in both — is 3 dB louder in the middle
     than at the sides, and everything drifts quieter as it is spread out.
     Swapping the panner for a linear one would change every mix in the app
     by 3 dB and nothing else here would notice, so it is asserted. */
  check('a centred mono lane follows the equal-power law, not a linear one',
    near(said.centreLeft, 0.5 / Math.SQRT2, 0.005),
    `${said.centreLeft}, expected ${0.5 / Math.SQRT2}`);
  check('and hard right is the full level, which is what makes it equal power',
    near(said.rightChannelRight, 0.5, 0.005), String(said.rightChannelRight));

  // ── A lane's own level ─────────────────────────────────────────────
  check('a lane set to a quarter comes out at a quarter of its own level',
    near(said.quietPeak, (0.8 * 0.25) / Math.SQRT2, 0.005),
    `${said.quietPeak}, expected ${(0.8 * 0.25) / Math.SQRT2}`);

  /* ── Mute ─────────────────────────────────────────────────────────────
     Measured against the single-lane render rather than against a number:
     the assertion is that the second tone contributed nothing at all, and
     "identical to the mix without it" says that exactly. */
  check('a muted lane contributes nothing to the file',
    near(said.mutedPeak, said.centreLeft, 0.005),
    `${said.mutedPeak} vs ${said.centreLeft} — the muted tone got in`);

  /* ── The ceiling, on real samples ─────────────────────────────────────
     Three tones at 0.9 sum well past full scale. What comes out must be
     under the ceiling, and the promise is exact rather than approximate,
     which is the whole reason the master is a multiplication instead of a
     limiter. */
  /* A lane with an amp on it plays the amped audio, not the recording.

     Baking rather than wiring is the right call — inference is not an audio
     node — but it splits one lane into two buffers, and a render that reads
     the wrong one is a fault nobody hears until the file is out. The
     recording peaks at 0.8 and the capture at 0.2; after the equal-power pan
     each lands at 1/√2 of that. */
  check('an amped lane renders the amp, not the recording',
    near(said.ampedPeak, 0.2 / Math.SQRT2, 0.02),
    `amped ${said.ampedPeak?.toFixed(4)}, bare ${said.barePeak?.toFixed(4)}`);
  check('and taking the amp off gives the recording back',
    near(said.barePeak, 0.8 / Math.SQRT2, 0.02),
    `bare ${said.barePeak?.toFixed(4)}`);

  check('three loud lanes really do sum past full scale', said.rawPeak > 1,
    String(said.rawPeak));
  const ceiling = 10 ** (-1 / 20);
  check('and the rendered file comes out under the ceiling',
    said.finalPeak <= ceiling + 1e-6, `${said.finalPeak} vs ${ceiling}`);
  check('but not needlessly quieter than it', said.finalPeak > ceiling - 0.02,
    String(said.finalPeak));

  // ── Loudness matching ──────────────────────────────────────────────
  check('a quiet mix asked to match loudness reaches the target',
    near(said.matchedRms, 0.1995, 0.01), String(said.matchedRms));

  /* ── Tone ─────────────────────────────────────────────────────────────
     A lane nobody touched must come out untouched — a tone chain that is
     built and then does something at its default settings would colour every
     lane in the app silently. */
  check('a clean tone leaves the audio bit for bit alone', said.cleanIsUntouched === 1);

  /* Drive compresses. The curve is normalised so that turning it up changes
     the shape and not the level — which is the point: louder is reliably
     mistaken for better, and a drive control that is also a volume control
     gets pushed for the wrong reason. So the average must rise while the
     peak stays put. */
  check('drive raises the average level', said.drivenRms > said.plainRms * 1.15,
    `${said.plainRms} → ${said.drivenRms}`);
  /* The peak-to-average ratio falling is what compression *is*, and it is the
     honest way to state this. The first version asserted that the peak does
     not move at all, which is false for anything below full scale — a soft
     clip pushes a half-scale signal up towards the ceiling, and that is the
     effect, not a side effect. */
  check('and squashes the peak-to-average ratio, which is what compression is',
    said.drivenPeak / said.drivenRms < (said.plainPeak / said.plainRms) * 0.85,
    `${said.plainPeak / said.plainRms} → ${said.drivenPeak / said.drivenRms}`);
  /* What "normalised" actually promises: a lane already at full scale does not
     come out any louder for being driven. That is what stops the drive
     doubling as a volume knob and being pushed because louder sounded better. */
  check('a full-scale lane is no louder for being driven',
    said.loudDrivenPeak <= said.loudPlainPeak * 1.01,
    `${said.loudPlainPeak} → ${said.loudDrivenPeak}`);

  /* And the speaker band removes what is above it, rather than being three
     filters that were wired up and never connected. */
  /* Averages, not peaks: a filter fed a sine that starts abruptly overshoots
     on the first cycles, and the peak over the buffer is that transient rather
     than what the filter passes. Read as a peak this said the four-pole
     cabinet was 7 dB down at 9 kHz when it is twenty — a measurement error
     that looked exactly like a filter that was not connected. */
  const cabinetDb = 20 * Math.log10(said.boxedRms / said.brightRms);
  check('the speaker band takes 9 kHz right out, as a four-pole roll-off should',
    cabinetDb < -15, `${cabinetDb.toFixed(1)} dB at 9 kHz`);

  /* ── The same twice ───────────────────────────────────────────────────
     Rendering is offline, so it must be deterministic. If it is not, the
     file somebody approves is not the file they get, and nothing else here
     means anything. */
  check('two renders of one session are the same file', said.identical === 1);

  /* ── A take counted in from the top ───────────────────────────────────
     A lane starting at −1 is trimmed rather than pushing everything else a
     second late. This is exactly what the count-in relies on. */
  check('a lane that starts before zero is trimmed, not shifted',
    near(said.earlySeconds, 2, 0.02), `${said.earlySeconds}s — the session got longer`);

  /* ── A cut lane ───────────────────────────────────────────────────────
     "Ek dink maar net of klanke gecut kan word?"

     The lane is a tone that is quiet (0.2) for its first second and loud
     (0.8) for its second. So the peak of the render says which half came out,
     and a length check on its own would go green on a cut that kept the wrong
     half — which is worse than a cut that does nothing. */
  /* Centred, so each channel carries level/√2 — the equal-power law this
     probe pins twenty lines above. The first version of these three expected
     0.8 and 0.2 flat and called a working cut broken: the numbers it read,
     0.566 and 0.141, are exactly 0.8/√2 and 0.2/√2. A check has to know the
     law the rest of the file is enforcing. */
  const centred = (level) => level / Math.SQRT2;
  check('the whole lane is two seconds and reaches the loud half',
    near(said.wholeSeconds, 2, 0.02) && near(said.wholePeak, centred(0.8), 0.02),
    `${said.wholeSeconds}s, peak ${said.wholePeak}`);
  check('cut to its second half, only the loud half comes out',
    near(said.tailSeconds, 2, 0.02) && near(said.tailPeak, centred(0.8), 0.02),
    `${said.tailSeconds}s, peak ${said.tailPeak}`);
  check('cut to its first half, only the quiet half comes out',
    near(said.headSeconds, 1, 0.02) && near(said.headPeak, centred(0.2), 0.02),
    `${said.headSeconds}s, peak ${said.headPeak} — the loud level would mean the cut kept the wrong half`);
  /* The tail case keeps `at` at 1, because cutting the head keeps the audio
     still on the clock. Two seconds of session with one second of sound in
     the second half of it. */
  check('and cutting the head leaves the audio where it was on the clock',
    near(said.tailSeconds, 2, 0.02),
    `${said.tailSeconds}s — the lane slid instead of being trimmed`);
  check('a window collapsed to nothing plays the whole lane rather than silence',
    near(said.collapsedSeconds, 2, 0.02) && near(said.collapsedPeak, centred(0.8), 0.02),
    `${said.collapsedSeconds}s, peak ${said.collapsedPeak}`);

  await b.close();
} finally {
  if (server?.pid) {
    try { process.kill(-server.pid); } catch { /* already gone */ }
    try { server.kill('SIGKILL'); } catch { /* already gone */ }
  }
  if (existsSync(LIVE)) rmSync(LIVE);
}

console.log('problems:', problems.join(' ;; ') || 'none');
process.exit(problems.length ? 1 : 0);

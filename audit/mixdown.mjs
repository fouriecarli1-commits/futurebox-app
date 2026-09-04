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
 * It owns the whole loop, as `safezones.mjs` does: copies the probe page in,
 * builds, measures, and removes it again — whether it passed, failed or threw.
 * The app never ships a route that exists for a test.
 */
import { cpSync, rmSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';

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

  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
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

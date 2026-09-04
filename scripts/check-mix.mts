/**
 * What the master does, before any of it reaches a screen.
 *
 * The rule the session model exists for is that the mixer and the mixdown can
 * never disagree about what somebody is listening to. The master is where that
 * rule is easiest to break: a limiter in the live path and a different one in
 * the render, and the file that comes out is not the mix that was approved —
 * a difference nobody can point at afterwards.
 *
 * So the master is one number, worked out from the rendered mix and applied
 * identically in both places. This pins what that number is.
 */
import {
  FLAT_MASTER, MOST_BOOST, TARGET_RMS, dbOf, levelOfDb, trimFor, type Master,
} from '../app/lib/session.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok ' : '  ✗  '} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) bad += 1;
};
const near = (a: number, b: number, slack = 1e-9) => Math.abs(a - b) < slack;

// ── Decibels, both directions ────────────────────────────────────────────
check('unity is zero dB', near(dbOf(1), 0));
check('half the level is about six dB down', near(dbOf(0.5), -6.0206, 1e-3), String(dbOf(0.5)));
check('silence is minus infinity rather than NaN', dbOf(0) === -Infinity);
check('and the two directions agree', near(levelOfDb(dbOf(0.37)), 0.37, 1e-12));
check('the ceiling default is just under full scale', near(levelOfDb(-1), 0.8913, 1e-4), String(levelOfDb(-1)));

// ── Doing nothing, which is the default ──────────────────────────────────
check('a quiet mix under the ceiling is left exactly alone',
  trimFor(0.5, 0.1, FLAT_MASTER) === 1, String(trimFor(0.5, 0.1, FLAT_MASTER)));
check('silence stays silence rather than being boosted into hiss',
  trimFor(0, 0, { ...FLAT_MASTER, matchLoudness: true }) === 1,
  String(trimFor(0, 0, { ...FLAT_MASTER, matchLoudness: true })));

// ── The ceiling, which is a promise ──────────────────────────────────────
{
  const master: Master = { gain: 1, ceilingDb: -1, matchLoudness: false };
  const trim = trimFor(1.0, 0.3, master);
  check('a mix at full scale is brought under the ceiling',
    near(1.0 * trim, levelOfDb(-1), 1e-12), String(1.0 * trim));
  const hot = trimFor(2.5, 0.9, master);
  check('and so is one well over it', near(2.5 * hot, levelOfDb(-1), 1e-12), String(2.5 * hot));
}
{
  /* The ordering that matters. Loudness matching wants to multiply up; the
     ceiling has to be able to overrule it. A mix brought to the target and
     then clipping is not "loud enough", it is broken — and the whole reason
     to compute this rather than run a limiter is that the answer is knowable
     before anything is rendered. */
  const master: Master = { gain: 1, ceilingDb: -1, matchLoudness: true };
  const trim = trimFor(0.9, 0.02, master);
  check('the ceiling overrules the loudness target, not the other way round',
    near(0.9 * trim, levelOfDb(-1), 1e-12), `peak lands at ${0.9 * trim}`);
  check('and the target is not reached when it cannot be',
    0.02 * trim < TARGET_RMS, `${0.02 * trim} vs ${TARGET_RMS}`);
}

// ── Matching loudness, where there is room ───────────────────────────────
{
  const master: Master = { gain: 1, ceilingDb: -1, matchLoudness: true };
  /* A quiet mix with plenty of headroom: the target is reachable, so it is
     reached exactly. */
  const trim = trimFor(0.2, 0.05, master);
  check('a quiet mix with headroom is brought to the target',
    near(0.05 * trim, TARGET_RMS, 1e-12), String(0.05 * trim));
  check('and still does not touch the ceiling', 0.2 * trim <= levelOfDb(-1) + 1e-12,
    String(0.2 * trim));
}
{
  /* Near-silence. Without a cap this is a multiplication by hundreds, which
     turns a room's noise floor into a room. */
  const master: Master = { gain: 1, ceilingDb: -1, matchLoudness: true };
  const trim = trimFor(0.0005, 0.0001, master);
  check('near-silence is not amplified without limit', trim <= MOST_BOOST, String(trim));
}

// ── Nothing ever comes out above the ceiling ─────────────────────────────
{
  let worst = 0;
  for (const peak of [0.001, 0.05, 0.3, 0.7, 0.891, 0.95, 1, 1.4, 3]) {
    for (const rms of [0.0001, 0.01, 0.1, 0.2, 0.5]) {
      for (const matchLoudness of [false, true]) {
        for (const ceilingDb of [-0.1, -1, -3, -6]) {
          const trim = trimFor(peak, rms, { gain: 1, ceilingDb, matchLoudness });
          const over = peak * trim - levelOfDb(ceilingDb);
          if (over > worst) worst = over;
        }
      }
    }
  }
  check('across every combination, the peak never ends up above the ceiling',
    worst <= 1e-12, `worst overshoot ${worst}`);
}

if (bad) {
  console.error(`\ncheck:mix — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:mix — one number, worked out once, and the ceiling always wins.');

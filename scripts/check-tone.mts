/**
 * The shaping curve, before it reaches anything that makes a sound.
 *
 * A waveshaper takes a table of numbers and looks values up in it. Every way
 * that table can be wrong is silent: a curve that is not monotonic folds the
 * waveform back on itself and makes a ring rather than a growl; one that is
 * asymmetric adds a second harmonic that reads as "cheap"; one that is not
 * normalised means turning the drive up also turns the volume up, and louder
 * is reliably mistaken for better.
 */
import {
  CLEAN, CURVE_POINTS, MOST_TILT_DB, curveFor, isClean, tiltDb,
} from '../app/lib/tone.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok ' : '  ✗  '} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) bad += 1;
};
const near = (a: number, b: number, slack: number) => Math.abs(a - b) <= slack;

// ── Doing nothing ────────────────────────────────────────────────────────
{
  const curve = curveFor(0);
  let worst = 0;
  for (let i = 0; i < CURVE_POINTS; i += 1) {
    const x = (i / (CURVE_POINTS - 1)) * 2 - 1;
    worst = Math.max(worst, Math.abs(curve[i] - x));
  }
  /* A drive of zero has to be a straight wire, not "nearly" one: anything else
     means the room quietly colours every lane that was never asked to be
     coloured. The tolerance is single-precision because the table is a
     `Float32Array` — this asserted 1e-12 first, which no curve table of any
     kind can meet, and the failure was the assertion rather than the curve. */
  const FLOAT32 = 1e-6;
  check('no drive is a straight line, to the precision a curve table holds',
    worst < FLOAT32, String(worst));
}
check('a clean tone builds nothing at all', isClean(CLEAN));
check('and an absent one counts as clean', isClean(undefined));
check('but any drive at all is not clean', !isClean({ ...CLEAN, drive: 0.2 }));
check('and so is a tilt', !isClean({ ...CLEAN, colour: 0.9 }));
check('and so is a cabinet', !isClean({ ...CLEAN, cabinet: true }));

// ── The properties every setting must have ───────────────────────────────
for (const drive of [0, 0.1, 0.35, 0.7, 1]) {
  const curve = curveFor(drive);

  check(`drive ${drive}: the table is the right size`, curve.length === CURVE_POINTS);

  /* Normalised. Full scale in, full scale out, at every setting — so the knob
     changes the shape and not the level, and nobody pushes it because louder
     sounded better. */
  check(`drive ${drive}: full scale in is full scale out`,
    near(curve[CURVE_POINTS - 1], 1, 1e-9) && near(curve[0], -1, 1e-9),
    `${curve[0]} … ${curve[CURVE_POINTS - 1]}`);

  /* Monotonic. A curve that dips folds the waveform back on itself, and a
     folded waveform rings rather than growls — the classic sound of a
     waveshaper built by hand. */
  let rises = true;
  for (let i = 1; i < CURVE_POINTS; i += 1) if (curve[i] < curve[i - 1] - 1e-12) rises = false;
  check(`drive ${drive}: the curve never turns back on itself`, rises);

  /* Odd-symmetric. An asymmetric curve adds even harmonics, which is a
     specific effect and not this one; getting it by accident is how a tone
     control ends up sounding cheap. */
  let worstOdd = 0;
  for (let i = 0; i < CURVE_POINTS; i += 1) {
    worstOdd = Math.max(worstOdd, Math.abs(curve[i] + curve[CURVE_POINTS - 1 - i]));
  }
  check(`drive ${drive}: it is symmetrical about zero`, worstOdd < 1e-9, String(worstOdd));

  // Nothing may leave the shaper louder than full scale.
  let over = 0;
  for (let i = 0; i < CURVE_POINTS; i += 1) over = Math.max(over, Math.abs(curve[i]));
  check(`drive ${drive}: nothing comes out above full scale`, over <= 1 + 1e-9, String(over));
}

/* ── More drive is more squash ───────────────────────────────────────────
   The knob has to do something, in the direction it says. Measured at half
   scale: the harder the drive, the further a mid-level signal is pushed up
   towards the ceiling, which is what compression sounds like. */
{
  const half = Math.floor(CURVE_POINTS * 0.75);
  /* The x this index actually stands for, rather than the 0.5 it is near. The
     first version compared against 0.5 and failed by 1.5e-3 — which was the
     index arithmetic in this file, not the curve. A check that is wrong about
     where it is looking reports a bug that is not there, and the next person
     goes hunting in the wrong file. */
  const x = (half / (CURVE_POINTS - 1)) * 2 - 1;
  const gentle = curveFor(0.2)[half];
  const heavy = curveFor(0.9)[half];
  check('more drive pushes a mid-level signal further up', heavy > gentle,
    `${gentle} vs ${heavy}`);
  check('and a straight wire leaves it where it was',
    near(curveFor(0)[half], x, 1e-6), `${curveFor(0)[half]} vs ${x}`);
}

// ── The tilt ─────────────────────────────────────────────────────────────
check('the middle of the colour control is flat', tiltDb(0.5) === 0);
check('all the way dark is the full cut', near(tiltDb(0), -MOST_TILT_DB, 1e-9), String(tiltDb(0)));
check('all the way bright is the full lift', near(tiltDb(1), MOST_TILT_DB, 1e-9), String(tiltDb(1)));
check('and a value outside the range is clamped rather than exaggerated',
  tiltDb(5) === MOST_TILT_DB && tiltDb(-5) === -MOST_TILT_DB);

if (bad) {
  console.error(`\ncheck:tone — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:tone — the curve is straight when it should be, and only ever bends one way.');

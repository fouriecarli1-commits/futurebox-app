/**
 * The transition detector finds real changes, and nothing where there are none.
 *
 * ── Why this check is the whole feature ──────────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan die studio ook nie 'n drag funksie hê, wat ook
 * natuurlike oorgange detect"*.
 *
 * A detector like this is the easiest thing in the app to be wrong about
 * quietly. It returns a list of numbers. Numbers look like an answer. A
 * threshold slightly too low returns twenty transitions for a song with four,
 * a threshold slightly too high returns an empty list, and both of those read
 * on screen as "the app has analysed your song" — the first draws twenty
 * blocks, the second says it could not hear any. Nobody reports either,
 * because nobody knows what the right answer was.
 *
 * So this does not check that it returns something. It builds signals whose
 * boundaries are known to the millisecond, and holds the answer to them:
 *
 *   - a tone that changes pitch once: ONE transition, at the change
 *   - a tone that changes twice: TWO, at both
 *   - a quiet passage that becomes a loud one: found, because that is a
 *     chorus coming in and it is the commonest boundary there is
 *   - a single unchanging tone: NOTHING
 *   - silence: NOTHING
 *   - something too short to hold a window either side: NOTHING
 *
 * The three negatives are the half that matters. A detector that answers a
 * steady drone with a list of transitions is a detector that will answer a
 * sustained organ chord with a list of transitions, and the studio will draw
 * them.
 */

import { readFileSync } from 'node:fs';
import {
  transitionsIn, snapTo, windowsFrom, noveltyOf, SHORTEST, APART,
} from '../app/lib/transitions.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const RATE = 16_000;

/**
 * A stretch of sound built out of named pieces.
 *
 * Each piece is a chord rather than a single sine, because a single sine is
 * not what a detector meets: a chord moves several bands and several pitch
 * classes at once, which is the thing a section change does.
 */
function build(pieces: readonly { seconds: number; hz: readonly number[]; loud: number }[]): Float32Array {
  const total = pieces.reduce((sum, one) => sum + one.seconds, 0);
  const out = new Float32Array(Math.round(total * RATE));
  let at = 0;
  for (const piece of pieces) {
    const count = Math.round(piece.seconds * RATE);
    for (let i = 0; i < count; i += 1) {
      let value = 0;
      for (const hz of piece.hz) value += Math.sin((2 * Math.PI * hz * i) / RATE);
      /* A little noise, so the spectrum is not a line of pure spikes. Real
         music is broadband and a detector tuned on pure tones is a detector
         tuned on something it will never be given. */
      value += (Math.random() - 0.5) * 0.3;
      out[at + i] = (value / (piece.hz.length + 1)) * piece.loud;
    }
    at += count;
  }
  return out;
}

const near = (got: readonly number[], want: readonly number[], slack = 0.6): boolean =>
  got.length === want.length
  && want.every((one, index) => Math.abs(got[index] - one) <= slack);

/* ── 1. One change, found once, in the right place ─────────────────────── */

const once = transitionsIn(
  build([
    { seconds: 6, hz: [220, 277, 330], loud: 0.5 },
    { seconds: 6, hz: [165, 196, 247, 392], loud: 0.5 },
  ]),
  RATE,
);
ok('a chord that changes once is one transition, at the change',
  near(once, [6]),
  `answered ${once.map((one) => one.toFixed(2)).join(', ') || 'nothing'} rather than 6.00`);

/* ── 2. Two changes, both found ────────────────────────────────────────── */

const twice = transitionsIn(
  build([
    { seconds: 6, hz: [220, 277, 330], loud: 0.5 },
    { seconds: 6, hz: [165, 196, 247, 392], loud: 0.5 },
    { seconds: 6, hz: [294, 370, 440, 587], loud: 0.5 },
  ]),
  RATE,
);
ok('  and a chord that changes twice is two, at both',
  near(twice, [6, 12]),
  `answered ${twice.map((one) => one.toFixed(2)).join(', ') || 'nothing'} rather than 6.00, 12.00`);

/* ── 3. The commonest boundary there is: the loud part starting ────────── */

const lifts = transitionsIn(
  build([
    { seconds: 6, hz: [220, 330], loud: 0.1 },
    { seconds: 6, hz: [220, 330, 440, 660], loud: 0.9 },
  ]),
  RATE,
);
ok('  and a quiet passage becoming a loud one is found',
  near(lifts, [6]),
  'a chorus coming in is the boundary somebody is most likely to drag to, and'
  + ' it is a change in level and width rather than in pitch'
  + ` — answered ${lifts.map((one) => one.toFixed(2)).join(', ') || 'nothing'}`);

/* ── 4. The three that must answer nothing ─────────────────────────────── */

const steady = transitionsIn(build([{ seconds: 20, hz: [220, 277, 330], loud: 0.5 }]), RATE);
ok('an unchanging chord is no transitions at all',
  steady.length === 0,
  'this is the fault that cannot be seen: a drone answered with a list of'
  + ' numbers draws blocks in a song that has none, and a sustained organ'
  + ` chord is a drone — answered ${steady.length}`);

const quiet = transitionsIn(new Float32Array(RATE * 20), RATE);
ok('  and silence is none',
  quiet.length === 0,
  `answered ${quiet.length}`);

const tiny = transitionsIn(build([{ seconds: SHORTEST / 2, hz: [220], loud: 0.5 }]), RATE);
ok('  and something too short to hold a window either side is none',
  tiny.length === 0,
  'rather than a window reaching off the end of the array and comparing a'
  + ` song against zeroes — answered ${tiny.length}`);

const nonsense = transitionsIn(build([{ seconds: 20, hz: [220], loud: 0.5 }]), 0);
ok('  and a rate of zero is none rather than a divide by it',
  nonsense.length === 0,
  `answered ${nonsense.length}`);

/* ── 5. It finds places, and never names them ─────────────────────────── */

/* Comments out first. The header has to be able to say "a chorus is not the
   same shape as a verse" to explain what the thing measures, and a scan that
   cannot tell that sentence from a line of code that labels a block is a scan
   that reads prose instead of code — which is the fault this family of checks
   exists to find in other people's work and has found in its own six times. */
const source = withoutComments(readFileSync('app/lib/transitions.ts', 'utf8'));
ok('the detector names no section',
  !/\b(chorus|verse|bridge|intro|outro)\b/i.test(source),
  'a detector that guessed "chorus" would be wrong often and confidently, and'
  + ' the studio would print the guess as a fact');

ok('  and the windows it cuts are unnamed',
  (() => {
    const cuts = windowsFrom([6, 12], 18);
    if (cuts.length !== 3) return false;
    return cuts.every((one) => Object.keys(one).sort().join(',') === 'from,to');
  })(),
  'a window with a name on it is a guess with a label');

/* ── 6. The ceiling is a ceiling, not a target ─────────────────────────── */

const capped = transitionsIn(
  build([
    { seconds: 6, hz: [220, 277, 330], loud: 0.5 },
    { seconds: 6, hz: [165, 196, 247, 392], loud: 0.5 },
    { seconds: 6, hz: [294, 370, 440, 587], loud: 0.5 },
  ]),
  RATE,
  { most: 1 },
);
ok('asking for at most one gives one, and it is the clearest',
  capped.length === 1,
  `answered ${capped.length}`);

const asked = transitionsIn(
  build([
    { seconds: 6, hz: [220, 277, 330], loud: 0.5 },
    { seconds: 6, hz: [165, 196, 247, 392], loud: 0.5 },
  ]),
  RATE,
  { most: 8 },
);
ok('  and asking for eight when there is one gives one',
  asked.length === 1,
  'padding the list out to the number asked for is how a feature like this'
  + ` starts lying — answered ${asked.length}`);

/* ── 7. Two spikes from one boundary are one answer ────────────────────── */

ok('two transitions are never closer together than a section can be',
  (() => {
    const all = transitionsIn(
      build([
        { seconds: 6, hz: [220, 277, 330], loud: 0.5 },
        { seconds: 6, hz: [165, 196, 247, 392], loud: 0.5 },
        { seconds: 6, hz: [294, 370, 440, 587], loud: 0.5 },
      ]),
      RATE,
    );
    return all.every((one, index) => index === 0 || one - all[index - 1] >= APART);
  })(),
  'a real boundary spikes across several frames and the point is one answer'
  + ' per boundary');

/* ── 8. The drag snaps, and can be escaped ─────────────────────────────── */

ok('a handle dropped near a transition lands on it',
  snapTo(6.3, [6, 12]) === 6,
  'this is the whole of "drag, and it lands on the music"');

ok('  and a handle dropped away from one stays where it was put',
  snapTo(9, [6, 12]) === 9,
  'a snap with no escape from it is a control somebody cannot use: somebody'
  + ' who wants a cut between two boundaries must be able to have one');

ok('  and the nearest wins when two are in reach',
  snapTo(6.4, [6, 6.5]) === 6.5,
  `answered ${snapTo(6.4, [6, 6.5])}`);

/* ── 9. The curve the studio draws is the curve it decided from ────────── */

ok('the novelty curve is as long as the song is in frames',
  (() => {
    const curve = noveltyOf(build([{ seconds: 10, hz: [220, 330], loud: 0.5 }]), RATE);
    /* Ten seconds at ten frames a second, less the window that cannot start
       past the end. Within two frames is the honest tolerance. */
    return Math.abs(curve.length - 100) <= 2;
  })(),
  'the studio draws this under the blocks, so a curve on a different time base'
  + ' from the blocks would put the explanation in the wrong place');

ok('  and it is highest at the change',
  (() => {
    const curve = noveltyOf(
      build([
        { seconds: 6, hz: [220, 277, 330], loud: 0.5 },
        { seconds: 6, hz: [165, 196, 247, 392], loud: 0.5 },
      ]),
      RATE,
    );
    let top = 0;
    for (let f = 1; f < curve.length; f += 1) if (curve[f] > curve[top]) top = f;
    return Math.abs(top * 0.1 - 6) <= 0.6;
  })(),
  'a curve whose peak is not where the music changes is a picture of'
  + ' something else');

console.log(bad === 0
  ? '\n  The detector finds the changes that are there, nothing where there are\n'
    + '  none, and it never names what it found.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

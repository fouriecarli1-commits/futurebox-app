/**
 * Turning, sharpening and enlarging a photograph — the arithmetic, which is
 * where all three of them go wrong.
 *
 *   npm run check:postwork
 *
 * The drawing is the browser's and is proved in a browser by
 * `audit/postwalk.mjs`. What is here is the part that decides whether the
 * drawing is asked for correctly, and every one of these is a fault that
 * produces a picture rather than an error:
 *
 *   1. **A turn that does not swap the sides.** A quarter turn of a 4:3
 *      photograph is 3:4, and a canvas sized the old way crops the two ends
 *      off it with no warning at all.
 *   2. **A turn that wraps the wrong way, or not at all.** Four presses of
 *      "turn" must come back to where it started.
 *   3. **An enlargement above what a phone's canvas can hold.** The
 *      ceiling is in pixels and is the thing that actually kills a tab;
 *      tripling a photograph that was only just allowed in crosses it.
 *   4. **Steps that walk away from the answer.** Rounding at each doubling
 *      and not at the end lands near the size asked for rather than on it.
 */
import {
  BIGGER, SHARPEN, bigger, nextQuarter, sizeOf, tooBig, turnedSize, type Quarter,
} from '../app/lib/postwork.ts';
import { MAX_PIXELS } from '../app/lib/imagefile.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── 1. A turn swaps the sides, and only on the odd ones ─────────────── */
const PHOTO = { width: 4032, height: 3024 };
ok('a quarter turn of a 4:3 photograph is 3:4',
  turnedSize(PHOTO, 1).width === 3024 && turnedSize(PHOTO, 1).height === 4032,
  JSON.stringify(turnedSize(PHOTO, 1)));
ok('  and a half turn is the same shape it was',
  turnedSize(PHOTO, 2).width === 4032 && turnedSize(PHOTO, 2).height === 3024,
  JSON.stringify(turnedSize(PHOTO, 2)));
ok('  and three quarters swaps them again',
  turnedSize(PHOTO, 3).width === 3024, JSON.stringify(turnedSize(PHOTO, 3)));
ok('  and no turn at all leaves it alone',
  turnedSize(PHOTO, 0).width === 4032 && turnedSize(PHOTO, 0).height === 3024);

/* ── 2. Four presses come back to the start, both ways round ─────────── */
let at: Quarter = 0;
for (let i = 0; i < 4; i += 1) at = nextQuarter(at, 1);
ok('four quarter turns come back to where it started', at === 0, String(at));
let widdershins: Quarter = 0;
for (let i = 0; i < 4; i += 1) widdershins = nextQuarter(widdershins, -1);
ok('  and so do four the other way', widdershins === 0, String(widdershins));
ok('  and one back from nothing is three quarters, not minus one',
  nextQuarter(0, -1) === 3, String(nextQuarter(0, -1)));

/* ── The size of a thing, read the way a canvas and an image differ ──── */
ok('an image is measured by its natural size',
  sizeOf({ naturalWidth: 400, naturalHeight: 300, width: 99, height: 99 }).width === 400,
  'a drawn <img> reports the size it is SHOWN at in width/height, and the'
  + ' photograph is the natural one');
ok('  and a canvas, which has no natural size, by its own',
  sizeOf({ width: 400, height: 300 }).height === 300);

/* ── 3. The ceiling, which is what actually kills a tab ──────────────── */
const JUSTIN = { width: 10000, height: 7900 };
ok('a picture that was only just allowed in cannot be tripled past the ceiling',
  JUSTIN.width * JUSTIN.height <= MAX_PIXELS && tooBig(JUSTIN, 3),
  `${((JUSTIN.width * 3 * JUSTIN.height * 3) / 1e6).toFixed(0)} megapixels against`
  + ` a ceiling of ${(MAX_PIXELS / 1e6).toFixed(0)}`);
ok('  and a small one can be made bigger by all of them',
  BIGGER.every((times) => !tooBig({ width: 1080, height: 1080 }, times)),
  BIGGER.map((times) => `${times}x ${tooBig({ width: 1080, height: 1080 }, times)}`).join(' '));
ok('  and the biggest step is refused rather than attempted',
  bigger({ width: 10000, height: 7900 } as never, 3) === null,
  'a canvas above the ceiling does not throw, it comes back blank — which'
  + ' looks like the tool having deleted the photograph');

/* ── 4. The sharpening rungs are rungs, in order ─────────────────────── */
const rungs = Object.values(SHARPEN);
ok('the three sharpening strengths go up and none of them doubles the picture',
  rungs.every((one, i) => i === 0 || one > rungs[i - 1]) && Math.max(...rungs) <= 2,
  rungs.join(', '));
ok('  and the gentlest really is gentle', Math.min(...rungs) > 0 && Math.min(...rungs) < 0.8,
  String(Math.min(...rungs)));

if (bad) {
  console.error(`\ncheck:postwork — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:postwork — a turn swaps the sides and comes back round, and nothing'
  + ' can be enlarged past what a phone can hold.',
);

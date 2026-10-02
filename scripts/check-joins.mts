/**
 * The joins between pieces, worked out rather than looked at.
 *
 * ── Why this is arithmetic and not a probe ────────────────────────────────
 *
 * A transition is four tenths of a second long. A browser probe can press the
 * button, export the film and prove the film still decodes — and it cannot
 * tell a dissolve from a hard cut, because telling them apart means comparing
 * frames at a moment, and a real-time recording on a shared runner does not
 * land on a moment.
 *
 * So `videojoins.ts` holds every number as one pure function and this reads it
 * at the moments that matter: at the join, a third of the way through, at the
 * end, and past the end. The renderer paints what that function answers and
 * works nothing out for itself, which is what makes reading it enough.
 *
 * `check:editor` still walks the picker and the export in a browser. The two
 * together are the whole rule: the controls are reachable and wired, and the
 * numbers behind them are right.
 */
import {
  JOINS, JOIN_FOR, LONGEST_JOIN, NO_JOIN, joinFits, joinName, joiningAt, needsHeld,
  type Join,
} from '../app/lib/videojoins';
import { readFileSync } from 'node:fs';
import { before, from } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* ── The list itself ───────────────────────────────────────────────────── */

ok('a hard cut is one of the choices, and is the one nothing has to change for',
  JOINS.some((one) => one.id === NO_JOIN));

/* Through `String()` on purpose. `as const` narrows these to two unions with no
   member in common, so the typechecker calls `one.af !== one.en` provably true
   and refuses it — correct about today and useless about tomorrow, which is the
   day somebody pastes the English into the Afrikaans. Widened to compare at
   runtime, which is when it matters. */
const same = JOINS.filter((one) => String(one.af) === String(one.en));
ok('  and every join is named in both languages',
  same.length === 0 && JOINS.every((one) => one.af.length > 2 && one.en.length > 2),
  same.map((one) => one.id).join(', '));

ok('  and a name is asked for by id rather than typed at the call',
  joinName('dissolve', 'af') === 'Oorvloei' && joinName('dissolve', 'en') === 'Dissolve');

ok('  and an unknown join answers nothing rather than its own id',
  joinName('not_a_join' as Join, 'af') === '');

/* ── The length, and the clamp that actually bites ─────────────────────── */

ok('a join is capped at the longest a join may be',
  joinFits(5, 100) === LONGEST_JOIN,
  `five seconds became ${joinFits(5, 100)}`);

ok('  and never longer than half the piece it arrives on',
  joinFits(LONGEST_JOIN, 0.4) === 0.2,
  `a ${LONGEST_JOIN}s join on a 0.4s piece is ${joinFits(LONGEST_JOIN, 0.4)}s`
  + ' — a join still arriving when the piece ends is a shot never seen on its own');

ok('  and a piece of no length carries no join at all',
  joinFits(LONGEST_JOIN, 0) === 0);

ok('  and nothing asked for falls back to the written default',
  joinFits(undefined, 100) === JOIN_FOR,
  `${joinFits(undefined, 100)} against a default of ${JOIN_FOR}`);

ok('  and a negative length is nought and not a negative alpha',
  joinFits(-3, 100) === 0);

/* ── Which joins need the outgoing frame held ──────────────────────────── */

ok('the moving joins need the outgoing frame and the colour joins do not',
  needsHeld('dissolve') && needsHeld('wipe') && needsHeld('slide')
  && !needsHeld('dip') && !needsHeld('flash') && !needsHeld('cut'));

/* ── A dissolve, moment by moment ──────────────────────────────────────── */

const RUNS = 4;
const dissolving = (into: number) => joiningAt({
  arrive: 'dissolve', arriveFor: 0.4, leave: 'cut', into, runs: RUNS,
  first: false, last: true,
});

ok('a dissolve is the whole outgoing frame at the cut itself',
  dissolving(0).held?.solid === 1,
  `${dissolving(0).held?.solid} at nought seconds in`);

ok('  half gone halfway through',
  Math.abs((dissolving(0.2).held?.solid ?? 0) - 0.5) < 0.001,
  `${dissolving(0.2).held?.solid} at 0.2s of a 0.4s join`);

ok('  and gone, not merely faint, at the end of it',
  dissolving(0.4).held === undefined,
  'a held frame at alpha nought is still a drawImage every frame for the whole film');

ok('  and still gone well past the end',
  dissolving(3.9).held === undefined);

ok('  and the first piece dissolves from nothing, because there is nothing behind it',
  joiningAt({
    arrive: 'dissolve', arriveFor: 0.4, leave: 'cut', into: 0, runs: RUNS,
    first: true, last: true,
  }).held === undefined,
  'the frame held at the start of a film is the frame of a film that has not started');

ok('  and a dissolve lays no colour over anything',
  dissolving(0.1).wash === undefined,
  'a dissolve that also darkened would be two transitions at once');

/* ── A wipe and a slide move rather than fade ──────────────────────────── */

const wiping = joiningAt({
  arrive: 'wipe', arriveFor: 0.4, leave: 'cut', into: 0.1, runs: RUNS,
  first: false, last: true,
});
ok('a wipe keeps the outgoing frame solid and moves where it ends',
  wiping.held?.solid === 1 && Math.abs((wiping.held?.keepFrom ?? 0) - 0.25) < 0.001,
  `solid ${wiping.held?.solid}, showing from ${wiping.held?.keepFrom} across`);

const sliding = joiningAt({
  arrive: 'slide', arriveFor: 0.4, leave: 'cut', into: 0.3, runs: RUNS,
  first: false, last: true,
});
ok('  and a slide keeps it solid and moves it off',
  sliding.held?.solid === 1 && Math.abs((sliding.held?.slid ?? 0) - 0.75) < 0.001,
  `solid ${sliding.held?.solid}, slid ${sliding.held?.slid} of the way off`);

ok('  and neither of them wipes AND slides',
  (wiping.held?.slid ?? 0) === 0 && (sliding.held?.keepFrom ?? 0) === 0);

/* ── Through black: a half on each side of the cut ─────────────────────── */

const dipping = (into: number, last = false) => joiningAt({
  arrive: 'dip', arriveFor: 0.4, leave: 'dip', leaveFor: 0.4,
  into, runs: RUNS, first: false, last,
});

ok('through black is fully black at the cut itself',
  dipping(0).wash?.solid === 1 && dipping(0).wash?.colour === '#000',
  `${dipping(0).wash?.solid} of ${dipping(0).wash?.colour}`);

ok('  and clear again a fifth of a second later, which is half of a 0.4s join',
  dipping(0.2).wash === undefined,
  `${JSON.stringify(dipping(0).wash)} at the cut, ${JSON.stringify(dipping(0.2).wash)} at 0.2s`);

ok('  and darkening again at the END of the piece, because the next one asked',
  (dipping(RUNS - 0.1).wash?.solid ?? 0) > 0.4,
  `${dipping(RUNS - 0.1).wash?.solid} a tenth from the end`);

ok('  and fully black at the last frame of it',
  Math.abs((dipping(RUNS).wash?.solid ?? 0) - 1) < 0.001);

ok('  but not on the LAST piece of the film, which has nothing to dip into',
  dipping(RUNS, true).wash === undefined,
  'a film that ends in black because the last piece had a join set is a film that lost its ending');

ok('  and through black holds no frame, so it costs no drawImage',
  dipping(0.1).held === undefined);

const flashing = joiningAt({
  arrive: 'flash', arriveFor: 0.4, leave: 'cut', into: 0, runs: RUNS,
  first: false, last: true,
});
ok('a flash washes white rather than black',
  flashing.wash?.colour === '#fff' && flashing.wash?.solid === 1);

/* ── A straight cut does nothing, which is the point of it ─────────────── */

const cutting = joiningAt({
  arrive: 'cut', arriveFor: 0.4, leave: 'cut', leaveFor: 0.4,
  into: 0, runs: RUNS, first: false, last: false,
});
ok('a straight cut paints nothing at all',
  cutting.wash === undefined && cutting.held === undefined,
  'every join in this app was a straight cut until today, and must still be able to be one');

/* ── Two joins meeting on one piece ────────────────────────────────────── */

/* ── The clamp means the two halves can never meet ─────────────────────────

   This started as "where two joins overlap on one short piece the stronger wins"
   and failed: on a 0.3s piece with 0.6s joins at both ends, the wash in the
   middle was nothing at all.

   Which is correct, and better than what I was asserting. `joinFits` caps a
   join at half the piece, so each HALF is at most a quarter of it: the arriving
   wash covers the first quarter and the leaving wash the last, and they cannot
   reach each other. Every piece, however short, has half of itself showing
   clean. That is worth holding on purpose, so it is what is held. */
const middle = joiningAt({
  arrive: 'dip', arriveFor: 0.6, leave: 'flash', leaveFor: 0.6,
  into: 0.15, runs: 0.3, first: false, last: false,
});
ok('a piece joined at BOTH ends is still seen clean in the middle of itself',
  middle.wash === undefined,
  `${JSON.stringify(middle.wash)} in the middle of a 0.3s piece joined at both ends`
  + ' — a shot washed from end to end is a shot nobody ever sees');

ok('  and that holds at every length, not only at 0.3 seconds',
  [0.2, 0.3, 0.5, 1, 2, 10].every((runs) => joiningAt({
    arrive: 'dip', arriveFor: LONGEST_JOIN, leave: 'dip', leaveFor: LONGEST_JOIN,
    into: runs / 2, runs, first: false, last: false,
  }).wash === undefined),
  'the halfway point of a piece joined at both ends must be clear at any length');

/* And the stronger-of-two rule is still real, so it is still read: a dip
   arriving and a flash leaving on a piece long enough for neither to reach the
   middle still has to answer ONE wash at a time rather than mixing them. */
const atCut = joiningAt({
  arrive: 'dip', arriveFor: 0.4, leave: 'flash', leaveFor: 0.4,
  into: 0, runs: 4, first: false, last: false,
});
ok('  and two different colours on one piece answer one at a time, not a mix',
  atCut.wash?.colour === '#000' && atCut.wash?.solid === 1,
  `${JSON.stringify(atCut.wash)} at the cut, where the arriving black is total`);

ok('  and the overlap can never ask for more than solid',
  [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3].every((at) => {
    const now = joiningAt({
      arrive: 'dip', arriveFor: 0.6, leave: 'dip', leaveFor: 0.6,
      into: at, runs: 0.3, first: false, last: false,
    });
    return (now.wash?.solid ?? 0) <= 1 && (now.wash?.solid ?? 0) >= 0;
  }),
  'an alpha over one throws on some canvases and clamps silently on others');

/* ── And the renderer paints it rather than working it out again ───────── */

const stitch = readFileSync('app/lib/stitch.ts', 'utf8');

ok('the renderer asks this module rather than doing the sums itself',
  /joiningAt\(/.test(stitch),
  'a second copy of the arithmetic is a second answer to "what does a dissolve look like"');

ok('  and holds the outgoing frame only where a join needs one',
  /needsHeld\(/.test(stitch),
  'a canvas copied every frame of every film for a feature nobody switched on');

/* The one ordering that matters. A join under the words would leave the
   caption at full brightness over a dissolving picture, which is the same fault
   the film-wide fade's own ordering note was written for. */
const drawing = from(stitch, 'if (cut.markUnder)');
ok('  and paints the join OVER the words and the mark, not under them',
  before(drawing, 'if (cut.markUnder)', 'joining(')
  && before(drawing, 'joining(', 'fade.up > 0'),
  'words at full brightness over a dissolving picture read as a fault, not a transition;'
  + ' and the film-wide fade has to be last of all');

if (bad) {
  console.error(`\ncheck:joins — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:joins — the five joins are arithmetic with the clamps written down,'
  + ' the last piece cannot end in black, and the renderer paints rather than guesses.',
);

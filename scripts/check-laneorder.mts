/**
 * Lanes move up and down, and a locked group moves as one.
 *
 * ── Why this is arithmetic and not a browser ─────────────────────────────
 *
 * Carli asked for the buttons *"heel links by elke tydlyn, daar by die S en
 * M"*, and for a reason that is not about buttons at all: *"dit raak
 * belangrik wanneer 'n hele tydlyn se klankbane gelyktydig opgeskuif moet
 * word."* The part that can be got wrong is what happens to an interlocked
 * group, and that is a question about an array.
 *
 * ── Where the buttons ended up, and why ─────────────────────────────────
 *
 * They were already there. Not in the gutter — on the lane's own card,
 * behind a tap on its name, put there by an earlier session for a reason
 * that is written above them: the gutter is 96 pixels, a control in this
 * room is 44, and four of them do not fit.
 *
 * I told her they did not exist. I had looked in `BoothTimeline.tsx`, not
 * found them, and taken the absence for the answer, after saying I would
 * check rather than remember. `audit/boothmagnet.mjs` had been pressing
 * them for a day.
 *
 * What was really missing is what she asked them FOR: `shuffleLane` SWAPPED
 * two lanes, so it tore an interlocked group in half every time one of its
 * members moved. She was shown both layouts and chose to keep the card
 * rather than spend 44 pixels of timeline and a lane of height on a phone.
 * So the buttons stayed and the behaviour changed.
 *
 * This settles what pressing them should do, including three cases a
 * browser test would never think to stage: a group with a stranger between
 * its members, a stack that is entirely one group, and a move with nowhere
 * to go.
 */

import { readFileSync } from 'node:fs';
import { move, canMove, blockOf, type Ordered } from '../app/lib/laneorder';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const L = (id: string, link?: string): Ordered => (link ? { id, link } : { id });
const ids = (lanes: readonly Ordered[]): string => lanes.map((one) => one.id).join(' ');
const same = (what: string, got: readonly Ordered[], want: string): void =>
  ok(what, ids(got) === want, `got "${ids(got)}", wanted "${want}"`);

/* ── One lane, no lock ─────────────────────────────────────────────────── */

const plain = [L('a'), L('b'), L('c'), L('d')];
same('a lane moves down one place', move(plain, 'b', 'down'), 'a c b d');
same('and up one place', move(plain, 'b', 'up'), 'b a c d');
same('the top lane cannot go up', move(plain, 'a', 'up'), 'a b c d');
same('the bottom lane cannot go down', move(plain, 'd', 'down'), 'a b c d');

/* Identity, not equality. The caller writes the session down when the array
   changes, and a fresh copy every press would save a file on every press
   that did nothing. */
ok('a move with nowhere to go gives back the same array, not a copy',
  move(plain, 'a', 'up') === plain);
ok('and a real move does not', move(plain, 'b', 'up') !== plain);

/* ── The interlock, which is the reason she asked ──────────────────────── */

const pair = [L('a'), L('b', 'x'), L('c', 'x'), L('d')];
same('a locked pair moves down together', move(pair, 'b', 'down'), 'a d b c');
same('and up together', move(pair, 'c', 'up'), 'b c a d');
ok('pressing either member moves both',
  ids(move(pair, 'b', 'down')) === ids(move(pair, 'c', 'down')),
  'the group is the unit, not the lane that was pressed');

/* One lane stepped over, not one index. A group of two moving down past one
   lane lands two places along, which is the thing that looks wrong in a
   diff and is right on the screen. */
same('a group steps over ONE lane, however many are in the group',
  move(pair, 'b', 'down'), 'a d b c');

/* ── A group with a stranger inside it ─────────────────────────────────── */

const split = [L('a'), L('b', 'x'), L('s'), L('c', 'x'), L('d')];
ok('a group can be interleaved to begin with — link is a name, not a neighbour',
  blockOf(split, 'b').join(',') === '1,3');
same('and it comes out contiguous, because that is the only reading of "together"',
  move(split, 'b', 'down'), 'a s d b c');
same('the same going up', move(split, 'c', 'up'), 'b c a s d');

/* ── Nothing to move against ───────────────────────────────────────────── */

const allOne = [L('a', 'x'), L('b', 'x')];
same('a stack that is entirely one group cannot move', move(allOne, 'a', 'down'), 'a b');
ok('  and says so before it is pressed', !canMove(allOne, 'a', 'down') && !canMove(allOne, 'b', 'up'));
same('a lane that is not there changes nothing', move(plain, 'nope', 'up'), 'a b c d');

/* ── The buttons agree with the arithmetic ─────────────────────────────── */

ok('the top lane’s up arrow is off', !canMove(plain, 'a', 'up'));
ok('the bottom lane’s down arrow is off', !canMove(plain, 'd', 'down'));
ok('and the ones in between are on', canMove(plain, 'b', 'up') && canMove(plain, 'c', 'down'));
/* A locked group at the top: every member's up arrow is off, including the
   one that is not itself at index 0. */
const topLock = [L('a', 'x'), L('b', 'x'), L('c')];
ok('a locked group at the top has no up arrow on any of its members',
  !canMove(topLock, 'a', 'up') && !canMove(topLock, 'b', 'up'),
  'b is at index 1 but its group starts at 0');

/* ── And it is wired to the buttons that already existed ──────────────── */

const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
ok('the lane card still offers both arrows', /'pro\.laneUp'/.test(booth) && /'pro\.laneDown'/.test(booth));
ok('  and they go through the shared arithmetic, not a swap',
  /move\(was, id, way === -1 \? 'up' : 'down'\)/.test(booth),
  'a swap knows about two indexes and nothing about a group');
ok('  so a locked group is no longer torn in half by a press',
  !/next\[from\] = was\[to\]/.test(booth),
  'the old two-line swap must be gone, not merely unused');
ok('  a press with nowhere to go writes nothing down',
  /next === was \? was :/.test(booth),
  'a new array every press would save the session on a press that changed nothing');
ok('  and the arrow is greyed from the GROUP, not from this lane\u2019s index',
  /canMove\(lanes, picked, way === -1 \? 'up' : 'down'\)/.test(booth),
  'a lane at index 1 whose group starts at 0 cannot go up either');

/* The gutter was left alone, and that was her call rather than mine. A
   later session that widens it should be doing so on purpose. */
const timeline = readFileSync('app/components/BoothTimeline.tsx', 'utf8');
ok('the gutter is still 96, because she chose the timeline over the arrows',
  /const GUTTER = 96;/.test(timeline) && /const ROW = 78;/.test(timeline),
  'shown both, she kept the 294-pixel timeline rather than gain gutter arrows');

if (failures) {
  console.error(`\ncheck:laneorder — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:laneorder — a lane moves one place, a locked group moves as one block over one lane,'
  + ' and a move with nowhere to go changes nothing at all.',
);

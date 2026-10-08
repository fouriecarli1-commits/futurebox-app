/**
 * Pictures along a block, so a cut can be aimed.
 *
 *   npm run check:filmstrip
 *
 * Carli, 8 October 2026: *"Hoe moontlik is dit om die video se visuals op die
 * tydlyn te wys? Dit gaan dit makliker maak om te weet waar om te cut ens."*
 *
 * A block used to carry a name and a duration, which says WHICH shot it is
 * and nothing about where anything happens in it. The pictures are decoded on
 * the device out of a Blob that is already there — nothing uploaded, nothing
 * generated, nothing charged, works on the free plan.
 *
 * ── What this drives, and what it cannot ─────────────────────────────────
 *
 * The arithmetic, which has the three traps in it worth failing a build over.
 * Whether a real decoder gives back real pictures is `audit/strip.mjs`'s job,
 * because only a browser has a decoder and a source rule cannot tell a
 * working one from one answering black.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  FRAME_WIDE, MOST_FRAMES, howMany, stripKey, timesFor,
} from '../app/lib/filmstrip.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. No picture is taken from the end of the material ─────────────── */

/* The trap: seeking to `to` lands at or past the last frame and most files
   answer with nothing, so a strip built on the range's EDGES ends every
   block with a black thumbnail. The pictures come from the middles. */
const four = timesFor(10, 14, 4);
ok('four pictures across four seconds land at the half-seconds',
  JSON.stringify(four) === JSON.stringify([10.5, 11.5, 12.5, 13.5]),
  JSON.stringify(four));

ok('  and none of them is the first instant',
  four.every((one) => one > 10),
  'a picture at the exact in-point is the frame a trim just moved off');

ok('  nor the last',
  four.every((one) => one < 14),
  'the out-point is where a decoder has nothing to give, and a black'
  + ' thumbnail at the end of every block is how that looks on screen');

ok('  and they are evenly spread',
  new Set(four.slice(1).map((one, i) => +(one - four[i]).toFixed(6))).size === 1,
  'pictures that bunch up are a strip that lies about where things are');

/* ── 2. A piece shorter than a frame still shows something ───────────── */

for (const [what, from, to] of [
  ['a piece trimmed to nothing', 7, 7],
  ['a piece whose out is before its in', 7, 5],
  ['a piece a tenth of a second long', 7, 7.1],
] as const) {
  const got = timesFor(from, to, 6);
  ok(`${what} still asks for at least one picture`, got.length >= 1, JSON.stringify(got));
  ok(`  and every time it asks for is a real number`,
    got.every((one) => Number.isFinite(one) && one >= 0),
    `${JSON.stringify(got)} — a NaN seek is a decoder that never answers,`
    + ' and the strip is drawn block by block, so one of those blanks the rest');
}

ok('a count of nought is read as one rather than none',
  timesFor(0, 10, 0).length === 1, JSON.stringify(timesFor(0, 10, 0)));
ok('  and a negative count too', timesFor(0, 10, -5).length === 1);
ok('  and a count with a fraction is not asked for in halves',
  timesFor(0, 10, 3.7).length === 3, String(timesFor(0, 10, 3.7).length));

ok('a negative in-point is pulled back to the start',
  timesFor(-4, 2, 2).every((one) => one >= 0),
  JSON.stringify(timesFor(-4, 2, 2)));

/* ── 3. How many follows the width, within reason ────────────────────── */

ok('a block too thin for one picture still gets one',
  howMany(10) === 1, String(howMany(10)));
ok('  and a block of nought width does not ask for nought',
  howMany(0) === 1, String(howMany(0)));
ok('  and a width that is not a number does not either',
  howMany(Number.NaN) === 1, String(howMany(Number.NaN)));

ok('a block wide enough for four gets four',
  howMany(FRAME_WIDE * 4) === 4, String(howMany(FRAME_WIDE * 4)));
ok('  and one a shade under four gets three, not a part of one',
  howMany(FRAME_WIDE * 4 - 1) === 3, String(howMany(FRAME_WIDE * 4 - 1)));

/* The cap is the one that protects her while she is dragging: each picture
   is a seek, and a seek is tens of milliseconds. */
ok('a block stretched across a wall is capped',
  howMany(FRAME_WIDE * 400) === MOST_FRAMES, String(howMany(FRAME_WIDE * 400)));
ok('  and the cap is small enough to decode while she drags',
  MOST_FRAMES <= 16,
  `${MOST_FRAMES} seeks at tens of milliseconds each, per block, on a strip`
  + ' of a dozen blocks');

/* ── 4. What a remembered strip is remembered by ─────────────────────── */

ok('the same piece at the same trim is one key',
  stripKey('a', 1, 5, 4) === stripKey('a', 1, 5, 4));
ok('  a different trim is a different one',
  stripKey('a', 1, 5, 4) !== stripKey('a', 1, 6, 4),
  'a trimmed piece showing its old pictures is a strip that points at the'
  + ' wrong second, which is worse than no strip');
ok('  a different piece is a different one',
  stripKey('a', 1, 5, 4) !== stripKey('b', 1, 5, 4));
ok('  and a different count is a different one',
  stripKey('a', 1, 5, 4) !== stripKey('a', 1, 5, 8));

/* Width must NOT be in the key, or every frame of a zoom re-decodes the
   whole strip. This is the performance rule stated as a behaviour. */
const lib = withoutComments(readFileSync('app/lib/filmstrip.ts', 'utf8'));
ok('and the key does not carry the block’s width',
  !/function stripKey[\s\S]{0,400}wide/.test(lib),
  'a block that grows by a pixel is the same pictures; keying on width'
  + ' decodes the lot again on every frame of a pinch');

/* ── 5. Nothing here reaches a supplier ──────────────────────────────── */

ok('the strip is made on the device, with no call out',
  !/fetch\(/.test(lib),
  'the material is already a Blob in this browser. A strip that asked a'
  + ' server would be a charge for looking at your own film');

ok('  and the object URL it makes is revoked',
  /revokeObjectURL/.test(lib),
  'one leaked blob per block per open is a tab that grows all afternoon');

ok('  and a decoder that never answers gives up',
  (lib.match(/setTimeout\(\(\) => finish\(false\)/g) ?? []).length === 2,
  'the blocks are drawn in turn, so one file that hangs blanks every strip'
  + ' after it');

/* ── 6. It is on the blocks, behind the words, and eats no presses ───── */

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the cutting room puts a strip on its blocks',
  /<FilmStrip/.test(room),
  'the arithmetic above is of no use to anybody if nothing draws it');

ok('  and hands it the piece\u2019s own trim, not the whole file',
  /<FilmStrip[\s\S]{0,300}from=\{one\.from\}[\s\S]{0,120}to=\{one\.to\}/.test(room),
  'a strip of the untrimmed material points at the wrong second of every'
  + ' piece that has been cut, which is most of them');

ok('  and the block\u2019s real width, so the count follows the zoom',
  /<FilmStrip[\s\S]{0,400}wide=\{Math\.max\(THINNEST, wide\)\}/.test(room),
  'a fixed count is four pictures smeared across a metre at one zoom and'
  + ' sixty decoded for a block nobody can see at another');

const strip = withoutComments(readFileSync('app/components/FilmStrip.tsx', 'utf8'));

ok('the strip cannot take a press meant for the block',
  /pointer-events-none/.test(strip),
  'the block is one button; a picture that swallows a tap is a block that'
  + ' stops selecting');

ok('  and it is hidden from a screen reader',
  /aria-hidden="true"/.test(strip),
  'twelve decorative pictures read out one by one, per block');

ok('  and what it remembers outlives the component',
  /^const REMEMBERED = new Map/m.test(strip),
  'blocks remount on every trim, reorder and play tick, so a cache inside'
  + ' the component decodes the whole strip again each time — which looks'
  + ' exactly like the room being slow for no reason');

ok('  and that memory is capped',
  /REMEMBERED\.size >= KEEP/.test(strip),
  'an afternoon of cutting would otherwise hold every frame of every trim'
  + ' she has tried');

ok('  and two blocks never decode the same strip at once',
  /BUSY\.has\(key\)/.test(strip) && /BUSY\.add\(key\)/.test(strip),
  'the same material at the same trim on two blocks is one piece of work');

ok('the words stay readable over a photograph',
  (strip.match(/opacity: 0\.55/g) ?? []).length === 1
  && (room.match(/textShadow: '0 1px 2px rgba\(0,0,0,0\.85\)'/g) ?? []).length === 2,
  'a bright frame under white text is a name nobody can read, and the name'
  + ' is how she tells two shots apart');

console.log(bad === 0
  ? '\ncheck:filmstrip — the pictures come from inside each slice, a short piece still shows one, and the count follows the zoom without running away.'
  : `\ncheck:filmstrip — ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);

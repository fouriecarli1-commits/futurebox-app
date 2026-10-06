/**
 * The words on a post fit, and they are not under the platform's furniture.
 *
 * ── Why this can be checked at all ───────────────────────────────────────
 *
 * Laying out text needs to know how wide a string is, which only a browser
 * that has loaded the font can say. `lib/posttext.ts` takes that as an
 * argument rather than guessing, so here it is given a ruler this file
 * controls: every character is half the font size wide. Nothing about the
 * answers depends on a real font, and every assertion below is about the
 * logic rather than about a typeface.
 *
 * ── The two failures this is for ─────────────────────────────────────────
 *
 * Text that overflows, and text that lands under the caption bar. The second
 * is the one that costs: you find out after posting, when the words you wrote
 * are behind somebody's username, and by then it is on the internet.
 */
import {
  POST_SIZES, clashes, fitText, moveInside, sizeById, wrap,
  type Box, type Measure,
} from '../app/lib/posttext';
import { ALL, boxOf } from '../app/lib/safezones';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/** Every character half the size wide. A ruler, not a font. */
const ruler: Measure = (text, px) => text.length * px * 0.5;

const square = sizeById('square')!;
const story = sizeById('story')!;

/* ── Breaking lines ───────────────────────────────────────────────────── */

const lines = wrap('die son sak oor die see', 20, 100, ruler);
ok(`a line too long for the box is broken into lines (${lines.length})`,
  lines.length > 1, JSON.stringify(lines));
ok('  and no word is cut in half',
  lines.every((one) => one.split(' ').every((word) => /^[a-z]+$/.test(word))),
  JSON.stringify(lines) + ' — a word broken mid-letter is a word nobody reads');
ok('  and every word survives, in order',
  lines.join(' ') === 'die son sak oor die see', JSON.stringify(lines));

const long = wrap('kort #hierdieisveelteenlangeetiketvirenigeplasing kort', 20, 100, ruler);
ok('a single word wider than the box gets its own line rather than being cut',
  long.some((one) => one.startsWith('#hierdieis')) && long.length >= 2,
  JSON.stringify(long) + ' — it overflows visibly, which fitText then fixes by'
  + ' making everything smaller. Cutting it would hide the problem instead');

/* ── Finding the size ─────────────────────────────────────────────────── */

const frame = { width: square.width, height: square.height };

/* A box small enough that the BOX decides the size, not the ceiling. */
const box: Box = { x: 0.1, y: 0.1, w: 0.5, h: 0.08 };
const fit = fitText('Karoo pad vol stof en son', box, frame, ruler);

ok(`the text is fitted at a readable size (${fit.px}px)`, !fit.tight && fit.px > 14,
  JSON.stringify(fit));
ok('  and the box decided it, not the ceiling', !fit.capped,
  'this assertion is about the search; a capped answer would pass the next'
  + ' one for the wrong reason');

/**
 * The LARGEST that fits, which is the whole job.
 *
 * A search that stops early returns something that fits and looks timid — a
 * caption at 40px in a box that would hold 90. Asserted from the other side:
 * one pixel bigger must not fit.
 */
const bigger = (px: number): boolean => {
  const at = wrap('Karoo pad vol stof en son', px, box.w * frame.width, ruler);
  return at.length * px * 1.2 <= box.h * frame.height
    && at.every((one) => ruler(one, px) <= box.w * frame.width);
};
ok('  and one pixel larger would not fit', !bigger(fit.px + 1),
  `${fit.px + 1}px still fits, so the search stopped short and the words are`
  + ' smaller than the box allows');

const tight = fitText(
  'hierdie is baie meer teks as wat ooit in daardie klein blokkie gaan pas, en dit gaan nie pas nie',
  { x: 0.1, y: 0.1, w: 0.2, h: 0.03 }, frame, ruler,
);
/**
 * And the other end, which was a bug until this check found it.
 *
 * `most` was 160 pixels — a constant, in a file where every other measure is
 * a fraction because an export is not always 1080 wide. Two words in a large
 * box came back at exactly 160 and the answer LOOKED measured. It was the
 * ceiling, and nothing said so.
 */
const roomy = fitText('Hallo', { x: 0.05, y: 0.05, w: 0.9, h: 0.6 }, frame, ruler);
ok(`short text in a big box stops at the ceiling and says it did (${roomy.px}px)`,
  roomy.capped && roomy.px === Math.round(frame.height * 0.2),
  JSON.stringify(roomy) + ' — a caption larger than a fifth of the frame is a'
  + ' title, and a title is a bigger box rather than a bigger ceiling');
ok('  and the ceiling is a fraction of the frame, so a taller export gets more',
  fitText('Hallo', { x: 0.05, y: 0.05, w: 0.9, h: 0.6 },
    { width: 2160, height: 3840 }, ruler).px === Math.round(3840 * 0.2),
  'a ceiling in pixels is a caption that shrinks as the export grows');

ok('text that cannot fit says so rather than overflowing quietly',
  tight.tight,
  JSON.stringify(tight.px) + ' — the screen can then say "this is as small as'
  + ' it goes". Drawing it anyway and letting somebody notice is the failure');

/* ── The furniture ────────────────────────────────────────────────────── */

const safe = boxOf(ALL);
const low: Box = { x: 0.1, y: 0.92, w: 0.5, h: 0.06 };

ok('a box in the bottom band of a STORY is flagged', clashes(low, story),
  `safe band is ${safe.top.toFixed(3)}–${(safe.top + safe.height).toFixed(3)};`
  + ' the caption, the username and the sound bar live below that');

ok('  and the same box on a SQUARE is not', !clashes(low, square),
  'nothing is printed over a feed post. A warning drawn where there is no'
  + ' furniture teaches somebody to ignore it where there is');

ok('  and a box inside the band is not flagged',
  !clashes({ x: safe.left + 0.01, y: safe.top + 0.01, w: 0.3, h: 0.05 }, story));

const moved = moveInside(low, story);
ok('a flagged box is moved out of the furniture', !clashes(moved, story),
  JSON.stringify(moved));
/**
 * Moved the SHORTEST way, which is the falsifiable version of this rule.
 *
 * The assertion here was "without being resized" — `moved.w === low.w`. It
 * could not fail. `moveInside` returns early for any box bigger than the safe
 * band, so by the time it reaches the clamp the box already fits and a
 * `Math.min` against the band is a no-op. Breaking the function on purpose
 * changed nothing and the rule stayed green: not a safety net, a decoration.
 *
 * What CAN be got wrong is where it lands. A box that hangs off the bottom
 * belongs flush against the bottom of the safe band — not centred, not at the
 * top. Somebody put their caption low on purpose; the fix for "it is under
 * the sound bar" is to lift it just clear, not to move it to the middle of
 * the picture.
 */
const bottom = safe.top + safe.height;
ok('  and lands flush against the edge it came over, not re-centred',
  Math.abs(moved.y + moved.h - bottom) < 1e-9 && moved.x === low.x,
  `${JSON.stringify(moved)} against a safe band ending at ${bottom.toFixed(4)}`
  + ' — a caption placed low on purpose should come back low, just clear'
  + ' of the furniture');
ok('  and keeps the size it was given', moved.w === low.w && moved.h === low.h,
  'kept as a statement of intent rather than as a test: the early return'
  + ' above makes a resize unreachable, and a rule that cannot fail is'
  + ' decoration. The rule that bites is the one above it');

const huge: Box = { x: 0, y: 0, w: 1, h: 1 };
const stuck = moveInside(huge, story);
ok('a box too big to be safe is left where it is, and still reads as unsafe',
  stuck.x === huge.x && stuck.y === huge.y && clashes(stuck, story),
  'moving it somewhere equally unsafe and reporting it safe is the worst of'
  + ' the three answers');

ok('  and on a square it is left alone, because there is nothing to avoid',
  moveInside(low, square) === low);

/* ── The shapes ───────────────────────────────────────────────────────── */

ok(`there are post shapes to choose from (${POST_SIZES.length})`,
  POST_SIZES.length >= 3);
ok('  and exactly one of them carries platform furniture',
  POST_SIZES.filter((one) => one.furniture).length === 1,
  POST_SIZES.filter((one) => one.furniture).map((one) => one.id).join(', ')
  + ' — the safe zones are measured for a 9:16 frame, and claiming them for a'
  + ' square would be a guide about an overlay that is not there');
ok('  and it is the one shaped like the frame they were measured against',
  story.width / story.height === 1080 / 1920,
  `${story.width}×${story.height} against the 1080×1920 those numbers were read for`);
ok('  and every shape says what it is for, in both languages',
  POST_SIZES.every((one) => one.what.en.length > 20 && one.what.af.length > 20));

if (bad) {
  console.error(`\ncheck:posttext — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:posttext — ${POST_SIZES.length} shapes, text that fits at the largest`
  + ' size it can, and a warning where the platform draws over it.',
);

/**
 * The crop box, held to the four things that can go wrong with one.
 *
 *   npm run check:cropbox
 *
 * ── Why these four ───────────────────────────────────────────────────────
 *
 * Each one is a way a crop tool fails that looks, on the screen, like the app
 * having lost the photograph:
 *
 *   1. **A box outside the picture.** `drawImage` with a source rectangle
 *      partly off the edge draws the overlap and pads the rest with nothing,
 *      so a crop dragged off the side comes back with a transparent band down
 *      one edge.
 *   2. **A box turned inside out.** Pull the north-west corner past the
 *      south-east one and the naive box has a negative width. `drawImage`
 *      accepts it and draws nothing at all.
 *   3. **A box of no size.** Rounding a small share on a small picture lands
 *      on zero, and a zero-pixel source is also drawn as nothing.
 *   4. **A box that changes size when it is only being moved.** Dragged
 *      against an edge, a box that shrinks instead of stopping comes out a
 *      different shape from the one somebody set up, and they cannot see why.
 *
 * None of them is caught by a type. All four are arithmetic, which is why
 * this is a check and not a browser probe: the browser proves the gesture
 * reaches the box, `audit/postwalk.mjs` does that, and this proves the box
 * cannot be put into a state that draws nothing.
 */
import {
  LEAST, WHOLE, cropped, cutTo, gripAt, moveBox, pullCorner, toShape, type Box,
} from '../app/lib/cropbox.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const inside = (box: Box): boolean =>
  box.left >= 0 && box.top >= 0 && box.right <= 1 && box.bottom <= 1;
const sized = (box: Box): boolean =>
  box.right - box.left >= LEAST - 1e-9 && box.bottom - box.top >= LEAST - 1e-9;
const says = (box: Box): string =>
  `${box.left.toFixed(3)},${box.top.toFixed(3)} → ${box.right.toFixed(3)},${box.bottom.toFixed(3)}`;

/* ── 1. Nothing any gesture can do puts the box outside the picture ─────
 
   Every corner, pulled to every one of a grid of points well outside the
   picture, plus every direction of drag at an absurd distance. Exhaustive
   rather than a few cases, because the failure is a band of transparency
   down one edge of a photograph and the case that produces it is whichever
   one nobody thought of. */
let out: string | null = null;
let shrunk: string | null = null;
const grips = ['nw', 'ne', 'sw', 'se'] as const;
for (const grip of grips) {
  for (let x = -2; x <= 3; x += 0.25) {
    for (let y = -2; y <= 3; y += 0.25) {
      const got = pullCorner(WHOLE, grip, x, y);
      if (!inside(got)) out ??= `${grip} pulled to ${x},${y} gave ${says(got)}`;
      if (!sized(got)) shrunk ??= `${grip} pulled to ${x},${y} gave ${says(got)}`;
    }
  }
}
ok('no corner can be pulled outside the picture', out === null, out ?? '');
ok('  and no corner can be pulled smaller than the floor', shrunk === null, shrunk ?? '');

/* ── 2. And it cannot be turned inside out ────────────────────────────── */
const flipped = pullCorner({ left: 0.2, top: 0.2, right: 0.8, bottom: 0.8 }, 'nw', 0.95, 0.95);
ok('pulling a corner past the opposite one gives a box, not a negative one',
  flipped.right > flipped.left && flipped.bottom > flipped.top && inside(flipped) && sized(flipped),
  `${says(flipped)} — drawImage accepts a negative width and draws nothing`);

/* ── 3. A moved box keeps its size, and stops at the edge ─────────────── */
const small: Box = { left: 0.3, top: 0.3, right: 0.5, bottom: 0.6 };
const far = moveBox(small, 9, 9);
ok('a box dragged off the edge stops rather than shrinking',
  Math.abs((far.right - far.left) - (small.right - small.left)) < 1e-9
  && Math.abs((far.bottom - far.top) - (small.bottom - small.top)) < 1e-9
  && inside(far),
  `${says(small)} moved by 9,9 gave ${says(far)}`);
ok('  and it really is against the edge',
  Math.abs(far.right - 1) < 1e-9 && Math.abs(far.bottom - 1) < 1e-9,
  `${says(far)} — stopping short of the edge is a box that cannot reach the corner`);
const back = moveBox(small, -9, -9);
ok('  and the same at the other two edges',
  Math.abs(back.left) < 1e-9 && Math.abs(back.top) < 1e-9
  && Math.abs((back.right - back.left) - (small.right - small.left)) < 1e-9,
  says(back));

/* ── 4. The pixels that come out are real pixels ──────────────────────── */
let zero: string | null = null;
let over: string | null = null;
for (const picture of [{ width: 16, height: 9 }, { width: 4032, height: 3024 }, { width: 1, height: 1 }]) {
  for (const box of [
    WHOLE,
    { left: 0, top: 0, right: LEAST, bottom: LEAST },
    { left: 1 - LEAST, top: 1 - LEAST, right: 1, bottom: 1 },
    { left: 0.499, top: 0.499, right: 0.501, bottom: 0.501 },
  ]) {
    const cut = cutTo(box, picture);
    if (cut.width < 1 || cut.height < 1) zero ??= `${picture.width}x${picture.height} ${says(box)} → ${JSON.stringify(cut)}`;
    if (cut.x < 0 || cut.y < 0
      || cut.x + cut.width > picture.width || cut.y + cut.height > picture.height) {
      over ??= `${picture.width}x${picture.height} ${says(box)} → ${JSON.stringify(cut)}`;
    }
  }
}
ok('every box cuts to at least one pixel by one', zero === null, zero ?? '');
ok('  and never reaches past the edge of the picture', over === null, over ?? '');

/* ── And the things a person notices ─────────────────────────────────── */
ok('the whole picture does not count as cropped', cropped(WHOLE) === false,
  'a crop button that charges or redraws for a box nobody moved');
ok('  and a box that moved does', cropped({ left: 0.1, top: 0, right: 1, bottom: 1 }));

/* A corner is grabbed in preference to the middle, and the NEAREST corner —
   on a small box a finger is within reach of two at once, and checking them
   in a fixed order makes one corner of every small box impossible to grab. */
const tight: Box = { left: 0.4, top: 0.4, right: 0.5, bottom: 0.5 };
ok('a finger near a corner takes the corner, not the middle',
  gripAt(tight, 0.41, 0.41, 0.05) === 'nw', String(gripAt(tight, 0.41, 0.41, 0.05)));
ok('  and the nearest one when two are within reach',
  gripAt(tight, 0.49, 0.49, 0.2) === 'se', String(gripAt(tight, 0.49, 0.49, 0.2)));
ok('  the middle when it is nowhere near a corner',
  gripAt(WHOLE, 0.5, 0.5, 0.05) === 'inside', String(gripAt(WHOLE, 0.5, 0.5, 0.05)));
ok('  and nothing at all outside the box',
  gripAt(tight, 0.9, 0.9, 0.05) === null, String(gripAt(tight, 0.9, 0.9, 0.05)));

/* Snapping to a shape is measured on the SCREEN, which means the picture's
   own proportions have to come into it. A box square in shares is square in
   pixels only on a square picture, and the first version of this got that
   the wrong way round. */
const photo = { width: 4000, height: 3000 };
for (const want of [1, 9 / 16, 16 / 9]) {
  const snapped = toShape(WHOLE, photo, want);
  const w = (snapped.right - snapped.left) * photo.width;
  const h = (snapped.bottom - snapped.top) * photo.height;
  ok(`snapping to ${want.toFixed(3)} comes out that shape on the screen`,
    Math.abs(w / h - want) < 0.01 && inside(snapped),
    `${(w / h).toFixed(3)} — ${says(snapped)} on a ${photo.width}x${photo.height} picture`);
}
const smaller = toShape({ left: 0.25, top: 0.25, right: 0.75, bottom: 0.75 }, photo, 1);
ok('  and snapping never brings in anything the box did not hold',
  smaller.left >= 0.25 - 1e-9 && smaller.top >= 0.25 - 1e-9
  && smaller.right <= 0.75 + 1e-9 && smaller.bottom <= 0.75 + 1e-9,
  `${says(smaller)} — a snap that grows the box undoes the crop somebody just set`);

if (bad) {
  console.error(`\ncheck:cropbox — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:cropbox — no gesture can put the crop box outside the picture, inside'
  + ' out, or down to nothing, and moving it never changes its size.',
);

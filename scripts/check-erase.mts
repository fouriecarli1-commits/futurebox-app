/**
 * The eraser, in numbers.
 *
 * ── Why this is arithmetic and not a screen ──────────────────────────────
 *
 * Carli, 7 October 2026: *"magic eraser"*. The algorithm is ours — the
 * background remover's model is Google's, but every pixel this writes is
 * written by `app/lib/erase.ts` — so the only honest test is to put known
 * pixels in and check the ones that come out.
 *
 * ── The assertion the whole file is for ──────────────────────────────────
 *
 * **Nothing outside the mask is ever written.** A photograph that comes back
 * subtly different everywhere is the worst outcome available here: nobody
 * would see it on a phone, it would be in every post she ever made, and it
 * would be blamed on the camera.
 *
 * It is also the easiest thing in the world to get wrong, because pass two
 * smooths and a smoothing pass that forgets which pixels it may touch looks
 * completely fine on any picture anybody tries.
 *
 *   npm run check:erase
 */
import { SMOOTHS, TOO_MUCH, brush, erase, shareOf, stroke } from '../app/lib/erase';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** An ImageData without a browser. Only the three fields `erase` reads. */
const picture = (width: number, height: number, paint: (x: number, y: number) => [number, number, number]) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y);
      const p = (y * width + x) * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
  }
  return { width, height, data } as unknown as ImageData;
};

const at = (one: ImageData, x: number, y: number): [number, number, number] => {
  const p = (y * one.width + x) * 4;
  return [one.data[p], one.data[p + 1], one.data[p + 2]];
};

/* ── A green blob on a flat blue wall ────────────────────────────────────── */

const SIDE = 64;
const BLUE: [number, number, number] = [40, 90, 200];

/**
 * A wall with a grain in it, and that grain is the whole point.
 *
 * The first version of this was FLAT blue, and three breaks walked straight
 * past it — including the one that matters most. Smoothing a flat region
 * changes nothing: the average of nine identical pixels is that pixel. So a
 * smoothing pass that touched every pixel in the photograph was invisible to
 * the assertion written to catch exactly that.
 *
 * A fixture that cannot show the fault is worse than no fixture, because it
 * is read as cover. Two units of grain is enough to make any averaging
 * anywhere show up, and little enough that the fill still has a flat-ish
 * wall to grow.
 */
const grain = (x: number, y: number): [number, number, number] => [
  BLUE[0] + ((x + y) % 2) * 2,
  BLUE[1] + ((x * 3 + y) % 3) * 2,
  BLUE[2] - ((x + y * 2) % 2) * 2,
];
const flat = picture(SIDE, SIDE, (x, y) => (
  x >= 26 && x < 38 && y >= 26 && y < 38 ? [0, 220, 0] : grain(x, y)));
const blob = new Uint8Array(SIDE * SIDE);
for (let y = 26; y < 38; y += 1) for (let x = 26; x < 38; x += 1) blob[y * SIDE + x] = 1;

const before = Uint8ClampedArray.from(flat.data);
const done = erase(flat, blob);
ok('a thing on a flat wall can be erased', done.ok === true);

if (done.ok) {
  let green = 0;
  for (let y = 26; y < 38; y += 1) {
    for (let x = 26; x < 38; x += 1) {
      const [r, g, b] = at(flat, x, y);
      if (g > 120 && r < 120 && b < 120) green += 1;
    }
  }
  ok('  and none of it is left', green === 0, `${green} of 144 pixels are still green`);

  let wrong = 0;
  for (let y = 26; y < 38; y += 1) {
    for (let x = 26; x < 38; x += 1) {
      const [r, g, b] = at(flat, x, y);
      if (Math.abs(r - BLUE[0]) > 8 || Math.abs(g - BLUE[1]) > 8 || Math.abs(b - BLUE[2]) > 8) wrong += 1;
    }
  }
  ok('  and what is there instead is the wall', wrong === 0,
    `${wrong} of 144 filled pixels are not the colour of the wall around them`);

  /* THE rule. Every byte outside the mask, compared one for one. */
  let touched = 0;
  for (let i = 0; i < before.length; i += 1) {
    const pixel = Math.floor(i / 4);
    if (blob[pixel]) continue;
    if (before[i] !== flat.data[i]) touched += 1;
  }
  ok('and not one pixel outside the mask was written', touched === 0,
    `${touched} bytes changed outside the mask — a photograph subtly different`
    + ' everywhere is invisible on a phone and in every post she ever makes');

  ok('  and it finished in rounds, not in a loop that cannot end',
    done.rounds > 0 && done.rounds < SIDE, `${done.rounds} rounds for a 12-pixel hole`);
}

/* ── It fills from every edge, not from one corner ───────────────────────── */

/* Symmetry, which is the only thing that catches the fault it is for.
 
   A hole exactly on the line between a red half and a blue half must fill
   symmetrically: as many of its pixels redder as bluer, because every ring
   is decided before any of it is written.
 
   Reading the colour near each edge of the hole did NOT catch it. Filling as
   it goes still leaves the pixel beside the red wall red and the one beside
   the blue wall blue; the bias is in the middle, where each pixel averages
   from one its own neighbour invented a moment earlier. Measured rather than
   guessed at: a ring at a time gives 72 and 72, filling as it goes gives 80
   and 64 — dragged toward the corner the scan starts in. */
const halves = picture(SIDE, SIDE, (x, y) => (
  y >= 26 && y < 38 && x >= 26 && x < 38
    ? [0, 220, 0]
    : (x < 32 ? [200, 0, 0] : [0, 0, 200])));
const twoSides = new Uint8Array(SIDE * SIDE);
for (let y = 26; y < 38; y += 1) for (let x = 26; x < 38; x += 1) twoSides[y * SIDE + x] = 1;
erase(halves, twoSides);
let redder = 0;
let bluer = 0;
for (let y = 26; y < 38; y += 1) {
  for (let x = 26; x < 38; x += 1) {
    const [r, , b] = at(halves, x, y);
    if (r > b) redder += 1; else if (b > r) bluer += 1;
  }
}
ok('a hole on the line between two colours fills evenly from both',
  redder === bluer && redder > 0,
  `${redder} pixels came out redder and ${bluer} bluer — filling as it goes`
  + ' rather than a ring at a time drags the hole toward the corner the scan'
  + ' starts in');

/* ── It refuses what it is the wrong tool for ────────────────────────────── */

const empty = erase(picture(8, 8, () => BLUE), new Uint8Array(64));
ok('an empty mask is refused rather than quietly doing nothing',
  empty.ok === false && empty.why === 'nothing');

const most = new Uint8Array(64).fill(1);
const greedy = erase(picture(8, 8, () => BLUE), most);
ok(`a mask over more than ${Math.round(TOO_MUCH * 100)}% of the picture is refused`,
  greedy.ok === false && greedy.why === 'toomuch',
  'growing the edges inwards over half a photograph is a smear, and offering'
  + ' it as an erase is promising something this cannot do');

/* A wrong-sized mask that is NOT empty.
 
   An empty one was refused with or without the size guard — `shareOf` of all
   zeros is nought and the "nothing to do" refusal caught it — so removing the
   guard failed nothing and the assertion was cover. Filled, the guard is the
   only thing between this and a loop reading past the end of a typed array. */
const mismatched = erase(picture(8, 8, () => BLUE), new Uint8Array(10).fill(1));
ok('  and a mask of the wrong size is refused for being the wrong size',
  mismatched.ok === false && mismatched.why === 'nothing',
  'reading past a typed array gives undefined, which becomes NaN, which'
  + ' becomes a transparent pixel');

/* ── The share, and the brush ────────────────────────────────────────────── */

ok('the share of a mask is counted right',
  shareOf(new Uint8Array(0)) === 0
  && shareOf(new Uint8Array(4).fill(1)) === 1
  && shareOf(Uint8Array.from([1, 0, 1, 0])) === 0.5);

const mask = new Uint8Array(21 * 21);
brush(mask, 21, 21, 10, 10, 5);
ok('a brush paints a round patch', mask[10 * 21 + 10] === 1 && mask[10 * 21 + 5] === 1
  && mask[0] === 0, 'the middle, the edge of the circle, and the far corner');

const edge = new Uint8Array(21 * 21);
brush(edge, 21, 21, 0, 0, 5);
ok('  and a brush at the corner paints what it can rather than reading off the end',
  edge[0] === 1 && edge[20] === 0 && edge[21 * 21 - 1] === 0,
  'a brush half outside the picture must not wrap onto the next row');

/* ── A stroke leaves nothing between its samples ─────────────────────────
 
   The bug this is for would have shipped and looked like the whole feature
   not working. One disc per pointer event leaves unmasked specks twenty
   pixels apart, those specks are pixels of the thing being erased, and the
   fill grows them straight back over the hole.
 
   Measured as the SOLIDITY of what a stroke paints: a bounding box that is
   fully covered. Counting masked pixels would not catch it — a row of discs
   covers most of the box and still ruins the result. */
const SPAN = 120;
const dotted = new Uint8Array(SPAN * SPAN);
for (let step = 0; step <= 4; step += 1) brush(dotted, SPAN, SPAN, 20 + step * 20, 60, 10);
const joined = new Uint8Array(SPAN * SPAN);
stroke(joined, SPAN, SPAN, 20, 60, 100, 60, 10);

/** Whether every pixel of a box is masked. */
const solid = (mask: Uint8Array, x0: number, x1: number, y0: number, y1: number): number => {
  let gaps = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) if (!mask[y * SPAN + x]) gaps += 1;
  }
  return gaps;
};

ok('a stroke covers everything between its ends',
  solid(joined, 25, 95, 56, 64) === 0,
  `${solid(joined, 25, 95, 56, 64)} pixels inside the stroke are unpainted —`
  + ' every one of them is a speck of the thing being erased, and the fill'
  + ' grows it straight back over the hole');
ok('  which a row of separate dots does not',
  solid(dotted, 25, 95, 56, 64) > 0,
  'the fixture meant to show the fault has no gaps in it either, so the'
  + ' assertion above is proving nothing');

/* And a stroke that goes nowhere still paints, or the first touch of a tap
   leaves no mark at all. */
const tapped = new Uint8Array(SPAN * SPAN);
stroke(tapped, SPAN, SPAN, 60, 60, 60, 60, 10);
ok('  and a tap that does not move still paints', tapped[60 * SPAN + 60] === 1);

if (bad) {
  console.error(`\ncheck:erase — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:erase — a hole fills from every edge it has, in ${SMOOTHS} smoothing passes`
  + ' over only what it wrote, and not one pixel outside the mask is ever touched.',
);

/**
 * The things in a photograph, found and lifted out.
 *
 *   npm run check:gryp
 *
 * ── The one that would ship ──────────────────────────────────────────────
 *
 * Gemini answers a box as **[ymin, xmin, ymax, xmax]**, normalised to
 * 0–1000. Not x first. A reader that assumes the ordinary order produces a
 * box that is plausible, drawable, and wrong — and on a square picture of a
 * centred subject it is ALMOST right, which is the worst way to be wrong:
 * it looks like an engine having a bad day rather than like our arithmetic.
 *
 * So the box below is deliberately lopsided and off-centre, and swapping the
 * pairs cannot pass it.
 *
 * ── And the one underneath it ────────────────────────────────────────────
 *
 * The mask arrives at its own size, usually smaller than the box. Read by
 * index instead of by proportion, the cut comes out recognisably the right
 * shape and a few pixels adrift — again indistinguishable, from the outside,
 * from a poor engine.
 *
 * ── Why none of this needs a key ─────────────────────────────────────────
 *
 * `lib/grabobject.ts` calls nothing. It says what to ask, reads what came
 * back, and turns a mask into a cut; the key, the caller check and the
 * charge live in the route. So every rule here runs with no network and no
 * rand spent — which is the only reason they can run on every push.
 */
import {
  ASK, GRID, INSIDE, MOST_THINGS, SHORTEST_LABEL, boxOf, liftWith, readFound,
} from '../app/lib/grabobject.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe things in a photograph, found and lifted out\n');

/* ── The ask ────────────────────────────────────────────────────────── */

ok('the ask says the order the box comes in',
  ASK.includes('[ymin, xmin, ymax, xmax]'),
  'an instruction that does not name the order gets whichever order the'
  + ' engine feels like, and both of them parse');

ok('  and names the scale',
  ASK.includes('0-1000'),
  'asked without a scale it answers in pixels sometimes and in fractions'
  + ' other times, and a fraction read as a pixel is a box one pixel wide');

ok('  and asks for JSON and nothing else',
  /JSON only/i.test(ASK) && /No prose/i.test(ASK),
  'a sentence in front of the JSON is the most common answer there is');

ok('  and caps what it asks for',
  ASK.includes(String(MOST_THINGS)) && MOST_THINGS <= 20,
  'forty boxes on a phone is a tap that lands on whichever one happens to'
  + ' be on top');

/* ── The box, which is the trap ─────────────────────────────────────── */

/* Lopsided on purpose: tall and narrow, far from the middle, on a picture
   that is not square. Swap the pairs and nothing about this fits. */
const grid = [100, 600, 900, 750];
const box = boxOf(grid, 2000, 1000);

ok('a box is read y-first, as the engine sends it',
  box !== null
  && box.left === 1200 && box.right === 1500
  && box.top === 100 && box.bottom === 900,
  JSON.stringify(box)
  + ' — [ymin, xmin, ymax, xmax] read as [xmin, ymin, xmax, ymax] gives a'
  + ' box that draws fine and is in the wrong place');

ok('  and the grid is 1000, not the picture',
  GRID === 1000 && boxOf([0, 0, GRID, GRID], 640, 480)?.right === 640);

ok('a box the wrong way round is refused, not flipped',
  boxOf([900, 600, 100, 750], 2000, 1000) === null,
  'quietly flipping it hides an engine that has started answering in a'
  + ' different order, which is a thing to find out about');

ok('  and one off the grid is refused',
  boxOf([0, 0, 1400, 500], 100, 100) === null);

ok('  and a box of the wrong length is refused',
  boxOf([1, 2, 3], 100, 100) === null && boxOf([], 100, 100) === null);

/* ── Reading the answer ─────────────────────────────────────────────── */

const answer = JSON.stringify([
  { label: 'a red bicycle', box_2d: [100, 600, 900, 750], mask: 'A'.repeat(64) },
  { label: 'a postbox', box_2d: [0, 0, 500, 500] },
]);

const found = readFound(answer, 2000, 1000);
ok('two things are read out of a clean answer', found.length === 2, String(found.length));
ok('  with their labels', found[0]?.label === 'a red bicycle');
ok('  and their boxes in pixels', found[0]?.box.left === 1200);
ok('  and a mask when one came', found[0]?.mask?.length === 64);
ok('  and null when one did not, rather than an empty string',
  found[1]?.mask === null,
  'an empty string is a mask as far as the next line is concerned, and it'
  + ' cuts out nothing at all');

ok('a fence and a sentence in front of it do not stop it',
  readFound(`Here is the JSON:\n\`\`\`json\n${answer}\n\`\`\``, 2000, 1000).length === 2,
  'this is what an engine actually answers about a third of the time');

ok('  and a data: prefix is taken off the mask',
  readFound(JSON.stringify([{
    label: 'a cat', box_2d: [0, 0, 500, 500],
    mask: `data:image/png;base64,${'A'.repeat(64)}`,
  }]), 100, 100)[0]?.mask === 'A'.repeat(64),
  'left on, it is decoded as part of the picture and the decode fails');

ok('  and the other spelling of the key is read',
  readFound(JSON.stringify([{ label: 'a cat', box: [0, 0, 500, 500] }]), 100, 100).length === 1,
  '`box_2d` is documented and `box` is what sometimes arrives');

{
  const both = readFound(JSON.stringify([
    { kind: 'object', label: 'an owl', box_2d: [100, 500, 600, 900] },
    { kind: 'text', label: 'Groot vrae. Klein uil. Groot aha.', box_2d: [900, 300, 950, 900], mask: 'x'.repeat(64) },
  ]), 1000, 1000);
  ok('writing comes back as text, word for word, with no mask to cut by',
    both.length === 2 && both[0].kind === 'object' && both[1].kind === 'text'
      && both[1].label === 'Groot vrae. Klein uil. Groot aha.' && both[1].mask === null,
    JSON.stringify(both));
  ok('  and a row that does not say is an object',
    readFound(JSON.stringify([{ label: 'a cat', box_2d: [0, 0, 500, 500] }]), 100, 100)[0]?.kind === 'object');
}
ok('an answer cut off part of the way keeps every entry that arrived whole',
  readFound('[{"label":"an owl","box_2d":[0,0,500,500]},{"label":"a wo', 100, 100).length === 1);
ok('nothing is read out of prose', readFound('I cannot see any objects.', 100, 100).length === 0);
ok('  or out of broken JSON', readFound('[{"label": "a cat",', 100, 100).length === 0);
ok('  or out of an object that is not a list', readFound('{"label":"a cat"}', 100, 100).length === 0);

ok('a row with no usable box is dropped, not defaulted',
  readFound(JSON.stringify([
    { label: 'a cat', box_2d: [9, 9, 1, 1] },
    { label: 'a dog', box_2d: [0, 0, 500, 500] },
  ]), 100, 100).map((one) => one.label).join() === 'a dog',
  'a box in the wrong place is a tap that lifts the wrong part of her'
  + ' photograph, which is worse than one thing fewer in the list');

ok('  and so is a row with no label worth showing',
  readFound(JSON.stringify([{ label: 'x', box_2d: [0, 0, 500, 500] }]), 100, 100).length === 0
  && SHORTEST_LABEL === 2);

ok('and more than the cap is cut off',
  readFound(JSON.stringify(
    Array.from({ length: 30 }, () => ({ label: 'a thing', box_2d: [0, 0, 500, 500] })),
  ), 100, 100).length === MOST_THINGS);

/* ── The cut ────────────────────────────────────────────────────────── */

/** A picture where every pixel says where it is, so a shift is visible. */
const picture = (() => {
  const wide = 40; const tall = 20;
  const data = new Uint8ClampedArray(wide * tall * 4);
  for (let y = 0; y < tall; y += 1) {
    for (let x = 0; x < wide; x += 1) {
      const at = (y * wide + x) * 4;
      data[at] = x * 6; data[at + 1] = y * 12; data[at + 2] = 7; data[at + 3] = 255;
    }
  }
  return { data, width: wide, height: tall };
})();

/** A mask half the size of the box, white on the left half only. */
const mask = (() => {
  const wide = 5; const tall = 5;
  const data = new Uint8ClampedArray(wide * tall * 4);
  for (let y = 0; y < tall; y += 1) {
    for (let x = 0; x < wide; x += 1) {
      const at = (y * wide + x) * 4;
      /* A soft column in the middle, because a real mask is a probability
         and its edge runs from nothing to everything over a few pixels.
         Without one here, hardening the alpha into a stencil changes
         nothing and the assertion below cannot fail — which is what
         happened the first time it was run against that mutation. */
      const on = x < 2 ? 255 : x === 2 ? 128 : 0;
      data[at] = on; data[at + 1] = on; data[at + 2] = on; data[at + 3] = 255;
    }
  }
  return { data, width: wide, height: tall };
})();

const cutBox = { left: 10, top: 4, right: 30, bottom: 14 };
const lifted = liftWith(picture, cutBox, mask);

ok('the cut is the size of the box, not of the picture',
  lifted?.width === 20 && lifted?.height === 10,
  `${lifted?.width}x${lifted?.height} — carrying the rest of the photograph`
  + ' around as transparent pixels makes every later step slower and every'
  + ' saved file bigger for nothing');

ok('  and its top-left pixel is the box’s top-left pixel of the picture',
  lifted !== null && lifted.data[0] === picture.data[((4 * 40) + 10) * 4]
  && lifted.data[1] === picture.data[((4 * 40) + 10) * 4 + 1],
  'off by the box offset, the cut is the right shape and the wrong part of'
  + ' the photograph');

ok('  and the mask is read by proportion, not by index',
  lifted !== null
  && lifted.data[(0 * 20 + 7) * 4 + 3] === 255
  && lifted.data[(0 * 20 + 12) * 4 + 3] === 0,
  'the mask is 5 wide and the box is 20: by index everything past the fifth'
  + ' column is transparent, which is a cut that is nearly right and looks'
  + ' like a poor engine rather than like our arithmetic');

ok('  and the mask decides the alpha, not a yes or a no',
  lifted !== null && lifted.data[(0 * 20 + 10) * 4 + 3] === 128,
  `${lifted?.data[(0 * 20 + 10) * 4 + 3]} — the mask's half-lit column came`
  + ' back fully opaque, so the soft edge is gone. That is the'
  + ' cut-out-with-scissors look, and it is what stops a lifted thing from'
  + ' sitting on a new background');

ok('  and a pixel under the floor is nothing at all',
  lifted !== null && lifted.data[(0 * 20 + 18) * 4 + 3] === 0
  && INSIDE > 0 && INSIDE < 128);

ok('a cut with no size is refused',
  liftWith(picture, { left: 10, top: 4, right: 10, bottom: 14 }, mask) === null);

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

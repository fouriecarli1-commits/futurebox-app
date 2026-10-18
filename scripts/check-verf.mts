/**
 * A cut-out shape given a new colour, without losing the cut.
 *
 *   npm run check:verf
 *
 * ── What is actually at risk ─────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"om 'n logo, of 'n objek se kleur te kan verander
 * ... die pearlescent funksie ... waar twee na 3 kleure saam blend"*.
 *
 * She reaches this with a mark she has just cut out by hand, and the cut is
 * the expensive part. So the thing to hold is not "it is the right colour" —
 * she can see that — but everything that happens to be true about the
 * picture and is easy to destroy on the way:
 *
 * **The alpha.** Every soft edge, every hole inside a letter, the whole
 * result of the remover. Touched by one line of arithmetic and it is a halo
 * back, or a staircase, and she would have to cut it out again.
 *
 * **The order of the ramp.** Two stops read backwards give a mirror of the
 * blend. That is a picture that is wrong and looks completely deliberate,
 * which is the worst kind of wrong to ship.
 *
 * **Where the blend starts.** Pinned to the canvas rather than the shape, a
 * mark in the corner of a big transparent sheet gets one sliver of the ramp
 * and comes out flat — and "flat" is exactly what somebody asking for a
 * pearlescent blend would report as "it does not work".
 *
 * **Transparent pixels.** Painted, they are invisible until the day somebody
 * saves as JPG or puts it on white, and then there is a coloured rectangle
 * where the picture used to be.
 */
import {
  MOST_COLOURS, SOMETHING, lightOf, rampAt, repaint, rgbOf, shapeOf, type Sheet,
} from '../app/lib/repaint.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA cut-out shape given a new colour, without losing the cut\n');

/* ── Reading a colour ───────────────────────────────────────────────── */

ok('a six-digit colour is read', String(rgbOf('#1f3a5f')) === '31,58,95');
ok('  and a three-digit one', String(rgbOf('#f0a')) === '255,0,170');
ok('  and one without its hash', String(rgbOf('1f3a5f')) === '31,58,95');
for (const junk of ['', '#', 'navy', '#12345', '#gggggg', '#1f3a5f7f']) {
  ok(`  and ${JSON.stringify(junk)} is refused rather than read as black`,
    rgbOf(junk) === null,
    'a colour that silently becomes black is a logo that silently becomes a'
    + ' silhouette');
}

/* ── The ramp ───────────────────────────────────────────────────────── */

const red: [number, number, number] = [255, 0, 0];
const blue: [number, number, number] = [0, 0, 255];
const green: [number, number, number] = [0, 255, 0];

ok('one colour is the same colour everywhere',
  String(rampAt([red], 0)) === '255,0,0' && String(rampAt([red], 1)) === '255,0,0');

ok('two colours run from the first to the second, in that order',
  String(rampAt([red, blue], 0)) === '255,0,0'
  && String(rampAt([red, blue], 1)) === '0,0,255',
  'read backwards this is a mirror image of the blend she asked for, and it'
  + ' looks entirely deliberate');

ok('  and meet in the middle',
  String(rampAt([red, blue], 0.5)) === '128,0,128');

ok('three colours put the middle one in the middle',
  String(rampAt([red, green, blue], 0.5)) === '0,255,0',
  'a three-stop ramp that treats the middle stop as a second start spends'
  + ' half the shape on a colour she did not ask for');

ok('  and a quarter of the way is halfway to the middle one',
  String(rampAt([red, green, blue], 0.25)) === '128,128,0');

/* ── The half of a three-stop ramp nothing was looking at ─────────────
 
   The two assertions above sample at 0.25 and 0.5, and BOTH of them pass a
   ramp that has forgotten the middle stop entirely: with the first stop
   pinned at index 0 the arithmetic happens to agree for the whole first
   half, and only diverges after it. The mutation was run, it passed, and
   the gap was in the test rather than in the code.
 
   So the second half is sampled too, and the far end most of all: that is
   where a forgotten middle stop stops interpolating and starts
   extrapolating, which on a real picture is a blend that runs off into a
   colour nobody chose. */
ok('  and three-quarters of the way is halfway from the middle to the last',
  String(rampAt([red, green, blue], 0.75)) === '0,128,128',
  String(rampAt([red, green, blue], 0.75)));

ok('  and the far end is the LAST colour, not the ramp overshooting',
  String(rampAt([red, green, blue], 1)) === '0,0,255',
  String(rampAt([red, green, blue], 1)));

ok('past the end is the end, not the beginning again',
  String(rampAt([red, blue], 1.4)) === '0,0,255'
  && String(rampAt([red, blue], -0.4)) === '255,0,0',
  'a wrap puts a seam down the middle of the shape');

ok('three is as many as blend',
  MOST_COLOURS === 3,
  'her words: "twee na 3 kleure"');

/* ── A shape to paint ───────────────────────────────────────────────── */

/** A sheet with a solid block in it, and nothing anywhere else. */
function sheetWith(
  wide: number, tall: number,
  block: { left: number; top: number; right: number; bottom: number },
  colour: [number, number, number] = [20, 20, 20],
  edgeAlpha = 255,
): Sheet {
  const data = new Uint8ClampedArray(wide * tall * 4);
  for (let y = block.top; y <= block.bottom; y += 1) {
    for (let x = block.left; x <= block.right; x += 1) {
      const at = (y * wide + x) * 4;
      data[at] = colour[0]; data[at + 1] = colour[1]; data[at + 2] = colour[2];
      /* The left column half-transparent, standing in for the soft edge a
         real cut leaves behind. */
      data[at + 3] = x === block.left ? edgeAlpha : 255;
    }
  }
  return { data, width: wide, height: tall };
}

const box = { left: 10, top: 4, right: 19, bottom: 9 };
const sheet = sheetWith(40, 20, box, [20, 20, 20], 128);

const found = shapeOf(sheet);
ok('the shape is found by its alpha, not by its colour',
  found !== null && found.left === 10 && found.top === 4
  && found.right === 19 && found.bottom === 9,
  JSON.stringify(found));

ok('  and an empty sheet has no shape rather than a wrong one',
  shapeOf({ data: new Uint8ClampedArray(16), width: 2, height: 2 }) === null);

/* ── The paint ──────────────────────────────────────────────────────── */

const alphaOf = (one: Sheet): number[] => {
  const out: number[] = [];
  for (let at = 3; at < one.data.length; at += 4) out.push(one.data[at]);
  return out;
};

const flat = repaint(sheet, { colours: ['#ff0000'] });
ok('painting answers a sheet', flat !== null);

ok('  and every transparent pixel is left alone',
  flat !== null && (() => {
    for (let at = 0; at < sheet.data.length; at += 4) {
      if (sheet.data[at + 3] >= SOMETHING) continue;
      if (flat.data[at] || flat.data[at + 1] || flat.data[at + 2]) return false;
    }
    return true;
  })(),
  'colour under a transparent pixel is invisible until somebody saves as JPG'
  + ' or drops it on white, and then there is a coloured rectangle where the'
  + ' picture was');

ok('  and the alpha channel comes back untouched, every pixel',
  flat !== null && String(alphaOf(flat)) === String(alphaOf(sheet)),
  'the alpha IS the cut — every soft edge and every hole inside a letter. A'
  + ' recolour that touches it is a cut she has to do again');

ok('  and the half-transparent edge keeps being half transparent',
  flat !== null && flat.data[((4 * 40) + 10) * 4 + 3] === 128,
  'this is the anti-aliased line the remover worked to keep');

ok('  and the solid part really is the new colour',
  flat !== null && String([0, 1, 2].map((one) => flat.data[((6 * 40) + 15) * 4 + one]))
    === '255,0,0');

ok('  and the sheet it was given is not written into',
  sheet.data[((6 * 40) + 15) * 4] === 20,
  '"Put it back" restores the picture from before, and a function that edits'
  + ' in place has already destroyed it');

ok('a colour that cannot be read paints nothing at all',
  repaint(sheet, { colours: ['bogus'] }) === null,
  'better a button that does nothing visible than a logo turned black');

/* ── The blend, across the shape ────────────────────────────────────── */

const swept = repaint(sheet, { colours: ['#ff0000', '#0000ff'], angle: 0 });
const atX = (one: Sheet, x: number): string =>
  String([0, 1, 2].map((c) => one.data[((6 * 40) + x) * 4 + c]));

/* Sampled at the shape's own first column, 10, and not at 11: one pixel in
   the ramp has already moved, and a test that samples inside the shape and
   demands the starting colour fails a correct blend. Which it did, first
   time round. */
ok('the blend starts at the shape’s own left edge, not the canvas’s',
  swept !== null && atX(swept, 10) === '255,0,0',
  `${swept ? atX(swept, 10) : 'nothing'} — pinned to the canvas, a mark in the`
  + ' corner of a big sheet gets one sliver of the ramp and comes out flat,'
  + ' which is exactly what "the pearlescent does not work" looks like');

ok('  and ends at its right edge',
  swept !== null && atX(swept, 19) === '0,0,255',
  swept ? atX(swept, 19) : 'nothing');

ok('  and has already begun to move one pixel in',
  swept !== null && atX(swept, 11) !== '255,0,0',
  'a ramp that only changes at the very ends is a flat fill with two edges');

ok('  and really does change across the shape',
  swept !== null && atX(swept, 11) !== atX(swept, 15)
  && atX(swept, 15) !== atX(swept, 19),
  'a blend that comes out one colour is a flat fill wearing its name');

const down = repaint(sheet, { colours: ['#ff0000', '#0000ff'], angle: 90 });
const atY = (one: Sheet, y: number): string =>
  String([0, 1, 2].map((c) => one.data[((y * 40) + 15) * 4 + c]));
ok('  and the angle turns it',
  down !== null && atY(down, 4) !== atY(down, 9)
  && String([0, 1, 2].map((c) => down.data[((6 * 40) + 11) * 4 + c]))
    === String([0, 1, 2].map((c) => down.data[((6 * 40) + 18) * 4 + c])),
  'at 90° the colour must change down the shape and NOT across it');

/* ── Shading ────────────────────────────────────────────────────────── */

/* Two halves at different lightness, which is a photographed object rather
   than flat artwork. */
const lit = (() => {
  const one = sheetWith(40, 20, box, [200, 200, 200]);
  for (let y = box.top; y <= box.bottom; y += 1) {
    for (let x = 15; x <= box.right; x += 1) {
      const at = (y * 40 + x) * 4;
      one.data[at] = 60; one.data[at + 1] = 60; one.data[at + 2] = 60;
    }
  }
  return one;
})();

const kept = repaint(lit, { colours: ['#ff0000'], keepShading: true });
ok('an object’s own light and shade survives a repaint',
  kept !== null && kept.data[((6 * 40) + 12) * 4] > kept.data[((6 * 40) + 17) * 4],
  'the lit side and the shadowed side come back the same, which hands back a'
  + ' sticker where there was an object');

ok('  and the lit side is the full colour rather than a dimmed one',
  kept !== null && kept.data[((6 * 40) + 12) * 4] >= 250,
  'measured against white instead of against the brightest pixel in the'
  + ' shape, a dark object comes back almost black');

/* ── Flat line work must come back at the FULL colour ─────────────────
 
   The failure this is for shipped into a screenshot before anybody noticed:
   a navy mark painted orange came out muddy. Anti-aliased line work has soft
   edges that are part background and therefore LIGHTER than the line, so
   measuring the brightest pixel across everything non-transparent finds an
   edge, and the body of the line is dimmed against it.
 
   The sheet below is exactly that: a solid line with a half-transparent
   column down its left, which is what every cut-out drawing looks like. */
const inked = (() => {
  const one = sheetWith(40, 20, box, [31, 58, 95], 128);
  /* And the edge is LIGHTER as well as thinner, which is the whole point: a
     feathered pixel is part line and part the white it was cut from. The
     first version of this fixture gave the edge the same colour as the line,
     so the brightest pixel was the same either way and the assertion below
     could not fail. Found by reverting the fix and watching it pass. */
  for (let y = box.top; y <= box.bottom; y += 1) {
    const at = (y * 40 + box.left) * 4;
    one.data[at] = 150; one.data[at + 1] = 170; one.data[at + 2] = 195;
  }
  return one;
})();
const painted = repaint(inked, { colours: ['#ff7a00'], keepShading: true });
ok('flat line work keeps its full colour even with shading kept on',
  painted !== null
  && String([0, 1, 2].map((c) => painted.data[((6 * 40) + 15) * 4 + c])) === '255,122,0',
  painted
    ? String([0, 1, 2].map((c) => painted.data[((6 * 40) + 15) * 4 + c]))
    : 'nothing');

ok('  and the soft edge is shaded rather than clipped away',
  painted !== null && painted.data[((6 * 40) + 10) * 4 + 3] === 128,
  'the feathering is still the cut, whatever colour it is now');

const ignored = repaint(lit, { colours: ['#ff0000'], keepShading: false });
ok('  and flat artwork can ask for it to be ignored',
  ignored !== null
  && ignored.data[((6 * 40) + 12) * 4] === ignored.data[((6 * 40) + 17) * 4]);

ok('  and lightness is the same arithmetic the rest of the app uses',
  Math.abs(lightOf(255, 255, 255) - 1) < 1e-9 && lightOf(0, 0, 0) === 0);

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

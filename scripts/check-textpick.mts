/**
 * Tapping the writing in a photograph.
 *
 *   npm run check:textpick
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"dat dit AI integrated is en die masjien
 * identifiseer self objekte en text wat dan highlight en dan kan die klient
 * op die objekte of text click wat hulle graag wil grab, rondskuif, of
 * delete."*
 *
 * ── Why the arithmetic is the whole risk ─────────────────────────────────
 *
 * There are three frames of reference in one gesture and they are all
 * different sizes: the picture's own pixels, which is what the engine read
 * and what the eraser works in; shares of the picture, which is what the
 * room stores; and the canvas, which is a third of either on a phone.
 *
 * Get the conversion wrong and nothing throws. The highlight lands near the
 * words, the tap selects the line above, and the erase takes out a rectangle
 * beside the writing — all of which read as the FEATURE being inaccurate
 * rather than as a scale factor being applied once too often. That is the
 * kind of fault a browser probe is bad at catching and arithmetic is good
 * at, so the conversion lives in a pure module and is held here.
 */
import {
  fromFrame, maskFor, middleOf, ontoFrame, pickAt, picksFrom, shareOf, type Pick,
} from '../app/lib/textpick.ts';
import type { Found } from '../app/lib/ocr.ts';
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const line = (
  text: string, left: number, top: number, width: number, height: number, sure = 90,
): Found => ({ text, sure, left, top, width, height });

/* A thousand-pixel picture, so a share is a thousandth and the arithmetic
   below can be read without a calculator. */
const WIDE = 1000;
const TALL = 500;

/* ── 1. Pixels become shares, once ──────────────────────────────────── */
{
  const picks = picksFrom([line('AANDKLAS', 100, 50, 400, 60)], WIDE, TALL);
  ok('a box in the picture’s pixels becomes a share of the picture',
    picks.length === 1
      && picks[0].x === 0.1 && picks[0].y === 0.1
      && picks[0].w === 0.4 && picks[0].h === 0.12,
    JSON.stringify(picks[0]));
  ok('  and keeps the words it found',
    picks[0]?.text === 'AANDKLAS' && picks[0]?.sure === 90,
    JSON.stringify(picks[0]));
}

ok('a picture of no size gives nothing rather than dividing by it',
  picksFrom([line('x', 0, 0, 10, 10)], 0, 0).length === 0,
  'an image that has not decoded yet reports nought by nought, and an'
  + ' Infinity in a box is a highlight drawn somewhere nobody can see');

/* ── 2. The specks it must refuse ───────────────────────────────────── */
{
  const picks = picksFrom([
    line('AANDKLAS', 100, 50, 400, 60),
    /* A mark on a wall: one character, tiny, and the engine unsure. */
    line('.', 10, 10, 4, 3, 22),
    /* Wide enough but a single letter. */
    line('I', 10, 300, 300, 40),
    /* Two letters but a hairline. */
    line('AB', 10, 400, 300, 1),
  ], WIDE, TALL);
  ok('a speck is not offered as a line to tap',
    picks.length === 1 && picks[0].text === 'AANDKLAS',
    `${JSON.stringify(picks.map((one) => one.text))} — a tappable box round`
    + ' every mark on a wall turns the photograph into a rash of rectangles'
    + ' nobody can aim at');
}

/* ── 3. The tap ─────────────────────────────────────────────────────── */
{
  const picks = picksFrom([
    /* A heading's block, which on a poster swallows half the picture. */
    line('AANDKLAS VRYDAG 20:00', 50, 40, 900, 400),
    /* And one line inside it. */
    line('VRYDAG 20:00', 100, 300, 400, 60),
  ], WIDE, TALL);
  const hit = pickAt(picks, 0.3, 0.68);
  ok('a tap inside two boxes picks the smaller one',
    hit?.text === 'VRYDAG 20:00',
    `${hit?.text} — boxes nest, and picking the largest means tapping a word`
    + ' and selecting the whole sign');
  ok('  and a tap on nothing picks nothing',
    pickAt(picks, 0.99, 0.02) === null,
    `${pickAt(picks, 0.99, 0.02)?.text} — a tap on the sky that selects the`
    + ' nearest writing is a selection she did not make');
  ok('  and a thumb just outside a thin line still finds it',
    pickAt(picksFrom([line('klein', 100, 250, 300, 6)], WIDE, TALL), 0.2, 0.495) !== null,
    'a line of small type is three pixels tall on a phone preview and nobody'
    + ' hits that exactly');
}

/* ── 4. The mask the eraser is handed ───────────────────────────────── */
{
  const pick: Pick = {
    id: 'one', text: 'AANDKLAS', sure: 90, x: 0.1, y: 0.1, w: 0.4, h: 0.12,
  };
  const mask = maskFor(pick, WIDE, TALL, 0);
  ok('the mask is one byte per pixel of the picture, not of the preview',
    mask.length === WIDE * TALL,
    `${mask.length} against ${WIDE * TALL} — \`erase\` indexes it by the`
    + ' picture’s own grid, and a mask sized to the canvas erases a'
    + ' rectangle a third of the way across');

  let on = 0;
  for (const one of mask) on += one;
  /* 400 wide by 60 tall, inclusive of both edges, is 401 × 61 — and then
     one pixel of growth on every side even at a pad of nought, because
     `maskFor` floors the growth at one.
 
     That floor is deliberate and this assertion exists to say so. A pad
     expressed as a share of the line's own height rounds to nought on a
     line four pixels tall, which is exactly the small type whose edges
     bleed most; a pad that disappears on the hardest case is no pad. The
     first version of this assertion expected 401 × 61, which was my
     arithmetic being wrong rather than the code. */
  ok('  and it covers the line, and one pixel round it even at a pad of nought',
    on === 403 * 63,
    `${on} pixels against ${403 * 63}`);

  const padded = maskFor(pick, WIDE, TALL);
  let grown = 0;
  for (const one of padded) grown += one;
  ok('  and the default grows it, because a letter’s edge bleeds',
    grown > on,
    `${grown} against ${on} — a mask that stops exactly at the box leaves a`
    + ' grey outline of the words behind, which reads as a smudge where the'
    + ' writing was and is worse than the writing');

  /* The one that would go unnoticed: a line against the edge of the
     picture, grown past it. */
  const edge: Pick = { ...pick, x: 0, y: 0, w: 1, h: 0.1 };
  const safe = maskFor(edge, WIDE, TALL);
  ok('  and a line at the very edge does not grow off the picture',
    safe.length === WIDE * TALL && safe.every((one) => one === 0 || one === 1),
    'a mask index past the end is a silent no-op in a typed array, so this'
    + ' fails by erasing the wrong row rather than by throwing');
}

/* ── 5. Where a grabbed line goes ───────────────────────────────────── */
{
  const pick: Pick = {
    id: 'one', text: 'AANDKLAS', sure: 90, x: 0.1, y: 0.2, w: 0.4, h: 0.1,
  };
  const at = middleOf(pick);
  ok('a grabbed line goes back in the middle of where it was',
    Math.abs(at.x - 0.3) < 1e-9 && Math.abs(at.y - 0.25) < 1e-9,
    JSON.stringify(at) + ' — words that jump to the default spot when she'
    + ' grabs them are words she has to put back by hand');
  ok('  and how much of the picture it covers can be asked',
    Math.abs(shareOf(pick) - 0.04) < 1e-9,
    `${shareOf(pick)} — the eraser refuses past a share of the frame, so the`
    + ' room has to know before it offers to take a line out');
}

/* ── 6. The third frame of reference, there and back ────────────── */
{
  const pick: Pick = {
    id: 'one', text: 'AANDKLAS', sure: 90, x: 0.25, y: 0.5, w: 0.5, h: 0.25,
  };
  /* A photograph drawn small and off-centre in the frame, which is what a
     dragged, zoomed-out picture looks like. */
  const at = { left: 100, top: 40, width: 400, height: 200 };

  const on = ontoFrame(pick, at);
  ok('a box moves from the picture onto the frame it is drawn in',
    on.left === 200 && on.top === 140 && on.width === 200 && on.height === 50,
    JSON.stringify(on) + ' — the picture is not the frame: it is placed'
    + ' inside it, cropped, zoomed and panned, so a box drawn as if the two'
    + ' were the same sits over the wrong part of the photograph');

  const back = fromFrame(on.left + on.width / 2, on.top + on.height / 2, at);
  ok('  and a thumb in the middle of it comes back as the middle of the box',
    back !== null
      && Math.abs(back.x - (pick.x + pick.w / 2)) < 1e-9
      && Math.abs(back.y - (pick.y + pick.h / 2)) < 1e-9,
    JSON.stringify(back) + ' — the drawing and the tap have to agree, and'
    + ' when they do not nothing throws: the highlight sits over the words'
    + ' and the tap selects the line above');

  ok('  and a thumb beside the photograph is off it, not clamped onto it',
    fromFrame(10, 10, at) === null && fromFrame(600, 300, at) === null,
    'a point outside answered as a share below nought would hit-test against'
    + ' a line at the edge, which is a selection she did not make');

  ok('  and a picture of no width is answered rather than divided by',
    fromFrame(10, 10, { left: 0, top: 0, width: 0, height: 0 }) === null,
    'a frame measured before layout reports nought, and an Infinity here is'
    + ' a tap that selects whatever is first in the list');

  const corner = fromFrame(on.left, on.top, at);
  ok('  and the top-left corner round-trips exactly',
    corner !== null
      && Math.abs(corner.x - pick.x) < 1e-9 && Math.abs(corner.y - pick.y) < 1e-9,
    JSON.stringify(corner));
}

/* ── 7. The engine is really asked for the boxes ────────────────────── */
const ocr = readFileSync('app/lib/ocr.ts', 'utf8');
ok('the engine is asked for its blocks by name',
  /blocks:\s*true/.test(ocr),
  '`blocks` is not the default in this version, and without it `data.blocks`'
  + ' is null and every box is silently absent — which reads, on the screen,'
  + ' as a photograph with no writing in it');
ok('  and a reading with no blocks still answers with its text',
  /lines,/.test(ocr) && /const lines: Found\[\] = \[\]/.test(ocr),
  'the boxes are an addition to what this already did, and a reading that'
  + ' comes back without them must not stop the words arriving');

if (bad) {
  console.error(`\ncheck:textpick — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:textpick — the engine’s boxes become shares of the picture once,'
  + ' a tap picks the smallest line it landed on, and the mask handed to the'
  + ' eraser is in the picture’s own pixels and stays inside it.',
);

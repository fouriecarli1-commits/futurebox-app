/**
 * Smart crop: `lib/smartcrop.ts`.
 *
 *   npm run check:smartcrop
 *
 * The owner, 18 October 2026: *"'n dimensions blokke vir smart cropping."* A
 * shape the photo is not is shown as a block over the photo, standing over
 * the part worth keeping. What is held here, with made-up photos whose
 * interesting part is known: that the block goes to it, along the axis that
 * has room; that a dull photo is still cut in the middle; and that the
 * crop it hands the editor shows exactly the window it drew.
 */
import { place } from '../app/lib/postcrop.ts';
import { bestCrop, interestOf, windowOf } from '../app/lib/smartcrop.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/** A grey photo, `w` × `h` cells, with a busy, colourful patch at a spot. */
const photo = (w: number, h: number, patch: { x0: number; x1: number; y0: number; y1: number } | null): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const inPatch = patch && x >= patch.x0 && x < patch.x1 && y >= patch.y0 && y < patch.y1;
      const v = inPatch ? ((x + y) % 2 ? 230 : 40) : 120;
      px[i] = inPatch ? v : 120;
      px[i + 1] = inPatch ? 255 - v : 120;
      px[i + 2] = inPatch ? 60 : 120;
      px[i + 3] = 255;
    }
  }
  return px;
};

/* ── A person to one side of a plain sky, and of a sunset ────────────
   The owner, 25 October 2026: *"Smart crop werk nie."* On a phone
   photograph of somebody standing to the right of a flat blue sky the crop
   cut them in half: the sky's colour scored as interest in every cell, and
   the pull to the middle, a share of the whole, outweighed one face. And
   an orange sky met the skin rule outright. Both are held here. */
const person = (w: number, h: number, sky: 'plain' | 'sunset'): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      let r = 40; let g = 60; let b = 90;
      if (sky === 'sunset' && x < w * 0.69) { r = 230; g = 90 + Math.round(60 * y / h); b = 30 + Math.round(20 * x / w); }
      const cx = w * 0.84; const cy = h * 0.36;
      if ((x - cx) ** 2 / (w * w * 0.004) + (y - cy) ** 2 / (h * h * 0.02) < 1) { r = 200; g = 150; b = 120; }
      else if (x > w * 0.76 && x < w * 0.94 && y > h * 0.49) { r = 50; g = 50; b = 60; }
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  return px;
};
for (const sky of ['plain', 'sunset'] as const) {
  const got = bestCrop(interestOf(person(160, 90, sky), 160, 90), 16 / 9, 1);
  ok(`a person to the right of a ${sky} sky is kept in a square`, got.x < -0.5, JSON.stringify(got));
}

/* A wide photo (16:9 at 48 × 27) with a person standing far right. */
const wideRight = interestOf(photo(48, 27, { x0: 38, x1: 46, y0: 5, y1: 25 }), 48, 27);
const square = bestCrop(wideRight, 16 / 9, 1);
ok('a wide photo with the subject on the right is cut to a square around it, not through the middle',
  square.x < -0.6 && square.y === 0, JSON.stringify(square));
const block = windowOf(square, 16 / 9, 1);
ok('  and the block drawn over it covers the subject', block.x <= 38 / 48 && block.x + block.w >= 46 / 48 - 0.02, JSON.stringify(block));

const wideLeft = interestOf(photo(48, 27, { x0: 2, x1: 10, y0: 5, y1: 25 }), 48, 27);
ok('  and on the left, to the left', bestCrop(wideLeft, 16 / 9, 1).x > 0.6, JSON.stringify(bestCrop(wideLeft, 16 / 9, 1)));

/* A tall photo (3:4 at 36 × 48) with the subject near the top, cut wide. */
const tallTop = interestOf(photo(36, 48, { x0: 8, x1: 28, y0: 2, y1: 12 }), 36, 48);
const wide = bestCrop(tallTop, 3 / 4, 16 / 9);
ok('a tall photo cut to a wide frame moves up and down, towards the subject at the top',
  wide.x === 0 && wide.y > 0.6, JSON.stringify(wide));

const dull = interestOf(photo(48, 27, null), 48, 27);
const centred = bestCrop(dull, 16 / 9, 1);
ok('a photo with nothing much anywhere is cut in the middle, as it always was',
  Math.abs(centred.x) < 0.05, JSON.stringify(centred));

ok('a photo that already is the shape is not moved',
  JSON.stringify(bestCrop(wideRight, 16 / 9, 16 / 9)) === JSON.stringify({ basis: 'fill', zoom: 1, x: 0, y: 0 }));

/* The window drawn is the window the editor shows: through `place`. */
const shown = place({ width: 1920, height: 1080 }, { width: 1080, height: 1080 }, square);
const fromPlace = -shown.left / shown.width;
ok('the block drawn and the part the editor shows are the same part',
  Math.abs(fromPlace - block.x) < 0.01, `${fromPlace.toFixed(3)} against ${block.x.toFixed(3)}`);

if (bad) {
  console.error(`\ncheck:smartcrop — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:smartcrop — a shape the photo is not stands over the part worth keeping, and a dull photo is cut in the middle.');

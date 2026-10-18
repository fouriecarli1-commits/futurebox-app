/**
 * Where to cut a photograph to a shape it is not: the part worth keeping.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 18 October 2026: *"Dalk as aspect ratios nie 100% gemanipuleer
 * kan word nie, moet ons dalk ook kyk na 'n dimensions blokke vir smart
 * cropping."* A wide photo on a square post, or a story, has to lose
 * something — and until now it lost both ends equally, so whatever was not
 * dead centre was cut in half. Each shape is shown as a block over her own
 * photo, already standing over the part that matters, and one press makes
 * the post that shape with the photo placed there. She can still drag it
 * after; this only chooses where it starts.
 *
 * ── How "the part that matters" is found ─────────────────────────────────
 *
 * On the phone, with no model and nothing sent anywhere. The photo is read
 * small — a grid of cells — and each cell scores for what an eye goes to:
 * detail (how sharply it differs from its neighbours, which is where faces,
 * writing and edges are), colour (how saturated), and skin (the colours
 * people are). Flat sky, a plain wall and the dark bottom of a room score
 * little. Then the window of the shape is slid across, and the place
 * holding the most is where it stands — with a slight pull to the middle,
 * so a photo with nothing much anywhere is cut the old, centred way.
 *
 * Pure, in shares and grids: `check:smartcrop` hands it made-up photos.
 */
import type { Crop } from './postcrop';

/** How many cells across the longest side the photo is read at. */
export const GRID = 48;

/** A photo read small: `w` × `h` cells, one interest score each. */
export interface Interest {
  readonly w: number;
  readonly h: number;
  readonly score: Float32Array;
}

/**
 * The interest of each cell, from RGBA pixels already read at grid size.
 */
export function interestOf(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Interest {
  const score = new Float32Array(w * h);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) {
    lum[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      const a = rgba[i * 4 + 3] / 255;
      /* Detail: the difference from the four neighbours. */
      let detail = 0;
      if (x > 0) detail += Math.abs(lum[i] - lum[i - 1]);
      if (x < w - 1) detail += Math.abs(lum[i] - lum[i + 1]);
      if (y > 0) detail += Math.abs(lum[i] - lum[i - w]);
      if (y < h - 1) detail += Math.abs(lum[i] - lum[i + w]);
      const most = Math.max(r, g, b);
      const least = Math.min(r, g, b);
      const saturation = most > 0 ? (most - least) / most : 0;
      /* Skin, by the usual rule of thumb: red leads, green follows, blue
         trails, and not too dark. Every skin colour meets it. */
      const skin = r > 60 && r > g && g > b && r - b > 15 && r - g < 110 ? 1 : 0;
      score[i] = a * (detail / 4 + saturation * 40 + skin * 30);
    }
  }
  return { w, h, score };
}

/**
 * The crop that shows the most interest for a frame of `frameAspect`
 * (width ÷ height), filling it — as a `Crop` the editor already draws.
 */
export function bestCrop(interest: Interest, pictureAspect: number, frameAspect: number): Crop {
  const { w, h, score } = interest;
  if (!(pictureAspect > 0) || !(frameAspect > 0) || w < 1 || h < 1) return { basis: 'fill', zoom: 1, x: 0, y: 0 };
  /* Running sums, so any rectangle's total is four lookups. */
  const sums = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      sums[(y + 1) * (w + 1) + x + 1] = score[y * w + x]
        + sums[y * (w + 1) + x + 1] + sums[(y + 1) * (w + 1) + x] - sums[y * (w + 1) + x];
    }
  }
  const total = (x0: number, y0: number, x1: number, y1: number): number =>
    sums[y1 * (w + 1) + x1] - sums[y0 * (w + 1) + x1] - sums[y1 * (w + 1) + x0] + sums[y0 * (w + 1) + x0];

  const across = pictureAspect > frameAspect;
  /* The window's share of the photo along the axis that has room. */
  const share = across ? frameAspect / pictureAspect : pictureAspect / frameAspect;
  if (share >= 0.999) return { basis: 'fill', zoom: 1, x: 0, y: 0 };
  const cells = across ? w : h;
  const span = Math.max(1, Math.round(cells * share));
  const room = cells - span;
  if (room <= 0) return { basis: 'fill', zoom: 1, x: 0, y: 0 };

  let best = -1;
  let bestAt = room / 2;
  const all = total(0, 0, w, h) || 1;
  for (let at = 0; at <= room; at += 1) {
    const held = across ? total(at, 0, at + span, h) : total(0, at, w, at + span);
    /* A light pull to the middle: worth a twentieth of the photo's whole
       interest at the far edges, so a dull photo stays centred and a
       clearly better place still wins. */
    const offCentre = Math.abs(at - room / 2) / (room / 2);
    const value = held - all * 0.05 * offCentre;
    if (value > best) {
      best = value;
      bestAt = at;
    }
  }
  /* From where the window starts to the -1..1 share of the slack that
     `place` reads: +1 shows the start of the photo, -1 its end. */
  const pan = 1 - (2 * bestAt) / room;
  return across
    ? { basis: 'fill', zoom: 1, x: Math.max(-1, Math.min(1, pan)), y: 0 }
    : { basis: 'fill', zoom: 1, x: 0, y: Math.max(-1, Math.min(1, pan)) };
}

/**
 * The window a crop shows, as shares of the photo — for drawing the block
 * over the photo's thumbnail.
 */
export function windowOf(crop: Crop, pictureAspect: number, frameAspect: number): { x: number; y: number; w: number; h: number } {
  const across = pictureAspect > frameAspect;
  const share = across ? frameAspect / pictureAspect : pictureAspect / frameAspect;
  if (share >= 0.999) return { x: 0, y: 0, w: 1, h: 1 };
  const start = ((1 - (across ? crop.x : crop.y)) / 2) * (1 - share);
  return across ? { x: start, y: 0, w: share, h: 1 } : { x: 0, y: start, w: 1, h: share };
}

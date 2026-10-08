/**
 * Tapping the writing in a photograph, to grab it, move it or take it out.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"hoe moontlik is dit wanneer mens die magic eraser
 * button click, of die grab text, dat dit AI integrated is en die masjien
 * identifiseer self objekte en text wat dan highlight en dan kan die klient
 * op die objekte of text click wat hulle graag wil grab, rondskuif, of
 * delete."*
 *
 * ── Why this half was nearly free ────────────────────────────────────────
 *
 * The room has read the words out of a photograph since September, on the
 * device, for nothing. What it did with the answer was take `data.text` and
 * throw the rest away — and the rest is a box round every line, computed in
 * the same pass. So "highlight what it found and let her tap one" is not a
 * new engine. It is the part of the old one that was being discarded.
 *
 * ── What this file is, and what it refuses to be ─────────────────────────
 *
 * Arithmetic, and no drawing. Boxes arrive from `ocr.ts` in the pixels of
 * the picture that was read; the room works in shares of the frame and
 * draws on a canvas of a third size. One conversion, here, so the box she
 * taps and the box that gets erased cannot disagree — which they would the
 * first time the preview changed size, and in a way that looks like the tap
 * being inaccurate rather than like two different rectangles.
 *
 * It also refuses to decide anything a model should. There is no cleverness
 * here about what the words MEAN: a line the engine was unsure of is still
 * offered, marked with how sure it was, because a reading this file silently
 * dropped is a line she can see in her own photograph and cannot tap.
 */

import type { Found } from './ocr';

/** A line of writing on the picture, in shares of the picture, nought to one. */
export interface Pick {
  readonly id: string;
  readonly text: string;
  /** Nought to a hundred, the engine's own confidence. */
  readonly sure: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * How small a box can be before it is noise rather than writing.
 *
 * A thousandth of the picture's width, and a line has to be at least four
 * pixels tall in a 1000-pixel picture. Tesseract reports specks — a mark on
 * a wall, the grain in a dark corner — with a text of one character and a
 * confidence in the twenties, and a tappable box round every speck turns the
 * photograph into a rash of rectangles nobody can aim at.
 */
const LEAST_WIDE = 0.01;
const LEAST_TALL = 0.004;

/** And a line of one character is a mark, not writing. */
const LEAST_LETTERS = 2;

/**
 * The lines worth offering, as shares of the picture.
 *
 * `wide` and `tall` are the picture's own pixels — the ones the engine read,
 * not the ones the preview draws. Passing the preview's would put every box
 * in the wrong place by exactly the scale factor, which is the fault this
 * file exists to make impossible by having one place to get it wrong.
 */
export function picksFrom(
  found: readonly Found[],
  wide: number,
  tall: number,
): readonly Pick[] {
  if (wide <= 0 || tall <= 0) return [];
  const out: Pick[] = [];
  found.forEach((one, n) => {
    const letters = one.text.replace(/[^\p{L}\p{N}]/gu, '').length;
    if (letters < LEAST_LETTERS) return;
    const w = one.width / wide;
    const h = one.height / tall;
    if (w < LEAST_WIDE || h < LEAST_TALL) return;
    /* Clamped, because a box can reach a pixel past the edge of the picture
       it came from and a share above one lands the highlight off the glass. */
    const x = Math.max(0, Math.min(1, one.left / wide));
    const y = Math.max(0, Math.min(1, one.top / tall));
    out.push({
      id: `found-${n}`,
      text: one.text,
      sure: one.sure,
      x,
      y,
      w: Math.min(w, 1 - x),
      h: Math.min(h, 1 - y),
    });
  });
  return out;
}

/**
 * Which line a thumb landed on, or null.
 *
 * The SMALLEST box containing the point, because boxes nest: a line inside a
 * paragraph inside a block, and on a poster a heading's box can swallow half
 * the picture. Picking the largest, or the first, means tapping a word and
 * selecting the whole sign.
 *
 * `reach` is a tolerance in shares, so a thumb that lands just outside a
 * thin line still finds it. A line of small type is four pixels tall on a
 * phone preview and nobody hits that.
 */
export function pickAt(
  picks: readonly Pick[],
  x: number,
  y: number,
  reach = 0.01,
): Pick | null {
  const hits = picks.filter((one) => x >= one.x - reach
    && x <= one.x + one.w + reach
    && y >= one.y - reach
    && y <= one.y + one.h + reach);
  if (!hits.length) return null;
  return hits.reduce((small, one) => (one.w * one.h < small.w * small.h ? one : small));
}

/**
 * A mask over one line, for the eraser.
 *
 * `erase` in `lib/erase.ts` takes a byte per pixel of the picture's own
 * grid, so this is in the picture's pixels and not in shares. Grown by
 * `pad`, as a share of the line's own height rather than a number of pixels:
 * the antialiased edge of a letter bleeds a pixel or two at any size, and a
 * mask that stops exactly at the box leaves a grey outline of the words
 * behind — which reads as a smudge where the writing was, which is worse
 * than the writing.
 */
export function maskFor(
  pick: Pick,
  wide: number,
  tall: number,
  pad = 0.18,
): Uint8Array {
  const mask = new Uint8Array(Math.max(0, wide * tall));
  if (wide <= 0 || tall <= 0) return mask;
  const grow = Math.max(1, Math.round(pick.h * tall * pad));
  const left = Math.max(0, Math.round(pick.x * wide) - grow);
  const top = Math.max(0, Math.round(pick.y * tall) - grow);
  const right = Math.min(wide - 1, Math.round((pick.x + pick.w) * wide) + grow);
  const bottom = Math.min(tall - 1, Math.round((pick.y + pick.h) * tall) + grow);
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) mask[row * wide + col] = 1;
  }
  return mask;
}

/** Where a grabbed line's words should sit: the middle of where they were. */
export const middleOf = (pick: Pick): { readonly x: number; readonly y: number } => ({
  x: pick.x + pick.w / 2,
  y: pick.y + pick.h / 2,
});

/**
 * How much of the picture one line covers.
 *
 * The eraser refuses past a share of the frame — it grows the edges of a gap
 * inwards and cannot invent what was behind something large — so the room
 * has to ask before it offers "take it out" on a line that fills the poster.
 */
export const shareOf = (pick: Pick): number => pick.w * pick.h;

/**
 * Where the picture is drawn inside the frame, as `place` reports it.
 *
 * In frame units, which is what the canvas is scaled to before anything is
 * drawn on it — not device pixels and not shares.
 */
export interface Placed {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A line's box, moved from the picture onto the frame.
 *
 * ── The third frame of reference, and the one that bites ────────────
 *
 * A box out of the engine is a share of the PICTURE. The picture is not the
 * frame: it is placed inside it by `place`, which crops, zooms and pans it,
 * so the same box lands somewhere different the moment she drags the
 * photograph or changes the shape of the post.
 *
 * Doing this conversion at the drawing and again at the tap is two chances
 * to get it wrong, and when they disagree nothing throws — the highlight
 * sits over the words and the tap selects the line above. So both go
 * through here.
 */
export const ontoFrame = (pick: Pick, at: Placed): Placed => ({
  left: at.left + pick.x * at.width,
  top: at.top + pick.y * at.height,
  width: pick.w * at.width,
  height: pick.h * at.height,
});

/**
 * And back: a thumb on the frame, as a share of the picture under it.
 *
 * Returns null where the thumb is off the photograph — on the background
 * beside it, or outside a picture zoomed past the edges. A point outside
 * answered as a share below nought or above one would hit-test against a
 * line at the edge, which is a selection she did not make.
 */
export function fromFrame(
  x: number,
  y: number,
  at: Placed,
): { readonly x: number; readonly y: number } | null {
  if (at.width <= 0 || at.height <= 0) return null;
  const px = (x - at.left) / at.width;
  const py = (y - at.top) / at.height;
  if (px < 0 || px > 1 || py < 0 || py > 1) return null;
  return { x: px, y: py };
}

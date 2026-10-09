/**
 * Getting several pictures onto one request without the platform refusing it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"al die spesiale funksies van google moet ook daar
 * in wees."* The largest unused one was that Gemini reads SEVERAL pictures in
 * a turn: put this person into that scene, keep the same child on page four
 * as on page one, put my logo on this poster.
 *
 * `/api/google/picture` now accepts up to `MOST_PICTURES` of them. The thing
 * that stops it being usable is arithmetic, not wiring: a picture this app
 * draws comes back at 2048 across, and a 2048 PNG is commonly three or four
 * megabytes. Base64 adds a third. **One** of them is already at the ceiling,
 * so sending three straight back up would be refused by the platform before
 * the route runs — a bare 413 with no sentence in it, which is the failure
 * `check:bodylimit` was written about.
 *
 * ── A reference is not a photograph ──────────────────────────────────────
 *
 * The fix is not a bigger ceiling, it is noticing what a reference picture is
 * FOR. It is not being handed back to anybody; it is being looked at by a
 * model so the next picture matches it. A face, a palette, a costume, a logo
 * — all of that survives 768 pixels and heavy JPEG. Fine texture does not
 * survive either, and nothing downstream needs it.
 *
 * So: every reference is shrunk to `REFERENCE_SIDE` on its longest edge and
 * re-encoded as JPEG, with the quality walked down until it fits the share of
 * the budget it is allowed. Three references then cost less together than one
 * unshrunk one did alone.
 *
 * ── The arithmetic is separate from the canvas on purpose ────────────────
 *
 * `shareFor`, `sideFor` and `LADDER` are pure and exported, because a canvas
 * cannot be driven from a check and a budget that is never measured is a
 * budget that is wrong. `packOne` is the thin part that touches the browser.
 */

import { BUDGET, MOST_PICTURES } from './picturelimit';

/**
 * How long the longest edge of a reference may be.
 *
 * 768 because that is what the models themselves look at: Gemini tiles an
 * image into patches and a picture larger than its tile grid is scaled down
 * on their side anyway, so sending 2048 pays for bytes that are thrown away
 * before the model sees them. Where a reference is the thing being EDITED
 * rather than looked at, the room sends it unshrunk and alone — see
 * `sideFor`, which hands back zero for a single picture.
 */
export const REFERENCE_SIDE = 768;

/**
 * JPEG qualities to try, in order.
 *
 * Walked down rather than computed, because the size of a JPEG at a given
 * quality depends on the picture and no formula gets it right. Stopping at
 * 0.4 rather than going lower is deliberate: below that the artefacts are
 * strong enough to become part of what the model copies, and a reference that
 * teaches the next picture to look blocky is worse than no reference.
 */
export const LADDER: readonly number[] = [0.9, 0.78, 0.65, 0.52, 0.4];

/**
 * The share of the budget one picture gets, when `count` are going.
 *
 * Evenly, which is not the cleverest split and is the one that cannot
 * surprise anybody. A first picture allowed to eat the budget would make the
 * third fail for a reason that depends on the first.
 */
export function shareFor(count: number): number {
  const many = Math.max(1, Math.min(MOST_PICTURES, Math.floor(count)));
  return Math.floor(BUDGET / many);
}

/**
 * The longest edge to shrink to, when `count` pictures are going.
 *
 * Zero means do not shrink at all — which is the right answer for one
 * picture, because one picture is the EDIT case: somebody's own photograph
 * going up to be changed and handed back, where shrinking it would be this
 * app quietly lowering the quality of her picture.
 *
 * Two or more means references, where `REFERENCE_SIDE` applies.
 */
export function sideFor(count: number): number {
  return count > 1 ? REFERENCE_SIDE : 0;
}

/** A picture ready to go up: base64 without the `data:` preamble, and its type. */
export interface Packed {
  readonly data: string;
  readonly mime: 'image/jpeg' | 'image/png';
}

/** What `packOne` is handed. An `HTMLImageElement` satisfies this. */
export interface Measured {
  readonly naturalWidth?: number;
  readonly naturalHeight?: number;
  readonly width: number;
  readonly height: number;
}

/**
 * How big to draw a picture so its longest edge is `side`.
 *
 * Never enlarged. A 300-pixel logo scaled up to 768 is three times the bytes
 * for exactly the same information.
 */
export function drawnSize(
  width: number,
  height: number,
  side: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (!side || !longest || longest <= side) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const by = side / longest;
  return {
    width: Math.max(1, Math.round(width * by)),
    height: Math.max(1, Math.round(height * by)),
  };
}

/**
 * One picture, shrunk and encoded to fit `most` base64 characters.
 *
 * `null` where even the bottom of the ladder does not fit, which the caller
 * has to handle rather than send anyway: sending it anyway is the 413 this
 * file exists to avoid.
 */
export function packOne(image: Measured, side: number, most: number): Packed | null {
  const from = {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
  const size = drawnSize(from.width, from.height, side);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  /* White underneath, because a reference may have a see-through background
     from the remover in the photo room and JPEG has no transparency — left
     alone it fills with black, and a model shown a black-backed cut-out
     draws the black. */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(image as unknown as CanvasImageSource, 0, 0, size.width, size.height);

  for (const quality of side ? LADDER : [1]) {
    /* PNG where nothing is being shrunk, which is the edit case: a photograph
       going up to be changed must not arrive already JPEG-damaged. */
    const url = side
      ? canvas.toDataURL('image/jpeg', quality)
      : canvas.toDataURL('image/png');
    const data = url.slice(url.indexOf(',') + 1);
    if (data.length <= most) return { data, mime: side ? 'image/jpeg' : 'image/png' };
  }
  return null;
}

/**
 * Several pictures, packed to share the budget.
 *
 * Anything past `MOST_PICTURES` is dropped here rather than sent, because the
 * route refuses the whole request over it — and a refusal of the whole
 * request is a page that does not get drawn, which is worse than a page drawn
 * with two references instead of four.
 */
export function packSome(images: readonly Measured[]): Packed[] {
  const taking = images.slice(0, MOST_PICTURES);
  const side = sideFor(taking.length);
  const share = shareFor(taking.length);
  const out: Packed[] = [];
  for (const one of taking) {
    const packed = packOne(one, side, share);
    if (packed) out.push(packed);
  }
  return out;
}

/**
 * How long the longest edge of the picture being EDITED may be, when
 * references travel with it.
 *
 * ── The tension, written down rather than split evenly ───────────────────
 *
 * `packSome` treats every picture the same, which is right for references
 * and wrong the moment one of them is somebody's own photograph being
 * changed. The model's answer is drawn at 2K either way, but it can only put
 * back detail it could see: a face sent at 768 comes back as a 2K picture of
 * a 768 face.
 *
 * So the edited picture leads. It gets half the budget on its own and 1280
 * on its longest edge — more than enough for a face, a label, a hand — and
 * the references share the other half at `REFERENCE_SIDE`, because all a
 * reference has to carry is "this person", "this palette", "this logo".
 *
 * One picture and no references is still sent whole and unshrunk. That case
 * is the common one and this app does not quietly lower the quality of her
 * photograph to make room for something she did not send.
 */
export const LEAD_SIDE = 1280;

/**
 * The picture being changed, plus references to copy from.
 *
 * `lead` is `null` when drawing from nothing. The lead always comes first in
 * the list, because Gemini reads a turn in order and "put the person from the
 * second picture into the first" is a sentence about an order.
 *
 * Anything that will not fit even at the bottom of the ladder is left out
 * rather than sent — the route refuses the whole request over one
 * over-weight picture, and a refused request is a picture nobody gets.
 */
export function packLed(
  lead: Measured | null,
  refs: readonly Measured[],
): Packed[] {
  const taking = refs.slice(0, Math.max(0, MOST_PICTURES - (lead ? 1 : 0)));
  if (!lead) return packSome(taking);
  if (taking.length === 0) {
    /* Whole and unshrunk, as it has always been. */
    const alone = packOne(lead, 0, BUDGET);
    return alone ? [alone] : [];
  }
  const out: Packed[] = [];
  const first = packOne(lead, LEAD_SIDE, Math.floor(BUDGET / 2));
  if (first) out.push(first);
  const share = Math.floor(BUDGET / 2 / taking.length);
  for (const one of taking) {
    const packed = packOne(one, REFERENCE_SIDE, share);
    if (packed) out.push(packed);
  }
  return out;
}

/**
 * How many references may still be brought in.
 *
 * A screen needs this to stop offering a fourth slot that the route would
 * refuse the whole request over.
 */
export function roomForRefs(hasLead: boolean): number {
  return Math.max(0, MOST_PICTURES - (hasLead ? 1 : 0));
}

/**
 * A picture out of a data URL, or null if it will not decode.
 *
 * Here rather than in each room because three of them hold their pictures as
 * data URLs — the cutting room's drawn frame, a cast member off storage, a
 * kept still — and `packOne` needs something with pixels and a size. Written
 * once so a room that forgets to wait for `onload` cannot send a picture of
 * nothing: an `Image` whose `naturalWidth` is still zero packs to a 1×1
 * canvas without throwing, which is the quiet kind of wrong.
 */
export function imageFrom(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

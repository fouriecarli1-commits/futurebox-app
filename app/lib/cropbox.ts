/**
 * The box you cut a photograph down to.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 7 October 2026, in the photo editor: *"Ek sien nie goeie cropping en
 * cutting tools nie."*
 *
 * She is right, and the thing that was there is worth naming so the
 * difference is clear. `postcrop.ts` chooses which part of a photograph shows
 * THROUGH A FRAME: go closer, then pull the picture about until the part you
 * want is the part inside the shape. It is the right tool for making a story
 * out of a 4:3 photo, and it is what every post needs.
 *
 * It is not a crop. A crop is the other way round: the frame goes over the
 * picture, you drag its corners to say how much of the picture you are
 * keeping, and the rest is cut away for good. The two differ in three ways
 * that matter to somebody using them:
 *
 *   · the shape comes OUT of the gesture rather than being chosen first, so
 *     you can crop to whatever the picture wants
 *   · what you throw away is gone, so the file is smaller and the next tool
 *     works on less
 *   · you can see both edges of what you are keeping at once, which is the
 *     part that makes it quick
 *
 * ── Why the box is held as shares and not pixels ─────────────────────────
 *
 * The same reasoning as `postcrop.ts`'s pan, and for the same reason: there
 * is then no state that can be out of range. A box is four numbers between 0
 * and 1 — left, top, right, bottom, as shares of the picture's own width and
 * height — so it means the same thing before and after the picture is
 * replaced, resized, read, cut out or enlarged. A box in pixels has to be
 * rescaled at every one of those moments, and the one place it is forgotten
 * is a crop that silently moves when you do something else.
 *
 * It also makes the drawing trivial: the canvas knows where the picture is on
 * the glass, so a share is a multiplication.
 *
 * ── What is clamped, and where ───────────────────────────────────────────
 *
 * Everything, here, on the way in. Every function in this file returns a box
 * that is inside the picture and at least `LEAST` on both sides, so no caller
 * can produce one that is not — including the ones that have not been written
 * yet. The alternative is a clamp at each of the four or five places a box
 * changes, and the one that is forgotten is a crop with a negative width,
 * which `drawImage` draws as nothing at all.
 */

/** A rectangle over the picture, as shares of its width and height. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The whole picture, which is where a crop starts. */
export const WHOLE: Box = { left: 0, top: 0, right: 1, bottom: 1 };

/**
 * The smallest a side may get, as a share.
 *
 * A twentieth rather than nothing. Two reasons, and the second is the one
 * that bites: a box of zero width cuts to a zero-pixel picture, which
 * `drawImage` accepts and draws as nothing — a tool that answers with a blank
 * where a photograph was. And a box of three pixels cannot be grabbed again
 * by a finger, so the crop is stuck with no way back but starting over.
 */
export const LEAST = 0.05;

/** A pixel size, the same shape `postcrop.ts` uses. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Which part of the box a finger has taken hold of. */
export type Grip = 'nw' | 'ne' | 'sw' | 'se' | 'inside' | null;

const hold = (n: number): number => Math.min(1, Math.max(0, n));

/** Inside the picture, and never inside out or smaller than `LEAST`. */
function sane(box: Box): Box {
  const left = hold(Math.min(box.left, box.right));
  const right = hold(Math.max(box.left, box.right));
  const top = hold(Math.min(box.top, box.bottom));
  const bottom = hold(Math.max(box.top, box.bottom));
  /* Grown from whichever edge has room. Growing always to the right would
     stick a box pushed against the right-hand edge, and growing always to the
     left would move a box the finger is holding still. */
  const wide = right - left;
  const tall = bottom - top;
  const outX = wide < LEAST ? LEAST - wide : 0;
  const outY = tall < LEAST ? LEAST - tall : 0;
  let l = left - outX / 2;
  let r = right + outX / 2;
  let t = top - outY / 2;
  let b = bottom + outY / 2;
  if (l < 0) { r -= l; l = 0; }
  if (r > 1) { l -= r - 1; r = 1; }
  if (t < 0) { b -= t; t = 0; }
  if (b > 1) { t -= b - 1; b = 1; }
  return { left: hold(l), top: hold(t), right: hold(r), bottom: hold(b) };
}

/**
 * Which corner, or the middle, is under a point.
 *
 * `reach` is how close counts, as a share — the caller works it out from how
 * big the picture is drawn, because a corner has to be as easy to grab on a
 * 390-pixel phone as on a desk screen and "twelve pixels" is a different
 * share of each.
 *
 * Corners first, and the nearest of them. A finger on a small box is within
 * reach of two corners at once, and the one it meant is the one it is closest
 * to; checking them in a fixed order would make one corner of every small box
 * impossible to grab.
 */
export function gripAt(box: Box, atX: number, atY: number, reach: number): Grip {
  const corners: readonly (readonly [Grip, number, number])[] = [
    ['nw', box.left, box.top],
    ['ne', box.right, box.top],
    ['sw', box.left, box.bottom],
    ['se', box.right, box.bottom],
  ];
  let nearest: Grip = null;
  let best = reach;
  for (const [which, x, y] of corners) {
    const away = Math.hypot(atX - x, atY - y);
    if (away <= best) {
      best = away;
      nearest = which;
    }
  }
  if (nearest) return nearest;
  return atX >= box.left && atX <= box.right && atY >= box.top && atY <= box.bottom
    ? 'inside'
    : null;
}

/**
 * The whole box, moved, stopping at the edges of the picture.
 *
 * Stopping rather than shrinking. A box dragged off the side should stay the
 * size it is and refuse to go further — that is what a thing being in the way
 * feels like. Shrinking it against the edge is the behaviour that makes a
 * crop you have set up carefully come out a different shape because your
 * thumb went too far.
 */
export function moveBox(box: Box, byX: number, byY: number): Box {
  const wide = box.right - box.left;
  const tall = box.bottom - box.top;
  const left = Math.min(Math.max(box.left + byX, 0), 1 - wide);
  const top = Math.min(Math.max(box.top + byY, 0), 1 - tall);
  return sane({ left, top, right: left + wide, bottom: top + tall });
}

/** One corner, pulled to a point. The opposite corner stays put. */
export function pullCorner(box: Box, grip: Grip, toX: number, toY: number): Box {
  if (grip === null || grip === 'inside') return box;
  const x = hold(toX);
  const y = hold(toY);
  /* ── The opposite corner is the anchor, which is what stops the flip ───
 
     Written as "the corner you are holding is now here, and the other one has
     not moved", then made sane. So pulling the north-west corner past the
     south-east one does not give a box with a negative width — it gives a box
     on the other side of the anchor, which is what every editor does and what
     a finger that overshoots expects. `sane` sorts the edges. */
  switch (grip) {
    case 'nw': return sane({ left: x, top: y, right: box.right, bottom: box.bottom });
    case 'ne': return sane({ left: box.left, top: y, right: x, bottom: box.bottom });
    case 'sw': return sane({ left: x, top: box.top, right: box.right, bottom: y });
    default: return sane({ left: box.left, top: box.top, right: x, bottom: y });
  }
}

/** Is anything actually being cut away? */
export const cropped = (box: Box): boolean =>
  box.left > 0.001 || box.top > 0.001 || box.right < 0.999 || box.bottom < 0.999;

/**
 * The box in the picture's own pixels, ready for `drawImage`.
 *
 * Rounded, and then held to at least one pixel on each side. Rounding a
 * 0.05-share box on a 16-pixel picture can land on zero, and a zero-width
 * source rectangle is drawn as nothing — the one failure mode that looks like
 * the tool having deleted the photograph.
 */
export function cutTo(box: Box, picture: Size): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const safe = sane(box);
  /* ── The corner is pulled back far enough to leave a pixel behind it ───
 
     `check:cropbox` found this: a box in the bottom five per cent of a 16x9
     picture rounds to `y = 9` on a picture nine pixels tall, and a height of
     one from there reaches past the bottom edge. The clamp below it was
     `Math.min(picture.height - y, ...)`, which gives nought, and the floor of
     one then puts it back — so the two guards undid each other and produced
     exactly the rectangle neither allowed.
 
     A one-pixel picture is not a real photograph, but a crop of a thumbnail
     is, and `drawImage` reaching past an edge pads with transparency rather
     than failing. */
  const x = Math.min(Math.round(safe.left * picture.width), Math.max(0, picture.width - 1));
  const y = Math.min(Math.round(safe.top * picture.height), Math.max(0, picture.height - 1));
  const width = Math.max(1, Math.min(picture.width - x, Math.round((safe.right - safe.left) * picture.width)));
  const height = Math.max(1, Math.min(picture.height - y, Math.round((safe.bottom - safe.top) * picture.height)));
  return { x, y, width, height };
}

/**
 * The same box snapped to a shape, keeping its middle.
 *
 * For the shapes a post goes out in — square, story, wide — so somebody who
 * knows what they are posting does not have to get 9:16 right with a thumb.
 * `want` is width over height OF THE PICTURE's pixels, so the picture's own
 * proportions have to come in: a box that is square in shares is square on
 * the screen only if the picture is.
 *
 * Shrunk to fit rather than grown, so the result is always inside the box
 * that was asked for and nothing new is brought into the crop by snapping it.
 */
export function toShape(box: Box, picture: Size, want: number): Box {
  const safe = sane(box);
  const midX = (safe.left + safe.right) / 2;
  const midY = (safe.top + safe.bottom) / 2;
  const wide = (safe.right - safe.left) * picture.width;
  const tall = (safe.bottom - safe.top) * picture.height;
  const [w, h] = wide / tall > want ? [tall * want, tall] : [wide, wide / want];
  const halfX = w / 2 / picture.width;
  const halfY = h / 2 / picture.height;
  return sane({
    left: midX - halfX, top: midY - halfY, right: midX + halfX, bottom: midY + halfY,
  });
}

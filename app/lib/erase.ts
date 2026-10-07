/**
 * Taking a small thing out of a photograph, on the phone, for nothing.
 *
 * ── What this is, and what it is honestly not ────────────────────────────
 *
 * Carli, 7 October 2026: *"magic eraser"*, in her list of what a modern
 * editor has. Her list also has *"magic grab om 'n item uit te haal en weer
 * 'n ander item in te sit"*, and those are two different things:
 *
 *   **this**        grows the surrounding pixels inwards over the gap
 *   **magic grab**  asks a model to imagine what was behind
 *
 * The first is arithmetic and costs us nothing. The second needs an engine
 * and a price per use, and is still waiting on her.
 *
 * So this is good at a litter bin against a wall, a sign against a sky, a
 * blemish on skin, a stranger's leg at the edge of a beach. It is bad at
 * anything with structure behind it — a face in front of a window frame, a
 * bottle on a bookshelf — where it will smear, because there is nothing in
 * the arithmetic that knows a window frame continues. The room says so.
 *
 * ── How it works, which is two passes and no cleverness ──────────────────
 *
 * 1. **Inwards.** Every hole pixel that touches a known one takes the
 *    average of its known neighbours and becomes known itself. Repeat until
 *    the hole is gone. That is the gap filled from its own edges, which is
 *    what makes a wall behind a bin look like more wall.
 *
 * 2. **Smoothed.** The filling leaves faint ridges where two advancing
 *    fronts met. A few averaging passes over only the filled pixels take
 *    those out without touching one pixel of the photograph.
 *
 * Both are O(the hole), not O(the picture), so erasing something small off a
 * twelve-megapixel photograph costs what the small thing costs.
 *
 * ── The rule the whole file turns on ─────────────────────────────────────
 *
 * **Nothing outside the mask is ever written.** A photograph that comes back
 * subtly different everywhere is the worst possible outcome here: nobody
 * would see it on a phone, and it would be in every post she ever made. Both
 * passes read the whole picture and write only where the mask says.
 */

/** How much of the picture a hole may be before this is the wrong tool. */
export const TOO_MUCH = 0.25;

/** How many averaging passes take the ridges out. Few, and bounded. */
export const SMOOTHS = 6;

export type Erased =
  | { readonly ok: true; readonly pixels: ImageData; readonly rounds: number }
  | { readonly ok: false; readonly why: 'nothing' | 'toomuch' };

/** How much of the mask is hole, nought to one. */
export const shareOf = (mask: Uint8Array): number => {
  if (mask.length === 0) return 0;
  let holes = 0;
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) holes += 1;
  return holes / mask.length;
};

/**
 * Fill the masked pixels from the picture around them.
 *
 * `pixels` is changed in place and also returned, because copying twelve
 * megapixels to be tidy is a second of somebody's life for nothing.
 *
 * `mask` is one byte per pixel: non-zero means "this is the thing to take
 * out". It is left as it was — the caller may want to know what it asked
 * for after the fact.
 */
export function erase(pixels: ImageData, mask: Uint8Array): Erased {
  const { width, height, data } = pixels;
  if (mask.length !== width * height) return { ok: false, why: 'nothing' };

  const share = shareOf(mask);
  if (share === 0) return { ok: false, why: 'nothing' };
  if (share > TOO_MUCH) return { ok: false, why: 'toomuch' };

  /* A copy of the mask to eat away at, so the caller's is untouched, and a
     record of which pixels this filled — pass two must smooth those and only
     those. */
  const hole = Uint8Array.from(mask, (one) => (one ? 1 : 0));
  const filled = Uint8Array.from(hole);

  let left = 0;
  for (let i = 0; i < hole.length; i += 1) if (hole[i]) left += 1;

  let rounds = 0;
  /* Bounded by the picture's own size. A hole can only lose its outermost
     ring each round, so the longest possible run is half the shorter side —
     and a loop that cannot end is worse than a hole that does not fill. */
  const most = Math.ceil(Math.min(width, height) / 2) + 2;

  while (left > 0 && rounds < most) {
    rounds += 1;
    /* The ring to fill THIS round, decided before any of it is written.
       Filling as we go would let a pixel average from one its own neighbour
       just invented, and the hole would fill as a smear from one corner
       rather than evenly from every edge. */
    const ring: number[] = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const at = y * width + x;
        if (!hole[at]) continue;
        if ((x > 0 && !hole[at - 1]) || (x < width - 1 && !hole[at + 1])
          || (y > 0 && !hole[at - width]) || (y < height - 1 && !hole[at + width])) {
          ring.push(at);
        }
      }
    }
    if (ring.length === 0) break;

    for (const at of ring) {
      const x = at % width;
      const y = (at - x) / width;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let seen = 0;
      /* Eight neighbours, not four. Four leaves a visible cross-hatch on a
         diagonal edge, which is exactly where a thing being erased usually
         sits against its background. */
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const near = ny * width + nx;
          if (hole[near]) continue;
          const p = near * 4;
          r += data[p];
          g += data[p + 1];
          b += data[p + 2];
          a += data[p + 3];
          seen += 1;
        }
      }
      if (seen === 0) continue;
      const p = at * 4;
      data[p] = Math.round(r / seen);
      data[p + 1] = Math.round(g / seen);
      data[p + 2] = Math.round(b / seen);
      data[p + 3] = Math.round(a / seen);
    }
    for (const at of ring) {
      hole[at] = 0;
      left -= 1;
    }
  }

  /* ── Pass two: the ridges, and only on what pass one wrote ───────────── */

  for (let round = 0; round < SMOOTHS; round += 1) {
    const was = Uint8ClampedArray.from(data);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const at = y * width + x;
        if (!filled[at]) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let seen = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const p = (ny * width + nx) * 4;
            r += was[p];
            g += was[p + 1];
            b += was[p + 2];
            a += was[p + 3];
            seen += 1;
          }
        }
        const p = at * 4;
        data[p] = Math.round(r / seen);
        data[p + 1] = Math.round(g / seen);
        data[p + 2] = Math.round(b / seen);
        data[p + 3] = Math.round(a / seen);
      }
    }
  }

  return { ok: true, pixels, rounds };
}

/**
 * A brush dragged FROM one point TO another.
 *
 * ── The bug this exists for, which would have shipped ────────────────────
 *
 * Stamping one disc per pointer event is the obvious thing and it is wrong.
 * A thumb moving at any speed produces events twenty or more pixels apart,
 * so the painted area comes out as a row of discs with unmasked specks
 * between them — and those specks are pixels OF THE THING BEING REMOVED.
 *
 * `erase` then does exactly what it says: it grows the picture around the
 * hole inwards. The picture around the hole includes the specks. So the gap
 * fills with more of the thing, and the whole feature appears to do nothing.
 *
 * `audit/postwalk.mjs` found it by the shape of the arithmetic rather than by
 * looking: the first ring of a solid 45-by-258 hole should be about six
 * hundred pixels and it was twelve hundred, which is a region full of holes.
 *
 * So a stroke is a LINE of discs, stepped at half a radius — close enough
 * that consecutive discs overlap by half, which leaves nothing between them
 * at any speed.
 */
export function stroke(
  mask: Uint8Array,
  width: number,
  height: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
): void {
  const r = Math.max(1, Math.round(radius));
  const dx = toX - fromX;
  const dy = toY - fromY;
  const far = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(far / Math.max(1, r / 2)));
  for (let step = 0; step <= steps; step += 1) {
    const part = step / steps;
    brush(mask, width, height, fromX + dx * part, fromY + dy * part, r);
  }
}

/**
 * A round brush stamped into a mask.
 *
 * Here rather than in the screen because it is arithmetic with an edge case
 * — a brush at the border of the picture — and arithmetic with an edge case
 * belongs where it can be tested.
 */
export function brush(
  mask: Uint8Array,
  width: number,
  height: number,
  atX: number,
  atY: number,
  radius: number,
): void {
  const r = Math.max(1, Math.round(radius));
  const cx = Math.round(atX);
  const cy = Math.round(atY);
  const from = Math.max(0, cy - r);
  const to = Math.min(height - 1, cy + r);
  for (let y = from; y <= to; y += 1) {
    const span = Math.floor(Math.sqrt(r * r - (y - cy) * (y - cy)));
    const left = Math.max(0, cx - span);
    const right = Math.min(width - 1, cx + span);
    for (let x = left; x <= right; x += 1) mask[y * width + x] = 1;
  }
}

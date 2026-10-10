/**
 * Taking a plain background off a picture — the one that is not a person.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026, looking at a logo this app had just made for her:
 * *"Kyk gou of jy hierdie sien as transparent"* — and it was not. Then:
 * *"Well this was done on our own app. How are we going to get
 * transparency?"*
 *
 * ── Why the picture came back with a checkerboard painted on it ──────────
 *
 * Because an image model cannot make transparency. What comes back is opaque
 * pixels, with no fourth channel to be see-through in. Ask one for a
 * transparent background and it draws a PICTURE of a checkerboard, because a
 * checkerboard is what transparency looks like in every screenshot it has
 * ever been shown. Hers came back as a regular 35-pixel grid of grey and
 * white squares, measured rather than guessed. No wording fixes that; it is
 * not a prompt problem.
 *
 * So transparency is made afterwards, here, by taking the background out.
 *
 * ── Why this is a second background remover and not a change to the first ─
 *
 * `cutout.ts` finds PEOPLE. It runs a segmentation model that was trained on
 * people, and on a logo it finds nobody and says so — which is correct and
 * useless. This one knows nothing about what is in the picture. It learns
 * what the background IS from the edges of the frame and removes that, which
 * is the right tool for a drawing, a logo, a product on white, and the wrong
 * one for a person in a room.
 *
 * Two tools, each honest about what it does, beats one that is sometimes
 * either.
 *
 * ── How it decides, and why it learns rather than assumes ────────────────
 *
 * The background is read off a ring of pixels around the edge of the frame,
 * because whatever is out there is the background by definition. Up to four
 * colours are kept, because a checkerboard is two and a slight gradient is
 * three or four. Assuming white would have failed on the very picture that
 * started this: her ground was a checkerboard, and half of it is grey.
 *
 * Then every pixel is measured against the nearest of those colours. Close
 * to one of them is background; far from all of them is the drawing; and in
 * between is the soft edge of a line, which becomes a part-see-through pixel
 * rather than a hard cut. That in-between is the whole difference between a
 * cut-out that looks drawn and one that looks like it was done with
 * scissors.
 */

/** One colour, as it comes out of a canvas. */
export type Colour = readonly [number, number, number];

/** A picture's pixels, in the shape a canvas hands them over. */
export type Pixels = {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
};

/**
 * How many colours the background may be made of.
 *
 * Four. One is a flat ground, two is a checkerboard, and three or four is a
 * ground with a little gradient or compression noise in it. More than four
 * and a busy photograph starts qualifying as "plain", which is how this kind
 * of tool ends up deleting half of somebody's picture.
 */
export const MOST_GROUNDS = 4;

/** Two colours nearer than this are the same colour with noise on it. */
export const SAME = 26;

/**
 * How close to a background colour still counts as background.
 *
 * Below this a pixel is ground and goes fully see-through. It is small and
 * absolute because it only has to swallow compression noise.
 */
export const CLEAR = 18;

/**
 * The smallest distance that may be treated as "all the way to the picture".
 *
 * A floor, not the threshold — see `takeGround`, which works out the real one
 * from the picture. Without a floor, a frame that is nothing but background
 * divides by almost nothing and turns its own noise into a subject.
 */
export const KEPT = 64;

/** How wide a ring around the frame is read to learn the background. */
export const RING = 3;

const apart = (a: Colour, b: Colour): number =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/**
 * What the background is, learned from the edges of the frame.
 *
 * Every colour in the ring is matched against the ones already found and
 * merged into the nearest if it is close enough, so a checkerboard arrives as
 * two and compression noise does not arrive as hundreds. They come back in
 * the order they were found, commonest first, so a caller that wants only the
 * main one can take the first.
 */
export function groundsOf(pixels: Pixels, ring = RING): Colour[] {
  const { data, width, height } = pixels;
  const found: { at: Colour; seen: number }[] = [];
  const look = (x: number, y: number): void => {
    const o = (y * width + x) * 4;
    /* A pixel that is already see-through says nothing about the ground. */
    if (data[o + 3] < 8) return;
    const one: Colour = [data[o], data[o + 1], data[o + 2]];
    let best = -1;
    let least = Infinity;
    found.forEach((was, at) => {
      const d = apart(was.at, one);
      if (d < least) { least = d; best = at; }
    });
    if (best >= 0 && least <= SAME) {
      found[best].seen += 1;
      return;
    }
    found.push({ at: one, seen: 1 });
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x < ring || y < ring || x >= width - ring || y >= height - ring;
      if (edge) look(x, y);
    }
  }
  return found
    .sort((a, b) => b.seen - a.seen)
    .slice(0, MOST_GROUNDS)
    .map((one) => one.at);
}

/** What a cut-out did, so the room can say something true about it. */
export type Taken = {
  readonly pixels: Pixels;
  /** How much of the frame went see-through, 0 to 1. */
  readonly removed: number;
  /** The colours it decided the background was. */
  readonly grounds: readonly Colour[];
};

/**
 * Take the background out.
 *
 * `reach` is the one real choice and it is the caller's, because the right
 * answer depends on the picture and nothing in the pixels says which:
 *
 *   · `'everywhere'` clears every pixel of a background colour, wherever it
 *     is. Right for a drawing or a logo, where the gaps INSIDE the mark are
 *     background too and the whole point is to see through them.
 *   · `'edges'` clears only what is joined to the edge of the frame. Right
 *     for a photograph, where a white shirt in the middle of the picture is
 *     not the background and punching a hole in it is the thing this kind of
 *     tool is notorious for.
 */
export function takeGround(
  pixels: Pixels,
  reach: 'everywhere' | 'edges' = 'everywhere',
  grounds = groundsOf(pixels),
): Taken {
  const { data, width, height } = pixels;
  const out = new Uint8ClampedArray(data);
  const alpha = new Float32Array(width * height);

  /* How far every pixel is from the nearest background colour. */
  const away = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    const one: Colour = [data[o], data[o + 1], data[o + 2]];
    let least = Infinity;
    for (const ground of grounds) {
      const d = apart(ground, one);
      if (d < least) least = d;
    }
    away[i] = grounds.length === 0 ? Infinity : least;
  }

  /**
   * How far away "all the way to the picture" is, for THIS picture.
   *
   * A pixel on the edge of a line is a mixture: part ground, part drawing. If
   * it is a tenth drawing it sits a tenth of the way from the ground to the
   * drawing's own colour — so the share of the way IS the share of the pixel
   * the drawing covers, and that is the alpha it should get.
   *
   * Which means the far end cannot be a number typed here. It is how far the
   * drawing is from the ground, and that differs per picture: navy on white
   * is 338 apart, grey on white is 60. A fixed 64 called a pixel that was
   * half navy fully opaque, and every anti-aliased line came out as a
   * staircase. It was the check that said so.
   *
   * Taken as a high percentile rather than the maximum, because one stray
   * pixel of pure black would otherwise set the scale for the whole picture.
   */
  const sorted = Array.from(away).filter((d) => Number.isFinite(d)).sort((a, b) => a - b);
  const full = Math.max(KEPT, sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : KEPT);

  for (let i = 0; i < width * height; i += 1) {
    const kept = (away[i] - CLEAR) / (full - CLEAR);
    alpha[i] = Math.max(0, Math.min(1, kept));
  }

  if (reach === 'edges') {
    /* Only ground joined to the frame is ground. Walk in from the border
       through pixels the measurement already called background, and clear
       just those; everything else keeps the alpha it arrived with. */
    const reached = new Uint8Array(width * height);
    const queue: number[] = [];
    const push = (x: number, y: number): void => {
      const i = y * width + x;
      if (reached[i] || alpha[i] >= 1) return;
      reached[i] = 1;
      queue.push(i);
    };
    for (let x = 0; x < width; x += 1) { push(x, 0); push(x, height - 1); }
    for (let y = 0; y < height; y += 1) { push(0, y); push(width - 1, y); }
    while (queue.length) {
      const i = queue.pop()!;
      const x = i % width;
      const y = (i - x) / width;
      if (x > 0) push(x - 1, y);
      if (x < width - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < height - 1) push(x, y + 1);
    }
    for (let i = 0; i < alpha.length; i += 1) if (!reached[i]) alpha[i] = 1;
  }

  let cleared = 0;
  for (let i = 0; i < width * height; i += 1) {
    const was = data[i * 4 + 3] / 255;
    const now = alpha[i] * was;
    out[i * 4 + 3] = Math.round(now * 255);
    if (now < 0.02) cleared += 1;
  }

  return {
    pixels: { data: out, width, height },
    removed: cleared / (width * height),
    grounds,
  };
}

/**
 * How much may go before it is worth saying something.
 *
 * A cut-out that takes 97% of the frame has almost certainly decided the
 * subject was background too, and hands back an empty picture — which on a
 * phone looks exactly like a picture that failed to load. The room warns
 * rather than refuses, because "almost everything" is the right answer for a
 * small mark on a big white square, which is precisely this logo.
 */
export const NEARLY_ALL = 0.97;

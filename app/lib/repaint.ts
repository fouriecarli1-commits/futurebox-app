/**
 * Giving a cut-out shape a new colour, flat or pearlescent.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Iets wat ek ook nou beleef het met die logo wat
 * ek transparent gemaak het, wat ook belangrik kan wees is om 'n logo, of 'n
 * objek se kleur te kan verander. Ek dink ook wanneer dit kom by kleur, moet
 * mens ook die pearlescent funksie in sit waar twee na 3 kleure saam blend
 * vir 'n kleur skakering."*
 *
 * She hit this on her own artwork within the hour: a navy mark, cut out, that
 * cannot be read on a dark page. The app's answer to that was to turn a whole
 * room light, which is the right answer when it is OUR room and the wrong
 * answer for somebody else's poster. The answer that scales is to let her
 * change the colour herself — her decision about her own drawing, rather than
 * mine about it.
 *
 * ── Why the alpha channel is never touched ───────────────────────────────
 *
 * It IS the cut. Every soft edge the remover worked out, every anti-aliased
 * line, the holes inside a letter — all of that lives in alpha, and none of
 * it is about colour. So this reads alpha, paints only where there is
 * something, and writes alpha back unchanged. A recolour can therefore never
 * undo a cut, re-introduce a halo, or harden an edge; the worst it can do is
 * be the wrong colour, which is one press to change again.
 *
 * ── Why the blend runs across the SHAPE and not the sheet ────────────────
 *
 * A mark sitting in the corner of a big transparent sheet would otherwise
 * get one sliver of the ramp and come out looking flat, with the rest of the
 * sweep spent on empty pixels nobody sees. So the ends of the gradient are
 * pinned to the shape's own edges, found by looking at where the alpha is.
 *
 * ── Why the original's shading survives ──────────────────────────────────
 *
 * A logo is usually flat and does not care. A photographed object is not: it
 * has light on one side, and a repaint that throws that away hands back a
 * sticker. So each pixel's own lightness, measured against the lightest
 * pixel in the shape, is kept as a multiplier.
 *
 * ── And why "the lightest pixel" means the lightest SOLID one ────────────
 *
 * The first version measured across every pixel that was not transparent,
 * and the claim written next to it — that flat art has one lightness so the
 * multiplier is 1 everywhere — was wrong in the one case that matters.
 * Anti-aliased line work does not have one lightness: its soft edges are
 * partly the background it was cut from, so they are LIGHTER than the line,
 * and the brightest pixel in the shape is a half-transparent edge. The body
 * of the line is then measured against that and dimmed.
 *
 * Caught by looking at it: her orange came out muddy on a navy mark. So the
 * reference is the lightest pixel that is actually solid — the shape's own
 * body, not the feathering the remover left round it.
 *
 * `check:verf` holds all of it, including the one that would ship silently:
 * a ramp that reads its stops in the wrong order gives a mirror image of the
 * blend, which is a picture that is wrong and looks deliberate.
 */

/** Pixels as a canvas hands them over. */
export interface Sheet {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/**
 * How many colours may be blended.
 *
 * Three, which is what she asked for — *"twee na 3 kleure"* — and also where
 * a blend stops reading as a sheen and starts reading as a rainbow.
 */
export const MOST_COLOURS = 3;

/** Below this a pixel is nothing, and nothing does not get painted. */
export const SOMETHING = 4;

/**
 * At or above this a pixel is the shape itself rather than its soft edge.
 *
 * 250 of 255: anything a hair under full is the remover's feathering, which
 * is part background and therefore lighter than the line it belongs to.
 */
export const SOLID = 250;

export type Rgb = readonly [number, number, number];

/** `#rgb` or `#rrggbb` to channels. Anything else is null rather than black. */
export function rgbOf(hex: string): Rgb | null {
  const said = hex.trim();
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(said);
  if (short) {
    return [1, 2, 3].map((at) => parseInt(short[at] + short[at], 16)) as unknown as Rgb;
  }
  const full = /^#?([0-9a-f]{6})$/i.exec(said);
  if (!full) return null;
  return [0, 2, 4].map((at) => parseInt(full[1].slice(at, at + 2), 16)) as unknown as Rgb;
}

/**
 * The colour a fraction of the way along the ramp.
 *
 * `at` is clamped rather than wrapped: a value past the end is the end, not
 * the beginning again, because a wrap puts a seam down the middle of a shape
 * and the seam looks like a drawing mistake rather than a bug.
 */
export function rampAt(stops: readonly Rgb[], at: number): Rgb {
  if (!stops.length) return [0, 0, 0];
  if (stops.length === 1) return stops[0];
  const held = Math.min(1, Math.max(0, at));
  const span = held * (stops.length - 1);
  const first = Math.min(stops.length - 2, Math.floor(span));
  const part = span - first;
  return [0, 1, 2].map((one) => Math.round(
    stops[first][one] + (stops[first + 1][one] - stops[first][one]) * part,
  )) as unknown as Rgb;
}

/** Where the shape actually is, read off the alpha. */
export function shapeOf(sheet: Sheet): {
  readonly left: number; readonly top: number;
  readonly right: number; readonly bottom: number;
} | null {
  let left = sheet.width; let top = sheet.height; let right = -1; let bottom = -1;
  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      if (sheet.data[(y * sheet.width + x) * 4 + 3] < SOMETHING) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

/** How light a pixel is, 0 to 1. Rec. 709, the same weights everything else uses. */
export const lightOf = (r: number, g: number, b: number): number =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export interface Paint {
  /** One colour is flat; two or three are the pearlescent blend. */
  readonly colours: readonly string[];
  /** Which way the blend runs, in degrees. 0 is left to right. */
  readonly angle?: number;
  /**
   * Whether the original's own light and shade is kept.
   *
   * On for a photographed object, off for flat artwork — though flat artwork
   * does not notice either way, because its lightness is already one value.
   */
  readonly keepShading?: boolean;
}

/**
 * Paint everything that is not transparent, and leave the transparency alone.
 *
 * Answers a new sheet rather than writing into the one it was given: the
 * room keeps the picture before this as the thing "Put it back" restores,
 * and a function that edits in place quietly removes that.
 */
export function repaint(sheet: Sheet, paint: Paint): Sheet | null {
  const stops = paint.colours.slice(0, MOST_COLOURS)
    .map(rgbOf).filter((one): one is Rgb => one !== null);
  if (!stops.length) return null;

  const shape = shapeOf(sheet);
  if (!shape) return null;

  const radians = ((paint.angle ?? 0) * Math.PI) / 180;
  const across = Math.cos(radians);
  const down = Math.sin(radians);
  const wide = Math.max(1, shape.right - shape.left);
  const tall = Math.max(1, shape.bottom - shape.top);
  /* The two corners of the shape's box furthest apart along the blend's own
     direction. Without this a 45° sweep on a wide shape runs off the end and
     the last third of the ramp is never seen. */
  const reach = Math.abs(across * wide) + Math.abs(down * tall);

  /* The lightest pixel in the shape, so shading is kept as a ratio to
     something real rather than to white — a dark object measured against
     white comes back almost black. */
  let brightest = 0;
  if (paint.keepShading) {
    for (let at = 0; at < sheet.data.length; at += 4) {
      /* Solid only. A half-transparent edge is part background and reads
         lighter than the line it belongs to — see the header. */
      if (sheet.data[at + 3] < SOLID) continue;
      const light = lightOf(sheet.data[at], sheet.data[at + 1], sheet.data[at + 2]);
      if (light > brightest) brightest = light;
    }
    /* A shape with no solid pixel at all — a whole drawing of feathering —
       has nothing to measure against, so nothing is dimmed. */
    if (brightest === 0) brightest = 1;
  }

  const out = new Uint8ClampedArray(sheet.data);
  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      const at = (y * sheet.width + x) * 4;
      if (sheet.data[at + 3] < SOMETHING) continue;
      const along = reach === 0 ? 0
        : (across * (x - shape.left) + down * (y - shape.top)
          + (across < 0 ? wide : 0) + (down < 0 ? tall : 0)) / reach;
      const colour = rampAt(stops, along);
      const shade = paint.keepShading && brightest > 0
        ? Math.min(1, lightOf(sheet.data[at], sheet.data[at + 1], sheet.data[at + 2]) / brightest)
        : 1;
      out[at] = Math.round(colour[0] * shade);
      out[at + 1] = Math.round(colour[1] * shade);
      out[at + 2] = Math.round(colour[2] * shade);
      /* Alpha copied, never computed. See the header. */
    }
  }
  return { data: out, width: sheet.width, height: sheet.height };
}

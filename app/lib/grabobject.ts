/**
 * The things in a photograph, found so one of them can be lifted out.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Ek dink hierdie funksie by photo editor moet net
 * sê grab, dan moet die objekte en woorde gehighlight word, en dit moet dan
 * rondgeskuif kan word en ge-edit word."*
 *
 * The words half has existed since 8 October: a reader on her own device
 * draws a box round every line and she taps one to lift it. This is the
 * other half — the same gesture, for the things in the picture rather than
 * the writing on it.
 *
 * ── Why this one reaches an engine when the words do not ─────────────────
 *
 * And when she was told the cheap version runs on the phone: *"Niks is
 * gratis."* So it is Google, and it is charged per press like every other
 * engine in the app.
 *
 * The reason there is no phone-sized version worth having: reading letters
 * is a solved, small problem, and a reader that fits in a browser has been
 * shipping for years. "What is in this photograph, and exactly which pixels
 * is it" is not that. The honest on-device version is a flood fill from
 * where you tapped, which cuts a flat logo well and a dog on grass badly —
 * and a tool that works on a quarter of the pictures somebody tries is a
 * tool they stop trusting.
 *
 * ── What this file is and is not ─────────────────────────────────────────
 *
 * It is the arithmetic: what to ask, how to read the answer, and how to turn
 * a mask into a cut. It calls nothing and holds no key — the seam is
 * `api/picture/objects`, which is where the caller is checked and the charge
 * happens, exactly as every other supplier-reaching route in this app works.
 *
 * Which also means every rule below can be driven by `check:gryp` without a
 * network, a key, or a rand spent.
 *
 * ── The trap this file exists to contain ─────────────────────────────────
 *
 * Gemini answers a box as **[ymin, xmin, ymax, xmax]**, normalised to
 * 0–1000. Not x first. Not 0–1. A reader that assumes the ordinary order
 * gets a box that is plausible, drawable, and wrong — and on a square
 * picture of a centred subject it is almost right, which is the worst
 * possible way to be wrong. So the ordering is converted once, here, and
 * `check:gryp` drives it with a deliberately lopsided box where swapping the
 * pairs cannot pass.
 */

/** A box as this app uses one: left, top, right, bottom, in pixels. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** One thing the engine found. */
export interface Found {
  /** What it called the thing, in its own words — or, for writing, the words exactly as printed. Shown, never trusted. */
  readonly label: string;
  /** A thing to cut out, or a line of writing to take as text. */
  readonly kind: 'object' | 'text';
  readonly box: Box;
  /** The mask as it arrived: a base64 PNG, or null when only a box came. */
  readonly mask: string | null;
}

/** The scale Gemini normalises a box to. Not 0–1, and not the pixel size. */
export const GRID = 1000;

/**
 * How many things are worth finding in one picture.
 *
 * Twelve things was the ceiling while it found only things. Since 17 October
 * 2026 it reads the writing too — Carli: *"Die text en die objekte moet
 * highlight"*, and the phone's own reader was inventing words out of hair —
 * so a poster's lines count as well, and twenty leaves room for both before
 * the boxes overlap on a phone.
 */
export const MOST_THINGS = 20;

/** Below this a label is not a label, and the row is dropped. */
export const SHORTEST_LABEL = 2;

/**
 * What to ask for.
 *
 * Written out rather than built, because an instruction assembled from
 * fragments is an instruction nobody can read in review — and this one has
 * to be exact or the answer comes back in a shape the reader below refuses.
 */
export const ASK = [
  'Find the distinct objects in this picture, and every line of printed or written text in it.',
  'Answer with JSON only: an array of objects, each with',
  '"kind" ("object" or "text"),',
  '"label" (for an object, two or three words in plain English; for text, the words exactly as they appear, never guessed),',
  '"box_2d" ([ymin, xmin, ymax, xmax], each 0-1000),',
  'and, for an object, "mask" (a base64 PNG, white where the object is).',
  'Only text that is really there and readable; never read letters into hair, cloth or texture.',
  `At most ${MOST_THINGS} entries, the largest and clearest first.`,
  'No prose, no code fence, no explanation.',
].join(' ');

/** A box out of the engine's grid and into this picture's pixels. */
export function boxOf(
  grid: readonly number[],
  wide: number,
  tall: number,
): Box | null {
  if (grid.length !== 4 || grid.some((one) => !Number.isFinite(one))) return null;
  /* [ymin, xmin, ymax, xmax] — see the header. */
  const [top, left, bottom, right] = grid;
  if (top >= bottom || left >= right) return null;
  if (grid.some((one) => one < 0 || one > GRID)) return null;
  return {
    left: Math.round((left / GRID) * wide),
    top: Math.round((top / GRID) * tall),
    right: Math.round((right / GRID) * wide),
    bottom: Math.round((bottom / GRID) * tall),
  };
}

/**
 * Read the answer.
 *
 * Tolerant of the three things an engine does anyway — a code fence, a
 * sentence in front of the JSON, a key spelled the other way — and refuses
 * everything else rather than guessing. A row with no usable box is dropped
 * rather than defaulted: a box in the wrong place is a tap that lifts the
 * wrong part of somebody's photograph.
 */
export function readFound(said: string, wide: number, tall: number): Found[] {
  const text = said.trim();
  /* The JSON array, wherever it is. A fence, a "Here is the JSON:" before
     it, a trailing newline — all of which arrive in practice. */
  const from = text.indexOf('[');
  const upTo = text.lastIndexOf(']');
  if (from === -1 || upTo <= from) return [];
  let rows: unknown;
  try {
    rows = JSON.parse(text.slice(from, upTo + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];

  const out: Found[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const one = row as Record<string, unknown>;
    const label = typeof one.label === 'string' ? one.label.trim() : '';
    if (label.length < SHORTEST_LABEL) continue;
    /* Both spellings, because the documented key is `box_2d` and the one
       that actually comes back is sometimes `box`. Neither is worth a
       support message about a button that found nothing. */
    const grid = Array.isArray(one.box_2d) ? one.box_2d
      : Array.isArray(one.box) ? one.box : null;
    const box = grid ? boxOf(grid.map(Number), wide, tall) : null;
    if (!box) continue;
    const mask = typeof one.mask === 'string' && one.mask.length > 32
      ? one.mask.replace(/^data:image\/png;base64,/, '')
      : null;
    const kind = one.kind === 'text' ? 'text' : 'object';
    out.push({ label: label.slice(0, kind === 'text' ? 120 : 40), kind, box, mask: kind === 'text' ? null : mask });
    if (out.length >= MOST_THINGS) break;
  }
  return out;
}

/**
 * Where a mask is white enough to be the thing.
 *
 * A mask is a probability, not a stencil: its edges run from nothing to
 * everything over a few pixels, which is what makes a lifted object sit on
 * a new background without a cut-out-with-scissors edge. So the alpha is the
 * mask's own value rather than a yes or no, and this threshold only decides
 * what counts as nothing at all.
 */
export const INSIDE = 24;

/** The mask's pixels, as alpha for the box they belong to. */
export interface Lift {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/**
 * Cut the thing out of the picture, using the mask for its alpha.
 *
 * Answers a sheet the size of the BOX and not of the picture: a lifted
 * object is its own thing from here on, to be moved, painted with
 * `lib/repaint.ts`, or saved on its own, and carrying the rest of the
 * photograph around as transparent pixels makes every one of those slower
 * and the saved file larger for nothing.
 *
 * The mask arrives at its own size — the engine decides, and it is usually
 * smaller than the box — so it is read by proportion rather than by index.
 * Reading it by index is the bug that produces a cut that is recognisably
 * the right shape and a few pixels off, which looks like a bad engine
 * rather than like arithmetic.
 */
export function liftWith(
  picture: Lift,
  box: Box,
  mask: Lift,
): Lift | null {
  const wide = box.right - box.left;
  const tall = box.bottom - box.top;
  if (wide <= 0 || tall <= 0) return null;
  if (!mask.width || !mask.height) return null;

  const out = new Uint8ClampedArray(wide * tall * 4);
  for (let y = 0; y < tall; y += 1) {
    const maskY = Math.min(mask.height - 1, Math.floor((y / tall) * mask.height));
    for (let x = 0; x < wide; x += 1) {
      const maskX = Math.min(mask.width - 1, Math.floor((x / wide) * mask.width));
      /* A mask PNG is grey: any channel is the value. Red, because a grey
         written as RGB has it in all three and a grey written as one
         channel has it in the first. */
      const how = mask.data[(maskY * mask.width + maskX) * 4];
      const at = (y * wide + x) * 4;
      const from = ((y + box.top) * picture.width + (x + box.left)) * 4;
      out[at] = picture.data[from];
      out[at + 1] = picture.data[from + 1];
      out[at + 2] = picture.data[from + 2];
      out[at + 3] = how < INSIDE ? 0 : how;
    }
  }
  return { data: out, width: wide, height: tall };
}

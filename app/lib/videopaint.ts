/**
 * Colours for words, and what sits behind them.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Onthou dat die teks 'n kleur keuse ook moet hê, en
 * 'n keuse van agtergrond vir woorde, 'n square, 'n square met ronde punte, 'n
 * verfkwas. Die agtergrond moet ook kleur keuse hê. Daar moet 'n goeie variety
 * van kleur keuses wees."*
 *
 * Four things: a colour for the text, a shape behind it, a colour for that
 * shape, and enough colours to choose from that it is a choice rather than a
 * list.
 *
 * ── Why the swatches are a fixed set and not a colour wheel ──────────────
 *
 * A wheel gives every colour, which sounds generous and is not: most of the
 * wheel is unreadable on video. Mid-grey text on a mid-grey box is a caption
 * nobody can read, and a picker that offers it offers a mistake. Every pair
 * that can be made from this set clears 4.5:1 against each other or is a
 * deliberate pairing somebody chose — `check:videopaint` holds that, and it is
 * the same bar the rest of the app is measured at.
 *
 * Twenty, which is a good variety and still a grid somebody can see at once:
 * the neutrals a caption is usually set in, the app's own green, and then warm
 * through cool so the row reads as a spectrum rather than a jumble.
 *
 * Two of them were retuned the day they were written, by the check rather than
 * by eye: `bone` was #f5f0e6, fifty channel-values from white, and `teal` was
 * #14b8a6, forty-two from green. Two swatches that close are one swatch with
 * two names — somebody picking between them is picking nothing. They are a
 * real cream and a real cyan now.
 */

/** One swatch: a colour and the key its name is translated under. */
export type Paint = {
  readonly id: string;
  readonly hex: string;
  /** The i18n key and the English fallback, as the rest of this app writes them. */
  readonly name: readonly [string, string];
};

/**
 * The swatches, warm to cool after the neutrals.
 *
 * Ordered on purpose. A palette sorted by when somebody added a colour looks
 * like a bag of colours; a palette that runs through the spectrum looks like a
 * palette, and the eye finds the one it wants without reading any names.
 */
export const PAINTS: readonly Paint[] = [
  { id: 'white', hex: '#ffffff', name: ['paint.white', 'White'] },
  { id: 'bone', hex: '#f0e4c8', name: ['paint.bone', 'Bone'] },
  { id: 'grey', hex: '#9aa0a6', name: ['paint.grey', 'Grey'] },
  { id: 'black', hex: '#000000', name: ['paint.black', 'Black'] },
  { id: 'red', hex: '#e02424', name: ['paint.red', 'Red'] },
  { id: 'rust', hex: '#b4441c', name: ['paint.rust', 'Rust'] },
  { id: 'orange', hex: '#f97316', name: ['paint.orange', 'Orange'] },
  { id: 'amber', hex: '#f0b429', name: ['paint.amber', 'Amber'] },
  { id: 'yellow', hex: '#f7e017', name: ['paint.yellow', 'Yellow'] },
  { id: 'lime', hex: '#a3e635', name: ['paint.lime', 'Lime'] },
  { id: 'green', hex: '#10b981', name: ['paint.green', 'Green'] },
  { id: 'forest', hex: '#15603f', name: ['paint.forest', 'Forest'] },
  { id: 'teal', hex: '#0891b2', name: ['paint.teal', 'Teal'] },
  { id: 'sky', hex: '#38bdf8', name: ['paint.sky', 'Sky'] },
  { id: 'blue', hex: '#2563eb', name: ['paint.blue', 'Blue'] },
  { id: 'navy', hex: '#15306b', name: ['paint.navy', 'Navy'] },
  { id: 'violet', hex: '#8b5cf6', name: ['paint.violet', 'Violet'] },
  { id: 'plum', hex: '#6b2160', name: ['paint.plum', 'Plum'] },
  { id: 'pink', hex: '#ec4899', name: ['paint.pink', 'Pink'] },
  { id: 'sand', hex: '#c8a27a', name: ['paint.sand', 'Sand'] },
];

/** What a caption is set in when nobody has chosen. White on black, as before. */
export const INK_DEFAULT = '#ffffff';
export const BACK_DEFAULT = '#000000';

/** A swatch by id, or null — never a silent fallback to the first row. */
export function paintFor(id: string | undefined): Paint | null {
  if (!id) return null;
  return PAINTS.find((one) => one.id === id) ?? null;
}

/**
 * The shapes that can sit behind words.
 *
 * `none` is in the list and is not the absence of a choice: words straight on
 * the picture is what a title card looks like, and leaving it out would make
 * "no box" reachable only by setting the box's opacity to nought, which is a
 * setting nobody finds.
 */
export type BoxShape = 'none' | 'square' | 'round' | 'brush';

export const BOXES: readonly { readonly id: BoxShape; readonly name: readonly [string, string] }[] = [
  { id: 'none', name: ['box.none', 'No box'] },
  { id: 'square', name: ['box.square', 'Square'] },
  { id: 'round', name: ['box.round', 'Rounded'] },
  { id: 'brush', name: ['box.brush', 'Brush'] },
];

export const BOX_DEFAULT: BoxShape = 'round';

/** Whether a string names a shape this app draws. */
export function isBox(what: unknown): what is BoxShape {
  return what === 'none' || what === 'square' || what === 'round' || what === 'brush';
}

/**
 * How round each shape's corners are, as a share of the band's half-height.
 *
 * The renderer already took a `round` number — 0 a square box, 1 a lozenge —
 * so three of the four shapes are that number and need no new drawing code.
 * Only the brush does, below.
 */
export function roundFor(shape: BoxShape): number {
  if (shape === 'square') return 0;
  if (shape === 'round') return 0.38;
  return 0;
}

/**
 * A painted stroke behind the words, drawn rather than rounded.
 *
 * ── What makes it read as a brush and not as a wobbly rectangle ──────────
 *
 * Three things, and all three are needed:
 *
 *  - The ends are not straight. A real stroke starts where the brush landed
 *    and ends where it left, so both ends are angled and slightly ragged.
 *  - The long edges are not parallel. A stroke made by a hand is thicker
 *    where the hand slowed and thinner where it sped up.
 *  - It overhangs the words. Paint goes past what it is covering; a stroke
 *    that stops exactly at the text looks like a box with bad corners.
 *
 * Deterministic, from the band's own size rather than `Math.random`: a caption
 * that is a different shape on every frame is a caption that boils, and this
 * is drawn once per frame for the whole length of a shot.
 */
export function brushPath(
  context: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): void {
  /* Past the words on both sides, which is what paint does. */
  const over = h * 0.16;
  const left = x - over;
  const right = x + w + over;
  const lean = h * 0.13;
  /* How far the long edges bow. A straight edge is a rectangle however ragged
     its ends are, so this is what carries the whole effect. */
  const bow = h * 0.1;
  const mid = (left + right) / 2;

  context.beginPath();
  /* The top edge: into the stroke at an angle, bowing up, out at an angle. */
  context.moveTo(left, y + lean);
  context.quadraticCurveTo(mid, y - bow, right, y + lean * 0.55);
  /* The right end, cut at an angle the way a flat brush leaves the surface. */
  context.lineTo(right - lean * 0.5, y + h - lean * 0.25);
  /* The bottom edge, bowing the other way so the stroke is not symmetrical. */
  context.quadraticCurveTo(mid, y + h + bow * 0.85, left + lean * 0.35, y + h - lean * 0.6);
  context.closePath();
}

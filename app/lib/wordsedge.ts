/**
 * What keeps words readable over a moving picture.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink ook daar moet heelwat 'n verskeidenheid
 * van teks opsies wees."* Measuring before adding found something worse than
 * a short list: words burned into a film had **no outline and no shadow at
 * all**. `stitch.ts` set a fill colour and called `fillText`, and that was
 * the whole of it.
 *
 * Which is fine on the shot it was tried on and invisible on the next one.
 * White words over a bright sky are gone. Black words over a dark room are
 * gone. The caption box hid the problem — at 62% black behind every caption
 * there is always contrast — so the fault only shows on the one setting that
 * exists precisely to have no box: a title card. The photo editor has had a
 * shadow since it was written; the cutting room never did.
 *
 * ── Why this is a file and not four lines in the painter ─────────────────
 *
 * Because the thing that can be wrong is arithmetic, and a canvas is not
 * something a check can read. A stroke too thin vanishes at 1080p; one too
 * thick closes the counters of an `e` and turns a word into a smudge. Both
 * look like a font problem rather than a width problem, and neither throws.
 *
 * So the widths and blurs are worked out here, against the text size, and
 * `check:woordrand` drives them at the sizes a film is actually rendered at.
 * `stitch.ts` applies what it is given.
 *
 * ── Why the outline is dark and the shadow darker ────────────────────────
 *
 * Not black, and not the opposite of the ink. The opposite of a mid-grey ink
 * is a mid-grey, which reads as a blur rather than an edge — and a white
 * outline on white words is nothing at all. A near-black edge is what every
 * subtitle on television does, and it works against both a bright sky and a
 * dark room because the eye reads the SEAM rather than the colour.
 */

export type EdgeId = 'none' | 'outline' | 'shadow' | 'both';

export interface Edge {
  readonly id: EdgeId;
  readonly en: string;
  readonly af: string;
}

export const EDGES: readonly Edge[] = [
  { id: 'none', en: 'None', af: 'Geen' },
  { id: 'outline', en: 'Outline', af: 'Omlyn' },
  { id: 'shadow', en: 'Shadow', af: 'Skaduwee' },
  { id: 'both', en: 'Both', af: 'Albei' },
];

/**
 * The default.
 *
 * `outline` and not `none`, because the setting that existed before this was
 * written was effectively `none` and it was wrong on half the shots anybody
 * would use it on. An edit made before today has no value stored, so this is
 * what it gets — a change to how an old edit renders, chosen deliberately:
 * the old rendering was the bug.
 */
export const EDGE_DEFAULT: EdgeId = 'outline';

export interface Painted {
  /** Stroke width in pixels, or 0 for no stroke. */
  readonly stroke: number;
  /** Shadow blur in pixels, or 0 for none. */
  readonly blur: number;
  /** How far the shadow falls, in pixels. */
  readonly drop: number;
  /** The colour for both. */
  readonly colour: string;
}

/** Near-black rather than black: a pure black edge reads as a hole at size. */
export const EDGE_COLOUR = 'rgba(0, 0, 0, 0.85)';

/**
 * How to paint the edge, for text of this size.
 *
 * Everything is a share of the size, so a caption at 32px on a phone and one
 * at 96px on a 4K export get the same WEIGHT of edge rather than the same
 * number of pixels — which at 96px is a hairline and at 32px is a smudge.
 *
 * The share itself is the one number worth arguing about. A twelfth is what
 * a broadcast subtitle uses and it survives both ends of the range: at 24px
 * it is 2 pixels, which is visible; at 160px it is 13, which is an edge and
 * not a slab.
 */
export function paintedFor(id: EdgeId | undefined, size: number): Painted {
  const px = Math.max(1, size);
  const edge = id ?? EDGE_DEFAULT;
  /* Rounded up, because a stroke of 0.4 is a stroke the canvas draws as
     nothing and the setting then does nothing at small sizes — which is
     exactly where it is needed most. */
  const stroke = Math.max(2, Math.ceil(px / 12));
  const blur = Math.max(3, Math.round(px / 5));
  const drop = Math.max(1, Math.round(px / 24));

  if (edge === 'none') return { stroke: 0, blur: 0, drop: 0, colour: EDGE_COLOUR };
  if (edge === 'outline') return { stroke, blur: 0, drop: 0, colour: EDGE_COLOUR };
  if (edge === 'shadow') return { stroke: 0, blur, drop, colour: EDGE_COLOUR };
  return { stroke, blur, drop, colour: EDGE_COLOUR };
}

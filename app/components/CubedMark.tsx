/**
 * The Cubed mark: two cubes threaded through each other, in iron.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek soek ook 'n Logo waar twee cubes in mekaar
 * vervleg is met 'n sterk yster tipe look."*
 *
 * ── Why it is drawn rather than generated ────────────────────────────────
 *
 * Because it is a logo. A generated picture is a different picture every time
 * it is asked for, it arrives as pixels, it cannot be recoloured for a light
 * page, and the one in the room would not be the one in the favicon. Paths
 * are the same mark at every size, weigh about two kilobytes, and take a
 * colour.
 *
 * ── How two cubes interweave, which is the whole problem ─────────────────
 *
 * Interwoven means each cube passes in FRONT of the other somewhere. A flat
 * drawing cannot do that by stacking: whatever is drawn second is in front
 * everywhere, which is two cubes overlapping — and that is what the first
 * version of this file was. It was drawn, looked at, and thrown away.
 *
 * The way it is actually done is the way a draughtsman does it. Each cube is
 * nine bars. The far cube goes down first. Then every bar of the near cube is
 * drawn TWICE: once fat, in the background colour, and once at its own width
 * in iron — so the fat pass erases the far cube where the near one crosses it
 * and the bar sits in the hole it just made. Then two bars of the FAR cube are
 * drawn again the same way, on top, so those two cross back over.
 *
 * That last step is the one that earns the word. Without it the far cube is
 * merely behind, and behind is not woven.
 *
 * `back` is why it has to be given rather than assumed: the erasing pass is
 * painted in the page's own colour, so a mark drawn with black on a white page
 * is a mark with black gashes through it.
 *
 * ── The iron ─────────────────────────────────────────────────────────────
 *
 * One gradient across the whole mark in user space, not one per bar. A
 * gradient per bar lights every bar from its own direction, and eighteen
 * separately lit bars read as eighteen objects rather than two cubes. Five
 * stops rather than two, because a smooth ramp reads as plastic.
 */

import React from 'react';

/** The geometry, so a check can ask the same questions the drawing answers. */
export const BAR = 6;
/** The erasing pass. Wider than the bar, or the hole does not clear its edges. */
export const CASING = 9.4;

/**
 * One isometric cube as nine bars: the hexagon's six, and the three that run
 * to the near corner.
 */
export function cubeBars(cx: number, cy: number, side: number): string[] {
  const h = side * 0.5;
  /* tan(30°) × half width: the rise of an isometric edge. */
  const q = side * 0.28868;
  const d = side * 0.62;
  const T: [number, number] = [cx, cy];
  const TL: [number, number] = [cx - h, cy + q];
  const TR: [number, number] = [cx + h, cy + q];
  const C: [number, number] = [cx, cy + 2 * q];
  const BL: [number, number] = [cx - h, cy + q + d];
  const BR: [number, number] = [cx + h, cy + q + d];
  const B: [number, number] = [cx, cy + 2 * q + d];
  const bar = (a: [number, number], b: [number, number]): string =>
    `M${a[0].toFixed(2)},${a[1].toFixed(2)}L${b[0].toFixed(2)},${b[1].toFixed(2)}`;
  return [
    bar(T, TL), bar(T, TR),
    bar(TL, C), bar(TR, C),
    bar(TL, BL), bar(TR, BR), bar(C, B),
    bar(BL, B), bar(BR, B),
  ];
}

/* The two cubes, placed so the drawing sits in the middle of its box and the
   overlap is large enough to weave. Written out rather than computed: a mark
   is a drawing somebody can read, not a function somebody has to run. */
const FAR = cubeBars(45, 19, 48);
const NEAR = cubeBars(75, 43, 48);

/**
 * Which bars of the far cube come back over the near one.
 *
 * Five is its right-hand vertical and eight is its lower-right bar — the two
 * that actually cross the near cube's top face. Choosing bars that do not
 * cross anything would draw something and weave nothing, which is exactly how
 * this kind of mark looks right in the source and wrong on the page.
 */
const OVER = [5, 8];

export default function CubedMark({
  size = 64,
  back = '#09090b',
  title,
}: {
  readonly size?: number;
  /** The colour of the page behind it. The erasing pass is painted in this. */
  readonly back?: string;
  /** Given where the mark is the only thing saying what this is. */
  readonly title?: string;
}): React.ReactElement {
  /* One id per instance, or two marks on a page share a gradient. */
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const iron = `url(#${id}iron)`;

  const bars = (paths: readonly string[], stroke: string, width: number) =>
    paths.map((d, at) => (
      <path
        key={`${stroke}-${width}-${at}`}
        d={d}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
      />
    ));

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-cubedmark
    >
      <defs>
        <linearGradient id={`${id}iron`} gradientUnits="userSpaceOnUse" x1="8" y1="6" x2="112" y2="114">
          <stop offset="0%" stopColor="#f4f6f9" />
          <stop offset="24%" stopColor="#b2bbc5" />
          <stop offset="48%" stopColor="#6f7883" />
          <stop offset="72%" stopColor="#3c444d" />
          <stop offset="100%" stopColor="#1a1f25" />
        </linearGradient>
      </defs>

      {/* The far cube, whole. */}
      {bars(FAR, iron, BAR)}

      {/* The near cube, in the hole it makes for itself. */}
      {bars(NEAR, back, CASING)}
      {bars(NEAR, iron, BAR)}

      {/* And two bars of the far cube back over the top, which is the weave. */}
      {bars(OVER.map((at) => FAR[at]), back, CASING)}
      {bars(OVER.map((at) => FAR[at]), iron, BAR)}
    </svg>
  );
}

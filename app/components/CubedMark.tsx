/**
 * The Cubed mark: two cubes threaded through each other, one of them turned,
 * in iron.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek soek ook 'n Logo waar twee cubes in mekaar
 * vervleg is met 'n sterk yster tipe look."* And, after looking at the first
 * one: *"Die cubed nog meer in mekaar, die een moet half gedraai wees, dat dit
 * soos een in mekaar pas en dan meer hoeke het, omdat die een gedraai is."*
 *
 * The shapes live in `app/lib/cubedmark.ts`, where they are a real cube turned
 * in three dimensions rather than a hexagon somebody placed by hand — because
 * a hand-placed hexagon can only be a cube from one direction, and her second
 * sentence asks for a second direction. This file is the drawing of them.
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
 * its visible bars. The far cube goes down first. Then every bar of the near
 * cube is drawn TWICE: once fat, in the background colour, and once at its own
 * width in iron — so the fat pass erases the far cube where the near one
 * crosses it and the bar sits in the hole it just made. Then the far cube's
 * crossing bars are drawn again the same way, on top, so those cross back over.
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
 * gradient per bar lights every bar from its own direction, and twenty
 * separately lit bars read as twenty objects rather than two cubes. Five
 * stops rather than two, because a smooth ramp reads as plastic.
 */

import React from 'react';
import { BAR, CASING, FAR, NEAR, OVER } from '../lib/cubedmark';

export { BAR, CASING } from '../lib/cubedmark';

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

      {/* The straight cube, whole. */}
      {bars(FAR, iron, BAR)}

      {/* The turned cube, in the hole it makes for itself. */}
      {bars(NEAR, back, CASING)}
      {bars(NEAR, iron, BAR)}

      {/* And the straight one's crossing bars back over the top, which is the weave. */}
      {bars(OVER.map((at) => FAR[at]), back, CASING)}
      {bars(OVER.map((at) => FAR[at]), iron, BAR)}
    </svg>
  );
}

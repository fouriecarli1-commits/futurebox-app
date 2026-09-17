/**
 * The magnet: what a dragged clip sticks to besides the grid.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 16 September 2026: *"Die timeline het 'n magnet nodig."*
 *
 * The room already had a grid. `snapped` in `lib/tempo` rounds a start time
 * to the nearest bar or beat, and the Snap box on the dock chooses which. So
 * "a magnet" is not asking for that again — it is asking for the other half
 * of what a magnet does in every desk there is: a clip that sticks to the
 * THINGS on the timeline, not only to the ruler behind them.
 *
 * The difference matters on real work. A guitar part that has to come in
 * exactly where the drums stop has nothing to do with a bar line: the point
 * it wants is the end of another clip, and that point is wherever that clip
 * happens to sit. A part that has to start where the marked piece starts is
 * the same problem. Neither is reachable by rounding to the grid, and both
 * are the commonest thing anybody does with two sounds.
 *
 * ── The rule, written down so it is predictable ──────────────────────────
 *
 * The grid still applies exactly as it did. The magnet adds a set of points
 * — the ends of every other clip, the playhead, the ends of the marked
 * piece, and the two ends of the song — and a dragged edge takes whichever
 * of those is nearest, but ONLY when it is nearer than where the grid would
 * have put it. So:
 *
 *   · far from everything, the grid wins and nothing changed;
 *   · close to another clip's end, that end wins;
 *   · with the grid off entirely, the points are all there is, and a drag in
 *     open space is free — which is what "snap: off" means and has to keep
 *     meaning.
 *
 * A rule somebody cannot predict is worse than no rule, which is the same
 * reason `snapped`'s "smart" has its rule spelled out where it is defined.
 *
 * ── Why the reach is in pixels and not in seconds ────────────────────────
 *
 * A tolerance of "a tenth of a second" is a different distance on a phone
 * than on a desk, and a different distance again on a four-minute song than
 * on a sixteen-bar loop: the axis is the width of the room and it carries
 * whatever the session is long. Half a second of a three-minute song is one
 * pixel of a 390-pixel screen, so a magnet measured in seconds is either
 * unreachable or it swallows the whole bar, depending on the song.
 *
 * So the reach is a number of pixels, converted here. Twelve is about a
 * third of a fingertip: near enough that aiming at a clip's edge lands on
 * it, far enough that a deliberate placement two clips apart is left alone.
 */

/** A point a drag can stick to, and what it is — so the room can say so. */
export interface Sticky {
  readonly at: number;
  readonly what: 'clip' | 'head' | 'region' | 'song';
  /** The lane's name, where the point came from one. */
  readonly name?: string;
}

/** Where a drag landed, and what it stuck to. Null is "the grid, or free". */
export interface Stuck {
  readonly at: number;
  readonly to: Sticky | null;
}

/** How near a point has to be, in pixels, before it pulls. */
export const REACH = 12;

/**
 * That many pixels, in seconds on this axis.
 *
 * Zero when the axis has not been measured yet, which switches the magnet
 * off rather than making it infinite — a `wide` of 0 would otherwise divide
 * into a reach of everything and pin every drag to the nearest clip.
 */
export function reachOf(pixels: number, total: number, wide: number): number {
  if (!(wide > 0) || !(total > 0)) return 0;
  return (pixels / wide) * total;
}

/**
 * Where a drag lands: the grid's answer, or a point that beat it.
 *
 * `raw` is where the finger actually is. `gridded` is what the grid made of
 * it, or NULL when there is no grid — with Snap off the grid is not a quieter
 * answer, it is no answer, and the difference is load-bearing. Both are
 * needed because the comparison is against the finger: "which of these did I
 * mean" is a question about where the hand is, not about where the grid has
 * already moved it to.
 *
 * With a grid, a point has to be strictly nearer than the grid to win. With
 * none, any point within reach wins and open space stays free — which is
 * what Snap off means and has to keep meaning.
 */
export function pullTo(
  raw: number,
  gridded: number | null,
  points: readonly Sticky[],
  within: number,
): Stuck {
  const floor = gridded ?? raw;
  if (!(within > 0) || points.length === 0) return { at: floor, to: null };

  let best: Sticky | null = null;
  let howFar = Infinity;
  for (const point of points) {
    const gap = Math.abs(raw - point.at);
    if (gap > within || gap >= howFar) continue;
    best = point;
    howFar = gap;
  }
  if (!best) return { at: floor, to: null };
  /* Only a grid can outrank a point, and only by being strictly nearer.
     `gridded === null` is Snap off, where the alternative to the point is the
     raw finger — and losing to the raw finger is losing to nothing, because
     the finger is where the reach was measured from. Written as a null rather
     than as `gridded === raw` on purpose: a grid CAN land exactly under the
     finger, and in that case it really did answer and really should keep it.

     A dead tie goes to the point. It is arbitrary either way, so it goes to
     the more specific of the two: the ruler is behind everything and the
     thing is what somebody was aiming at. */
  if (gridded !== null && howFar > Math.abs(raw - gridded)) return { at: gridded, to: null };
  return { at: best.at, to: best };
}

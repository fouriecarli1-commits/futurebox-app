/**
 * The geometry of the Cubed mark: two cubes, one of them turned, threaded
 * through each other.
 *
 * ── What she asked, twice ────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek soek ook 'n Logo waar twee cubes in mekaar
 * vervleg is met 'n sterk yster tipe look."* And then, having looked at the
 * first one: *"Die cubed nog meer in mekaar, die een moet half gedraai wees,
 * dat dit soos een in mekaar pas en dan meer hoeke het, omdat die een gedraai
 * is."*
 *
 * The second sentence is the whole brief for this file. The first mark was two
 * cubes in the SAME stance, pushed apart and overlapped. Two cubes in the same
 * stance have the same angles, so overlapping them adds nothing but clutter —
 * every line in the drawing already ran in one of three directions. Turning
 * one of them is what produces the angles she is asking for, and a cube cannot
 * be turned by nudging the numbers of a flat drawing. It has to be turned in
 * three dimensions and then flattened.
 *
 * ── So the cube is a real cube ───────────────────────────────────────────
 *
 * Eight corners, six faces with outward normals, twelve edges. A face is
 * facing us when its normal leans towards the eye; an edge is drawn when a
 * face that owns it is facing us. That rule is what deletes the three hidden
 * edges, and it keeps working at any angle — which the hand-placed hexagon
 * this replaces did not: it only knew how to be a cube from one direction.
 *
 * ── The projection ───────────────────────────────────────────────────────
 *
 * Isometric, looking down the corner (1, 1, 1):
 *
 *     sx = (x − z)·cos30°        sy = (x + z)/2 − y
 *
 * The eye vector is the same corner, normalised, so "facing us" is one dot
 * product.
 *
 * ── Why this axis and this angle ─────────────────────────────────────────
 *
 * Not every turn shows more. Turning a cube about (1, 1, 1) — the very corner
 * we are looking down — spins the finished drawing on the page and changes
 * nothing about it: same nine bars, same three directions, just rotated. It
 * was generated, looked at, and thrown away for exactly that reason. The turn
 * has to be about an axis ACROSS the view, which is what (1, −1, 0) is, and at
 * 35° it lands where the turned cube shows a face the straight one does not.
 */

/** The bar, and the pass that erases what sits under the bar. */
export const BAR = 6;
/** Wider than the bar, or the hole does not clear its edges. */
export const CASING = 9.4;

export type Point3 = readonly [number, number, number];
export type Point2 = readonly [number, number];

/** The eight corners of a cube two units on a side, centred on nothing. */
const CORNERS: readonly Point3[] = [
  [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
  [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
];

/** Where a corner lives in that list. */
const at = (x: number, y: number, z: number): number =>
  (x > 0 ? 4 : 0) + (y > 0 ? 2 : 0) + (z > 0 ? 1 : 0);

/** Six faces, each as its four corners and the way it points. */
const FACES: readonly { readonly rim: readonly number[]; readonly out: Point3 }[] = [
  { rim: [at(1, -1, -1), at(1, -1, 1), at(1, 1, 1), at(1, 1, -1)], out: [1, 0, 0] },
  { rim: [at(-1, -1, -1), at(-1, 1, -1), at(-1, 1, 1), at(-1, -1, 1)], out: [-1, 0, 0] },
  { rim: [at(-1, 1, -1), at(1, 1, -1), at(1, 1, 1), at(-1, 1, 1)], out: [0, 1, 0] },
  { rim: [at(-1, -1, -1), at(-1, -1, 1), at(1, -1, 1), at(1, -1, -1)], out: [0, -1, 0] },
  { rim: [at(-1, -1, 1), at(-1, 1, 1), at(1, 1, 1), at(1, -1, 1)], out: [0, 0, 1] },
  { rim: [at(-1, -1, -1), at(1, -1, -1), at(1, 1, -1), at(-1, 1, -1)], out: [0, 0, -1] },
];

/** The corner we look down. Isometric means the eye is on this line. */
export const VIEW: Point3 = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];

const dot = (a: Point3, b: Point3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Rodrigues: a point turned about an axis through the middle of the cube. */
export function turn(p: Point3, axis: Point3, angle: number): Point3 {
  const len = Math.sqrt(dot(axis, axis));
  const [ax, ay, az] = [axis[0] / len, axis[1] / len, axis[2] / len];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const [x, y, z] = p;
  return [
    (t * ax * ax + c) * x + (t * ax * ay - s * az) * y + (t * ax * az + s * ay) * z,
    (t * ax * ay + s * az) * x + (t * ay * ay + c) * y + (t * ay * az - s * ax) * z,
    (t * ax * az - s * ay) * x + (t * ay * az + s * ax) * y + (t * az * az + c) * z,
  ];
}

/** Three dimensions down to two, looking down the corner. */
export function flat(p: Point3, side: number, cx: number, cy: number): Point2 {
  const [x, y, z] = p;
  const k = Math.cos(Math.PI / 6);
  return [cx + (x - z) * k * side, cy + ((x + z) * 0.5 - y) * side];
}

/**
 * One cube, turned however far, as the bars you can actually see.
 *
 * Nine of them when a corner faces the eye, which is the isometric cube
 * everybody draws; more than nine at most other angles, because a turned cube
 * shows more of itself — and that is the point of turning it.
 */
export function cubeBars(
  axis: Point3,
  angle: number,
  side: number,
  cx: number,
  cy: number,
): string[] {
  const corners = CORNERS.map((p) => turn(p, axis, angle));
  const seen = new Set<string>();
  for (const face of FACES) {
    if (dot(turn(face.out, axis, angle), VIEW) <= 1e-9) continue;
    for (let i = 0; i < 4; i += 1) {
      const a = face.rim[i];
      const b = face.rim[(i + 1) % 4];
      seen.add(a < b ? `${a},${b}` : `${b},${a}`);
    }
  }
  return [...seen]
    .map((key) => key.split(',').map(Number) as [number, number])
    .sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]))
    .map(([a, b]) => {
      const u = flat(corners[a], side, cx, cy);
      const v = flat(corners[b], side, cx, cy);
      return `M${u[0].toFixed(2)},${u[1].toFixed(2)}L${v[0].toFixed(2)},${v[1].toFixed(2)}`;
    });
}

/** No turn at all: the cube standing square on its corner. */
export const SQUARE_ON: Point3 = [0, 1, 0];

/* Two directions that lie ACROSS the line of sight — both of them square to
   (1, 1, 1), which is what makes the turn show something. The axis is a blend
   of the two, so it is across the view by construction rather than by a number
   somebody typed and nobody re-checked. */
const ACROSS: Point3 = [1, -1, 0];
const ALSO_ACROSS: Point3 = [1, 1, -2];
const LEAN = (25 * Math.PI) / 180;

const unit = (p: Point3): Point3 => {
  const len = Math.sqrt(dot(p, p));
  return [p[0] / len, p[1] / len, p[2] / len];
};

export const TURN_AXIS: Point3 = ((): Point3 => {
  const a = unit(ACROSS);
  const b = unit(ALSO_ACROSS);
  const c = Math.cos(LEAN);
  const s = Math.sin(LEAN);
  return [c * a[0] + s * b[0], c * a[1] + s * b[1], c * a[2] + s * b[2]];
})();

/**
 * How far the second cube is turned. Her word was "half gedraai".
 *
 * Not every angle shows more. A cube has a great deal of symmetry, and several
 * turns land it back on a view with only two edge directions on the page — a
 * cube that has gone flat, which looks like a mistake nobody can name. 60°
 * 70° about this axis is one of the few that leaves the whole mark with five
 * directions on the page where a pair of cubes in one stance has three, with
 * no two of them close enough to read as a line that missed. So the mark gains
 * angles instead of weight. The check counts them.
 */
export const TURN = (70 * Math.PI) / 180;

/** Big enough to fill the box, small enough that the casing stays inside it. */
const SIDE = 22;

/* The two centres sit a little either side of the middle: far enough apart to
   read as two cubes, close enough that each one's near corner is well inside
   the other — "nog meer in mekaar". */
export const FAR = cubeBars(SQUARE_ON, 0, SIDE, 53.4, 60);
export const NEAR = cubeBars(TURN_AXIS, TURN, SIDE, 60, 65.4);

/**
 * Which bars of the far cube come back over the near one.
 *
 * These are not a taste: they are the far cube's bars that actually CROSS the
 * near cube, which is the only kind that can weave. A bar chosen to come back
 * over that crosses nothing is drawn twice and changes no pixel, and the mark
 * then looks deliberate in the source and overlapped on the page. The first
 * choice made here was exactly that — one of the two crossed nothing — and it
 * was the check that said so, not the eye. They are crossed for real there.
 */
export const OVER = [1, 3];

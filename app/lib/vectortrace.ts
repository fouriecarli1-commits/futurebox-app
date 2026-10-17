/**
 * A photograph turned into vector shapes, on the phone.
 *
 * The picture is brought down to a handful of colours, each colour's area
 * is outlined, the outlines are simplified and smoothed into curves, and the
 * colours are laid biggest first so the smaller shapes sit on top. What comes
 * out is ordinary SVG — every shape its own path, so each can be recoloured
 * or taken away in the vector studio.
 *
 * Pure arithmetic on pixels (`check:vector` drives it on a drawn picture).
 */
import { simplify, smoothPath, type Pt, type SvgNode } from './vectordoc';

export interface Pixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

export interface TraceOptions {
  /** How many colours, 2 to 12. */
  readonly colours: number;
  /** How closely outlines follow the pixels, in pixels: lower is more detail. */
  readonly tolerance: number;
  /** Outlines smaller than this many pixels are dropped as speckle. */
  readonly minArea: number;
}

export const TRACE_DEFAULT: TraceOptions = { colours: 6, tolerance: 1.2, minArea: 12 };

const hex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** The picture's colours, `k` of them, by k-means from evenly spread starting colours — the same answer every time. */
export function palette(px: Pixels, k: number): [number, number, number][] {
  const count = px.width * px.height;
  const step = Math.max(1, Math.floor(count / 6000));
  const samples: [number, number, number][] = [];
  for (let i = 0; i < count; i += step) {
    if (px.data[i * 4 + 3] < 128) continue;
    samples.push([px.data[i * 4], px.data[i * 4 + 1], px.data[i * 4 + 2]]);
  }
  if (!samples.length) return [[255, 255, 255]];
  /* Starting colours: the farthest-first walk from the first sample. */
  const centres: [number, number, number][] = [samples[0]];
  const dist = (a: readonly number[], b: readonly number[]): number => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  while (centres.length < k) {
    let best = -1;
    let at = 0;
    samples.forEach((s, j) => {
      const d = Math.min(...centres.map((c) => dist(s, c)));
      if (d > best) { best = d; at = j; }
    });
    if (best <= 0) break;
    centres.push([...samples[at]] as [number, number, number]);
  }
  for (let round = 0; round < 12; round += 1) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      let j = 0;
      let d = Infinity;
      centres.forEach((c, i) => { const e = dist(s, c); if (e < d) { d = e; j = i; } });
      sums[j][0] += s[0]; sums[j][1] += s[1]; sums[j][2] += s[2]; sums[j][3] += 1;
    }
    centres.forEach((c, i) => { if (sums[i][3]) { c[0] = sums[i][0] / sums[i][3]; c[1] = sums[i][1] / sums[i][3]; c[2] = sums[i][2] / sums[i][3]; } });
  }
  return centres;
}

/**
 * The outlines of the cells marked in `mask` (width w, height h), as closed
 * loops of corner points — walked along the edges between marked and
 * unmarked cells, so holes come out as loops of their own.
 */
export function outlines(mask: Uint8Array, w: number, h: number): Pt[][] {
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  /* Every boundary edge, directed so the marked cell is on its right; keyed by its start corner. */
  const next = new Map<number, number[]>();
  const key = (x: number, y: number): number => y * (w + 1) + x;
  const add = (x1: number, y1: number, x2: number, y2: number): void => {
    const k = key(x1, y1);
    const list = next.get(k);
    if (list) list.push(key(x2, y2)); else next.set(k, [key(x2, y2)]);
  };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) add(x, y, x + 1, y);
      if (!on(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!on(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!on(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const loops: Pt[][] = [];
  for (const [start, ends] of next) {
    while (ends.length) {
      const loop: Pt[] = [];
      let at = start;
      let guard = 0;
      do {
        loop.push([at % (w + 1), Math.floor(at / (w + 1))]);
        const options = next.get(at);
        const to = options?.pop();
        if (to === undefined) break;
        at = to;
        guard += 1;
      } while (at !== start && guard < (w + 1) * (h + 1) * 4);
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}

/**
 * A closed outline with fewer points. Simplified as two halves, split at the
 * point farthest from its start: simplified whole, a loop's two ends are the
 * same point, every other point is "on the line" between them, and the whole
 * outline collapsed to nothing.
 */
export function simplifyLoop(loop: readonly Pt[], tolerance: number): Pt[] {
  if (loop.length < 4) return [...loop];
  const [x0, y0] = loop[0];
  let far = 1;
  loop.forEach(([x, y], k) => { if ((x - x0) ** 2 + (y - y0) ** 2 > (loop[far][0] - x0) ** 2 + (loop[far][1] - y0) ** 2) far = k; });
  const first = simplify(loop.slice(0, far + 1), tolerance);
  const second = simplify([...loop.slice(far), loop[0]], tolerance);
  return [...first, ...second.slice(1, -1)];
}

const area = (loop: readonly Pt[]): number => {
  let a = 0;
  for (let k = 0; k < loop.length; k += 1) {
    const [x1, y1] = loop[k];
    const [x2, y2] = loop[(k + 1) % loop.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

/** The picture as an SVG drawing: one path per colour, biggest first, holes cut by the even-odd rule. */
export function trace(px: Pixels, options: TraceOptions = TRACE_DEFAULT): SvgNode {
  const k = Math.max(2, Math.min(12, Math.round(options.colours)));
  const colours = palette(px, k);
  const { width: w, height: h, data } = px;
  const label = new Int16Array(w * h).fill(-1);
  for (let i = 0; i < w * h; i += 1) {
    if (data[i * 4 + 3] < 128) continue;
    let best = 0;
    let d = Infinity;
    colours.forEach((c, j) => {
      const e = (data[i * 4] - c[0]) ** 2 + (data[i * 4 + 1] - c[1]) ** 2 + (data[i * 4 + 2] - c[2]) ** 2;
      if (e < d) { d = e; best = j; }
    });
    label[i] = best;
  }
  const counts = colours.map((_, j) => label.reduce((sum, v) => sum + (v === j ? 1 : 0), 0));
  const order = colours.map((_, j) => j).sort((a, b) => counts[b] - counts[a]);
  const paths: SvgNode[] = [];
  for (const j of order) {
    if (!counts[j]) continue;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i += 1) mask[i] = label[i] === j ? 1 : 0;
    const loops = outlines(mask, w, h).filter((loop) => area(loop) >= options.minArea);
    if (!loops.length) continue;
    const d = loops.map((loop) => smoothPath(simplifyLoop(loop, options.tolerance), true)).join('');
    const c = colours[j];
    const colour = hex(c[0], c[1], c[2]);
    /* A hairline in its own colour closes the seams smoothing leaves between neighbours. */
    paths.push({ tag: 'path', attrs: { d, fill: colour, 'fill-rule': 'evenodd', stroke: colour, 'stroke-width': '0.6', 'stroke-linejoin': 'round' }, children: [] });
  }
  return { tag: 'svg', attrs: { viewBox: `0 0 ${w} ${h}` }, children: paths };
}

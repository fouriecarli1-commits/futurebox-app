/**
 * Shapes a post can carry: drawn, lit, and exported with the picture.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 13 October 2026: *"ons kort amazing futuristic text, foto, en shape
 * templates. Neon, futuristic, phantasm, etc."* Google's page listed four —
 * an isometric cube, a neon ring, a cyber grid and a hologram frame — and
 * these are those four, as real layers on the canvas rather than pictures
 * of them: each is a stroke the painter draws at the size it is asked for,
 * in the colour and the glow it was given, so it is crisp at 1080 and at
 * 4K and it lands in the exported file.
 *
 * `pictureshapes.ts` is a different thing with the same word in it — the
 * aspect of the whole picture. These are marks ON the picture.
 */

import type { Look } from './postlook';
import type { GlowId } from './postglow';
import { drawChart, type ChartSpec } from './postcharts';
import { glowOf, haloPasses } from './postglow';

/* The owner, 14 October 2026: "Die shapes is meestal daar as 'n background vir
   die text. Daai shapes moet soos 'n sirkel, box, triangle, rectangle,
   painted box wees, en die shape moet ook gemanupileer word deur te kan
   beweeg groter en kleiner gemaak word, transparent, kan die kleur kies."
   The first five are filled, to sit behind words; the four after them are
   the neon outlines that were here before. */
/* The owner, 30 October 2026: *"Ek sien jy het nog nie gewerk aan my ding
   rondom shapes nie."* Twelve more filled ones, and `ai`, the outline the AI
   draws from a sentence (`lib/shapeai.ts`), which is not on the list to pick
   from: it is made from the box above it. */
export const FILLED_KINDS = [
  'circle', 'box', 'triangle', 'rect', 'paint',
  'star', 'heart', 'hexagon', 'diamond', 'pentagon', 'arrow', 'bubble', 'bolt', 'burst', 'cross', 'moon', 'cloud',
  'ai',
] as const;
/* A chart (`postcharts.ts`, 17 October 2026) is a mark too, so it moves,
   sizes, stacks and exports with everything else; it is not on the shapes
   list, it has a bench of its own. */
/* Vector art from the vector studio (17 October 2026) is a mark the same
   way: an SVG drawn as a picture, carrying the drawing so it can be opened
   and changed again. */
export const MARK_KINDS = [...FILLED_KINDS, 'cube', 'ring', 'grid', 'frame', 'chart', 'art'] as const;
export type MarkKind = (typeof MARK_KINDS)[number];

export interface MarkSpec {
  readonly id: MarkKind;
  readonly icon: string;
  readonly name: readonly [string, string];
}

export const MARK_SPECS: readonly MarkSpec[] = [
  { id: 'circle', icon: '●', name: ['post.mark.circle', 'Circle'] },
  { id: 'box', icon: '■', name: ['post.mark.box', 'Box'] },
  { id: 'triangle', icon: '▲', name: ['post.mark.triangle', 'Triangle'] },
  { id: 'rect', icon: '▬', name: ['post.mark.rect', 'Rectangle'] },
  { id: 'paint', icon: '🖌️', name: ['post.mark.paint', 'Painted box'] },
  { id: 'star', icon: '★', name: ['post.mark.star', 'Star'] },
  { id: 'heart', icon: '♥', name: ['post.mark.heart', 'Heart'] },
  { id: 'bolt', icon: '⚡', name: ['post.mark.bolt', 'Lightning'] },
  { id: 'bubble', icon: '💬', name: ['post.mark.bubble', 'Speech bubble'] },
  { id: 'arrow', icon: '➜', name: ['post.mark.arrow', 'Arrow'] },
  { id: 'burst', icon: '✸', name: ['post.mark.burst', 'Burst'] },
  { id: 'hexagon', icon: '⬢', name: ['post.mark.hexagon', 'Hexagon'] },
  { id: 'diamond', icon: '◆', name: ['post.mark.diamond', 'Diamond'] },
  { id: 'pentagon', icon: '⬟', name: ['post.mark.pentagon', 'Pentagon'] },
  { id: 'cross', icon: '✚', name: ['post.mark.cross', 'Plus'] },
  { id: 'moon', icon: '☾', name: ['post.mark.moon', 'Moon'] },
  { id: 'cloud', icon: '☁', name: ['post.mark.cloud', 'Cloud'] },
  { id: 'cube', icon: '🧊', name: ['post.mark.cube', 'Isometric cube'] },
  { id: 'ring', icon: '⭕', name: ['post.mark.ring', 'Neon ring'] },
  { id: 'grid', icon: '🌐', name: ['post.mark.grid', 'Cyber grid'] },
  { id: 'frame', icon: '🖼️', name: ['post.mark.frame', 'Hologram frame'] },
];

/** One mark on the picture. `x`, `y` and `size` are shares of the picture. */
export interface Mark {
  readonly id: string;
  readonly kind: MarkKind;
  readonly x: number;
  readonly y: number;
  /** The mark's width as a share of the picture's shorter side. */
  readonly size: number;
  readonly ink: string;
  readonly glow: GlowId;
  /** How see-through, 0.1 to 1. Absent is solid. */
  readonly opacity?: number;
  /** Width over height, for the shapes that can be stretched. Absent is 1. */
  readonly stretch?: number;
  /** Its place in the layer stack — `lib/postlayers.ts`. Absent is where shapes always sat. */
  readonly z?: number;
  /** Switched off in the layer list: not drawn, not saved, not taken hold of. */
  readonly hidden?: boolean;
  /** The layer's own opacity, 0.1 to 1, from the layer list — the whole shape, glow and all. Absent is 1. */
  readonly alpha?: number;
  /** The layer's own Adjust and Filters, when it is chosen in Layers (`lib/postlook.ts`). Absent is as drawn. */
  readonly look?: Look;
  /** A chart's data and look, for the kind 'chart'. */
  readonly chart?: ChartSpec;
  /** Vector art, for the kind 'art': the SVG drawn, and the studio's drawing to open again. */
  readonly art?: { readonly svg: string; readonly doc: unknown };
  /** The outline the AI drew, for the kind 'ai': SVG path data in a 100 by 100 box (`lib/shapeai.ts`). */
  readonly path?: string;
  /*
   * The owner, 30 October 2026: *"al die verstellings wat ek vroeer gevra het
   * moet saam met 'n shape gaan"* — the ones the words got that day: glow,
   * shadow, turn, and the flips. And round corners, from the same list.
   */
  /** How round the corners are, 0 (sharp) to 1 (as round as they go), for the shapes with corners. */
  readonly round?: number;
  /** How strong the glow is, 0 to 2; absent is 1. */
  readonly glowPower?: number;
  /** How dark the drop shadow is, 0 to 1; absent is none. */
  readonly shadow?: number;
  /** Turned, in degrees, -180 to 180. */
  readonly turn?: number;
  /** Mirrored left to right. */
  readonly flipX?: boolean;
  /** Upside down. */
  readonly flipY?: boolean;
}

/* ── The filled shapes' outlines, in a box of 100 by 100 ────────────────
   Straight-edged ones as corners, so their corners can be rounded; curved
   ones as path data. */
const ring = (points: number, outer: number, inner: number, start = -Math.PI / 2): (readonly [number, number])[] =>
  Array.from({ length: points * (inner === outer ? 1 : 2) }, (_, i) => {
    const step = inner === outer ? (Math.PI * 2) / points : Math.PI / points;
    const r = inner === outer || i % 2 === 0 ? outer : inner;
    return [50 + r * Math.cos(start + i * step), 50 + r * Math.sin(start + i * step)] as const;
  });

/** The shapes with corners, as their corners. */
export const CORNERS: Readonly<Partial<Record<MarkKind, readonly (readonly [number, number])[]>>> = {
  box: [[0, 0], [100, 0], [100, 100], [0, 100]],
  rect: [[0, 0], [100, 0], [100, 100], [0, 100]],
  triangle: [[50, 0], [100, 100], [0, 100]],
  diamond: [[50, 0], [100, 50], [50, 100], [0, 50]],
  hexagon: ring(6, 50, 50, 0),
  pentagon: ring(5, 50, 50),
  star: ring(5, 50, 21),
  burst: ring(14, 50, 38),
  arrow: [[0, 34], [58, 34], [58, 8], [100, 50], [58, 92], [58, 66], [0, 66]],
  cross: [[34, 0], [66, 0], [66, 34], [100, 34], [100, 66], [66, 66], [66, 100], [34, 100], [34, 66], [0, 66], [0, 34], [34, 34]],
  bolt: [[60, 0], [16, 58], [46, 58], [36, 100], [84, 38], [54, 38], [68, 0]],
};

/** The curved ones, as path data in the same box. */
const CURVES: Readonly<Partial<Record<MarkKind, string>>> = {
  heart: 'M50 92 C20 70 0 52 0 30 C0 13 13 0 29 0 C39 0 46 6 50 14 C54 6 61 0 71 0 C87 0 100 13 100 30 C100 52 80 70 50 92 Z',
  bubble: 'M12 0 H88 Q100 0 100 12 V60 Q100 72 88 72 H42 L18 98 L24 72 H12 Q0 72 0 60 V12 Q0 0 12 0 Z',
  moon: 'M64 2 C34 2 10 26 10 56 C10 82 32 100 58 100 C76 100 90 92 98 78 C90 82 82 84 72 84 C46 84 26 64 26 38 C26 22 34 10 46 4 C52 2 58 2 64 2 Z',
  cloud: 'M24 86 C10 86 0 76 0 63 C0 51 9 42 21 41 C22 25 35 14 51 14 C64 14 75 22 79 34 C91 35 100 45 100 58 C100 73 89 86 74 86 Z',
};

/** How round a shape's corners are when nobody has said: the box and the rectangle always had a little. */
export const roundOf = (mark: Pick<Mark, 'kind' | 'round'>): number =>
  Math.max(0, Math.min(1, mark.round ?? (mark.kind === 'box' ? 0.16 : mark.kind === 'rect' ? 0.24 : 0)));

/** Whether a shape has corners a slider can round. */
export const hasCorners = (kind: MarkKind): boolean => kind in CORNERS;

/**
 * A polygon with its corners rounded, centred on 0,0 at w by h. Each corner
 * takes the radius asked for, or as much as its two edges leave room for —
 * a star's points round less than a box's corners, and none crosses.
 */
function roundedCorners(ctx: CanvasRenderingContext2D, corners: readonly (readonly [number, number])[], w: number, h: number, radius: number): void {
  const pts = corners.map(([x, y]) => [(x / 100 - 0.5) * w, (y / 100 - 0.5) * h] as const);
  const n = pts.length;
  const mid = (a: readonly [number, number], b: readonly [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i += 1) {
    const prev = pts[(i + n - 1) % n];
    const at = pts[i];
    const next = pts[(i + 1) % n];
    const a = Math.hypot(prev[0] - at[0], prev[1] - at[1]);
    const b = Math.hypot(next[0] - at[0], next[1] - at[1]);
    const cos = ((prev[0] - at[0]) * (next[0] - at[0]) + (prev[1] - at[1]) * (next[1] - at[1])) / Math.max(1e-6, a * b);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    /* The arc meets each edge this far from the corner; half an edge at most. */
    const room = Math.min(a, b) / 2 * Math.tan(angle / 2);
    const r = Math.max(0, Math.min(radius, room));
    if (r < 0.5) ctx.lineTo(at[0], at[1]);
    else ctx.arcTo(at[0], at[1], next[0], next[1], r);
  }
  ctx.closePath();
}

/* ── Vector art as pictures, loaded once ──────────────────────────────── */

/** Fired when a piece of vector art has loaded, so the post draws again with it. */
export const ART_READY = 'fb-art-ready';
const ART = new Map<string, HTMLImageElement>();

/** The art as a picture, or null while it loads. */
export function artImage(svg: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = ART.get(svg);
  if (!img) {
    if (ART.size > 40) ART.delete(ART.keys().next().value as string);
    img = new Image();
    img.onload = () => window.dispatchEvent(new Event(ART_READY));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    ART.set(svg, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export const isFilled = (kind: MarkKind): boolean => (FILLED_KINDS as readonly string[]).includes(kind);

/** The neon family a shape can wear, brightest first, and white and black. */
export const NEON_INKS = ['#39ff14', '#00f0ff', '#ff2bd6', '#fff200', '#ff6b00', '#b026ff', '#34d399', '#f472b6', '#ffffff', '#000000'] as const;

/**
 * Where a mark sits and how big it is on the frame, in frame pixels — the
 * box a thumb has to land in to pick it up.
 */
export function markBox(mark: Mark, width: number, height: number): { cx: number; cy: number; w: number; h: number } {
  const short = Math.min(width, height);
  const w = mark.size * short;
  const stretch = isFilled(mark.kind) || mark.kind === 'chart' || mark.kind === 'art' ? Math.max(0.2, Math.min(5, mark.stretch ?? 1)) : 1;
  return { cx: mark.x * width, cy: mark.y * height, w: w * Math.sqrt(stretch), h: w / Math.sqrt(stretch) };
}

export const MARK_SIZES = [
  { id: 'small', share: 0.28 },
  { id: 'medium', share: 0.46 },
  { id: 'large', share: 0.72 },
] as const;

/** The inks a mark can wear: the neon family, and white. */
export const MARK_INKS = ['#34d399', '#22d3ee', '#f472b6', '#a78bfa', '#fde68a', '#ffffff'] as const;


export const newMark = (kind: MarkKind, id: string): Mark => ({
  id,
  kind,
  x: 0.5,
  y: 0.5,
  size: MARK_SIZES[1].share,
  ink: isFilled(kind) ? NEON_INKS[1] : MARK_INKS[0],
  glow: 'neon',
  ...(isFilled(kind) ? { opacity: 0.8, stretch: kind === 'rect' || kind === 'paint' ? 2.4 : kind === 'arrow' || kind === 'bubble' ? 1.4 : 1 } : {}),
});

/** A number from a mark's id, so a painted edge is the same on every draw. */
function seeded(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** The filled shapes, drawn round the origin at w by h. */
function fillShape(ctx: CanvasRenderingContext2D, mark: Mark, w: number, h: number): void {
  ctx.beginPath();
  if (mark.kind === 'circle') {
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mark.kind === 'paint') {
    /* A box laid down with a brush: a few overlapping strokes, each a little
       off true, so the edges are ragged the way paint is. */
    const rand = seeded(mark.id);
    const strokes = 7;
    const band = h / strokes;
    for (let i = 0; i < strokes; i += 1) {
      const y = -h / 2 + i * band;
      const lean = (rand() - 0.5) * band * 0.6;
      const left = -w / 2 + (rand() - 0.2) * w * 0.05;
      const right = w / 2 - (rand() - 0.2) * w * 0.05;
      ctx.beginPath();
      ctx.moveTo(left, y + lean);
      ctx.lineTo(right, y - lean);
      ctx.lineTo(right - rand() * w * 0.02, y + band * 1.35);
      ctx.lineTo(left + rand() * w * 0.02, y + band * 1.35 + lean);
      ctx.closePath();
      ctx.fill();
    }
  } else if (CORNERS[mark.kind]) {
    /* box, rect, and every shape with corners: rounded as far as the slider says. */
    roundedCorners(ctx, CORNERS[mark.kind] ?? [], w, h, roundOf(mark) * Math.min(w, h) * 0.5);
    ctx.fill();
  } else {
    /* The curved ones, and the AI's outline, from path data in a 100 box. */
    const d = mark.kind === 'ai' ? mark.path : CURVES[mark.kind];
    if (!d || typeof Path2D === 'undefined') return;
    ctx.save();
    ctx.translate(-w / 2, -h / 2);
    ctx.scale(w / 100, h / 100);
    ctx.fill(new Path2D(d), 'evenodd');
    ctx.restore();
  }
}

/** The outline of one mark, as a path on the context, centred on 0,0 at width `w`. */
function trace(ctx: CanvasRenderingContext2D, kind: MarkKind, w: number): void {
  const h = w;
  ctx.beginPath();
  if (kind === 'ring') {
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
    ctx.moveTo(w * 0.36, 0);
    ctx.arc(0, 0, w * 0.36, 0, Math.PI * 2);
  } else if (kind === 'cube') {
    /* An isometric cube: a hexagon with the three inner edges, the same
       figure the Cubed mark is built on. */
    const r = w / 2;
    const dx = r * Math.cos(Math.PI / 6);
    const dy = r * Math.sin(Math.PI / 6);
    ctx.moveTo(0, -r); ctx.lineTo(dx, -dy); ctx.lineTo(dx, dy); ctx.lineTo(0, r);
    ctx.lineTo(-dx, dy); ctx.lineTo(-dx, -dy); ctx.closePath();
    ctx.moveTo(0, -r * 0.0); ctx.lineTo(0, r);
    ctx.moveTo(0, 0); ctx.lineTo(dx, -dy);
    ctx.moveTo(0, 0); ctx.lineTo(-dx, -dy);
  } else if (kind === 'grid') {
    /* A floor in perspective: lines fanning to a vanishing point and
       horizontals that bunch toward it. */
    const top = -h * 0.5;
    const bottom = h * 0.5;
    const far = w * 0.18;
    const nearW = w * 0.5;
    for (let i = -4; i <= 4; i += 1) {
      ctx.moveTo((i / 4) * far, top);
      ctx.lineTo((i / 4) * nearW, bottom);
    }
    for (let i = 0; i <= 6; i += 1) {
      const tt = (i / 6) ** 2;
      const y = top + tt * (bottom - top);
      const half = far + tt * (nearW - far);
      ctx.moveTo(-half, y); ctx.lineTo(half, y);
    }
  } else {
    /* A hologram frame: a rounded rectangle with its four corners drawn
       heavier, the way an interface bracket is. */
    const r = w * 0.06;
    const half = w / 2;
    ctx.moveTo(-half + r, -half);
    ctx.arcTo(half, -half, half, half, r);
    ctx.arcTo(half, half, -half, half, r);
    ctx.arcTo(-half, half, -half, -half, r);
    ctx.arcTo(-half, -half, half, -half, r);
    ctx.closePath();
    const c = w * 0.16;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      ctx.moveTo(sx * (half - c), sy * half);
      ctx.lineTo(sx * half, sy * half);
      ctx.lineTo(sx * half, sy * (half - c));
    }
  }
}

/**
 * Draw one mark onto a picture of `width` by `height`.
 *
 * The glow is the same stack of passes the words use, so a lit ring and a
 * lit word beside it are the same light. The frame's corners are drawn a
 * second time heavier, which is what makes them read as brackets.
 */
export function drawMark(ctx: CanvasRenderingContext2D, mark: Mark, width: number, height: number, lang = 'en'): void {
  if (mark.kind === 'art') {
    const img = mark.art ? artImage(mark.art.svg) : null;
    if (!img) return;
    const box = markBox(mark, width, height);
    ctx.save();
    ctx.globalAlpha *= Math.max(0.1, Math.min(1, mark.opacity ?? 1));
    ctx.drawImage(img, box.cx - box.w / 2, box.cy - box.h / 2, box.w, box.h);
    ctx.restore();
    return;
  }
  if (mark.kind === 'chart') {
    if (!mark.chart) return;
    const box = markBox(mark, width, height);
    ctx.save();
    ctx.globalAlpha *= Math.max(0.1, Math.min(1, mark.opacity ?? 1));
    drawChart(ctx, mark.chart, box.cx - box.w / 2, box.cy - box.h / 2, box.w, box.h, lang);
    ctx.restore();
    return;
  }
  /* ── See-through, faded once ────────────────────────────────────────
     The owner, 16 October 2026, found while building the layers: the shape is
     filled once per halo pass and once more on top, and turning the canvas's
     alpha down for each fill stacks them back up — the slider at ninety per
     cent see-through drew a shape that was nearly solid. So a see-through
     shape is drawn whole on a sheet of its own and laid down at its opacity,
     once. The neon outlines too since 30 October 2026, when every shape got
     the see-through slider. */
  const seeThrough = Math.max(0.1, Math.min(1, mark.opacity ?? 1));
  if (seeThrough < 0.999 && typeof document !== 'undefined') {
    const sheet = document.createElement('canvas');
    sheet.width = ctx.canvas.width;
    sheet.height = ctx.canvas.height;
    const sctx = sheet.getContext('2d');
    if (sctx) {
      sctx.setTransform(ctx.getTransform());
      drawMark(sctx, { ...mark, opacity: 1 }, width, height, lang);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha *= seeThrough;
      ctx.drawImage(sheet, 0, 0);
      ctx.restore();
      return;
    }
  }
  /* Turned and flipped about its own middle, the way the words are. */
  const lay = (cx: number, cy: number): void => {
    ctx.translate(cx, cy);
    if (mark.turn) ctx.rotate((mark.turn * Math.PI) / 180);
    if (mark.flipX || mark.flipY) ctx.scale(mark.flipX ? -1 : 1, mark.flipY ? -1 : 1);
  };
  /* The drop shadow, then the glow as strong as its slider says, then the
     shape crisp on top — the same order the words are lit in. */
  const shade = Math.max(0, Math.min(1, mark.shadow ?? 0));
  const power = Math.max(0, Math.min(2, mark.glowPower ?? 1));
  const light = (paint: () => void, size: number, reach: number): void => {
    if (shade > 0) {
      ctx.shadowColor = `rgba(0,0,0,${shade.toFixed(2)})`;
      ctx.shadowBlur = Math.max(2, size * 0.06 * (0.6 + shade));
      ctx.shadowOffsetX = size * 0.05 * shade;
      ctx.shadowOffsetY = size * 0.05 * shade;
      paint();
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    if (power > 0) {
      for (const pass of haloPasses(glowOf(mark.glow), reach)) {
        ctx.shadowColor = pass.colour;
        ctx.shadowBlur = pass.blur * power;
        paint();
        if (power > 1.4) paint();
      }
    }
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    paint();
  };
  if (isFilled(mark.kind)) {
    const box = markBox(mark, width, height);
    ctx.save();
    lay(box.cx, box.cy);
    ctx.fillStyle = mark.ink;
    light(() => fillShape(ctx, mark, box.w, box.h), Math.min(box.w, box.h), Math.min(box.w, box.h) * 0.12);
    ctx.restore();
    return;
  }
  const short = Math.min(width, height);
  const w = mark.size * short;
  const line = Math.max(2, w * 0.035);
  ctx.save();
  lay(mark.x * width, mark.y * height);
  ctx.lineWidth = line;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = mark.ink;
  light(() => { trace(ctx, mark.kind, w); ctx.stroke(); }, w, w * 0.18);
  ctx.restore();
}

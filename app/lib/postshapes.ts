/**
 * Shapes a post can carry: drawn, lit, and exported with the picture.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 13 October 2026: *"ons kort amazing futuristic text, foto, en shape
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

import type { GlowId } from './postglow';
import { glowOf, haloPasses } from './postglow';

/* Carli, 14 October 2026: "Die shapes is meestal daar as 'n background vir
   die text. Daai shapes moet soos 'n sirkel, box, triangle, rectangle,
   painted box wees, en die shape moet ook gemanupileer word deur te kan
   beweeg groter en kleiner gemaak word, transparent, kan die kleur kies."
   The first five are filled, to sit behind words; the four after them are
   the neon outlines that were here before. */
export const FILLED_KINDS = ['circle', 'box', 'triangle', 'rect', 'paint'] as const;
export const MARK_KINDS = [...FILLED_KINDS, 'cube', 'ring', 'grid', 'frame'] as const;
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
  const stretch = isFilled(mark.kind) ? Math.max(0.2, Math.min(5, mark.stretch ?? 1)) : 1;
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
  ...(isFilled(kind) ? { opacity: 0.8, stretch: kind === 'rect' || kind === 'paint' ? 2.4 : 1 } : {}),
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
  } else if (mark.kind === 'triangle') {
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
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
  } else {
    /* box and rect: a rectangle with a little rounding on the corners. */
    const r = Math.min(w, h) * (mark.kind === 'box' ? 0.08 : 0.12);
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
    ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
    ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
    ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
    ctx.closePath();
    ctx.fill();
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
export function drawMark(ctx: CanvasRenderingContext2D, mark: Mark, width: number, height: number): void {
  if (isFilled(mark.kind)) {
    /* ── See-through, faded once ──────────────────────────────────────
       Carli, 16 October 2026, found while building the layers: the shape is
       filled once per halo pass and once more on top, and turning the
       canvas's alpha down for each fill stacks them back up — the slider at
       ninety per cent see-through drew a shape that was nearly solid. So a
       see-through shape is drawn whole on a sheet of its own and laid down
       at its opacity, once. */
    const seeThrough = Math.max(0.1, Math.min(1, mark.opacity ?? 1));
    if (seeThrough < 0.999 && typeof document !== 'undefined') {
      const sheet = document.createElement('canvas');
      sheet.width = ctx.canvas.width;
      sheet.height = ctx.canvas.height;
      const sctx = sheet.getContext('2d');
      if (sctx) {
        sctx.setTransform(ctx.getTransform());
        drawMark(sctx, { ...mark, opacity: 1 }, width, height);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha *= seeThrough;
        ctx.drawImage(sheet, 0, 0);
        ctx.restore();
        return;
      }
    }
    const box = markBox(mark, width, height);
    ctx.save();
    ctx.translate(box.cx, box.cy);
    ctx.globalAlpha *= seeThrough;
    ctx.fillStyle = mark.ink;
    const glow = glowOf(mark.glow);
    for (const pass of haloPasses(glow, Math.min(box.w, box.h) * 0.12)) {
      ctx.shadowColor = pass.colour;
      ctx.shadowBlur = pass.blur;
      fillShape(ctx, mark, box.w, box.h);
    }
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = 0;
    fillShape(ctx, mark, box.w, box.h);
    ctx.restore();
    return;
  }
  const short = Math.min(width, height);
  const w = mark.size * short;
  const line = Math.max(2, w * 0.035);
  ctx.save();
  ctx.translate(mark.x * width, mark.y * height);
  ctx.lineWidth = line;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = mark.ink;
  const glow = glowOf(mark.glow);
  for (const pass of haloPasses(glow, w * 0.18)) {
    ctx.shadowColor = pass.colour;
    ctx.shadowBlur = pass.blur;
    trace(ctx, mark.kind, w);
    ctx.stroke();
  }
  ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.shadowBlur = 0;
  trace(ctx, mark.kind, w);
  ctx.stroke();
  ctx.restore();
}

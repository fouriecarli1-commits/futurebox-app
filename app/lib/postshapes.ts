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

export const MARK_KINDS = ['cube', 'ring', 'grid', 'frame'] as const;
export type MarkKind = (typeof MARK_KINDS)[number];

export interface MarkSpec {
  readonly id: MarkKind;
  readonly icon: string;
  readonly name: readonly [string, string];
}

export const MARK_SPECS: readonly MarkSpec[] = [
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
}

export const MARK_SIZES = [
  { id: 'small', share: 0.28 },
  { id: 'medium', share: 0.46 },
  { id: 'large', share: 0.72 },
] as const;

/** The inks a mark can wear: the neon family, and white. */
export const MARK_INKS = ['#34d399', '#22d3ee', '#f472b6', '#a78bfa', '#fde68a', '#ffffff'] as const;

/** Where a mark can be put with one press. */
export const MARK_SPOTS = [
  { id: 'centre', x: 0.5, y: 0.5 },
  { id: 'top', x: 0.5, y: 0.22 },
  { id: 'bottom', x: 0.5, y: 0.78 },
  { id: 'left', x: 0.24, y: 0.5 },
  { id: 'right', x: 0.76, y: 0.5 },
] as const;

export const newMark = (kind: MarkKind, id: string): Mark => ({
  id, kind, x: 0.5, y: 0.5, size: MARK_SIZES[1].share, ink: MARK_INKS[0], glow: 'neon',
});

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

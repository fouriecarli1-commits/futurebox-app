/**
 * Painting a transition: the one place that turns `joiningAt`'s answer into
 * pixels.
 *
 * The export (`stitch.ts`) and the toolbox's little moving pictures both call
 * `paintJoin`, so what a transition looks like in the list is exactly what it
 * does to the film — the owner's screenshots put a picture beside every
 * name, and a picture drawn by different code would be a promise this file
 * could break.
 *
 * On entry the canvas holds the ARRIVING shot's frame, already drawn with its
 * words and mark. `held` is the last frame of the shot before. Nothing here
 * decides when or how much; `videojoins.ts` and `joinbook.ts` do.
 */
import type { JoinLook, Layer, MaskKind } from './joinbook';
import type { Joining } from './videojoins';

type Canvasish = HTMLCanvasElement;

/** Sheets reused between frames, so a transition costs no allocation per frame. */
const sheets = new Map<string, Canvasish>();
function sheetOf(name: string, w: number, h: number): { canvas: Canvasish; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  /* Keyed by size as well, so the toolbox's little pictures and a film being
     exported at the same time do not keep resizing one shared sheet. */
  const key = `${name}:${w}x${h}`;
  let canvas = sheets.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    sheets.set(key, canvas);
  }
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.clearRect(0, 0, w, h);
  return { canvas, ctx };
}

/** The same "random" every time for the same seed, so a frame redrawn is the same frame. */
function seeded(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

function polygon(points: readonly (readonly [number, number])[]): Path2D {
  const path = new Path2D();
  points.forEach(([x, y], at) => (at === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
  path.closePath();
  return path;
}

function regular(sides: number, cx: number, cy: number, r: number, turn = -Math.PI / 2): Path2D {
  return polygon(Array.from({ length: sides }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / sides;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  }));
}

/**
 * The part of the screen the arriving shot has reached, at `t`, as one or more
 * paths. More than one when the shape is several pieces; they are filled one
 * by one, so pieces that overlap are added together rather than cancelled.
 */
export function revealOf(kind: MaskKind, t: number, w: number, h: number): Path2D[] {
  const cx = w / 2;
  const cy = h / 2;
  const half = Math.hypot(w, h) / 2;
  /* How far a centred shape must grow to cover the corners, per shape. */
  const grow = (cover: number): number => Math.max(0.0001, t * cover * half);
  const rect = (x: number, y: number, rw: number, rh: number): Path2D => {
    const path = new Path2D();
    path.rect(x, y, Math.max(0, rw), Math.max(0, rh));
    return path;
  };
  switch (kind) {
    case 'circle': {
      const path = new Path2D();
      path.arc(cx, cy, grow(1), 0, Math.PI * 2);
      return [path];
    }
    case 'oval': {
      const r = grow(1.35);
      const path = new Path2D();
      path.ellipse(cx, cy, r * 1.25, r * 0.8, 0, 0, Math.PI * 2);
      return [path];
    }
    case 'eye': {
      /* A lens: where two circles above and below the middle overlap. */
      const r = grow(1.9);
      const path = new Path2D();
      path.moveTo(cx - r, cy);
      path.quadraticCurveTo(cx, cy - r * 0.9, cx + r, cy);
      path.quadraticCurveTo(cx, cy + r * 0.9, cx - r, cy);
      path.closePath();
      return [path];
    }
    case 'diamond': {
      const r = grow(1.45);
      return [polygon([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]])];
    }
    case 'square': {
      const r = grow(1.05);
      return [rect(cx - r, cy - r, r * 2, r * 2)];
    }
    case 'box':
      return [rect(cx - (t * w) / 2, cy - (t * h) / 2, t * w, t * h)];
    case 'triangle':
      return [regular(3, cx, cy + grow(2.2) * 0.2, grow(2.2))];
    case 'pentagon':
      return [regular(5, cx, cy, grow(1.3))];
    case 'hexagon':
      return [regular(6, cx, cy, grow(1.2), 0)];
    case 'cross': {
      const r = grow(3.4);
      const arm = r * 0.3;
      return [rect(cx - arm, cy - r, arm * 2, r * 2), rect(cx - r, cy - arm, r * 2, arm * 2)];
    }
    case 'arrow': {
      const r = grow(2.6);
      return [polygon([
        [cx, cy - r], [cx + r * 0.75, cy - r * 0.05], [cx + r * 0.3, cy - r * 0.05],
        [cx + r * 0.3, cy + r], [cx - r * 0.3, cy + r], [cx - r * 0.3, cy - r * 0.05],
        [cx - r * 0.75, cy - r * 0.05],
      ])];
    }
    case 'star': {
      const r = grow(2.4);
      const points: [number, number][] = [];
      for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.46;
        points.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
      }
      return [polygon(points)];
    }
    case 'heart': {
      const r = grow(2.1);
      const path = new Path2D();
      const top = cy - r * 0.35;
      path.moveTo(cx, cy + r * 0.85);
      path.bezierCurveTo(cx - r * 1.2, cy + r * 0.1, cx - r * 0.9, top - r * 0.75, cx, top);
      path.bezierCurveTo(cx + r * 0.9, top - r * 0.75, cx + r * 1.2, cy + r * 0.1, cx, cy + r * 0.85);
      path.closePath();
      return [path];
    }
    case 'edge':
      return [rect(0, 0, t * w, h)];
    case 'center':
      return [rect(((1 - t) * w) / 2, 0, t * w, h)];
    case 'band': {
      const n = 8;
      const bh = h / n;
      return Array.from({ length: n }, (_, i) => (i % 2 === 0
        ? rect(0, i * bh, t * w, bh + 1)
        : rect(w - t * w, i * bh, t * w, bh + 1)));
    }
    case 'venetian': {
      const n = 10;
      const bh = h / n;
      return Array.from({ length: n }, (_, i) => rect(0, i * bh, w, bh * t + 0.5));
    }
    case 'clock': {
      const path = new Path2D();
      path.moveTo(cx, cy);
      path.arc(cx, cy, half * 1.5, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
      path.closePath();
      return [path];
    }
    case 'radial':
      return Array.from({ length: 4 }, (_, k) => {
        const path = new Path2D();
        const from = -Math.PI / 2 + (k * Math.PI) / 2;
        path.moveTo(cx, cy);
        path.arc(cx, cy, half * 1.5, from, from + (t * Math.PI) / 2);
        path.closePath();
        return path;
      });
    case 'spiral': {
      /* A sweep that turns twice while a circle grows out of the middle:
         read together they are a spiral opening. */
      const sweep = new Path2D();
      sweep.moveTo(cx, cy);
      sweep.arc(cx, cy, half * 1.5, -Math.PI / 2, -Math.PI / 2 + Math.min(1, t * 1.6) * Math.PI * 2);
      sweep.closePath();
      const middle = new Path2D();
      middle.arc(cx, cy, Math.max(0.001, t * t * half), 0, Math.PI * 2);
      return [sweep, middle];
    }
    case 'x': {
      const angle = Math.atan2(h, w);
      const band = t * half * 1.5;
      return [angle, -angle].map((a) => {
        const along = [Math.cos(a), Math.sin(a)] as const;
        const across = [-Math.sin(a), Math.cos(a)] as const;
        const L = half * 1.2;
        return polygon([
          [cx + along[0] * L + across[0] * band, cy + along[1] * L + across[1] * band],
          [cx - along[0] * L + across[0] * band, cy - along[1] * L + across[1] * band],
          [cx - along[0] * L - across[0] * band, cy - along[1] * L - across[1] * band],
          [cx + along[0] * L - across[0] * band, cy + along[1] * L - across[1] * band],
        ]);
      });
    }
    case 'checker': {
      const cols = 8;
      const rows = Math.max(3, Math.round((cols * h) / w));
      const cw = w / cols;
      const ch = h / rows;
      const out: Path2D[] = [];
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const local = clamp01(t * 2 - ((i + j) % 2));
          if (local <= 0) continue;
          out.push(rect(i * cw + (cw * (1 - local)) / 2, j * ch + (ch * (1 - local)) / 2, cw * local + 0.5, ch * local + 0.5));
        }
      }
      return out;
    }
    case 'tile':
    case 'blocks': {
      const cols = kind === 'tile' ? 8 : 16;
      const rows = Math.max(3, Math.round((cols * h) / w));
      const cw = w / cols;
      const ch = h / rows;
      const random = seeded(kind === 'tile' ? 7 : 13);
      const out: Path2D[] = [];
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const start = random() * 0.7;
          const local = kind === 'tile' ? clamp01((t - start) / 0.3) : (t >= start + 0.15 ? 1 : 0);
          if (local <= 0) continue;
          out.push(rect(i * cw + (cw * (1 - local)) / 2, j * ch + (ch * (1 - local)) / 2, cw * local + 0.5, ch * local + 0.5));
        }
      }
      return out;
    }
    case 'vee': {
      const x = t * w * 1.4;
      const point = w * 0.35;
      return [polygon([[0, 0], [x - point, 0], [x, cy], [x - point, h], [0, h]])];
    }
    case 'triLeft':
      return [polygon([[0, 0], [t * 2 * w, 0], [0, t * 2 * h]])];
    case 'triRight':
      return [polygon([[w, 0], [w - t * 2 * w, 0], [w, t * 2 * h]])];
    case 'curl':
      return [polygon([[w, h], [w - t * 2.1 * w, h], [w, h - t * 2.1 * h]])];
    default:
      return [rect(0, 0, t * w, h)];
  }
}

/** One picture, placed as `layer` says, onto `ctx` of size `w` by `h`. */
function drawLayer(ctx: CanvasRenderingContext2D, image: CanvasImageSource, w: number, h: number, layer: Layer | undefined): void {
  const alpha = clamp01(layer?.alpha ?? 1);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (layer?.blend) ctx.globalCompositeOperation = layer.blend;
  if (layer?.blur && layer.blur > 0) ctx.filter = `blur(${Math.max(0, layer.blur * w).toFixed(1)}px)`;
  const scale = layer?.scale ?? 1;
  ctx.translate(w / 2 + (layer?.x ?? 0) * w, h / 2 + (layer?.y ?? 0) * h);
  if (layer?.turn) ctx.rotate(layer.turn * Math.PI * 2);
  ctx.scale(scale * (layer?.squash ?? 1), scale);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function paintLook(ctx: CanvasRenderingContext2D, w: number, h: number, look: JoinLook, held: CanvasImageSource): void {
  const arriving = sheetOf('arrive', w, h);
  if (!arriving) return;
  arriving.ctx.drawImage(ctx.canvas, 0, 0, w, h);
  const arrive = arriving.canvas;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const heldOnTop = look.top === 'held';
  /* The one underneath, whole. */
  drawLayer(ctx, heldOnTop ? arrive : held, w, h, heldOnTop ? look.arrive : look.held);

  if (look.doors && heldOnTop) {
    /* The held frame torn and pulled apart: two halves to the sides, or four
       quarters to the corners. */
    const t = clamp01(look.doors.t);
    const pieces: [number, number, number, number, number, number][] = look.doors.kind === 'h'
      ? [[0, 0, w / 2, h, -t * w / 2, 0], [w / 2, 0, w / 2, h, t * w / 2, 0]]
      : [
        [0, 0, w / 2, h / 2, -t * w / 2, -t * h / 2], [w / 2, 0, w / 2, h / 2, t * w / 2, -t * h / 2],
        [0, h / 2, w / 2, h / 2, -t * w / 2, t * h / 2], [w / 2, h / 2, w / 2, h / 2, t * w / 2, t * h / 2],
      ];
    for (const [sx, sy, sw, sh, dx, dy] of pieces) {
      ctx.drawImage(held, sx, sy, sw, sh, sx + dx, sy + dy, sw, sh);
    }
  } else if (look.slices !== undefined && !heldOnTop) {
    /* The arriving shot in strips that rise into place one after another. */
    const n = 10;
    const sw = w / n;
    for (let i = 0; i < n; i += 1) {
      const local = clamp01(look.slices * 1.7 - (i * 0.7) / n);
      const e = local < 0.5 ? 2 * local * local : 1 - ((-2 * local + 2) ** 2) / 2;
      ctx.drawImage(arrive, i * sw, 0, sw + 1, h, i * sw, (1 - e) * h, sw + 1, h);
    }
  } else {
    /* The one on top: whole, or cut to the part of the screen it still owns. */
    const top = sheetOf('top', w, h);
    if (top) {
      drawLayer(top.ctx, heldOnTop ? held : arrive, w, h, heldOnTop ? look.held : look.arrive);
      if (look.mask) {
        top.ctx.globalCompositeOperation = heldOnTop ? 'destination-out' : 'destination-in';
        if (!heldOnTop) {
          /* `destination-in` keeps only what one fill covers, so the pieces are
             first gathered on a sheet of their own and applied once. */
          const keep = sheetOf('keep', w, h);
          if (keep) {
            keep.ctx.fillStyle = '#fff';
            for (const path of revealOf(look.mask.kind, clamp01(look.mask.t), w, h)) keep.ctx.fill(path);
            top.ctx.drawImage(keep.canvas, 0, 0);
          }
        } else {
          top.ctx.fillStyle = '#fff';
          for (const path of revealOf(look.mask.kind, clamp01(look.mask.t), w, h)) top.ctx.fill(path);
        }
        top.ctx.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(top.canvas, 0, 0);
      /* A page curl has a crease: a soft shadow along the edge being turned. */
      if (look.mask?.kind === 'curl' && look.mask.t > 0 && look.mask.t < 1) {
        const t = look.mask.t * 2.1;
        const shade = ctx.createLinearGradient(w - t * w * 0.5, h - t * h * 0.5, w - t * w * 0.5 + w * 0.06, h - t * h * 0.5 + h * 0.06);
        shade.addColorStop(0, 'rgba(0,0,0,0.45)');
        shade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        for (const path of revealOf('curl', look.mask.t, w, h)) ctx.clip(path);
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
  }

  /* ── Over everything ──────────────────────────────────────────────── */
  const fx = look.fx;
  if (fx && fx.amount > 0.001) {
    if (fx.kind === 'mosaic') {
      const block = Math.max(1, Math.round(1 + fx.amount * Math.min(w, h) / 10));
      const small = sheetOf('mosaic', Math.max(1, Math.round(w / block)), Math.max(1, Math.round(h / block)));
      if (small) {
        small.ctx.drawImage(ctx.canvas, 0, 0, small.canvas.width, small.canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small.canvas, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
      }
    } else if (fx.kind === 'glitch') {
      const copy = sheetOf('glitch', w, h);
      if (copy) {
        copy.ctx.drawImage(ctx.canvas, 0, 0);
        const random = seeded(fx.seed ?? 1);
        const bands = 14;
        for (let i = 0; i < bands; i += 1) {
          const y = random() * h;
          const bh = Math.max(2, random() * h * 0.08);
          const dx = (random() - 0.5) * w * 0.18 * fx.amount;
          ctx.drawImage(copy.canvas, 0, y, w, bh, dx, y, w, bh);
        }
        /* The colour coming apart: a tinted ghost to each side. */
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.35 * fx.amount;
        ctx.drawImage(copy.canvas, w * 0.012 * fx.amount, 0);
        ctx.fillStyle = 'rgba(255,0,90,0.18)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    } else if (fx.kind === 'light') {
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
      glow.addColorStop(0, `rgba(255,255,255,${fx.amount})`);
      glow.addColorStop(0.5, `rgba(255,248,220,${fx.amount * 0.7})`);
      glow.addColorStop(1, `rgba(255,255,255,${fx.amount * 0.15})`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
  }
  ctx.restore();
}

/**
 * Paint the join `joiningAt` answered, over the arriving frame already on
 * `ctx`'s canvas (which is `w` by `h`). `held` is the outgoing shot's last
 * frame, or null when there is none to hand.
 */
export function paintJoin(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: Joining,
  held: CanvasImageSource | null,
): void {
  if (now.look && held) {
    paintLook(ctx, w, h, now.look, held);
  } else if (now.held && held) {
    ctx.save();
    ctx.globalAlpha = clamp01(now.held.solid);
    if (now.held.keepFrom > 0) {
      /* A wipe. The outgoing frame is clipped to the part of the width it
         still owns, so the arriving shot is revealed from the left rather
         than faded into. */
      const from = now.held.keepFrom * w;
      ctx.beginPath();
      ctx.rect(from, 0, w - from, h);
      ctx.clip();
    }
    ctx.drawImage(held, -now.held.slid * w, 0, w, h);
    ctx.restore();
  }
  if (now.wash) {
    ctx.save();
    ctx.globalAlpha = clamp01(now.wash.solid);
    ctx.fillStyle = now.wash.colour;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

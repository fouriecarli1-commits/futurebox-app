/**
 * Effects on a shot: the moving kind, painted over the picture every frame.
 *
 * Carli, 16 October 2026, screenshots of a desktop editor's toolbox — camera
 * shake, glow, light rays, letterbox, vignette among its effects: *"Kyk ook
 * hoe netjies dit verpak is."*
 *
 * A look (`videofilters.ts`) and the dials (`videoadjust.ts`) are a filter
 * string: they change the colour of a pixel where it already is. These are
 * the rest — the picture moved (a shake, a beat), light added (a glow, a leak,
 * a flash), texture laid on (grain, scan lines) and the frame dressed (bars,
 * darkened corners). Each one is a pass over the canvas AFTER the shot is
 * drawn on it, so this file only ever needs the canvas: the film's renderer
 * (`stitch.ts`) and the editor's preview call the same `paintFx` with the
 * same time, so what she watches is what comes out.
 *
 * Every pass is a function of the time alone — no `Math.random()` per frame —
 * so the same moment of the same shot is the same picture on the preview, in
 * the export, and when it is exported again.
 */

export type FxId =
  | 'shake' | 'pulse' | 'mirror'
  | 'glow' | 'leak' | 'flash'
  | 'grain' | 'scanlines'
  | 'vignette' | 'letterbox';

export type FxGroup = 'camera' | 'light' | 'texture' | 'frame';

export const FX_GROUPS: readonly { readonly id: FxGroup; readonly en: string; readonly af: string }[] = [
  { id: 'camera', en: 'Camera', af: 'Kamera' },
  { id: 'light', en: 'Light', af: 'Lig' },
  { id: 'texture', en: 'Texture', af: 'Tekstuur' },
  { id: 'frame', en: 'Frame', af: 'Raam' },
];

export interface FxSpec {
  readonly id: FxId;
  readonly group: FxGroup;
  readonly en: string;
  readonly af: string;
  /** How strong it starts, 0..1. */
  readonly rest: number;
}

export const FX: readonly FxSpec[] = [
  { id: 'shake', group: 'camera', en: 'Camera shake', af: 'Kamera-skud', rest: 0.5 },
  { id: 'pulse', group: 'camera', en: 'Beat pulse', af: 'Klopslag', rest: 0.5 },
  { id: 'mirror', group: 'camera', en: 'Mirror', af: 'Spieël', rest: 1 },
  { id: 'glow', group: 'light', en: 'Glow', af: 'Gloed', rest: 0.5 },
  { id: 'leak', group: 'light', en: 'Light leak', af: 'Liglek', rest: 0.6 },
  { id: 'flash', group: 'light', en: 'Flash in', af: 'Flits in', rest: 0.9 },
  { id: 'grain', group: 'texture', en: 'Film grain', af: 'Filmkorrel', rest: 0.5 },
  { id: 'scanlines', group: 'texture', en: 'Scan lines', af: 'Skandeerlyne', rest: 0.5 },
  { id: 'vignette', group: 'frame', en: 'Vignette', af: 'Donker hoeke', rest: 0.6 },
  { id: 'letterbox', group: 'frame', en: 'Cinema bars', af: 'Rolprentstroke', rest: 0.5 },
];

/** One effect on a shot, and how strong. */
export interface FxOn {
  readonly id: FxId;
  readonly amount: number;
}

export const fxSpec = (id: FxId): FxSpec | undefined => FX.find((one) => one.id === id);

export const fxLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

const held = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Only effects this file knows, each once, with a strength it can use. */
export function cleanFx(list: readonly FxOn[] | undefined): FxOn[] {
  const seen = new Set<FxId>();
  const out: FxOn[] = [];
  for (const one of list ?? []) {
    if (!fxSpec(one.id) || seen.has(one.id)) continue;
    seen.add(one.id);
    out.push({ id: one.id, amount: held(one.amount) });
  }
  return out;
}

/* ── Scratch canvases, kept by size so a frame does not make new ones ── */
const sheets = new Map<string, HTMLCanvasElement>();
function sheet(name: string, w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${name}:${w}x${h}`;
  let one = sheets.get(key);
  if (!one) {
    one = document.createElement('canvas');
    one.width = w;
    one.height = h;
    sheets.set(key, one);
  }
  return one;
}

/** A small square of grain, made once; the same every time (a seeded walk, not Math.random). */
let grainTile: HTMLCanvasElement | null = null;
function grain(): HTMLCanvasElement | null {
  if (grainTile || typeof document === 'undefined') return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const ctx = tile.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(128, 128);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = seed % 256;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

/** Copy what is on the canvas so a pass can draw it back moved. */
function copyOf(ctx: CanvasRenderingContext2D, w: number, h: number): HTMLCanvasElement | null {
  const copy = sheet('copy', w, h);
  const cctx = copy?.getContext('2d');
  if (!copy || !cctx) return null;
  cctx.clearRect(0, 0, w, h);
  cctx.drawImage(ctx.canvas, 0, 0, w, h);
  return copy;
}

/**
 * Paint a shot's effects over what is on the canvas.
 *
 * `t` is seconds since the shot came on screen. The order is fixed: the
 * picture moved first, then light added to it, then texture over that, then
 * the frame dressed last — so cinema bars are never shaken and never glow.
 */
export function paintFx(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, list: readonly FxOn[] | undefined): void {
  const fx = cleanFx(list);
  if (!fx.length) return;
  const on = (id: FxId): number => fx.find((one) => one.id === id)?.amount ?? 0;
  const time = Number.isFinite(t) ? Math.max(0, t) : 0;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  /* ── The picture moved ── */
  const shake = on('shake');
  const pulse = on('pulse');
  const mirror = on('mirror');
  if (shake > 0 || pulse > 0) {
    const copy = copyOf(ctx, w, h);
    if (copy) {
      const dx = (Math.sin(time * 23.1) * Math.cos(time * 7.3)) * shake * 0.018 * w;
      const dy = (Math.cos(time * 19.7) * Math.sin(time * 5.9)) * shake * 0.018 * h;
      /* Bigger by enough that a shaken edge never shows the black behind it. */
      const beat = 0.5 + 0.5 * Math.cos(time * Math.PI * 4);
      const grow = 1 + shake * 0.04 + pulse * 0.07 * beat * beat;
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2 + dx, h / 2 + dy);
      ctx.scale(grow, grow);
      ctx.drawImage(copy, -w / 2, -h / 2, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }
  if (mirror > 0) {
    const copy = copyOf(ctx, w, h);
    if (copy) {
      /* The left half, turned over onto the right. */
      ctx.save();
      ctx.globalAlpha = mirror;
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(copy, 0, 0, w / 2, h, 0, 0, w / 2, h);
      ctx.restore();
    }
  }

  /* ── Light added ── */
  const glow = on('glow');
  if (glow > 0) {
    const sw = Math.max(1, Math.round(w / 4));
    const sh = Math.max(1, Math.round(h / 4));
    const small = sheet('glow', sw, sh);
    const sctx = small?.getContext('2d');
    if (small && sctx) {
      /* Blurred at a quarter of the size: the same soft halo for a sixteenth of the work. */
      sctx.clearRect(0, 0, sw, sh);
      sctx.filter = `blur(${(2 + glow * 4).toFixed(1)}px) brightness(1.3)`;
      sctx.drawImage(ctx.canvas, 0, 0, sw, sh);
      sctx.filter = 'none';
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = glow * 0.75;
      ctx.drawImage(small, 0, 0, w, h);
      ctx.restore();
    }
  }
  const leak = on('leak');
  if (leak > 0) {
    const cx = w * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.6)));
    const cy = h * (0.25 + 0.2 * Math.cos(time * 0.45));
    const reach = Math.max(w, h) * 0.75;
    const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
    light.addColorStop(0, 'rgba(255,170,90,0.95)');
    light.addColorStop(0.35, 'rgba(255,80,120,0.55)');
    light.addColorStop(1, 'rgba(255,60,120,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = leak * 0.7;
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const flash = on('flash');
  if (flash > 0 && time < 0.45) {
    ctx.save();
    ctx.globalAlpha = flash * (1 - time / 0.45);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ── Texture laid on ── */
  const grainy = on('grain');
  const tile = grainy > 0 ? grain() : null;
  if (tile) {
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) {
      /* A new place in the tile 24 times a second, picked from the time — the same frame, the same grain. */
      const step = Math.floor(time * 24);
      const ox = (step * 37) % 128;
      const oy = (step * 61) % 128;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = grainy * 0.45;
      ctx.translate(-ox, -oy);
      ctx.scale(Math.max(1, w / 1080), Math.max(1, w / 1080));
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w * 2, h * 2);
      ctx.restore();
    }
  }
  const scan = on('scanlines');
  if (scan > 0) {
    const gap = Math.max(2, Math.round(h / 360) * 3);
    ctx.save();
    ctx.globalAlpha = scan * 0.35;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < h; y += gap) ctx.fillRect(0, y, w, Math.max(1, gap / 3));
    /* And the slow bright bar an old screen rolls. */
    const bar = ((time * 0.25) % 1) * (h + h * 0.2) - h * 0.1;
    const roll = ctx.createLinearGradient(0, bar - h * 0.08, 0, bar + h * 0.08);
    roll.addColorStop(0, 'rgba(255,255,255,0)');
    roll.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    roll.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = roll;
    ctx.fillRect(0, bar - h * 0.08, w, h * 0.16);
    ctx.restore();
  }

  /* ── The frame dressed ── */
  const vignette = on('vignette');
  if (vignette > 0) {
    const far = Math.hypot(w, h) / 2;
    const ring = ctx.createRadialGradient(w / 2, h / 2, far * 0.4, w / 2, h / 2, far);
    ring.addColorStop(0, 'rgba(0,0,0,0)');
    ring.addColorStop(1, `rgba(0,0,0,${(vignette * 0.85).toFixed(3)})`);
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, w, h);
  }
  const bars = on('letterbox');
  if (bars > 0) {
    const tall = Math.round(h * (0.04 + bars * 0.1));
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, tall);
    ctx.fillRect(0, h - tall, w, tall);
  }
  ctx.restore();
}

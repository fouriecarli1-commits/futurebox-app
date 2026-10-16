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
  | 'vignette' | 'letterbox'
  /* The filters — the second shelf of her screenshots, the kind that restyles the picture itself. */
  | 'motionBlur' | 'zoomBlur' | 'tiltShift'
  | 'pixelate' | 'halftone' | 'duotone' | 'chromatic' | 'kaleido'
  | 'filmDamage' | 'lensFlare';

export type FxGroup = 'camera' | 'light' | 'texture' | 'frame' | 'blur' | 'stylise' | 'film';

/** The two shelves: effects laid over the shot, and filters that restyle it. */
export const FX_EFFECT_GROUPS: readonly FxGroup[] = ['camera', 'light', 'texture', 'frame'];
export const FX_FILTER_GROUPS: readonly FxGroup[] = ['blur', 'stylise', 'film'];

export const FX_GROUPS: readonly { readonly id: FxGroup; readonly en: string; readonly af: string }[] = [
  { id: 'camera', en: 'Camera', af: 'Kamera' },
  { id: 'light', en: 'Light', af: 'Lig' },
  { id: 'texture', en: 'Texture', af: 'Tekstuur' },
  { id: 'frame', en: 'Frame', af: 'Raam' },
  { id: 'blur', en: 'Blur', af: 'Vervaag' },
  { id: 'stylise', en: 'Stylise', af: 'Stileer' },
  { id: 'film', en: 'Old film', af: 'Ou film' },
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
  { id: 'motionBlur', group: 'blur', en: 'Motion blur', af: 'Bewegingsvervaging', rest: 0.5 },
  { id: 'zoomBlur', group: 'blur', en: 'Zoom blur', af: 'Zoemvervaging', rest: 0.5 },
  { id: 'tiltShift', group: 'blur', en: 'Tilt-shift', af: 'Miniatuur', rest: 0.6 },
  { id: 'pixelate', group: 'stylise', en: 'Pixelate', af: 'Blokkies', rest: 0.5 },
  { id: 'halftone', group: 'stylise', en: 'Halftone dots', af: 'Kolletjiesdruk', rest: 0.6 },
  { id: 'duotone', group: 'stylise', en: 'Duotone', af: 'Tweekleur', rest: 0.9 },
  { id: 'chromatic', group: 'stylise', en: 'Colour split', af: 'Kleurskeuring', rest: 0.5 },
  { id: 'kaleido', group: 'stylise', en: 'Kaleidoscope', af: 'Kaleidoskoop', rest: 1 },
  { id: 'filmDamage', group: 'film', en: 'Film damage', af: 'Filmskade', rest: 0.6 },
  { id: 'lensFlare', group: 'film', en: 'Lens flare', af: 'Lensgloed', rest: 0.6 },
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

  /* ── The picture restyled: the filters ── */
  paintFilters(ctx, w, h, time, on);

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

/** A second scratch canvas, for passes that need the copy AND somewhere to build. */
function work(name: string, w: number, h: number): CanvasRenderingContext2D | null {
  const one = sheet(name, w, h);
  const c = one?.getContext('2d', { willReadFrequently: name === 'cells' }) ?? null;
  if (c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.clearRect(0, 0, w, h);
  }
  return c;
}

/**
 * The filters, in a fixed order: blurs, then the restyles, then old film.
 * Every pass reads the canvas as it stands and writes it back changed.
 */
function paintFilters(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, on: (id: FxId) => number): void {
  const motion = on('motionBlur');
  if (motion > 0) {
    const copy = copyOf(ctx, w, h);
    if (copy) {
      /* Copies laid along a line, as a fast pan smears. */
      const reach = motion * w * 0.03;
      ctx.save();
      for (let i = 1; i <= 6; i += 1) {
        ctx.globalAlpha = 0.22;
        ctx.drawImage(copy, (i / 6) * reach - reach / 2, 0, w, h);
      }
      ctx.restore();
    }
  }
  const zoom = on('zoomBlur');
  if (zoom > 0) {
    const copy = copyOf(ctx, w, h);
    if (copy) {
      ctx.save();
      for (let i = 1; i <= 6; i += 1) {
        const k = 1 + (i / 6) * zoom * 0.12;
        ctx.globalAlpha = 0.2;
        ctx.drawImage(copy, (w - w * k) / 2, (h - h * k) / 2, w * k, h * k);
      }
      ctx.restore();
    }
  }
  const tilt = on('tiltShift');
  if (tilt > 0) {
    /* Top and bottom blurred, the middle sharp, and the colour a little
       richer — what makes a real street read as a model of one. */
    const sw = Math.max(1, Math.round(w / 4));
    const sh = Math.max(1, Math.round(h / 4));
    const soft = work('tiltSoft', sw, sh);
    const band = work('tiltBand', w, h);
    if (soft && band) {
      soft.filter = `blur(${(1.5 + tilt * 3).toFixed(1)}px) saturate(1.25)`;
      soft.drawImage(ctx.canvas, 0, 0, sw, sh);
      band.drawImage(soft.canvas, 0, 0, w, h);
      band.globalCompositeOperation = 'destination-out';
      const keep = band.createLinearGradient(0, 0, 0, h);
      keep.addColorStop(0, 'rgba(0,0,0,0)');
      keep.addColorStop(0.35, 'rgba(0,0,0,1)');
      keep.addColorStop(0.6, 'rgba(0,0,0,1)');
      keep.addColorStop(1, 'rgba(0,0,0,0)');
      band.fillStyle = keep;
      band.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.4 + tilt);
      ctx.drawImage(band.canvas, 0, 0);
      ctx.restore();
    }
  }
  const pixel = on('pixelate');
  if (pixel > 0) {
    const across = Math.max(8, Math.round(120 - pixel * 100));
    const down = Math.max(4, Math.round((across * h) / w));
    const small = work('pixels', across, down);
    if (small) {
      small.drawImage(ctx.canvas, 0, 0, across, down);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(small.canvas, 0, 0, w, h);
      ctx.restore();
    }
  }
  const dots = on('halftone');
  if (dots > 0) {
    /* Read small, then a dot per cell as big as the cell is dark. */
    const across = Math.max(16, Math.round(90 - dots * 50));
    const down = Math.max(8, Math.round((across * h) / w));
    const cells = work('cells', across, down);
    if (cells) {
      cells.drawImage(ctx.canvas, 0, 0, across, down);
      const px = cells.getImageData(0, 0, across, down).data;
      const cw = w / across;
      const ch = h / down;
      ctx.save();
      ctx.fillStyle = '#f5f1e6';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < down; y += 1) {
        for (let x = 0; x < across; x += 1) {
          const i = (y * across + x) * 4;
          const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          const r = (1 - lum) * Math.min(cw, ch) * 0.62;
          if (r < 0.3) continue;
          ctx.fillStyle = `rgb(${Math.round(px[i] * 0.55)},${Math.round(px[i + 1] * 0.55)},${Math.round(px[i + 2] * 0.55)})`;
          ctx.beginPath();
          ctx.arc((x + 0.5) * cw, (y + 0.5) * ch, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  const duo = on('duotone');
  if (duo > 0) {
    const grey = work('duo', w, h);
    if (grey) {
      /* Two inks, ours: deep violet in the shadows, hot pink in the light. */
      grey.filter = 'grayscale(1) contrast(1.15)';
      grey.drawImage(ctx.canvas, 0, 0);
      grey.filter = 'none';
      grey.globalCompositeOperation = 'multiply';
      grey.fillStyle = '#ff5fc8';
      grey.fillRect(0, 0, w, h);
      grey.globalCompositeOperation = 'lighten';
      grey.fillStyle = '#2a0b5c';
      grey.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = duo;
      ctx.drawImage(grey.canvas, 0, 0);
      ctx.restore();
    }
  }
  const split = on('chromatic');
  if (split > 0) {
    const red = work('red', w, h);
    const cyan = work('cyan', w, h);
    if (red && cyan) {
      red.drawImage(ctx.canvas, 0, 0);
      red.globalCompositeOperation = 'multiply';
      red.fillStyle = '#ff0000';
      red.fillRect(0, 0, w, h);
      cyan.drawImage(ctx.canvas, 0, 0);
      cyan.globalCompositeOperation = 'multiply';
      cyan.fillStyle = '#00ffff';
      cyan.fillRect(0, 0, w, h);
      const d = split * w * 0.012 * (1 + 0.3 * Math.sin(time * 3));
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(red.canvas, -d, 0);
      ctx.drawImage(cyan.canvas, d, 0);
      ctx.restore();
    }
  }
  const kaleido = on('kaleido');
  if (kaleido > 0) {
    const copy = copyOf(ctx, w, h);
    if (copy) {
      /* The top-left quarter, turned over into all four. */
      ctx.save();
      ctx.globalAlpha = kaleido;
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        ctx.setTransform(sx, 0, 0, sy, sx < 0 ? w : 0, sy < 0 ? h : 0);
        ctx.drawImage(copy, 0, 0, w / 2, h / 2, 0, 0, w / 2, h / 2);
      }
      ctx.restore();
    }
  }
  const damage = on('filmDamage');
  if (damage > 0) {
    const frameNo = Math.floor(time * 24);
    const rnd = (n: number): number => { const x = Math.sin(n * 91.7 + frameNo * 13.3) * 43758.5453; return x - Math.floor(x); };
    ctx.save();
    /* A warm, faded print. */
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = damage * 0.35;
    ctx.fillStyle = '#e8c98f';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    /* Scratches running down the frame, and dust. */
    const lines = 1 + Math.floor(rnd(1) * 3 * damage);
    for (let i = 0; i < lines; i += 1) {
      ctx.globalAlpha = 0.25 + 0.5 * rnd(i + 2);
      ctx.fillStyle = rnd(i + 5) > 0.5 ? '#f5f0e0' : '#1a1410';
      ctx.fillRect(rnd(i + 9) * w, 0, Math.max(1, w / 900), h);
    }
    const specks = Math.floor(damage * 14);
    for (let i = 0; i < specks; i += 1) {
      ctx.globalAlpha = 0.5 * rnd(i + 30);
      ctx.fillStyle = rnd(i + 40) > 0.6 ? '#f5f0e0' : '#140f0b';
      ctx.beginPath();
      ctx.arc(rnd(i + 50) * w, rnd(i + 60) * h, Math.max(1, (w / 600) * (1 + 3 * rnd(i + 70))), 0, Math.PI * 2);
      ctx.fill();
    }
    /* And the flicker of a lamp that is not quite steady. */
    ctx.globalAlpha = damage * 0.12 * rnd(99);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const flare = on('lensFlare');
  if (flare > 0) {
    /* A light drifting across the top, and its ghosts along the line through the middle. */
    const lx = w * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.4)));
    const ly = h * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sun = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(w, h) * 0.25);
    sun.addColorStop(0, `rgba(255,250,230,${(0.9 * flare).toFixed(3)})`);
    sun.addColorStop(0.2, `rgba(255,200,120,${(0.45 * flare).toFixed(3)})`);
    sun.addColorStop(1, 'rgba(255,160,80,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    const ghosts = [0.35, 0.6, 0.85, 1.2];
    ghosts.forEach((k, i) => {
      const gx = lx + (w / 2 - lx) * 2 * k;
      const gy = ly + (h / 2 - ly) * 2 * k;
      const r = Math.min(w, h) * (0.03 + 0.03 * (i % 2));
      const ghost = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      const ink = i % 2 ? '120,200,255' : '255,120,220';
      ghost.addColorStop(0, `rgba(${ink},${(0.35 * flare).toFixed(3)})`);
      ghost.addColorStop(1, `rgba(${ink},0)`);
      ctx.fillStyle = ghost;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

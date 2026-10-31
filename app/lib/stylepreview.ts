/**
 * A style, shown on the user's own photo, on the phone, before anything is paid for.
 *
 * The owner, 30 October 2026, of the Style match tiles: *"Met sulke
 * veranderings voorstelle, kan jy nie die foto wat huidiglik daar op is binne
 * daai voorstelle sit nie? ... Ons kort ook baie verskillende voorstelle
 * daar."* Each tile now shows their photograph with a quick likeness of the
 * style drawn over it here — outlines, a few flat colours, dots, a tint, a
 * glow. It is a preview of the look, never the result: the result is the
 * picture engine's, on the press, priced on the tile's row as before.
 *
 * Pixel work only (no `ctx.filter`), so it looks the same on every phone, and
 * small: a tile is 144 pixels square.
 */

type Rgb = readonly [number, number, number];

const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);
const lum = (d: Uint8ClampedArray, i: number): number => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

/** A Sobel edge strength, 0 to 1, for every pixel. */
function edges(d: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) g[i] = lum(d, i * 4);
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const at = (dx: number, dy: number): number => g[(y + dy) * w + x + dx];
      const gx = -at(-1, -1) - 2 * at(-1, 0) - at(-1, 1) + at(1, -1) + 2 * at(1, 0) + at(1, 1);
      const gy = -at(-1, -1) - 2 * at(0, -1) - at(1, -1) + at(-1, 1) + 2 * at(0, 1) + at(1, 1);
      out[y * w + x] = Math.min(1, Math.hypot(gx, gy) / 360);
    }
  }
  return out;
}

function posterize(d: Uint8ClampedArray, levels: number): void {
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c += 1) d[i + c] = Math.round(d[i + c] / step) * step;
  }
}

function saturate(d: Uint8ClampedArray, by: number): void {
  for (let i = 0; i < d.length; i += 4) {
    const l = lum(d, i);
    for (let c = 0; c < 3; c += 1) d[i + c] = clamp(l + (d[i + c] - l) * by);
  }
}

function contrast(d: Uint8ClampedArray, by: number, lift = 0): void {
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c += 1) d[i + c] = clamp((d[i + c] - 128) * by + 128 + lift);
  }
}

/** The picture in one colour's light and dark: grey, sepia, gold, a duotone. */
function mapLight(d: Uint8ClampedArray, dark: Rgb, light: Rgb, curve = 1): void {
  for (let i = 0; i < d.length; i += 4) {
    const t = Math.pow(lum(d, i) / 255, curve);
    for (let c = 0; c < 3; c += 1) d[i + c] = dark[c] + (light[c] - dark[c]) * t;
  }
}

function pixelate(d: Uint8ClampedArray, w: number, h: number, cells: number): void {
  const size = Math.max(2, Math.floor(w / cells));
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const i = (Math.min(h - 1, y + (size >> 1)) * w + Math.min(w - 1, x + (size >> 1))) * 4;
      for (let yy = y; yy < Math.min(h, y + size); yy += 1) {
        for (let xx = x; xx < Math.min(w, x + size); xx += 1) {
          const j = (yy * w + xx) * 4;
          d[j] = d[i]; d[j + 1] = d[i + 1]; d[j + 2] = d[i + 2];
        }
      }
    }
  }
}

/** Lines where the picture changes, in an ink, over what is there (or over paper). */
function ink(d: Uint8ClampedArray, e: Float32Array, colour: Rgb, cut: number, paper?: Rgb): void {
  for (let p = 0; p < e.length; p += 1) {
    const i = p * 4;
    if (paper) { d[i] = paper[0]; d[i + 1] = paper[1]; d[i + 2] = paper[2]; }
    if (e[p] > cut) {
      const a = Math.min(1, (e[p] - cut) * 4);
      for (let c = 0; c < 3; c += 1) d[i + c] = d[i + c] * (1 - a) + colour[c] * a;
    }
  }
}

/** Dots that grow in the dark, the way print shades. */
function halftone(ctx: CanvasRenderingContext2D, s: number, src: Uint8ClampedArray, cell: number, colour: string): void {
  ctx.fillStyle = colour;
  for (let y = cell / 2; y < s; y += cell) {
    for (let x = cell / 2; x < s; x += cell) {
      const i = (Math.floor(y) * s + Math.floor(x)) * 4;
      const r = (1 - lum(src, i) / 255) * cell * 0.55;
      if (r < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Ordered dithering to black and white. */
function dither(d: Uint8ClampedArray, w: number): void {
  const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4;
    const t = (m[(Math.floor(p / w) % 4) * 4 + (p % w) % 4] + 0.5) * 16;
    const v = lum(d, i) > t ? 255 : 18;
    d[i] = v; d[i + 1] = v; d[i + 2] = v;
  }
}

function sparkles(ctx: CanvasRenderingContext2D, s: number, colour: string, seed: number): void {
  let h = seed;
  const rand = (): number => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
  ctx.fillStyle = colour;
  for (let k = 0; k < 40; k += 1) {
    const x = rand() * s;
    const y = rand() * s;
    const r = 0.6 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * 0.5, y); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * 0.5, y); ctx.closePath();
    ctx.moveTo(x - r * 2, y); ctx.lineTo(x, y + r * 0.5); ctx.lineTo(x + r * 2, y); ctx.lineTo(x, y - r * 0.5); ctx.closePath();
    ctx.fill();
  }
}

function wash(ctx: CanvasRenderingContext2D, s: number, stops: readonly string[], mode: GlobalCompositeOperation, alpha = 0.55, angle = 0): void {
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  const g = angle ? ctx.createLinearGradient(0, 0, s, s) : ctx.createLinearGradient(0, 0, 0, s);
  stops.forEach((one, at) => g.addColorStop(at / Math.max(1, stops.length - 1), one));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.restore();
}

function vignette(ctx: CanvasRenderingContext2D, s: number, strength: number): void {
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

function grain(d: Uint8ClampedArray, amount: number, seed: number): void {
  let h = seed;
  for (let i = 0; i < d.length; i += 4) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const n = ((h >>> 24) / 255 - 0.5) * amount;
    d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n);
  }
}

/** A soft blur, two passes of a small box. */
function soften(d: Uint8ClampedArray, w: number, h: number): void {
  const copy = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) sum += copy[((y + dy) * w + x + dx) * 4 + c];
        d[i + c] = sum / 9;
      }
    }
  }
}

/** The styles drawn by these treatments, so the tile and the check agree on which they are. */
export const PREVIEWED = [
  'moderncomic', 'comic', 'pop', 'crayon', 'doodle', 'handdrawn', 'cartoon', 'cartoon3d', 'anime',
  'lineart', 'simpleline', 'colourline', 'flat', 'pixel', 'polygon', 'voxel', 'soft3d', 'chrome', 'iridescent', 'neon',
  'etching', 'pencil', 'oil', 'watercolour', 'riso', 'linocut', 'dither', 'glass', 'mosaic',
  'scrapbook', 'cutout', 'origami', 'clay', 'crochet', 'plush', 'stitched', 'glossy', 'marble', 'gold',
  'glittergold', 'glitterorange', 'glitterpink', 'glittersilver', 'glittergreen',
  'vintage', 'noir', 'sticker',
  'synthwave', 'vaporwave', 'cyberpunk', 'hologram', 'blueprint', 'thermal', 'xray', 'charcoal',
  'woodblock', 'graffiti', 'tattoo', 'polaroid', 'duotone', 'infrared',
] as const;

/**
 * Turn what is already on the canvas into a likeness of the style. Draw the
 * photo (or the sample balloon) first, then call this.
 */
export function previewStyle(ctx: CanvasRenderingContext2D, s: number, id: string): void {
  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const put = (): void => ctx.putImageData(img, 0, 0);
  const e = (): Float32Array => edges(src, s, s);
  const seed = [...id].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7);
  switch (id) {
    case 'pixel': pixelate(d, s, s, 18); saturate(d, 1.3); put(); return;
    case 'voxel': case 'mosaic': pixelate(d, s, s, 12); put();
      ctx.strokeStyle = id === 'mosaic' ? 'rgba(230,226,215,0.9)' : 'rgba(0,0,0,0.25)';
      for (let k = 0; k <= s; k += s / 12) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, s); ctx.moveTo(0, k); ctx.lineTo(s, k); ctx.stroke(); }
      return;
    case 'polygon': pixelate(d, s, s, 9); posterize(d, 6); put(); return;
    case 'lineart': case 'simpleline': ink(d, e(), [20, 20, 20], id === 'simpleline' ? 0.32 : 0.18, [250, 248, 242]); put(); return;
    case 'etching': case 'pencil': case 'charcoal': {
      ink(d, e(), id === 'charcoal' ? [10, 10, 10] : [60, 56, 52], id === 'charcoal' ? 0.12 : 0.15, id === 'etching' ? [244, 236, 214] : [245, 244, 240]);
      put();
      if (id !== 'pencil') { ctx.globalAlpha = 0.35; halftone(ctx, s, src, 5, '#1c1917'); ctx.globalAlpha = 1; }
      return;
    }
    case 'linocut': case 'woodblock': case 'tattoo': {
      const edge = e();
      for (let p = 0; p < s * s; p += 1) {
        const i = p * 4;
        const dark = lum(src, i) < 110 || edge[p] > 0.3;
        const c: Rgb = id === 'woodblock' ? (dark ? [28, 38, 74] : [238, 226, 196]) : id === 'tattoo' ? (dark ? [16, 16, 16] : [246, 236, 220]) : (dark ? [12, 12, 12] : [246, 244, 238]);
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
      put();
      if (id === 'tattoo') wash(ctx, s, ['#dc2626', '#16a34a'], 'multiply', 0.25, 1);
      return;
    }
    case 'dither': dither(d, s); put(); return;
    case 'comic': case 'moderncomic': case 'cartoon': case 'anime': case 'colourline': case 'doodle': case 'handdrawn': case 'crayon': case 'flat': {
      posterize(d, id === 'flat' ? 4 : id === 'anime' ? 6 : 5);
      saturate(d, id === 'crayon' || id === 'handdrawn' ? 1.1 : 1.45);
      if (id !== 'flat') ink(d, e(), [18, 18, 24], id === 'handdrawn' || id === 'crayon' ? 0.25 : 0.2);
      if (id === 'crayon') grain(d, 70, seed);
      put();
      if (id === 'comic') { ctx.globalAlpha = 0.28; halftone(ctx, s, src, 6, '#111'); ctx.globalAlpha = 1; }
      return;
    }
    case 'pop': posterize(d, 3); saturate(d, 2); put(); ctx.globalAlpha = 0.4; halftone(ctx, s, src, 7, '#ff2bd6'); ctx.globalAlpha = 1; return;
    case 'riso': {
      mapLight(d, [36, 70, 200], [255, 246, 236]);
      put();
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.7; ctx.translate(3, 2);
      halftone(ctx, s, src, 5, '#ff4f8b'); ctx.restore();
      return;
    }
    case 'neon': case 'cyberpunk': case 'hologram': {
      const edge = e();
      const glow: Rgb = id === 'hologram' ? [103, 232, 249] : id === 'cyberpunk' ? [255, 43, 214] : [57, 255, 20];
      for (let p = 0; p < s * s; p += 1) {
        const i = p * 4;
        const base = id === 'cyberpunk' ? lum(src, i) * 0.25 : id === 'hologram' ? lum(src, i) * 0.35 : 8;
        const a = Math.min(1, edge[p] * 2.4);
        d[i] = base * (id === 'hologram' ? 0.4 : 0.6) + glow[0] * a;
        d[i + 1] = base * (id === 'hologram' ? 0.9 : 0.4) + glow[1] * a;
        d[i + 2] = base + glow[2] * a;
      }
      put();
      if (id === 'cyberpunk') wash(ctx, s, ['#00f0ff', '#ff2bd6'], 'screen', 0.35, 1);
      if (id === 'hologram') { ctx.fillStyle = 'rgba(103,232,249,0.18)'; for (let y = 0; y < s; y += 4) ctx.fillRect(0, y, s, 1); }
      return;
    }
    case 'synthwave': case 'vaporwave': {
      mapLight(d, id === 'synthwave' ? [36, 6, 70] : [70, 40, 110], id === 'synthwave' ? [255, 120, 200] : [150, 240, 255], 0.9);
      put();
      wash(ctx, s, id === 'synthwave' ? ['#ff2bd6', '#7c3aed', '#00f0ff'] : ['#f9a8d4', '#a5f3fc'], 'screen', 0.35);
      ctx.strokeStyle = id === 'synthwave' ? 'rgba(255,43,214,0.6)' : 'rgba(165,243,252,0.5)';
      for (let k = 0; k < 6; k += 1) { const y = s * 0.68 + k * k * 1.6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }
      return;
    }
    case 'chrome': case 'marble': case 'gold': case 'glossy': {
      contrast(d, id === 'marble' ? 0.8 : 1.5, id === 'marble' ? 40 : 0);
      mapLight(d, id === 'gold' ? [90, 50, 0] : id === 'marble' ? [150, 150, 152] : [30, 34, 40], id === 'gold' ? [255, 226, 120] : id === 'marble' ? [250, 250, 248] : [250, 252, 255], id === 'chrome' ? 0.7 : 1);
      if (id === 'glossy') saturate(d, 1.4);
      put();
      if (id !== 'marble') wash(ctx, s, ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.5)'], 'screen', 0.45, 1);
      return;
    }
    case 'iridescent': saturate(d, 0.4); put(); wash(ctx, s, ['#f472b6', '#a78bfa', '#38bdf8', '#fb923c'], 'color', 0.55, 1); return;
    case 'glittergold': case 'glitterorange': case 'glitterpink': case 'glittersilver': case 'glittergreen': {
      const tone: Record<string, [Rgb, Rgb, string]> = {
        glittergold: [[90, 55, 0], [255, 220, 110], '#fff7cc'],
        glitterorange: [[110, 40, 0], [255, 170, 80], '#ffe4c4'],
        glitterpink: [[110, 10, 60], [255, 150, 210], '#ffe4f2'],
        glittersilver: [[60, 64, 72], [235, 238, 244], '#ffffff'],
        glittergreen: [[10, 70, 30], [140, 240, 150], '#e7ffe9'],
      };
      const [dark, light, star] = tone[id];
      mapLight(d, dark, light);
      grain(d, 90, seed);
      put();
      sparkles(ctx, s, star, seed);
      return;
    }
    case 'oil': case 'watercolour': {
      soften(d, s, s);
      if (id === 'oil') { posterize(d, 7); saturate(d, 1.35); } else { saturate(d, 1.15); contrast(d, 0.85, 22); }
      grain(d, id === 'oil' ? 26 : 18, seed);
      put();
      return;
    }
    case 'glass': posterize(d, 4); saturate(d, 1.7); ink(d, e(), [20, 18, 26], 0.14); put(); return;
    case 'scrapbook': case 'cutout': case 'origami': case 'clay': case 'crochet': case 'plush': case 'stitched': {
      posterize(d, id === 'origami' || id === 'cutout' ? 4 : 5);
      saturate(d, 1.2);
      if (id === 'clay' || id === 'plush') soften(d, s, s);
      if (id === 'crochet' || id === 'stitched' || id === 'scrapbook' || id === 'plush') grain(d, 60, seed);
      put();
      if (id === 'cutout' || id === 'scrapbook') vignette(ctx, s, 0.35);
      if (id === 'stitched' || id === 'crochet') {
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.setLineDash([3, 3]);
        for (let y = 4; y < s; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke(); }
        ctx.setLineDash([]);
      }
      return;
    }
    case 'cartoon3d': case 'soft3d': soften(d, s, s); saturate(d, 1.4); contrast(d, 1.1, 10); put();
      wash(ctx, s, ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'], 'screen', 0.5); return;
    case 'vintage': case 'polaroid': {
      mapLight(d, [50, 32, 18], [240, 222, 186]);
      grain(d, 40, seed);
      put();
      vignette(ctx, s, 0.5);
      if (id === 'polaroid') {
        ctx.strokeStyle = '#f5f5f0';
        ctx.lineWidth = s * 0.07;
        ctx.strokeRect(0, 0, s, s);
        ctx.fillStyle = '#f5f5f0';
        ctx.fillRect(0, s * 0.82, s, s * 0.18);
      }
      return;
    }
    case 'noir': mapLight(d, [0, 0, 0], [255, 255, 255]); contrast(d, 1.7); put(); vignette(ctx, s, 0.6); return;
    case 'duotone': mapLight(d, [40, 10, 90], [255, 200, 60]); put(); return;
    case 'blueprint': ink(d, e(), [235, 245, 255], 0.16, [18, 64, 140]); put();
      ctx.strokeStyle = 'rgba(235,245,255,0.18)'; for (let k = 0; k <= s; k += s / 10) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, s); ctx.moveTo(0, k); ctx.lineTo(s, k); ctx.stroke(); } return;
    case 'xray': for (let i = 0; i < d.length; i += 4) { const v = 255 - lum(src, i); d[i] = v * 0.75; d[i + 1] = v * 0.9; d[i + 2] = v; } put(); return;
    case 'thermal': case 'infrared': {
      for (let i = 0; i < d.length; i += 4) {
        const t = lum(src, i) / 255;
        if (id === 'thermal') {
          d[i] = clamp(255 * Math.min(1, t * 2)); d[i + 1] = clamp(255 * Math.max(0, t * 2 - 1)); d[i + 2] = clamp(255 * (t < 0.4 ? 1 - t * 2 : 0));
        } else {
          d[i] = clamp(src[i + 1] * 1.1 + 40); d[i + 1] = clamp(src[i] * 0.7); d[i + 2] = clamp(src[i + 2] * 0.9 + 30);
        }
      }
      put();
      return;
    }
    case 'graffiti': posterize(d, 4); saturate(d, 1.9); ink(d, e(), [10, 10, 10], 0.22); put();
      wash(ctx, s, ['#facc15', '#ec4899', '#22d3ee'], 'overlay', 0.35, 1); return;
    case 'sticker': {
      put();
      ctx.save();
      ctx.lineWidth = s * 0.08;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    default:
      put();
  }
}

/** The photo, cut to a square from its middle, at `s` pixels. */
export function drawCover(ctx: CanvasRenderingContext2D, s: number, source: CanvasImageSource & { width: number; height: number }): void {
  const w = (source as HTMLImageElement).naturalWidth || source.width;
  const h = (source as HTMLImageElement).naturalHeight || source.height;
  if (!w || !h) return;
  const side = Math.min(w, h);
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, s, s);
}

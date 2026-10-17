/**
 * Style match: the photograph, or the part of it painted, made over in a style.
 *
 * Carli, 17 October 2026, with screenshots of another app's style picker — a
 * row of sample tiles, one subject made in each style, under tabs for
 * drawing, digital and physical media: *"By magic moet daar ook van hierdie
 * filters wees … ons moet al daai presiese opsies en filters en templates gee
 * wat dan so oulik verander, google sal dit kan doen."*
 *
 * Ours, in our own hand: the sample on every tile is a little bird drawn here,
 * in code, in each style — nobody's picture is borrowed — and the change
 * itself is the picture engine's, through the magic touch's own paid route.
 * Each style is a sentence for the engine (`ask`) and a way to draw the bird
 * (`look`), kept side by side so a style cannot be offered without a picture
 * of what it does.
 */

export type StyleGroup = 'draw' | 'digital' | 'physical' | 'photo';

export const STYLE_GROUPS: readonly { readonly id: StyleGroup; readonly en: string; readonly af: string }[] = [
  { id: 'digital', en: 'Digital', af: 'Digitaal' },
  { id: 'draw', en: 'Drawn and painted', af: 'Geteken en geverf' },
  { id: 'physical', en: 'Made by hand', af: 'Met die hand gemaak' },
  { id: 'photo', en: 'Photo looks', af: 'Foto-voorkoms' },
];

type Look =
  | 'pixel' | 'polygon' | 'voxel' | 'soft3d' | 'chrome' | 'iridescent' | 'neon'
  | 'pencil' | 'watercolour' | 'comic' | 'anime' | 'oil' | 'cartoon'
  | 'clay' | 'origami' | 'stitched' | 'glass' | 'mosaic' | 'marble' | 'gold'
  | 'vintage' | 'noir' | 'pop' | 'sticker';

export interface MagicStyle {
  readonly id: Look;
  readonly group: StyleGroup;
  readonly en: string;
  readonly af: string;
  /** What the engine is asked to make it look like. */
  readonly ask: string;
}

export const MAGIC_STYLES: readonly MagicStyle[] = [
  { id: 'pixel', group: 'digital', en: 'Pixel art', af: 'Pixelkuns', ask: 'pixel art: crisp square pixels, a small limited palette, retro video-game look' },
  { id: 'polygon', group: 'digital', en: 'Low poly', af: 'Lae poli', ask: 'low-poly 3D: flat-shaded triangular facets, clean geometric planes' },
  { id: 'voxel', group: 'digital', en: 'Blocks', af: 'Blokkies', ask: 'voxel art: built from small 3D cubes, like a block-building game' },
  { id: 'soft3d', group: 'digital', en: '3D render', af: '3D-weergawe', ask: 'a smooth 3D render: soft studio light, rounded forms, gentle shadows' },
  { id: 'chrome', group: 'digital', en: 'Chrome', af: 'Chroom', ask: 'polished liquid chrome: mirror-like silver metal with bright reflections' },
  { id: 'iridescent', group: 'digital', en: 'Iridescent', af: 'Reënboogglans', ask: 'iridescent holographic: shifting pink, violet, blue and orange sheen' },
  { id: 'neon', group: 'digital', en: 'Neon', af: 'Neon', ask: 'glowing neon light lines on a dark background, vivid electric colour' },
  { id: 'pencil', group: 'draw', en: 'Pencil sketch', af: 'Potloodskets', ask: 'a graphite pencil sketch: fine hatching and loose construction lines on paper' },
  { id: 'watercolour', group: 'draw', en: 'Watercolour', af: 'Waterverf', ask: 'a watercolour painting: soft washes, blooms and paper texture' },
  { id: 'comic', group: 'draw', en: 'Comic', af: 'Strokiesprent', ask: 'a comic-book illustration: bold ink outlines, flat colours, halftone dots' },
  { id: 'anime', group: 'draw', en: 'Anime', af: 'Anime', ask: 'anime illustration: clean line art, cel shading, bright expressive eyes' },
  { id: 'oil', group: 'draw', en: 'Oil painting', af: 'Olieverf', ask: 'a classic oil painting: thick visible brush strokes, rich colour' },
  { id: 'cartoon', group: 'draw', en: 'Cartoon', af: 'Spotprent', ask: 'a playful cartoon: simple shapes, thick outlines, cheerful colours' },
  { id: 'clay', group: 'physical', en: 'Clay', af: 'Klei', ask: 'handmade clay figures: soft matte plasticine with fingerprints and rounded forms' },
  { id: 'origami', group: 'physical', en: 'Paper folds', af: 'Papiervou', ask: 'folded paper origami: crisp creases and flat paper planes' },
  { id: 'stitched', group: 'physical', en: 'Embroidery', af: 'Borduurwerk', ask: 'embroidery on fabric: satin stitches and thread texture' },
  { id: 'glass', group: 'physical', en: 'Stained glass', af: 'Loodglas', ask: 'a stained glass window: bright glass pieces with dark lead lines, light shining through' },
  { id: 'mosaic', group: 'physical', en: 'Mosaic', af: 'Mosaïek', ask: 'a tile mosaic: small square stone and glass tiles with grout between' },
  { id: 'marble', group: 'physical', en: 'Marble statue', af: 'Marmerbeeld', ask: 'a carved white marble statue with grey veins, museum lighting' },
  { id: 'gold', group: 'physical', en: 'Gold', af: 'Goud', ask: 'solid polished gold, warm metallic highlights' },
  { id: 'vintage', group: 'photo', en: 'Old photo', af: 'Ou foto', ask: 'an old sepia photograph: faded, soft grain, worn edges' },
  { id: 'noir', group: 'photo', en: 'Film noir', af: 'Film noir', ask: 'black-and-white film noir: hard shadows and dramatic contrast' },
  { id: 'pop', group: 'photo', en: 'Pop art', af: 'Popkuns', ask: 'pop art: bold flat colour blocks and halftone dots, four bright colours' },
  { id: 'sticker', group: 'photo', en: 'Sticker', af: 'Plakker', ask: 'a die-cut sticker: thick white border, glossy, slight drop shadow' },
];

export const styleById = (id: string): MagicStyle | undefined => MAGIC_STYLES.find((one) => one.id === id);

export const styleLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

/** The sentence the engine is sent, for a part or for the whole photograph. */
export function styleAsk(style: MagicStyle, whole: boolean): string {
  return whole
    ? `Restyle this whole photograph as ${style.ask}. Keep every person, their face, pose and expression, and the composition exactly as they are.`
    : `Restyle the main thing in this part of the photograph as ${style.ask}. Keep its shape, size, position and angle so it fits back into the photograph. Keep the edges of the picture as they are.`;
}

/* ── The bird on every tile ──────────────────────────────────────────── */

interface Part {
  readonly path: Path2D;
  readonly ink: string;
}

/** The bird's parts on an `s`-pixel square, back to front. */
function bird(s: number): Part[] {
  const body = new Path2D();
  body.ellipse(s * 0.48, s * 0.62, s * 0.3, s * 0.24, 0, 0, Math.PI * 2);
  const head = new Path2D();
  head.arc(s * 0.6, s * 0.34, s * 0.17, 0, Math.PI * 2);
  const beak = new Path2D();
  beak.moveTo(s * 0.74, s * 0.33);
  beak.lineTo(s * 0.9, s * 0.38);
  beak.lineTo(s * 0.74, s * 0.43);
  beak.closePath();
  const wing = new Path2D();
  wing.ellipse(s * 0.4, s * 0.62, s * 0.16, s * 0.1, -0.35, 0, Math.PI * 2);
  const eye = new Path2D();
  eye.arc(s * 0.64, s * 0.31, s * 0.035, 0, Math.PI * 2);
  return [
    { path: body, ink: '#ffcf33' },
    { path: head, ink: '#ffd84d' },
    { path: wing, ink: '#f5a524' },
    { path: beak, ink: '#ff7a1a' },
    { path: eye, ink: '#1c1c1c' },
  ];
}

/** The whole bird as one outline, for styles that fill it as one thing. */
function outline(s: number): Path2D {
  const all = new Path2D();
  for (const part of bird(s).slice(0, 4)) all.addPath(part.path);
  return all;
}

/** A clean outer outline: every part stroked twice as wide, the bird filled over it. */
function inked(ctx: CanvasRenderingContext2D, s: number, ink: string, width: number): void {
  ctx.strokeStyle = ink;
  ctx.lineWidth = width * 2;
  ctx.lineJoin = 'round';
  for (const part of bird(s).slice(0, 4)) ctx.stroke(part.path);
}

function flat(ctx: CanvasRenderingContext2D, s: number, recolour?: (ink: string) => string): void {
  for (const part of bird(s)) {
    ctx.fillStyle = recolour ? recolour(part.ink) : part.ink;
    ctx.fill(part.path);
  }
}

/** The bird drawn small, as pixels to build blocky styles from. */
function sampled(n: number): Uint8ClampedArray | null {
  const tiny = document.createElement('canvas');
  tiny.width = n;
  tiny.height = n;
  const c = tiny.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  flat(c, n);
  return c.getImageData(0, 0, n, n).data;
}

const rgb = (d: Uint8ClampedArray, i: number, by = 0): string =>
  `rgb(${Math.max(0, Math.min(255, d[i] + by))},${Math.max(0, Math.min(255, d[i + 1] + by))},${Math.max(0, Math.min(255, d[i + 2] + by))})`;

const grey = (ink: string): string => {
  const n = Number.parseInt(ink.slice(1), 16);
  const v = Math.round(((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11);
  return `rgb(${v},${v},${v})`;
};

/** Draw a style's sample on a square canvas. */
export function drawStyleTile(canvas: HTMLCanvasElement, id: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = canvas.width;
  ctx.save();
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, s, s);
  const line = Math.max(1.5, s / 30);

  switch (id) {
    case 'pixel': {
      const n = 14;
      const d = sampled(n);
      if (!d) break;
      const cell = s / n;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const i = (y * n + x) * 4;
          if (d[i + 3] < 128) continue;
          ctx.fillStyle = rgb(d, i);
          ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
        }
      }
      break;
    }
    case 'voxel': {
      const n = 11;
      const d = sampled(n);
      if (!d) break;
      const cell = s / (n + 1);
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const i = (y * n + x) * 4;
          if (d[i + 3] < 128) continue;
          const px = x * cell + cell * 0.3;
          const py = y * cell + cell * 0.3;
          const lip = cell * 0.28;
          ctx.fillStyle = rgb(d, i, -55);
          ctx.fillRect(px + lip, py + lip, cell, cell);
          ctx.fillStyle = rgb(d, i, 25);
          ctx.fillRect(px, py, cell, cell);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cell, cell);
        }
      }
      break;
    }
    case 'mosaic': {
      ctx.fillStyle = '#d8d2c4';
      ctx.fillRect(0, 0, s, s);
      const n = 16;
      const d = sampled(n);
      if (!d) break;
      const cell = s / n;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const i = (y * n + x) * 4;
          ctx.fillStyle = d[i + 3] < 128 ? ((x + y) % 3 === 0 ? '#8fb8c9' : '#a5c8d6') : rgb(d, i, ((x * 7 + y * 3) % 5) * 6 - 12);
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        }
      }
      break;
    }
    case 'polygon': {
      const n = 9;
      const d = sampled(n * 4);
      if (!d) break;
      const cell = s / n;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          for (let half = 0; half < 2; half += 1) {
            const cx = Math.min(n * 4 - 1, Math.round((x + (half ? 0.66 : 0.33)) * 4));
            const cy = Math.min(n * 4 - 1, Math.round((y + (half ? 0.66 : 0.33)) * 4));
            const i = (cy * n * 4 + cx) * 4;
            if (d[i + 3] < 128) continue;
            ctx.beginPath();
            if (half) {
              ctx.moveTo((x + 1) * cell, y * cell);
              ctx.lineTo((x + 1) * cell, (y + 1) * cell);
              ctx.lineTo(x * cell, (y + 1) * cell);
            } else {
              ctx.moveTo(x * cell, y * cell);
              ctx.lineTo((x + 1) * cell, y * cell);
              ctx.lineTo(x * cell, (y + 1) * cell);
            }
            ctx.closePath();
            ctx.fillStyle = rgb(d, i, half ? -28 : 18);
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'soft3d':
    case 'clay': {
      const parts = bird(s);
      for (const part of parts) {
        const g = ctx.createRadialGradient(s * 0.42, s * 0.3, s * 0.02, s * 0.5, s * 0.55, s * 0.5);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.25, part.ink);
        g.addColorStop(1, id === 'clay' ? '#a8621a' : '#b77708');
        ctx.fillStyle = part.ink === '#1c1c1c' ? part.ink : g;
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = s / 14;
        ctx.shadowOffsetY = s / 40;
        ctx.fill(part.path);
      }
      if (id === 'clay') {
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(120,70,20,0.18)';
        for (let k = 0; k < 9; k += 1) {
          ctx.beginPath();
          ctx.arc(s * (0.3 + (k % 3) * 0.12), s * (0.52 + Math.floor(k / 3) * 0.08), s * 0.018, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'chrome':
    case 'gold':
    case 'marble': {
      if (id === 'marble') { ctx.fillStyle = '#2b2b30'; ctx.fillRect(0, 0, s, s); }
      const g = ctx.createLinearGradient(0, s * 0.15, s, s * 0.9);
      const stops = id === 'chrome'
        ? ['#f8f8f8', '#8a8f98', '#ffffff', '#4b4f57', '#d7dbe0']
        : id === 'gold'
          ? ['#fff4c2', '#c8901e', '#ffe58a', '#8a5a0c', '#f2c94c']
          : ['#ffffff', '#e8e6e1', '#d4d1ca', '#f2f0eb', '#c9c5bc'];
      stops.forEach((one, k) => g.addColorStop(k / (stops.length - 1), one));
      ctx.fillStyle = g;
      ctx.fill(outline(s));
      if (id === 'marble') {
        ctx.save();
        ctx.clip(outline(s));
        ctx.strokeStyle = 'rgba(110,110,120,0.55)';
        ctx.lineWidth = line * 0.5;
        for (let k = 0; k < 4; k += 1) {
          ctx.beginPath();
          ctx.moveTo(s * (0.15 + k * 0.18), s * 0.2);
          ctx.bezierCurveTo(s * (0.3 + k * 0.1), s * 0.45, s * (0.1 + k * 0.2), s * 0.6, s * (0.35 + k * 0.15), s * 0.95);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.fillStyle = id === 'marble' ? '#9a968e' : '#1c1c1c';
      ctx.fill(bird(s)[4].path);
      break;
    }
    case 'iridescent': {
      const g = ctx.createLinearGradient(s * 0.2, s * 0.15, s * 0.85, s * 0.9);
      ['#ff4fd8', '#8b5cf6', '#38bdf8', '#34d399', '#fbbf24', '#ff4fd8'].forEach((one, k, all) => g.addColorStop(k / (all.length - 1), one));
      ctx.fillStyle = g;
      ctx.fill(outline(s));
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(s * 0.5, s * 0.5, s * 0.12, s * 0.05, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1c1c';
      ctx.fill(bird(s)[4].path);
      break;
    }
    case 'neon': {
      ctx.fillStyle = '#0b0614';
      ctx.fillRect(0, 0, s, s);
      ctx.lineWidth = line;
      ctx.shadowBlur = s / 10;
      for (const [k, part] of bird(s).entries()) {
        const ink = ['#ff3dc8', '#ff3dc8', '#22d3ee', '#fde047', '#22d3ee'][k];
        ctx.strokeStyle = ink;
        ctx.shadowColor = ink;
        ctx.stroke(part.path);
      }
      break;
    }
    case 'pencil':
    case 'noir': {
      if (id === 'noir') { ctx.fillStyle = '#d9d9d9'; ctx.fillRect(0, 0, s, s); flat(ctx, s, (ink) => (ink === '#1c1c1c' ? '#000' : grey(ink))); }
      ctx.save();
      ctx.clip(outline(s));
      ctx.strokeStyle = id === 'noir' ? 'rgba(0,0,0,0.85)' : 'rgba(60,60,60,0.55)';
      ctx.lineWidth = id === 'noir' ? line * 1.6 : Math.max(1, line * 0.35);
      for (let k = -s; k < s * 2; k += id === 'noir' ? s / 7 : s / 22) {
        ctx.beginPath();
        ctx.moveTo(k, s);
        ctx.lineTo(k + s * 0.6, 0);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = Math.max(1, line * 0.6);
      for (const part of bird(s)) ctx.stroke(part.path);
      break;
    }
    case 'watercolour': {
      ctx.filter = `blur(${Math.max(1, s / 40)}px)`;
      for (let k = 0; k < 3; k += 1) {
        ctx.globalAlpha = 0.45;
        ctx.save();
        ctx.translate((k - 1) * s * 0.015, (k - 1) * s * 0.012);
        flat(ctx, s);
        ctx.restore();
      }
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1c1c1c';
      ctx.fill(bird(s)[4].path);
      break;
    }
    case 'oil': {
      flat(ctx, s);
      ctx.save();
      ctx.clip(outline(s));
      ctx.lineCap = 'round';
      for (let k = 0; k < 40; k += 1) {
        const x = s * (0.15 + ((k * 37) % 70) / 100);
        const y = s * (0.15 + ((k * 53) % 75) / 100);
        ctx.strokeStyle = k % 3 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(170,90,10,0.3)';
        ctx.lineWidth = line * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + s * 0.08, y - s * 0.03);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'comic':
    case 'pop': {
      if (id === 'pop') {
        const half = s / 2;
        const grounds = ['#ff3dc8', '#22d3ee', '#fde047', '#34d399'];
        grounds.forEach((one, k) => {
          ctx.fillStyle = one;
          ctx.fillRect((k % 2) * half, Math.floor(k / 2) * half, half, half);
          ctx.save();
          ctx.translate((k % 2) * half, Math.floor(k / 2) * half);
          ctx.scale(0.5, 0.5);
          flat(ctx, s, (ink) => (ink === '#1c1c1c' ? ink : grounds[(k + 2) % 4]));
          ctx.restore();
        });
        break;
      }
      ctx.fillStyle = '#9ee7ff';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(0,90,140,0.25)';
      for (let y = 0; y < s; y += s / 12) for (let x = 0; x < s; x += s / 12) {
        ctx.beginPath();
        ctx.arc(x + s / 24, y + s / 24, s / 60, 0, Math.PI * 2);
        ctx.fill();
      }
      inked(ctx, s, '#111', line * 1.3);
      flat(ctx, s);
      break;
    }
    case 'anime':
    case 'cartoon': {
      inked(ctx, s, id === 'cartoon' ? '#111' : '#5a3a1a', id === 'cartoon' ? line * 1.4 : line * 0.6);
      flat(ctx, s);
      ctx.save();
      ctx.clip(outline(s));
      ctx.fillStyle = 'rgba(180,90,0,0.28)';
      ctx.fillRect(0, s * 0.62, s, s);
      ctx.restore();
      if (id === 'anime') {
        ctx.fillStyle = '#1c1c1c';
        ctx.beginPath();
        ctx.arc(s * 0.64, s * 0.31, s * 0.055, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s * 0.655, s * 0.295, s * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'origami': {
      const pts: [number, number][][] = [
        [[0.18, 0.62], [0.5, 0.42], [0.78, 0.66]],
        [[0.18, 0.62], [0.78, 0.66], [0.46, 0.86]],
        [[0.5, 0.42], [0.62, 0.18], [0.78, 0.4]],
        [[0.5, 0.42], [0.78, 0.4], [0.78, 0.66]],
        [[0.78, 0.4], [0.92, 0.38], [0.78, 0.46]],
      ];
      const inks = ['#ffd84d', '#e8b316', '#ffcf33', '#f0be22', '#ff7a1a'];
      pts.forEach((tri, k) => {
        ctx.beginPath();
        tri.forEach(([x, y], n) => (n ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
        ctx.closePath();
        ctx.fillStyle = inks[k];
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      break;
    }
    case 'stitched': {
      ctx.fillStyle = '#e9e1d0';
      ctx.fillRect(0, 0, s, s);
      ctx.lineWidth = line * 0.9;
      ctx.setLineDash([line * 1.6, line * 0.8]);
      for (const part of bird(s)) {
        ctx.save();
        ctx.clip(part.path);
        ctx.strokeStyle = part.ink;
        for (let k = -s; k < s * 2; k += line * 1.3) {
          ctx.beginPath();
          ctx.moveTo(k, 0);
          ctx.lineTo(k - s * 0.4, s);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.setLineDash([]);
      break;
    }
    case 'glass': {
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(0, 0, s, s);
      const shards = ['#ffd84d', '#ffb020', '#ffe680', '#f59e0b'];
      inked(ctx, s, '#111', line * 1.2);
      ctx.save();
      ctx.clip(outline(s));
      for (let k = 0; k < 7; k += 1) {
        ctx.fillStyle = shards[k % shards.length];
        ctx.beginPath();
        ctx.moveTo(s * (k / 7), 0);
        ctx.lineTo(s * ((k + 1.6) / 7), s * 0.5);
        ctx.lineTo(s * ((k - 0.4) / 7), s);
        ctx.lineTo(s * ((k - 1) / 7), s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#111';
      ctx.lineWidth = line * 0.8;
      for (let k = 1; k < 7; k += 1) {
        ctx.beginPath();
        ctx.moveTo(s * (k / 7), 0);
        ctx.lineTo(s * ((k + 1.6) / 7), s * 0.5);
        ctx.lineTo(s * ((k - 0.4) / 7), s);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#111';
      ctx.fill(bird(s)[4].path);
      break;
    }
    case 'vintage': {
      flat(ctx, s, (ink) => (ink === '#1c1c1c' ? '#3b2a1a' : '#b08a5a'));
      const v = ctx.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s * 0.72);
      v.addColorStop(0, 'rgba(112,66,20,0.05)');
      v.addColorStop(1, 'rgba(60,35,10,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, s, s);
      break;
    }
    case 'sticker': {
      ctx.fillStyle = '#c7e9f5';
      ctx.fillRect(0, 0, s, s);
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = s / 16;
      ctx.shadowOffsetY = s / 40;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = line * 3.2;
      ctx.lineJoin = 'round';
      ctx.stroke(outline(s));
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.fill(outline(s));
      flat(ctx, s);
      break;
    }
    default:
      flat(ctx, s);
  }
  ctx.restore();
}

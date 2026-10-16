/**
 * Filters for the photo editor: grouped, named, and shown on her own photo.
 *
 * Carli, 16 October 2026, with a filter row from another app open: *"Ek soek
 * ook al daai funksies en ook sulke oulike filters ... Ons foto's en filter
 * prentjies moet net iets anders wees en anders lyk."*
 *
 * So the names are ours — the light and the places she knows: the Karoo, the
 * Kalahari, a Highveld sunset, the mist belt, Cape Point — and every filter's
 * picture is HER photograph with it on, small. Before there is a photograph
 * the tiles show a scene drawn here (`drawSample`): a Highveld evening with
 * an acacia, not a stock photo of anything.
 *
 * A filter is only a `Look` (`postlook.ts`): the five sliders plus the few
 * things a mood needs — a brown, a turn of the colour wheel, a fade, a tint,
 * darkened corners. Choosing one sets the look; the sliders then show what it
 * did and can move it further, and the strength takes it part of the way.
 */
import { PLAIN, filterFor, paintWashes, type Look } from './postlook';

export type FilterGroup = 'natural' | 'warm' | 'cool' | 'vivid' | 'mono' | 'film' | 'moody' | 'neon';

export const FILTER_GROUPS: readonly { readonly id: FilterGroup; readonly en: string; readonly af: string }[] = [
  { id: 'natural', en: 'Natural', af: 'Natuurlik' },
  { id: 'warm', en: 'Warm', af: 'Warm' },
  { id: 'cool', en: 'Cool', af: 'Koel' },
  { id: 'vivid', en: 'Vivid', af: 'Helder' },
  { id: 'mono', en: 'Black and white', af: 'Swart en wit' },
  { id: 'film', en: 'Film', af: 'Film' },
  { id: 'moody', en: 'Moody', af: 'Donker' },
  { id: 'neon', en: 'Neon', af: 'Neon' },
];

export interface PostFilter {
  readonly id: string;
  readonly group: FilterGroup;
  readonly en: string;
  readonly af: string;
  readonly look: Look;
}

const f = (id: string, group: FilterGroup, en: string, af: string, look: Partial<Look>): PostFilter => ({
  id, group, en, af, look: { ...PLAIN, ...look },
});

export const POST_FILTERS: readonly PostFilter[] = [
  f('clean', 'natural', 'Clean', 'Skoon', { bright: 1.03, contrast: 1.06, colour: 1.05 }),
  f('daylight', 'natural', 'Daylight', 'Daglig', { bright: 1.06, contrast: 1.04, colour: 1.08, warmth: 0.08 }),
  f('soft', 'natural', 'Soft', 'Sag', { bright: 1.05, contrast: 0.9, colour: 0.95, fade: 0.12 }),
  f('crisp', 'natural', 'Crisp', 'Kraakvars', { contrast: 1.18, colour: 1.12 }),
  f('honest', 'natural', 'Honest', 'Eerlik', { contrast: 1.08, colour: 0.92 }),

  f('karoo', 'warm', 'Karoo', 'Karoo', { warmth: 0.45, colour: 0.9, contrast: 1.05, fade: 0.1, tint: [230, 150, 80, 0.15] }),
  f('kalahari', 'warm', 'Kalahari', 'Kalahari', { warmth: 0.6, colour: 1.15, contrast: 1.12, tint: [220, 90, 40, 0.18] }),
  f('bushveld', 'warm', 'Bushveld', 'Bosveld', { warmth: 0.3, colour: 1.05, hue: -6, tint: [180, 160, 60, 0.12] }),
  f('highveld', 'warm', 'Highveld sunset', 'Hoëveld-sononder', { warmth: 0.55, contrast: 1.08, tint: [255, 100, 120, 0.2], vignette: 0.3 }),
  f('honey', 'warm', 'Honey', 'Heuning', { warmth: 0.4, bright: 1.05, sepia: 0.15, colour: 1.05 }),

  f('atlantic', 'cool', 'Atlantic', 'Atlanties', { warmth: -0.45, colour: 0.95, contrast: 1.08 }),
  f('capepoint', 'cool', 'Cape Point', 'Kaappunt', { warmth: -0.3, contrast: 1.12, tint: [40, 140, 170, 0.18] }),
  f('mistbelt', 'cool', 'Mist belt', 'Mistgordel', { warmth: -0.25, fade: 0.25, colour: 0.8, contrast: 0.9 }),
  f('glacier', 'cool', 'Glacier', 'Gletser', { warmth: -0.6, bright: 1.08, colour: 0.85 }),
  f('lowtide', 'cool', 'Low tide', 'Laagwater', { hue: 8, warmth: -0.2, colour: 1.1, tint: [20, 160, 140, 0.14] }),

  f('pop', 'vivid', 'Pop', 'Pop', { colour: 1.55, contrast: 1.15 }),
  f('punch', 'vivid', 'Punch', 'Kragtig', { colour: 1.35, contrast: 1.3, bright: 0.98, vignette: 0.2 }),
  f('jacaranda', 'vivid', 'Jacaranda', 'Jakaranda', { colour: 1.2, hue: -8, tint: [150, 90, 220, 0.22] }),
  f('fynbos', 'vivid', 'Fynbos', 'Fynbos', { hue: 6, colour: 1.3, tint: [230, 80, 120, 0.12] }),

  f('charcoal', 'mono', 'Charcoal', 'Houtskool', { colour: 0, contrast: 1.25, bright: 0.96 }),
  f('silver', 'mono', 'Silver', 'Silwer', { colour: 0, contrast: 1.05, bright: 1.06, fade: 0.1 }),
  f('newsprint', 'mono', 'Newsprint', 'Koerantpapier', { colour: 0, contrast: 1.45, fade: 0.18 }),
  f('ink', 'mono', 'Ink', 'Ink', { colour: 0, contrast: 1.5, bright: 0.92, vignette: 0.45 }),
  f('oldbrown', 'mono', 'Old brown', 'Ou bruin', { colour: 0.3, sepia: 0.75, fade: 0.15, vignette: 0.3 }),

  f('seventies', 'film', 'Seventies', 'Sewentigs', { warmth: 0.35, fade: 0.3, colour: 0.85, contrast: 0.95, tint: [240, 180, 90, 0.15] }),
  f('faded', 'film', 'Faded', 'Verbleik', { fade: 0.4, colour: 0.75, contrast: 0.9 }),
  f('sunbleached', 'film', 'Sun-bleached', 'Songebleik', { bright: 1.1, fade: 0.3, colour: 0.7, warmth: 0.15 }),
  f('roadtrip', 'film', 'Road trip', 'Padreis', { warmth: 0.25, fade: 0.18, contrast: 1.05, tint: [80, 160, 150, 0.14], vignette: 0.25 }),
  f('throwaway', 'film', 'Throwaway camera', 'Weggooikamera', { contrast: 1.2, colour: 1.2, warmth: 0.2, fade: 0.1, vignette: 0.5 }),

  f('storm', 'moody', 'Thunderstorm', 'Donderstorm', { bright: 0.88, contrast: 1.2, colour: 0.75, warmth: -0.25, vignette: 0.4 }),
  f('midnight', 'moody', 'Midnight', 'Middernag', { bright: 0.82, colour: 0.85, tint: [40, 40, 140, 0.25], vignette: 0.5 }),
  f('smoke', 'moody', 'Smoke', 'Rook', { colour: 0.55, fade: 0.2, bright: 0.92, contrast: 1.05 }),
  f('ember', 'moody', 'Ember', 'Kole', { bright: 0.88, warmth: 0.5, contrast: 1.25, tint: [200, 50, 20, 0.15], vignette: 0.45 }),

  f('synthwave', 'neon', 'Synthwave', 'Synthwave', { hue: -15, colour: 1.3, contrast: 1.12, tint: [255, 40, 200, 0.28], vignette: 0.3 }),
  f('hologram', 'neon', 'Hologram', 'Hologram', { hue: 40, colour: 1.4, bright: 1.04, tint: [60, 240, 255, 0.2] }),
  f('neonglow', 'neon', 'Neon glow', 'Neongloed', { colour: 1.6, contrast: 1.2, tint: [57, 255, 20, 0.14], vignette: 0.35 }),
  f('gold', 'neon', 'Gold', 'Goud', { sepia: 0.35, warmth: 0.4, colour: 1.2, contrast: 1.1, tint: [255, 200, 60, 0.2] }),
];

export const filterById = (id: string): PostFilter | undefined => POST_FILTERS.find((one) => one.id === id);

export const filterLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

/* ── Our own picture, for before there is hers ─────────────────────────── */

/**
 * A Highveld evening: a sky going from night blue to peach, a low sun, two
 * ridges of hills, grass, and an acacia against the light. Drawn, not
 * photographed — warm and cool and dark and light all in one small square,
 * so every filter has something to show on it.
 */
export function drawSample(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.68);
  sky.addColorStop(0, '#1b2a6b');
  sky.addColorStop(0.45, '#7a4fa0');
  sky.addColorStop(0.78, '#f08a5d');
  sky.addColorStop(1, '#ffd29a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  /* The sun, with a little halo. */
  const sx = w * 0.64;
  const sy = h * 0.6;
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.32);
  halo.addColorStop(0, 'rgba(255,240,200,0.95)');
  halo.addColorStop(0.18, 'rgba(255,214,150,0.8)');
  halo.addColorStop(1, 'rgba(255,180,120,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  const ridge = (base: number, lift: number, ink: string, seed: number): void => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 24) {
      const y = h * base - Math.sin(x / w * 5 + seed) * h * lift - Math.sin(x / w * 11 + seed * 2) * h * lift * 0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = ink;
    ctx.fill();
  };
  ridge(0.66, 0.05, '#5b4a7e', 1.2);
  ridge(0.74, 0.04, '#3f5a3a', 2.6);

  /* Grass in the front, lighter where the sun reaches it. */
  const grass = ctx.createLinearGradient(0, h * 0.76, 0, h);
  grass.addColorStop(0, '#9c8a3c');
  grass.addColorStop(1, '#4d5a22');
  ctx.fillStyle = grass;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);

  /* An acacia: a trunk, and the flat crown it is known by. */
  ctx.fillStyle = '#1d1712';
  const tx = w * 0.26;
  ctx.fillRect(tx - w * 0.012, h * 0.5, w * 0.024, h * 0.32);
  ctx.beginPath();
  ctx.moveTo(tx, h * 0.6);
  ctx.lineTo(tx - w * 0.08, h * 0.47);
  ctx.lineTo(tx - w * 0.07, h * 0.46);
  ctx.lineTo(tx, h * 0.57);
  ctx.lineTo(tx + w * 0.09, h * 0.46);
  ctx.lineTo(tx + w * 0.1, h * 0.47);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(tx, h * 0.45, w * 0.17, h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A small square of the photograph — or of the drawn evening when there is no
 * photograph yet — that every filter and tool picture is drawn from. Made once
 * per photograph, so forty small pictures are forty draws of a tiny canvas
 * rather than forty of a twelve-megapixel one.
 */
export function thumbOf(picture: HTMLImageElement | HTMLCanvasElement | null, side = 128): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = side;
  out.height = side;
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  const w = picture instanceof HTMLImageElement ? picture.naturalWidth : picture?.width ?? 0;
  const h = picture instanceof HTMLImageElement ? picture.naturalHeight : picture?.height ?? 0;
  if (!picture || !w || !h) {
    drawSample(ctx, side, side);
    return out;
  }
  /* Filled, from the middle, as a square crop. */
  const scale = Math.max(side / w, side / h);
  ctx.drawImage(picture, (side - w * scale) / 2, (side - h * scale) / 2, w * scale, h * scale);
  return out;
}

/** One filter's picture: the small square with the look on it. */
export function drawFilterTile(canvas: HTMLCanvasElement, from: HTMLCanvasElement, look: Look): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  /* The blur is in post units at 1080 across; scaled down with the tile. */
  ctx.filter = filterFor(look, canvas.width / 1080);
  ctx.drawImage(from, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  paintWashes(ctx, look, 0, 0, canvas.width, canvas.height);
}

/**
 * The meerkat photograph every look and template is shown on.
 *
 * Carli, 17 October 2026, at the video editor's Looks: *"Hierdie looks in
 * video editor moet alles foto's wees vir 'n voorbeeld. Alles 'n meerkat. Al
 * die templates in al die kamers moet visual wees."*
 *
 * One scene, drawn here in code — nobody's photograph is borrowed: a meerkat
 * standing up on a red Kalahari dune against the sky, lit from the side, with
 * grass and a soft shadow, so a colour look has skin, sand, sky and shadow to
 * act on and shows what it does to each. The same animal as the style-match
 * tiles (`magicstyles.ts`), so the app has one mascot, not several.
 *
 * A mood repaints the light — golden hour, a neon night, noir, mist, old
 * film — for the presets that change the light rather than the colours. A
 * plain colour look is the day scene with the look's own `filter` laid over
 * it, the same string the render uses, so the tile and the film agree.
 *
 * Drawn once per mood and size and kept as a data URL: a grid of twenty
 * tiles is twenty `<img>` of one picture, not twenty paintings.
 */
import { meerkat } from './magicstyles';

export type MeerkatMood = 'day' | 'golden' | 'neon' | 'noir' | 'mist' | 'film' | 'night' | 'snow' | 'studio';

interface Light {
  readonly sky: readonly [string, string, string];
  readonly sun: string | null;
  readonly sunAt: readonly [number, number];
  readonly dune: readonly [string, string];
  readonly far: string;
  readonly grass: string;
  /** A wash over the whole picture, last. */
  readonly wash?: string;
  readonly rim?: string;
}

const LIGHTS: Readonly<Record<MeerkatMood, Light>> = {
  day: { sky: ['#5aa8e6', '#9fd0f2', '#e9f4fb'], sun: 'rgba(255,250,225,0.9)', sunAt: [0.82, 0.16], dune: ['#d9783f', '#a8492a'], far: '#e3a06a', grass: '#8a8f3c' },
  golden: { sky: ['#f08a3c', '#f7b55b', '#ffe2a3'], sun: 'rgba(255,214,120,0.95)', sunAt: [0.18, 0.52], dune: ['#e0743a', '#8f3b1f'], far: '#f0a060', grass: '#9a7a2e', wash: 'rgba(255,170,60,0.18)', rim: 'rgba(255,200,110,0.85)' },
  neon: { sky: ['#12052e', '#3b0b5c', '#0b6f8a'], sun: 'rgba(255,60,200,0.7)', sunAt: [0.8, 0.3], dune: ['#3b1460', '#140726'], far: '#5a1d7a', grass: '#0f8a8a', wash: 'rgba(0,240,255,0.10)', rim: 'rgba(255,70,220,0.9)' },
  noir: { sky: ['#1c1c1c', '#4a4a4a', '#8a8a8a'], sun: 'rgba(255,255,255,0.6)', sunAt: [0.85, 0.2], dune: ['#5a5a5a', '#151515'], far: '#7a7a7a', grass: '#3a3a3a', rim: 'rgba(255,255,255,0.8)' },
  mist: { sky: ['#cdd7ee', '#e9dff0', '#fbf4f6'], sun: 'rgba(255,255,255,0.9)', sunAt: [0.7, 0.25], dune: ['#e7b9a6', '#c99a8f'], far: '#efd9d2', grass: '#b5b88f', wash: 'rgba(255,255,255,0.28)' },
  film: { sky: ['#6f9fb4', '#b9c9b8', '#e8dcc0'], sun: 'rgba(255,240,200,0.7)', sunAt: [0.8, 0.18], dune: ['#c47a4b', '#86452c'], far: '#d4a27a', grass: '#7f7a3c', wash: 'rgba(120,80,30,0.16)' },
  night: { sky: ['#030b1f', '#0c1f45', '#1d3a6b'], sun: 'rgba(235,240,255,0.95)', sunAt: [0.8, 0.18], dune: ['#3a2b45', '#160f1f'], far: '#2b2a4a', grass: '#25332a', rim: 'rgba(190,210,255,0.7)' },
  snow: { sky: ['#8fb4d9', '#c9dcef', '#f2f6fb'], sun: 'rgba(255,255,255,0.9)', sunAt: [0.78, 0.2], dune: ['#f4f7fb', '#c6d3e2'], far: '#e2eaf3', grass: '#8a9aa0' },
  studio: { sky: ['#2a2d34', '#3c4049', '#575c66'], sun: null, sunAt: [0.5, 0.2], dune: ['#3c4049', '#22252b'], far: '#3c4049', grass: '#3c4049', rim: 'rgba(255,255,255,0.55)' },
};

/** Paint the scene on a canvas of any size. */
export function drawMeerkatPhoto(ctx: CanvasRenderingContext2D, w: number, h: number, mood: MeerkatMood = 'day'): void {
  const light = LIGHTS[mood];
  ctx.save();
  /* Sky. */
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, light.sky[0]);
  sky.addColorStop(0.55, light.sky[1]);
  sky.addColorStop(1, light.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (mood === 'night' || mood === 'neon') {
    let seed = 7;
    for (let k = 0; k < 40; k += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const x = (seed % 1000) / 1000;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const y = ((seed % 1000) / 1000) * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(x * w, y * h, Math.max(1, w / 160), Math.max(1, w / 160));
    }
  }
  /* The sun, or the moon, as a glow. */
  if (light.sun) {
    const [sx, sy] = light.sunAt;
    const glow = ctx.createRadialGradient(sx * w, sy * h, 0, sx * w, sy * h, w * 0.32);
    glow.addColorStop(0, light.sun);
    glow.addColorStop(0.18, light.sun);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
  /* A far dune, then the near one the meerkat stands on. */
  ctx.fillStyle = light.far;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.68);
  ctx.bezierCurveTo(w * 0.3, h * 0.56, w * 0.6, h * 0.66, w, h * 0.6);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  const dune = ctx.createLinearGradient(0, h * 0.7, 0, h);
  dune.addColorStop(0, light.dune[0]);
  dune.addColorStop(1, light.dune[1]);
  ctx.fillStyle = dune;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.8);
  ctx.bezierCurveTo(w * 0.35, h * 0.7, w * 0.65, h * 0.78, w, h * 0.74);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  /* Tufts of grass. */
  ctx.strokeStyle = light.grass;
  ctx.lineWidth = Math.max(1, w / 140);
  for (const [gx, gy] of [[0.1, 0.84], [0.16, 0.86], [0.83, 0.8], [0.9, 0.83]] as const) {
    for (let k = -2; k <= 2; k += 1) {
      ctx.beginPath();
      ctx.moveTo(gx * w, gy * h);
      ctx.quadraticCurveTo((gx + k * 0.008) * w, (gy - 0.04) * h, (gx + k * 0.02) * w, (gy - 0.07) * h);
      ctx.stroke();
    }
  }
  /* The meerkat: a soft shadow on the sand, the animal, then its light. */
  const s = h * 1.02;
  const left = w / 2 - s / 2;
  const top = -h * 0.02;
  ctx.fillStyle = 'rgba(40,15,5,0.28)';
  ctx.beginPath();
  ctx.ellipse(w / 2 + s * 0.08, h * 0.95, s * 0.2, s * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h * 0.95);
  ctx.clip();
  ctx.translate(left, top);
  const parts = meerkat(s);
  for (const part of parts) {
    ctx.fillStyle = mood === 'noir' ? greyOf(part.ink) : mood === 'snow' || mood === 'studio' || mood === 'day' ? part.ink : tintFor(part.ink, mood);
    ctx.fill(part.path);
  }
  /* Light from one side over the fur, shade on the other. */
  const outline = new Path2D();
  for (const part of parts) if (part.shape) outline.addPath(part.path);
  ctx.save();
  ctx.clip(outline);
  const lit = ctx.createLinearGradient(s * 0.3, 0, s * 0.72, 0);
  lit.addColorStop(0, light.rim ?? 'rgba(255,245,220,0.35)');
  lit.addColorStop(0.35, 'rgba(255,255,255,0)');
  lit.addColorStop(1, 'rgba(30,10,0,0.32)');
  ctx.fillStyle = lit;
  ctx.fillRect(0, 0, s, s * 1.4);
  ctx.restore();
  ctx.restore();
  if (light.wash) {
    ctx.fillStyle = light.wash;
    ctx.fillRect(0, 0, w, h);
  }
  if (mood === 'mist') {
    const fog = ctx.createLinearGradient(0, h * 0.5, 0, h);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(1, 'rgba(255,255,255,0.45)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, w, h);
  }
  if (mood === 'film' || mood === 'noir') {
    let seed = 3;
    for (let k = 0; k < (w * h) / 90; k += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const x = (seed % 10007) / 10007;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const y = (seed % 10007) / 10007;
      ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(x * w, y * h, 1, 1);
    }
  }
  if (mood === 'noir' || mood === 'film' || mood === 'neon') {
    const v = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function greyOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const g = Math.round(((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11);
  const c = Math.max(0, Math.min(255, Math.round((g - 128) * 1.4 + 128)));
  return `rgb(${c},${c},${c})`;
}

function tintFor(hex: string, mood: MeerkatMood): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (mood === 'golden') { r += 18; g += 4; b -= 20; }
  if (mood === 'neon') { r = r * 0.55 + 40; g = g * 0.4; b = b * 0.6 + 70; }
  if (mood === 'night') { r *= 0.45; g *= 0.5; b = b * 0.6 + 30; }
  if (mood === 'mist') { r = r * 0.8 + 50; g = g * 0.8 + 50; b = b * 0.8 + 55; }
  if (mood === 'film') { r += 6; b -= 14; }
  const k = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${k(r)},${k(g)},${k(b)})`;
}

const made = new Map<string, string>();

/** The scene as a data URL, drawn once per mood and size. Empty where there is no canvas. */
export function meerkatPhotoUrl(mood: MeerkatMood = 'day', w = 192, h = 192): string {
  const key = `${mood}:${w}x${h}`;
  const had = made.get(key);
  if (had) return had;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawMeerkatPhoto(ctx, w, h, mood);
  const url = canvas.toDataURL('image/jpeg', 0.86);
  made.set(key, url);
  return url;
}

/**
 * The light and look each kind of film, genre and music-video idea is shown
 * in, so a row of them reads as different pictures rather than one picture
 * twelve times. Looks are `videofilters.ts` ids.
 */
export const PICTURED: Readonly<Record<string, { readonly mood: MeerkatMood; readonly look?: string }>> = {
  /* The video desk's kinds. */
  music: { mood: 'neon' }, marketing: { mood: 'studio', look: 'bright' }, podcast: { mood: 'studio', look: 'warm' },
  social: { mood: 'day', look: 'punch' }, product: { mood: 'studio' }, atmosphere: { mood: 'mist' },
  /* Its genres. */
  amapiano: { mood: 'golden' }, gqom: { mood: 'neon', look: 'punch' }, sokkie: { mood: 'day', look: 'warm' },
  gospel: { mood: 'golden', look: 'bright' }, hiphop: { mood: 'night' }, afrobeats: { mood: 'golden', look: 'punch' },
  rock: { mood: 'noir' }, house: { mood: 'neon' }, rnb: { mood: 'night', look: 'warm' }, country: { mood: 'film' },
  /* Its music-video ideas. */
  performance: { mood: 'neon', look: 'punch' }, story: { mood: 'film' }, road: { mood: 'golden' },
  room: { mood: 'studio', look: 'warm' }, abstract: { mood: 'mist', look: 'cool' },
};

/**
 * The photograph put through a pixel recipe — a darkroom preset — drawn once
 * per `key`. `through` takes the pixels and gives new ones back.
 */
export function meerkatThrough(
  key: string,
  through: (px: { data: Uint8ClampedArray; width: number; height: number }) => Uint8ClampedArray,
  mood: MeerkatMood = 'day',
  side = 128,
): string {
  const name = `through:${key}:${mood}:${side}`;
  const had = made.get(name);
  if (had) return had;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';
  drawMeerkatPhoto(ctx, side, side, mood);
  const image = ctx.getImageData(0, 0, side, side);
  const out = through({ data: image.data, width: side, height: side });
  ctx.putImageData(new ImageData(new Uint8ClampedArray(out), side, side), 0, 0);
  const url = canvas.toDataURL('image/jpeg', 0.86);
  made.set(name, url);
  return url;
}

/** The light each feeling and each family of sound is pictured in. */
export const SHELF_PICTURES: Readonly<Record<string, { readonly mood: MeerkatMood; readonly filter?: string }>> = {
  love: { mood: 'golden', filter: 'hue-rotate(-20deg) saturate(1.3)' }, loss: { mood: 'noir' }, party: { mood: 'neon' },
  home: { mood: 'day', filter: 'sepia(0.25)' }, road: { mood: 'golden' }, faith: { mood: 'mist' },
  work: { mood: 'studio' }, young: { mood: 'day', filter: 'saturate(1.6)' },
  'Amapiano & SA House': { mood: 'golden' }, 'Gqom & Kwaito': { mood: 'neon', filter: 'contrast(1.2)' },
  'Traditional & World': { mood: 'day', filter: 'sepia(0.3)' }, 'Electronic & EDM': { mood: 'neon' },
  'House & Garage': { mood: 'neon', filter: 'hue-rotate(40deg)' }, 'Drum & Bass': { mood: 'night', filter: 'contrast(1.3)' },
  'Pop & Synthpop': { mood: 'day', filter: 'saturate(1.7) hue-rotate(-15deg)' }, 'Rock & Metal': { mood: 'noir' },
  'Punk & Hardcore': { mood: 'noir', filter: 'contrast(1.6)' }, 'Hip-Hop & Trap': { mood: 'night' },
  'R&B & Soul': { mood: 'night', filter: 'sepia(0.3) saturate(1.3)' }, 'Funk & Disco': { mood: 'neon', filter: 'hue-rotate(160deg)' },
  'Reggae & Dub': { mood: 'day', filter: 'hue-rotate(30deg) saturate(1.4)' }, 'Jazz & Blues': { mood: 'night', filter: 'hue-rotate(-30deg)' },
  'Gospel & Choral': { mood: 'golden', filter: 'brightness(1.15)' }, 'Country & Folk': { mood: 'film' },
  'Cyberpunk & Darksynth': { mood: 'neon', filter: 'contrast(1.3)' }, 'Cinematic & Orchestral': { mood: 'film', filter: 'contrast(1.2)' },
  'Classical & Piano': { mood: 'snow' }, 'Lo-Fi & Ambient': { mood: 'mist' }, 'Afrobeats & Latin': { mood: 'golden', filter: 'saturate(1.5)' },
  'Children & Learning': { mood: 'day', filter: 'saturate(1.5) brightness(1.1)' },
};


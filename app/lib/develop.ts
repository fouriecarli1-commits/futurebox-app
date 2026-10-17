/**
 * The darkroom: developing a photograph the way a professional does.
 *
 * Carli, 17 October 2026, with screenshots of a professional photo
 * developer: *"daar moet tog 'n lightroom … wees vir mense wat professioneel
 * edit."* Light (exposure, contrast, highlights, shadows, whites, blacks), a
 * tone curve, colour (white balance, temperature, tint, vibrance,
 * saturation), a mixer for eight colours, colour grading on three wheels,
 * effects (clarity, haze, vignette, grain) and detail (sharpening and noise).
 *
 * All of it is arithmetic on pixels, here, so it runs on the phone, costs
 * nothing, and can be checked without a browser (`check:develop`). The room
 * hands this file a picture's pixels, two blurred copies of them (the
 * browser blurs in C, far faster than a loop here) and the settings, and gets
 * the developed pixels back — the same function for the preview and for the
 * full-size photograph saved at the end.
 */

export type Band = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta';

export const BANDS: readonly { readonly id: Band; readonly hue: number; readonly ink: string; readonly en: string; readonly af: string }[] = [
  { id: 'red', hue: 0, ink: '#ef4444', en: 'Red', af: 'Rooi' },
  { id: 'orange', hue: 30, ink: '#f97316', en: 'Orange', af: 'Oranje' },
  { id: 'yellow', hue: 58, ink: '#eab308', en: 'Yellow', af: 'Geel' },
  { id: 'green', hue: 120, ink: '#22c55e', en: 'Green', af: 'Groen' },
  { id: 'aqua', hue: 180, ink: '#06b6d4', en: 'Aqua', af: 'Akwa' },
  { id: 'blue', hue: 220, ink: '#3b82f6', en: 'Blue', af: 'Blou' },
  { id: 'purple', hue: 270, ink: '#a855f7', en: 'Purple', af: 'Pers' },
  { id: 'magenta', hue: 320, ink: '#ec4899', en: 'Magenta', af: 'Magenta' },
];

export interface Mix { readonly h: number; readonly s: number; readonly l: number }
export interface Wheel { readonly hue: number; readonly sat: number; readonly lum: number }

export type Profile = 'colour' | 'vivid' | 'portrait' | 'landscape' | 'mono';

export const PROFILES: readonly { readonly id: Profile; readonly en: string; readonly af: string }[] = [
  { id: 'colour', en: 'Colour', af: 'Kleur' },
  { id: 'vivid', en: 'Vivid', af: 'Helder' },
  { id: 'portrait', en: 'Portrait', af: 'Portret' },
  { id: 'landscape', en: 'Landscape', af: 'Landskap' },
  { id: 'mono', en: 'Black and white', af: 'Swart en wit' },
];

export interface Develop {
  readonly profile: Profile;
  /** Stops of light, −5 to 5. */
  readonly exposure: number;
  /* The rest −100 to 100 unless said. */
  readonly contrast: number;
  readonly highlights: number;
  readonly shadows: number;
  readonly whites: number;
  readonly blacks: number;
  /** The tone curve's points, nought to one, sorted, ends included. */
  readonly curve: readonly (readonly [number, number])[];
  readonly temp: number;
  readonly tint: number;
  readonly vibrance: number;
  readonly saturation: number;
  readonly mixer: Readonly<Record<Band, Mix>>;
  readonly grade: { readonly shadows: Wheel; readonly midtones: Wheel; readonly highlights: Wheel; readonly blending: number; readonly balance: number };
  readonly clarity: number;
  readonly dehaze: number;
  readonly vignette: number;
  /** Nought to 100. */
  readonly grain: number;
  /** Nought to 150. */
  readonly sharpen: number;
  /** Nought to 100: how much of the edge sharpening keeps to. */
  readonly masking: number;
  /** Nought to 100. */
  readonly noise: number;
  /** Nought to 100. */
  readonly colourNoise: number;
}

const NO_MIX: Mix = { h: 0, s: 0, l: 0 };
const NO_WHEEL: Wheel = { hue: 0, sat: 0, lum: 0 };

export const STRAIGHT: readonly (readonly [number, number])[] = [[0, 0], [1, 1]];

export const AS_SHOT: Develop = {
  profile: 'colour',
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  curve: STRAIGHT,
  temp: 0, tint: 0, vibrance: 0, saturation: 0,
  mixer: { red: NO_MIX, orange: NO_MIX, yellow: NO_MIX, green: NO_MIX, aqua: NO_MIX, blue: NO_MIX, purple: NO_MIX, magenta: NO_MIX },
  grade: { shadows: NO_WHEEL, midtones: NO_WHEEL, highlights: NO_WHEEL, blending: 50, balance: 0 },
  clarity: 0, dehaze: 0, vignette: 0, grain: 0,
  sharpen: 0, masking: 0, noise: 0, colourNoise: 0,
};

/** Whether anything has been changed from the photograph as shot. */
export const developed = (d: Develop): boolean => JSON.stringify(d) !== JSON.stringify(AS_SHOT);

const held = (n: number, low: number, high: number): number =>
  (Number.isFinite(n) ? Math.min(high, Math.max(low, n)) : 0);

const smooth = (a: number, b: number, x: number): number => {
  const t = held((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ── The tone curve ───────────────────────────────────────────────────── */

/**
 * A curve through the points as a 256-step table, with no overshoot: a
 * monotone cubic, so a curve that rises between two points never dips or
 * bulges past them — which a plain spline does, and which shows as a band
 * of wrong tone nobody put there.
 */
export function curveTable(points: readonly (readonly [number, number])[]): Uint8ClampedArray {
  const pts = [...points]
    .map(([x, y]) => [held(x, 0, 1), held(y, 0, 1)] as const)
    .sort((a, b) => a[0] - b[0]);
  if (!pts.length || pts[0][0] > 0) pts.unshift([0, pts[0]?.[1] ?? 0]);
  if (pts[pts.length - 1][0] < 1) pts.push([1, pts[pts.length - 1][1]]);
  const n = pts.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(Math.max(1e-6, pts[i + 1][0] - pts[i][0]));
    slope.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const m: number[] = [slope[0] ?? 0];
  for (let i = 1; i < n - 1; i += 1) m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  m.push(slope[n - 2] ?? 0);
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  const out = new Uint8ClampedArray(256);
  let seg = 0;
  for (let k = 0; k < 256; k += 1) {
    const x = k / 255;
    while (seg < n - 2 && x > pts[seg + 1][0]) seg += 1;
    const h = dx[seg];
    const t = held((x - pts[seg][0]) / h, 0, 1);
    const t2 = t * t;
    const t3 = t2 * t;
    const y = (2 * t3 - 3 * t2 + 1) * pts[seg][1] + (t3 - 2 * t2 + t) * h * m[seg]
      + (-2 * t3 + 3 * t2) * pts[seg + 1][1] + (t3 - t2) * h * m[seg + 1];
    out[k] = Math.round(held(y, 0, 1) * 255);
  }
  return out;
}

/* ── Colour arithmetic ────────────────────────────────────────────────── */

/** Hue in degrees, saturation and lightness nought to one. */
export function toHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function fromHsl(h: number, s: number, l: number): [number, number, number] {
  if (s <= 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const part = (t0: number): number => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hh = (((h % 360) + 360) % 360) / 360;
  return [part(hh + 1 / 3), part(hh), part(hh - 1 / 3)];
}

/** How much a hue belongs to a band of the mixer, nought to one, soft at the edges. */
export function bandWeight(hue: number, centre: number): number {
  let d = Math.abs(hue - centre) % 360;
  if (d > 180) d = 360 - d;
  return Math.max(0, 1 - d / 40);
}

/** A fully saturated colour for a wheel's hue, nought to one. */
const hueColour = (hue: number): [number, number, number] => fromHsl(hue, 1, 0.5);

/* ── The whole development ────────────────────────────────────────────── */

export interface Pixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/**
 * The picture developed. `fine` is the picture blurred by the sharpening
 * radius, `broad` blurred wide (a fortieth of its size) for clarity and
 * noise; either may be null, and the effects that need it are then left out.
 */
export function developPixels(src: Pixels, fine: Pixels | null, broad: Pixels | null, d: Develop): Uint8ClampedArray<ArrayBuffer> {
  const { data, width, height } = src;
  const out = new Uint8ClampedArray(data.length);
  const lut = curveTable(d.curve);
  const curved = JSON.stringify(d.curve) !== JSON.stringify(STRAIGHT);
  const profile = d.profile;
  const satBase = profile === 'vivid' ? 0.18 : profile === 'landscape' ? 0.1 : profile === 'portrait' ? -0.05 : 0;
  const conBase = profile === 'vivid' ? 0.1 : profile === 'landscape' ? 0.06 : profile === 'portrait' ? -0.04 : 0;
  const warmBase = profile === 'portrait' ? 0.04 : 0;
  const t = held(d.temp / 100, -1, 1) * 0.28 + warmBase;
  const tn = held(d.tint / 100, -1, 1) * 0.18;
  const gain = 2 ** held(d.exposure, -5, 5);
  const contrast = 1 + held(d.contrast / 100, -1, 1) * 0.75 + conBase;
  const hi = held(d.highlights / 100, -1, 1);
  const sh = held(d.shadows / 100, -1, 1);
  const wh = held(d.whites / 100, -1, 1);
  const bl = held(d.blacks / 100, -1, 1);
  const vib = held(d.vibrance / 100, -1, 1);
  const sat = held(d.saturation / 100, -1, 1) + satBase;
  const clarity = held(d.clarity / 100, -1, 1);
  const haze = held(d.dehaze / 100, -1, 1);
  const vignette = held(d.vignette / 100, -1, 1);
  const grain = held(d.grain / 100, 0, 1);
  const sharpen = held(d.sharpen / 100, 0, 1.5);
  const masking = held(d.masking / 100, 0, 1) * 0.15;
  const noise = held(d.noise / 100, 0, 1);
  const cnoise = held(d.colourNoise / 100, 0, 1);
  const mixing = BANDS.some((one) => d.mixer[one.id].h || d.mixer[one.id].s || d.mixer[one.id].l);
  const g = d.grade;
  const wheels = [g.shadows, g.midtones, g.highlights].map((one) => ({
    tint: hueColour(one.hue),
    sat: held(one.sat / 100, 0, 1) * 0.35,
    lum: held(one.lum / 100, -1, 1) * 0.2,
  }));
  const grading = wheels.some((one) => one.sat || one.lum);
  const blend = 0.15 + held(g.blending / 100, 0, 1) * 0.35;
  const balance = held(g.balance / 100, -1, 1) * 0.2;
  const cx = width / 2;
  const cy = height / 2;
  const far = Math.hypot(cx, cy) || 1;
  let seed = 1234567;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let gg = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    /* Detail first, on the pixels as they came: the blurred copies are of
       those, so this is where they line up. */
    if (fine && (sharpen > 0 || noise > 0 || cnoise > 0)) {
      const fr = fine.data[i] / 255;
      const fg = fine.data[i + 1] / 255;
      const fb = fine.data[i + 2] / 255;
      const edge = Math.abs(r - fr) + Math.abs(gg - fg) + Math.abs(b - fb);
      if (noise > 0 || cnoise > 0) {
        /* Smooth where it is flat, keep where there is an edge. */
        const flatness = 1 - smooth(0.02, 0.12, edge);
        const k = noise * flatness * 0.85;
        r += (fr - r) * k;
        gg += (fg - gg) * k;
        b += (fb - b) * k;
        if (cnoise > 0) {
          const l0 = (r + gg + b) / 3;
          const lf = (fr + fg + fb) / 3;
          const c = cnoise * 0.9;
          r += ((fr - lf) - (r - l0)) * c;
          gg += ((fg - lf) - (gg - l0)) * c;
          b += ((fb - lf) - (b - l0)) * c;
        }
      }
      if (sharpen > 0 && edge > masking) {
        r += (r - fr) * sharpen * 1.6;
        gg += (gg - fg) * sharpen * 1.6;
        b += (b - fb) * sharpen * 1.6;
      }
    }
    if (broad && clarity !== 0) {
      const br = broad.data[i] / 255;
      const bg = broad.data[i + 1] / 255;
      const bb = broad.data[i + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const mid = 1 - Math.abs(lum - 0.5) * 2;
      const k = clarity * 0.7 * (0.35 + mid * 0.65);
      r += (r - br) * k;
      gg += (gg - bg) * k;
      b += (b - bb) * k;
    }

    /* White balance, then exposure. */
    r *= 1 + t;
    b *= 1 - t;
    gg *= 1 - tn;
    r *= gain;
    gg *= gain;
    b *= gain;

    /* Haze: a veil of grey lifted off (or laid on). */
    if (haze !== 0) {
      const veil = haze * 0.12;
      r = (r - veil) / (1 - veil);
      gg = (gg - veil) / (1 - veil);
      b = (b - veil) / (1 - veil);
    }

    /* Light, by how bright each pixel already is. */
    let lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    if (hi || sh || wh || bl) {
      let next = lum;
      next += hi * 0.32 * smooth(0.45, 1, lum) * (hi < 0 ? lum : 1 - lum + 0.3);
      next += sh * 0.32 * (1 - smooth(0, 0.55, lum)) * (sh > 0 ? 1 - lum : lum + 0.3);
      next += wh * 0.18 * smooth(0.65, 1, lum);
      next += bl * 0.14 * (1 - smooth(0, 0.3, lum));
      const ratio = lum > 0.002 ? next / lum : 1;
      r = lum > 0.002 ? r * ratio : next;
      gg = lum > 0.002 ? gg * ratio : next;
      b = lum > 0.002 ? b * ratio : next;
      lum = next;
    }
    if (contrast !== 1) {
      r = 0.5 + (r - 0.5) * contrast;
      gg = 0.5 + (gg - 0.5) * contrast;
      b = 0.5 + (b - 0.5) * contrast;
    }
    if (curved) {
      r = lut[Math.round(held(r, 0, 1) * 255)] / 255;
      gg = lut[Math.round(held(gg, 0, 1) * 255)] / 255;
      b = lut[Math.round(held(b, 0, 1) * 255)] / 255;
    }

    /* The colour mixer, band by band. */
    if (mixing) {
      let [h, s, l] = toHsl(held(r, 0, 1), held(gg, 0, 1), held(b, 0, 1));
      let dh = 0;
      let ds = 0;
      let dl = 0;
      for (const band of BANDS) {
        const w = bandWeight(h, band.hue);
        if (!w) continue;
        const one = d.mixer[band.id];
        dh += w * one.h * 0.3;
        ds += w * one.s / 100;
        dl += w * one.l / 100;
      }
      h += dh;
      s = held(s * (1 + ds), 0, 1);
      l = held(l + dl * 0.22 * s, 0, 1);
      [r, gg, b] = fromHsl(h, s, l);
    }

    /* Vibrance (the dull colours most) and saturation (all of them). */
    if (vib || sat) {
      const grey = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const chroma = Math.max(r, gg, b) - Math.min(r, gg, b);
      const k = 1 + sat + vib * (1 - held(chroma, 0, 1)) * 0.9;
      r = grey + (r - grey) * k;
      gg = grey + (gg - grey) * k;
      b = grey + (b - grey) * k;
    }

    /* Colour grading: a colour in the shadows, the middle and the light. */
    if (grading) {
      const y = held(0.2126 * r + 0.7152 * gg + 0.0722 * b, 0, 1);
      const shadowW = 1 - smooth(0.5 - blend + balance, 0.5 + balance, y);
      const lightW = smooth(0.5 + balance, 0.5 + blend + balance, y);
      const midW = Math.max(0, 1 - shadowW - lightW);
      const weights = [shadowW, midW, lightW];
      for (let k = 0; k < 3; k += 1) {
        const w = weights[k];
        const one = wheels[k];
        if (!w) continue;
        const [tr, tg, tb] = one.tint;
        const tm = (tr + tg + tb) / 3;
        r += w * (one.sat * (tr - tm) + one.lum);
        gg += w * (one.sat * (tg - tm) + one.lum);
        b += w * (one.sat * (tb - tm) + one.lum);
      }
    }

    if (profile === 'mono') {
      const y = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      r = y;
      gg = y;
      b = y;
    }

    if (vignette !== 0) {
      const px = (i / 4) % width;
      const py = Math.floor(i / 4 / width);
      const dd = (Math.hypot(px - cx, py - cy) / far) ** 2;
      const k = 1 + vignette * 0.85 * dd;
      r *= k;
      gg *= k;
      b *= k;
    }
    if (grain > 0) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const n = ((seed / 0x7fffffff) - 0.5) * grain * 0.14;
      r += n;
      gg += n;
      b += n;
    }

    out[i] = held(r, 0, 1) * 255;
    out[i + 1] = held(gg, 0, 1) * 255;
    out[i + 2] = held(b, 0, 1) * 255;
    out[i + 3] = data[i + 3];
  }
  return out;
}

/* ── Reading a picture ────────────────────────────────────────────────── */

/** Counts of red, green, blue and brightness, 256 each, read every `step`th pixel. */
export function histogram(data: Uint8ClampedArray, step = 4): { readonly r: Uint32Array; readonly g: Uint32Array; readonly b: Uint32Array; readonly l: Uint32Array } {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const l = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] < 8) continue;
    r[data[i]] += 1;
    g[data[i + 1]] += 1;
    b[data[i + 2]] += 1;
    l[Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722)] += 1;
  }
  return { r, g, b, l };
}

/** Where a share of the pixels lies, from a brightness count. */
const percentile = (counts: Uint32Array, share: number): number => {
  let total = 0;
  for (const n of counts) total += n;
  let seen = 0;
  for (let k = 0; k < 256; k += 1) {
    seen += counts[k];
    if (seen >= total * share) return k / 255;
  }
  return 1;
};

/**
 * Auto: the light set from what the photograph already is — its darkest
 * and brightest few per cent and where most of it sits — and a little
 * vibrance. A starting point that every slider can then move.
 */
export function autoTone(data: Uint8ClampedArray, from: Develop = AS_SHOT): Develop {
  const { l } = histogram(data);
  const low = percentile(l, 0.01);
  const high = percentile(l, 0.99);
  const middle = percentile(l, 0.5);
  const exposure = held(Math.log2(0.46 / Math.max(0.04, middle)) * 0.7, -2, 2);
  return {
    ...from,
    exposure: Math.round(exposure * 100) / 100,
    blacks: Math.round(held(-low * 220, -60, 0)),
    whites: Math.round(held((1 - high) * 180, 0, 60)),
    highlights: Math.round(held(high > 0.94 ? -35 : -10, -100, 100)),
    shadows: Math.round(held(low < 0.06 ? 30 : 12, -100, 100)),
    contrast: 8,
    vibrance: 15,
  };
}

/** HDR: the light squeezed in from both ends, with local contrast to keep it from looking flat. */
export const hdrTone = (from: Develop): Develop => ({
  ...from, highlights: -75, shadows: 65, whites: 15, blacks: -15, clarity: 30, vibrance: 18, dehaze: 8,
});

/**
 * The temperature and tint that make a picked spot neutral grey — the white
 * balance dropper. `r`, `g`, `b` are the spot's average, nought to 255.
 */
export function neutralAt(r: number, g: number, b: number): { readonly temp: number; readonly tint: number } {
  const rr = Math.max(1, r);
  const bb = Math.max(1, b);
  const t = (bb - rr) / (0.28 * (rr + bb));
  const rAfter = rr * (1 + t * 0.28);
  const bAfter = bb * (1 - t * 0.28);
  const tn = (1 - ((rAfter + bAfter) / 2) / Math.max(1, g)) / 0.18;
  return { temp: Math.round(held(t * 100, -100, 100)), tint: Math.round(held(tn * 100, -100, 100)) };
}

/* ── Starting points ──────────────────────────────────────────────────── */

export interface DevelopPreset {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  readonly make: Partial<Develop>;
}

const wheel = (hue: number, sat: number, lum = 0): Wheel => ({ hue, sat, lum });

export const DEVELOP_PRESETS: readonly DevelopPreset[] = [
  { id: 'clean', en: 'Clean', af: 'Skoon', make: { contrast: 10, highlights: -20, shadows: 15, vibrance: 12, clarity: 8 } },
  { id: 'golden', en: 'Golden hour', af: 'Goue uur', make: { temp: 30, tint: 6, highlights: -25, shadows: 20, vibrance: 18, grade: { ...AS_SHOT.grade, highlights: wheel(40, 35), shadows: wheel(25, 15) } } },
  { id: 'moody', en: 'Moody', af: 'Somber', make: { exposure: -0.3, contrast: 20, highlights: -40, blacks: -20, saturation: -20, clarity: 15, vignette: -30, grade: { ...AS_SHOT.grade, shadows: wheel(210, 30) } } },
  { id: 'matte', en: 'Matte film', af: 'Mat film', make: { contrast: -10, curve: [[0, 0.1], [0.5, 0.52], [1, 0.94]], saturation: -12, grain: 25 } },
  { id: 'tealorange', en: 'Teal and orange', af: 'Blougroen en oranje', make: { contrast: 12, vibrance: 15, grade: { ...AS_SHOT.grade, shadows: wheel(190, 45), highlights: wheel(32, 40) } } },
  { id: 'pastel', en: 'Faded pastel', af: 'Verbleikte pastel', make: { exposure: 0.25, contrast: -25, highlights: -15, curve: [[0, 0.14], [1, 0.96]], saturation: -18, grade: { ...AS_SHOT.grade, highlights: wheel(330, 18), shadows: wheel(260, 15) } } },
  { id: 'highkey', en: 'High key', af: 'Hoë sleutel', make: { exposure: 0.6, contrast: -10, shadows: 40, whites: 25, saturation: -8 } },
  { id: 'crispbw', en: 'Crisp black and white', af: 'Skerp swart en wit', make: { profile: 'mono', contrast: 30, clarity: 20, blacks: -15, whites: 15 } },
  { id: 'soft', en: 'Soft portrait', af: 'Sagte portret', make: { profile: 'portrait', clarity: -20, highlights: -15, shadows: 20, vibrance: 8, noise: 25 } },
  { id: 'night', en: 'Night city', af: 'Nagstad', make: { temp: -20, contrast: 18, highlights: -30, dehaze: 12, vibrance: 25, grade: { ...AS_SHOT.grade, shadows: wheel(230, 35), highlights: wheel(300, 20) } } },
];

/** A preset laid over the photograph as shot. */
export const fromPreset = (preset: DevelopPreset): Develop => ({ ...AS_SHOT, ...preset.make });

/** Settings read back from storage, refusing anything that is not settings. */
export function cleanDevelop(raw: unknown): Develop | null {
  if (!raw || typeof raw !== 'object') return null;
  const one = raw as Partial<Develop>;
  if (typeof one.exposure !== 'number' || !Array.isArray(one.curve) || !one.mixer || !one.grade) return null;
  return { ...AS_SHOT, ...one } as Develop;
}

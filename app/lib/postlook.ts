/**
 * What a picture looks like, before anything is written on it.
 *
 * ── Where this sits in what she asked for ────────────────────────────────
 *
 * Carli, 7 October 2026: *"ek dink die moderne editing tools, soos magic grab
 * om 'n item uit te haal en weer 'n ander item in te sit, BG remover, magic
 * eraser, upscaler, auto focus, blur, grab text, image to video, om motion by
 * 'n prent te sit."*
 *
 * That list splits in two, and the split is money. Half of it runs on the
 * phone for nothing — the half in this file — and half needs an engine and a
 * price per use, which is hers to set and not mine to guess. Starting with
 * the free half is not the easy half first: it is the half that can ship
 * without a decision from her, and it is the half somebody touches on every
 * single picture.
 *
 * ── Why a canvas filter and not pixels by hand ───────────────────────────
 *
 * `ctx.filter` is the browser's own compositor doing the work on the GPU. A
 * hand-written loop over an ImageData of two million pixels in JavaScript is
 * tens of milliseconds per frame on a phone, and this redraws on every drag
 * of a slider. The filter string costs nothing and is exact.
 *
 * It also only does what it says. There is no "sharpen" here, because
 * `ctx.filter` has no sharpen and a fake one — raising contrast and calling
 * it focus — would be a control that lies about what it did. Her "auto
 * focus" is answered by `AUTO` below, which is honest about being a lift
 * rather than a repair: nothing recovers a photograph that was out of
 * focus when it was taken.
 *
 * ── Warmth is not in the filter string, and that is why it is separate ───
 *
 * `sepia` drains colour on its way to warm, and `hue-rotate` turns a blue
 * sky green before it warms a face. Warmth is a wash of colour laid over the
 * picture, so it is painted after the filtered draw rather than folded into
 * it — see `WARM` and the note on `warmth` in the screen.
 */

export interface Look {
  /** 0.5..1.5, 1 is the picture as it came. */
  readonly bright: number;
  /** 0.5..1.5. */
  readonly contrast: number;
  /** 0..2, 0 is grey. */
  readonly colour: number;
  /** -1..1. Below nought is cooler, above is warmer. */
  readonly warmth: number;
  /** 0..20, in frame units at the picture's drawn size. */
  readonly blur: number;
  /* ── What a filter adds — none of these has a slider of its own ────
     Carli, 16 October 2026: *"Ek soek ook ... sulke oulike filters."* A
     filter is a look with a mood, and a mood needs a few things the five
     sliders do not reach. Absent is none, so every look saved before these
     existed reads exactly as it did. */
  /** 0..1, towards old brown paper. */
  readonly sepia?: number;
  /** -180..180 degrees round the colour wheel. */
  readonly hue?: number;
  /** 0..1: the blacks lifted to grey, as an old print fades. */
  readonly fade?: number;
  /** A colour laid softly over everything: red, green, blue 0..255 and how strong, 0..1. */
  readonly tint?: readonly [number, number, number, number];
  /** 0..1: the corners darkened, as an old lens does. */
  readonly vignette?: number;
}

export const PLAIN: Look = { bright: 1, contrast: 1, colour: 1, warmth: 0, blur: 0 };

/**
 * One press, for a picture off a phone.
 *
 * Her *"auto focus"*. It cannot be focus — nothing recovers a photograph that
 * was soft when it was taken, and a control that pretends to is worse than no
 * control. What a phone photograph almost always IS, though, is slightly flat:
 * the camera protects the highlights, so the result is safe and dull.
 *
 * Small on purpose. A big automatic lift is the thing that makes every
 * picture in a feed look like the same filter, which is the opposite of what
 * somebody wants from their own photograph.
 */
export const AUTO: Look = { bright: 1.04, contrast: 1.12, colour: 1.1, warmth: 0.12, blur: 0 };

export const RANGES = {
  bright: { min: 0.5, max: 1.5, step: 0.01 },
  contrast: { min: 0.5, max: 1.5, step: 0.01 },
  colour: { min: 0, max: 2, step: 0.01 },
  warmth: { min: -1, max: 1, step: 0.01 },
  blur: { min: 0, max: 20, step: 0.5 },
} as const;

const held = (n: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, Number.isFinite(n) ? n : low));

/** Whether anything has been changed from the picture as it came. */
export const touched = (look: Look): boolean =>
  look.bright !== PLAIN.bright || look.contrast !== PLAIN.contrast
  || look.colour !== PLAIN.colour || look.warmth !== PLAIN.warmth || look.blur !== PLAIN.blur
  || Boolean(look.sepia) || Boolean(look.hue) || Boolean(look.fade)
  || Boolean(look.tint && look.tint[3] > 0) || Boolean(look.vignette);

/**
 * The filter string for the picture.
 *
 * `'none'` rather than an identity string when nothing is changed: a canvas
 * with a filter set takes a different path through the compositor even when
 * the filter does nothing, and on a phone that is a real cost paid by every
 * picture nobody has adjusted — which is most of them.
 */
export function filterFor(look: Look, scale = 1): string {
  if (!touched(look)) return 'none';
  const parts = [
    `brightness(${held(look.bright, RANGES.bright.min, RANGES.bright.max).toFixed(3)})`,
    `contrast(${held(look.contrast, RANGES.contrast.min, RANGES.contrast.max).toFixed(3)})`,
    `saturate(${held(look.colour, RANGES.colour.min, RANGES.colour.max).toFixed(3)})`,
  ];
  const sepia = held(look.sepia ?? 0, 0, 1);
  if (sepia > 0.001) parts.push(`sepia(${sepia.toFixed(3)})`);
  const hue = held(look.hue ?? 0, -180, 180);
  if (Math.abs(hue) > 0.5) parts.push(`hue-rotate(${hue.toFixed(1)}deg)`);
  const blur = held(look.blur, RANGES.blur.min, RANGES.blur.max);
  /* Scaled with the canvas. The preview is drawn at a fraction of the frame,
     and a blur in device pixels would be four times as strong on screen as in
     the file — so the picture she approves is not the picture she gets. */
  if (blur > 0) parts.push(`blur(${(blur * scale).toFixed(2)}px)`);
  return parts.join(' ');
}

/** The wash of colour that warmth is, or null when there is none. */
export function warmWash(look: Look): { readonly ink: string; readonly how: GlobalCompositeOperation } | null {
  const warmth = held(look.warmth, RANGES.warmth.min, RANGES.warmth.max);
  if (Math.abs(warmth) < 0.005) return null;
  /* Soft-light rather than a flat overlay: a flat orange at any strength
     worth seeing also greys the whites, and the whites are what make a
     photograph read as a photograph. */
  return {
    ink: warmth > 0
      ? `rgba(255,170,60,${(warmth * 0.45).toFixed(3)})`
      : `rgba(60,150,255,${(-warmth * 0.45).toFixed(3)})`,
    how: 'soft-light',
  };
}

/** One coat laid over the picture after the filtered draw. */
export interface Wash {
  readonly ink: string;
  readonly how: GlobalCompositeOperation;
  /** Darkest at the corners and clear in the middle, rather than flat. */
  readonly round?: boolean;
}

/**
 * Every coat a look lays over the picture, in the order they go on: warmth,
 * then a filter's tint, then its fade, then its darkened corners.
 */
export function washesOf(look: Look): Wash[] {
  const out: Wash[] = [];
  const warm = warmWash(look);
  if (warm) out.push(warm);
  if (look.tint) {
    const [r, g, b, a] = look.tint.map((n, at) => held(n, 0, at === 3 ? 1 : 255));
    if (a > 0.005) out.push({ ink: `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(3)})`, how: 'soft-light' });
  }
  const fade = held(look.fade ?? 0, 0, 1);
  /* Screen with a grey lifts the blacks most and leaves the whites alone,
     which is what a faded print is: no true black left in it. */
  if (fade > 0.005) out.push({ ink: `rgba(110,104,98,${(fade * 0.55).toFixed(3)})`, how: 'screen' });
  const vignette = held(look.vignette ?? 0, 0, 1);
  if (vignette > 0.005) out.push({ ink: `rgba(0,0,0,${(vignette * 0.75).toFixed(3)})`, how: 'multiply', round: true });
  return out;
}

/** Lay a look's coats over a rectangle of a canvas already holding the picture. */
export function paintWashes(ctx: CanvasRenderingContext2D, look: Look, x: number, y: number, w: number, h: number): void {
  for (const wash of washesOf(look)) {
    ctx.save();
    ctx.globalCompositeOperation = wash.how;
    if (wash.round) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const far = Math.hypot(w, h) / 2;
      const ring = ctx.createRadialGradient(cx, cy, far * 0.35, cx, cy, far);
      ring.addColorStop(0, 'rgba(0,0,0,0)');
      ring.addColorStop(1, wash.ink);
      ctx.fillStyle = ring;
    } else {
      ctx.fillStyle = wash.ink;
    }
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

/** Part of the way from the picture as it came to a look: 0 is none of it, 1 all of it. */
export function towards(look: Look, share: number): Look {
  const s = held(share, 0, 1);
  const mix = (from: number, to: number): number => from + (to - from) * s;
  return {
    bright: mix(PLAIN.bright, look.bright),
    contrast: mix(PLAIN.contrast, look.contrast),
    colour: mix(PLAIN.colour, look.colour),
    warmth: mix(PLAIN.warmth, look.warmth),
    blur: mix(PLAIN.blur, look.blur),
    ...(look.sepia ? { sepia: look.sepia * s } : {}),
    ...(look.hue ? { hue: look.hue * s } : {}),
    ...(look.fade ? { fade: look.fade * s } : {}),
    ...(look.tint ? { tint: [look.tint[0], look.tint[1], look.tint[2], look.tint[3] * s] as const } : {}),
    ...(look.vignette ? { vignette: look.vignette * s } : {}),
  };
}

/* ── Smart lighting ───────────────────────────────────────────────────────
   Carli, 16 October 2026, a "fix your dark photos with one tap" tool open on
   her phone. Not a model: a dark photograph is a measurement. How bright it
   is on average, and how far its darkest and brightest parts are from black
   and white, say how much to lift and how much to stretch — so a photo that
   is already bright is hardly touched, and a dim one is opened up. */

/** How light a picture is: its mean, and the lightness its darkest and brightest twentieth reach (0..1). */
export interface Lightness {
  readonly mean: number;
  readonly low: number;
  readonly high: number;
}

/** Measure a picture's lightness from its pixels (RGBA, as `getImageData` gives them). */
export function lightnessOf(pixels: Uint8ClampedArray): Lightness {
  const counts = new Array<number>(256).fill(0);
  let sum = 0;
  let n = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 16) continue;
    const y = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
    counts[y] += 1;
    sum += y;
    n += 1;
  }
  if (!n) return { mean: 0.5, low: 0, high: 1 };
  const at = (share: number): number => {
    let seen = 0;
    for (let y = 0; y < 256; y += 1) {
      seen += counts[y];
      if (seen >= n * share) return y / 255;
    }
    return 1;
  };
  return { mean: sum / n / 255, low: at(0.05), high: at(0.95) };
}

/** The look that lights a picture measured as `light`. */
export function smartLight(light: Lightness): Look {
  const mean = held(light.mean, 0.02, 0.98);
  /* Towards a middle grey of about 0.48, never darker, and never more than half again. */
  const bright = held(0.48 / mean, 1, 1.5);
  /* Stretch what is there to reach most of the way from black to white. */
  const spread = Math.max(0.05, held(light.high, 0, 1) - held(light.low, 0, 1));
  const contrast = held(0.85 / spread, 1, 1.3);
  /* A lifted dark photo goes grey; a little colour back keeps it a photograph. */
  const colour = held(1 + (bright - 1) * 0.3, 1, 1.15);
  return { ...PLAIN, bright, contrast, colour };
}

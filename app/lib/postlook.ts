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
  || look.colour !== PLAIN.colour || look.warmth !== PLAIN.warmth || look.blur !== PLAIN.blur;

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

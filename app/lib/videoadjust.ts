/**
 * The dials under the looks: brightness, contrast, saturation, warmth, sharpness.
 *
 * ── Why these five and not the forty she sent ────────────────────────────
 *
 * Carli, 4 October 2026, with a phone editor open across seven screenshots:
 * *"kyk asb weer na al die foto's wat ek gestuur het. Om seker te maak al die
 * video editing tools is daar."*
 *
 * Her Adjust sheet carries about twenty dials across two tabs — Brightness,
 * Contrast, Saturation, Temp, Hue, Fade, Vignette, Grain, Highlights, Shadows,
 * Whites, Blacks, Brilliance, Sharpen, Clarity, HSL, Graphs, Colour wheel — and
 * a Video quality tab with Stabilize, Optical flow, Super resolution and Remove
 * flickers on it.
 *
 * Five of those are a `filter` string the browser applies for free, in real
 * time, on both the preview and the render, because `stitch.ts` already sets
 * `context.filter` from exactly such a string. They cost nothing and they work
 * today.
 *
 * The rest are not one honest group:
 *
 * - **Vignette and grain** are a second pass over the pixels. Doable on the
 *   canvas, not a `filter`, and not free on a phone at thirty frames a second.
 * - **Highlights, shadows, whites, blacks, curves, HSL** are a tone map. CSS
 *   has no such thing; it needs a lookup table per frame, which is real work.
 * - **Stabilize, optical flow, super resolution, remove flickers** need an
 *   engine and somebody's money. They belong beside the three doors in this room
 *   that already say so rather than pretending.
 *
 * A dial that moves and changes nothing is worse than a dial that is absent, so
 * what is here is what works. The rest is written down above rather than left
 * for somebody to discover.
 *
 * ── Why they are a `filter` string and not baked into the look ───────────
 *
 * A look is a CHOICE — one of thirteen, picked. These are a CORRECTION — the
 * shot was dark, the shot was flat. They compose: a black-and-white look on a
 * shot that was underexposed still wants lifting, and a scheme that made the
 * lift part of the look would need thirteen more looks to say it.
 *
 * So `filterCss(look)` and `adjustCss(dials)` are concatenated, in that order:
 * the grade first, the correction after it, which is the order a colourist
 * works in and the order that makes the dials mean the same thing under every
 * look.
 */

/** What each dial is called, what it does, and where it starts. */
export interface Dial {
  readonly id: 'bright' | 'contrast' | 'colour' | 'warm' | 'sharp';
  /** The i18n key and the English, as `t` takes them. */
  readonly label: readonly [string, string];
  /** Where "do nothing" is. */
  readonly rest: number;
  readonly least: number;
  readonly most: number;
  readonly step: number;
}

export const DIALS: readonly Dial[] = [
  { id: 'bright', label: ['adj.bright', 'Brightness'], rest: 1, least: 0.4, most: 1.8, step: 0.02 },
  { id: 'contrast', label: ['adj.contrast', 'Contrast'], rest: 1, least: 0.5, most: 1.8, step: 0.02 },
  { id: 'colour', label: ['adj.colour', 'Colour'], rest: 1, least: 0, most: 2, step: 0.02 },
  /**
   * Warmth, as a hue rotation in degrees.
   *
   * Not a colour temperature in kelvin, and the difference is worth naming: a
   * real temperature control remaps the white point, which CSS cannot do. This
   * turns the whole wheel, which at small amounts reads as warmer or cooler and
   * at large amounts reads as a special effect.
   *
   * Clamped to a sixth of a turn each way for exactly that reason. A dial that
   * can turn somebody's face green is a dial that will.
   */
  { id: 'warm', label: ['adj.warm', 'Warmth'], rest: 0, least: -30, most: 30, step: 1 },
  /**
   * Sharpness, as a negative blur.
   *
   * There is no sharpen filter in CSS. What there is is blur, and the useful
   * half of this dial is the other direction: phone footage shot through glass,
   * or a clip that has been through one compression too many, is helped more by
   * a little softening than by anything else available here.
   *
   * So the dial runs from soft to none and stops at none, and it is called
   * Softness in the room. Promising a sharpen we cannot do would be a dial that
   * moves and changes nothing, which is the thing this file exists to avoid.
   */
  { id: 'sharp', label: ['adj.sharp', 'Softness'], rest: 0, least: 0, most: 3, step: 0.1 },
];

/** Where every dial rests. */
export const NO_ADJUST: Readonly<Record<Dial['id'], number>> = {
  bright: 1, contrast: 1, colour: 1, warm: 0, sharp: 0,
};

export type Adjust = Partial<Record<Dial['id'], number>>;

/** Whether anything has been moved off its resting place. */
export function adjusted(dials?: Adjust): boolean {
  if (!dials) return false;
  return DIALS.some((one) => {
    const at = dials[one.id];
    return at !== undefined && Math.abs(at - one.rest) > 1e-6;
  });
}

/**
 * The dials as a `filter` string, or '' when nothing has moved.
 *
 * Empty rather than a string of no-ops on purpose: `context.filter = ''` leaves
 * the canvas alone, where `context.filter = 'brightness(1) contrast(1)'` makes
 * the browser run a filter pass over every frame to achieve nothing. On a phone
 * rendering in real time that is the difference between a film that finishes
 * and one that stutters.
 */
export function adjustCss(dials?: Adjust): string {
  if (!adjusted(dials)) return '';
  const at = (id: Dial['id']): number => {
    const one = DIALS.find((d) => d.id === id);
    const value = dials?.[id];
    if (!one || value === undefined || !Number.isFinite(value)) return one?.rest ?? 0;
    return Math.max(one.least, Math.min(one.most, value));
  };
  const parts: string[] = [];
  if (Math.abs(at('bright') - 1) > 1e-6) parts.push(`brightness(${at('bright').toFixed(2)})`);
  if (Math.abs(at('contrast') - 1) > 1e-6) parts.push(`contrast(${at('contrast').toFixed(2)})`);
  if (Math.abs(at('colour') - 1) > 1e-6) parts.push(`saturate(${at('colour').toFixed(2)})`);
  if (Math.abs(at('warm')) > 1e-6) parts.push(`hue-rotate(${Math.round(at('warm'))}deg)`);
  if (at('sharp') > 1e-6) parts.push(`blur(${at('sharp').toFixed(1)}px)`);
  return parts.join(' ');
}

/**
 * A look and its corrections, as one `filter` string.
 *
 * The grade first and the correction after it — the order a colourist works in,
 * and the order that makes a dial mean the same thing under every look.
 *
 * One function so that the preview and the renderer cannot compose them
 * differently. `check:adjust` holds both ends against it.
 */
export function gradeCss(lookCss: string, dials?: Adjust): string {
  const dial = adjustCss(dials);
  if (!lookCss) return dial;
  if (!dial) return lookCss;
  return `${lookCss} ${dial}`;
}

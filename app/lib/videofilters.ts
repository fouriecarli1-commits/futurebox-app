/**
 * The looks you can put on a piece, without asking anybody for anything.
 *
 * ── Why these are free and instant ───────────────────────────────────────
 *
 * Carli, 23 September 2026: *"Ek wonder of dit moontlik is om 'n basic video
 * editor te bou? Sodat mense hulle content self kan edit? Ook met 'n paar
 * filter moontlikhede."*
 *
 * `lib/stitch.ts` already paints every frame of every piece onto a canvas —
 * that is how the film is cut at all. A grade is one string set on that
 * canvas before the frame is drawn. No engine, no key, no credits, no wait:
 * the whole cost is the same paint that was happening anyway.
 *
 * Which is worth saying plainly, because the obvious way to build this would
 * have been to send each clip to a model and ask it for "the same shot but
 * warmer". That costs money, takes minutes, and comes back as a DIFFERENT
 * shot — a model asked to restyle a clip of her function returns a clip of
 * somebody else's function. A grade is arithmetic on the pixels she filmed,
 * so what comes out is what she shot.
 *
 * ── Why they are per piece and not per film ──────────────────────────────
 *
 * The opposite of the `look` on the storyboard, and for the opposite reason.
 * A look is the sentence every generated shot is made from, and one film with
 * two of those in it reads as two films. A grade is the last thing that
 * happens to a picture, and the case that matters is exactly the mixed one:
 * three pieces she filmed on a phone in a hall, and one generated shot to
 * open on. Pulling the generated shot towards the phone footage is the edit
 * that makes them read as one thing.
 *
 * ── What is not here ─────────────────────────────────────────────────────
 *
 * Nothing that pretends to be an effect it is not. There is no "cinematic"
 * and no "HDR": a canvas filter can move brightness, contrast, saturation,
 * hue and sepia, and everything below is one of those said in words somebody
 * can predict. A name that promises what the arithmetic cannot do is how a
 * filter row becomes twelve presses to find the one that works.
 */

export interface VideoFilter {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  /**
   * The value for `CanvasRenderingContext2D.filter`.
   *
   * Empty for `none`, which is the one that must never set the property at
   * all — see the note in `stitch.ts` about a browser that does not honour
   * it.
   */
  readonly css: string;
}

export const FILTERS: readonly VideoFilter[] = [
  { id: 'none', en: 'As filmed', af: 'Soos gefilm', css: '' },
  {
    id: 'mono',
    en: 'Black and white',
    af: 'Swart en wit',
    /* A touch of contrast with it. A straight `grayscale(1)` on phone
       footage comes out flat grey, because the colour was carrying the
       separation between the subject and the room. */
    css: 'grayscale(1) contrast(1.12)',
  },
  {
    id: 'warm',
    en: 'Warm',
    af: 'Warm',
    /* Sepia rather than a hue rotation: rotating the hue moves skin towards
       green as readily as towards gold, and faces are what is in these. */
    css: 'sepia(0.32) saturate(1.15) brightness(1.03)',
  },
  { id: 'cool', en: 'Cool', af: 'Koel', css: 'hue-rotate(-12deg) saturate(1.08) brightness(1.02)' },
  {
    id: 'faded',
    en: 'Faded',
    af: 'Verbleik',
    /* The one that makes a phone video look deliberate: lift the black
       point, take the colour down. Low contrast on purpose. */
    css: 'contrast(0.88) saturate(0.82) brightness(1.08) sepia(0.12)',
  },
  { id: 'punch', en: 'Punchy', af: 'Sterk', css: 'contrast(1.18) saturate(1.3)' },
  {
    id: 'bright',
    en: 'Brighter',
    af: 'Helderder',
    /* For a hall. Indoor phone footage is usually two stops under, and this
       is the one people reach for first. */
    css: 'brightness(1.18) contrast(1.04) saturate(1.05)',
  },

  /* ── Six more, 1 October 2026 ───────────────────────────────────────────

     Carli: *"Ek hou daarvan dat daar filters is, meer filters sal goed
     wees."*

     Each one is a grade somebody actually reaches for, not a slot filled to
     make the row longer. Named for the job rather than for the arithmetic:
     "Teal and orange" is what a colourist calls it, and nobody has ever
     wanted "hue-rotate(-8deg) saturate(1.35)".

     Still one CSS string per look, still painted by the same canvas pass, so
     six more looks cost exactly what nought more looks cost. That is the
     whole reason this list can grow whenever she asks. */
  {
    id: 'cinema',
    en: 'Teal and orange',
    af: 'Blougroen en oranje',
    /* The grade every advert on television has worn for twenty years: skin
       pulled warm, everything behind it pulled cold. Phone footage of a
       person in a room is exactly what it was invented for. */
    css: 'contrast(1.12) saturate(1.22) hue-rotate(-6deg) brightness(1.02)',
  },
  {
    id: 'noir',
    en: 'Hard black and white',
    af: 'Hard swart-wit',
    /* `mono` is grey and gentle; this one has a floor and a ceiling. For a
       shot where the light was already doing the work. */
    css: 'grayscale(1) contrast(1.45) brightness(0.96)',
  },
  {
    id: 'soft',
    en: 'Soft',
    af: 'Sag',
    /* The only one here that costs a blur, and it is kept under a pixel on
       purpose: anything more reads as a mistake rather than as a choice, and
       on a phone it reads as a dirty lens. */
    css: 'blur(0.6px) brightness(1.06) saturate(0.95) contrast(0.96)',
  },
  {
    id: 'night',
    en: 'Night',
    af: 'Nag',
    /* Not darker — darker is what the footage already is. Cold, lifted off
       the floor so the shadows hold detail, and desaturated the way eyes
       actually see in low light. */
    css: 'brightness(1.08) contrast(1.1) saturate(0.78) hue-rotate(8deg)',
  },
  {
    id: 'vhs',
    en: 'Old tape',
    af: 'Ou band',
    /* Washed, warm and soft, the way a cassette looked. Popular, and cheap:
       it is three filters nobody would think to combine. */
    css: 'saturate(1.35) contrast(0.88) brightness(1.08) sepia(0.18)',
  },
  {
    id: 'bleach',
    en: 'Bleached',
    af: 'Gebleik',
    /* Colour pulled most of the way out and contrast pushed hard — the look
       for something that is meant to feel like a document rather than a film. */
    css: 'saturate(0.35) contrast(1.3) brightness(1.05)',
  },
];

export const NO_FILTER = 'none';

/** The css for a filter id, or empty for none and for anything unknown. */
export function filterCss(id?: string): string {
  if (!id || id === NO_FILTER) return '';
  return FILTERS.find((one) => one.id === id)?.css ?? '';
}

export function filterName(id: string, lang: string): string {
  const found = FILTERS.find((one) => one.id === id);
  if (!found) return id;
  return lang === 'af' ? found.af : found.en;
}

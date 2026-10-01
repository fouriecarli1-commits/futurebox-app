/**
 * The faces words on a film can wear.
 *
 * ── Why these five, and why none of them is downloaded ───────────────────
 *
 * Carli, 30 September 2026: *"Die teks moet font opsies hê."*
 *
 * Every one of these is a stack of faces the device already has. That is the
 * whole design, and it is the same decision as the looks: `stitch.ts` paints
 * the caption onto a canvas in real time, and a canvas asked for a font the
 * browser has not finished loading does not wait — it draws the fallback and
 * says nothing. A film rendered with a webfont half-loaded comes out in the
 * wrong face, silently, and only on the attempt where the network was slow.
 *
 * So: no webfont, no `document.fonts.ready` to get wrong, no request that can
 * fail. The trade is five choices rather than fifty, and five real ones beat
 * fifty that sometimes arrive.
 *
 * ── The stacks ───────────────────────────────────────────────────────────
 *
 * Each one names the good face first and falls back through what Android,
 * iOS and Windows actually ship. Afrikaans needs the full Latin-1 range —
 * ê, ë, ï, ô, û and the apostrophe in 'n — and every face below has it.
 */

export interface VideoFont {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  /** What goes into `context.font`, after the weight and the size. */
  readonly stack: string;
  /** How heavy to draw it. A thin face over footage disappears. */
  readonly weight: number;
}

export const FONTS: readonly VideoFont[] = [
  {
    id: 'plain',
    en: 'Plain',
    af: 'Gewoon',
    /* The default, and what every caption rendered before today used. Kept
       first and kept as the fallback so an old edit reopened after this
       shipped looks exactly as it did. */
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    weight: 700,
  },
  {
    id: 'heavy',
    en: 'Heavy',
    af: 'Swaar',
    /* For a word or two over a busy shot. Impact is on Windows, Haettenschweiler
       beside it, and the condensed sans on Android and iOS carry the same
       intent. */
    stack: '"Arial Black", Impact, "Helvetica Neue", Roboto, sans-serif',
    weight: 900,
  },
  {
    id: 'serif',
    en: 'Serif',
    af: 'Skreef',
    /* The one that does not look like an app. For a title card, a name, or
       anything meant to read as written rather than posted. */
    stack: 'Georgia, "Times New Roman", "Noto Serif", serif',
    weight: 700,
  },
  {
    id: 'mono',
    en: 'Typewriter',
    af: 'Tikmasjien',
    /* Evenly spaced, which is what makes a timestamp, a lyric line or a
       countdown sit still instead of shuffling as the numbers change. */
    stack: '"Courier New", "Roboto Mono", ui-monospace, monospace',
    weight: 700,
  },
  {
    id: 'round',
    en: 'Rounded',
    af: 'Rond',
    /* Soft and friendly, and the one most phone footage of people suits.
       Verdana is everywhere and is the most legible of these at small sizes
       over moving pictures. */
    stack: 'Verdana, "Trebuchet MS", "Noto Sans", sans-serif',
    weight: 700,
  },
];

export const PLAIN_FONT = 'plain';

/** The one whose id this is, or the plain one for anything unknown. */
export function fontFor(id?: string): VideoFont {
  return FONTS.find((one) => one.id === id) ?? FONTS[0];
}

/** How small and how large the words may be set, as a share of frame height. */
export const WORDS_SMALLEST = 0.03;
export const WORDS_LARGEST = 0.12;

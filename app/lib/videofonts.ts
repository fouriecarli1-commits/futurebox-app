/**
 * The faces words on a film can wear.
 *
 * ── Why these five, and why none of them is downloaded ───────────────────
 *
 * The owner, 30 September 2026: *"Die teks moet font opsies hê."*
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
 * That was 30 September. Since 15 October the photo room's fifteen faces are
 * here too — self-hosted, and awaited before a frame is recorded, which is
 * the answer to the risk named above rather than a reversal of it. See the
 * note above `sans` in the list.
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
  /**
   * The photo room's face this one IS, by its id in `postfaces.ts`.
   *
   * Absent on the five system stacks above. Present on the rest, whose real
   * family name only exists inside the Next build — see `lendFaces` below for
   * why this file cannot import it and is handed it instead.
   */
  readonly face?: string;
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
  /* ── The photo room's fifteen, 15 October 2026 ─────────────────────────

     The owner: *"Die gedagte is ook om al hoe meer uit te brei oor tyd, meer text
     possibilities, meer templates."* The photo room had fifteen real faces
     and this room had the five above, and a text style carried over from
     there was folded down to the nearest of five — a Script line came out
     in Georgia. So every face the photo room has is here as well, drawn in
     the same file the post is.

     The note at the top still holds, and is why these are safe now when a
     webfont was not on 30 September: the faces are served from this app's
     own origin (`app/fonts/`), and the room awaits `document.fonts.load` for
     every face the film uses before the first frame is recorded — see
     `wordsReady` in `videofaces.ts`. What is left of the risk is a face that
     will not load at all, and then the stack below is what draws: the same
     SHAPE of letter from what the device already has, not a blank.

     The five above keep their ids and their stacks, so a film saved before
     today opens exactly as it was. The photo room's `plain` and `round` are
     different faces from this room's `plain` and `round`, so they come in as
     `sans` and `soft` rather than taking those ids over. The weights match
     `postfaces.ts`, because `document.fonts.load` matches on the weight. */
  { id: 'sans', en: 'Clean', af: 'Netjies', face: 'plain', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', weight: 700 },
  { id: 'poster', en: 'Poster', af: 'Plakkaat', face: 'poster', stack: 'Impact, "Arial Narrow", "Helvetica Neue", sans-serif', weight: 400 },
  { id: 'book', en: 'Book', af: 'Boek', face: 'book', stack: 'Georgia, "Times New Roman", serif', weight: 700 },
  { id: 'hand', en: 'Handwritten', af: 'Handskrif', face: 'hand', stack: '"Segoe Print", "Bradley Hand", cursive', weight: 700 },
  { id: 'type', en: 'Old typewriter', af: 'Ou tikmasjien', face: 'type', stack: '"Courier New", ui-monospace, monospace', weight: 700 },
  { id: 'soft', en: 'Soft round', af: 'Sag rond', face: 'round', stack: '"Trebuchet MS", Verdana, sans-serif', weight: 800 },
  { id: 'future', en: 'Future', af: 'Toekoms', face: 'future', stack: '"Arial Black", system-ui, sans-serif', weight: 800 },
  { id: 'script', en: 'Script', af: 'Lopende skrif', face: 'script', stack: '"Brush Script MT", cursive', weight: 400 },
  { id: 'spray', en: 'Spray paint', af: 'Spuitverf', face: 'spray', stack: 'Impact, system-ui, sans-serif', weight: 400 },
  { id: 'comic', en: 'Comic', af: 'Strokiesprent', face: 'comic', stack: 'Impact, "Comic Sans MS", sans-serif', weight: 400 },
  { id: 'classic', en: 'Classic', af: 'Klassiek', face: 'classic', stack: '"Trajan Pro", Georgia, serif', weight: 400 },
  { id: 'retro', en: 'Retro', af: 'Retro-styl', face: 'retro', stack: '"Trebuchet MS", system-ui, sans-serif', weight: 400 },
  { id: 'pixel', en: 'Pixel', af: 'Pieksel', face: 'pixel', stack: '"Courier New", ui-monospace, monospace', weight: 400 },
  { id: 'block', en: 'Block', af: 'Blokletters', face: 'block', stack: 'Impact, "Arial Black", sans-serif', weight: 400 },
  { id: 'fashion', en: 'Fashion', af: 'Mode', face: 'fashion', stack: '"Didot", "Bodoni MT", Georgia, serif', weight: 400 },
];

export const PLAIN_FONT = 'plain';

/**
 * The real family names of the photo room's faces, once somebody lends them.
 *
 * ── Why lent and not imported ────────────────────────────────────────────
 *
 * `postfaces.ts` is `next/font/local`, which is not a function at all until
 * the Next compiler has rewritten the call — outside the build it is an empty
 * module and calling it throws. This file is read by the source checks under
 * plain `tsx` (`check:filmstart` imports `FONTS`), and so is `stitch.ts`,
 * which draws with `fontFor`. Importing the faces here would take every one
 * of those checks down.
 *
 * So the room that IS built by Next — `videofaces.ts`, imported by the
 * editor — hands the names in, and until it has, each face draws in its own
 * fallback stack: the right shape of letter, never a blank.
 */
const lent = new Map<string, { readonly css: string; readonly weight: number }>();

export function lendFaces(
  faces: readonly { readonly id: string; readonly css: string; readonly weight: number }[],
): void {
  for (const one of faces) lent.set(one.id, { css: one.css, weight: one.weight });
}

/** The one whose id this is, or the plain one for anything unknown. */
export function fontFor(id?: string): VideoFont {
  const found = FONTS.find((one) => one.id === id) ?? FONTS[0];
  const real = found.face ? lent.get(found.face) : undefined;
  /* The real family first and the fallback stack after it, so a face that
     never arrives still falls to a letter of the same shape rather than to
     whatever the canvas used last. */
  return real ? { ...found, stack: `${real.css}, ${found.stack}`, weight: real.weight } : found;
}

/** How small and how large the words may be set, as a share of frame height. */
export const WORDS_SMALLEST = 0.03;
export const WORDS_LARGEST = 0.12;

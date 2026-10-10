/**
 * What we ask Google for when we ask it to draw the Cubed mark.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Vra ons google partner om vir ons logo te maak?
 * Joune is baie primitief."* And then, looking at what came back: *"Het jy vir
 * google gevra sonder jou voorbeelde?"*
 *
 * So the rule this file exists to hold: **nothing we have drawn is sent.** Not
 * the SVG, not a rendering of it, not a description of how it is built. Google
 * is given her brief in words and nothing else, because a picture handed to an
 * image model is not a reference, it is the answer — and four variations on a
 * mark she has already rejected twice is the one outcome that is worse than
 * asking nothing.
 *
 * The route enforces it (it passes no `from`); `check:merklab` proves it.
 *
 * ── Why four and not one ─────────────────────────────────────────────────
 *
 * Because what she keeps saying no to is not the geometry, it is the
 * execution — "baie meer modern en lig", "baie dun", "baie primitief". Asking
 * once answers one guess about that. Each of these holds her brief fixed and
 * changes only how it is made, so what comes back is a choice between four
 * ways of drawing the same idea rather than four tries at the same way.
 */

/** Said to Google before every one of them, so her brief never drifts. */
export const BRIEF = [
  'A logo mark for a company called Cubed.',
  'Two cubes interlocked, passing through one another like two links of a chain,',
  'one of the two rotated to a different angle from the other so the shape shows',
  'many edges and does not read as symmetrical.',
  'Centred, straight on, no camera perspective distortion, square image,',
  'no text, no lettering, no words, no background scene, no floor, no shadow.',
].join(' ');

export type Take = {
  readonly id: string;
  /** What she will see under it, in both languages. */
  readonly said: readonly [string, string];
  /** The execution, added to the brief. */
  readonly words: string;
};

export const TAKES: readonly Take[] = [
  {
    id: 'thin',
    said: ['Thin line', 'Dun lyn'],
    words:
      'Drawn as a fine wireframe: only the edges of each cube, as very thin'
      + ' uniform lines of light silver on a near-black ground. No surfaces, no'
      + ' thickness, no fill. Precise, modern, architectural, the weight of a'
      + ' technical drawing.',
  },
  {
    id: 'steel',
    said: ['Brushed steel', 'Geborselde staal'],
    words:
      'Built from slender bars of brushed stainless steel with softly chamfered'
      + ' edges, lit from the upper left so one side catches a cool highlight'
      + ' and the other falls into shadow. Photographic, machined, expensive.'
      + ' Dark graphite ground.',
  },
  {
    id: 'flat',
    said: ['One weight', 'Een gewig'],
    words:
      'Flat vector monoline: a single consistent stroke weight throughout, pure'
      + ' white on black, no gradient, no shading, no perspective shading at'
      + ' all. The kind of mark that still reads at the size of a favicon.',
  },
  {
    id: 'light',
    said: ['Edge-lit', 'Randlig'],
    words:
      'Slim translucent edges catching a cold light along their length, like'
      + ' glass rod lit from within, pale blue-white against deep black.'
      + ' Restrained — a thin bright line, not a glow, and no lens flare.',
  },
];

export const takeById = (id: string): Take | undefined =>
  TAKES.find((one) => one.id === id);

/**
 * Exactly what is handed to Google for one take.
 *
 * `from` is here, set to nothing, rather than simply left off at the call.
 * `makePicture(words, from, aspect)` takes a reference picture second, and a
 * reference added there one tired evening would be one word, invisible from
 * outside, and the only symptom would be that everything came back looking
 * like the mark she has already turned down twice — which is the exact
 * complaint she made. Written as a value, it is a value a check can read.
 */
export type Ask = {
  readonly words: string;
  /** No picture. Never a picture. See `check:merklab`. */
  readonly from: undefined;
  /** A logo that is not square cannot be an app icon. */
  readonly aspect: '1:1';
};

export function askFor(take: Take): Ask {
  return { words: `${BRIEF} ${take.words}`, from: undefined, aspect: '1:1' };
}

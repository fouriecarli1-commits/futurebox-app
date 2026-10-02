/**
 * The cutting room's own surface, ink and light.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * Carli, 4 October 2026, with four photographs of the room: *"Niks is duidelik
 * nie ... Kyk mooi alles allign nie. Plus moet die hele kamer dieselfde lyk,
 * tot bo."*
 *
 * The room shared `DeskSheet` with the Pro Booth, which is the right call —
 * the header, the name, the close button and the way a panel opens are things
 * somebody learns once. What came with it was the booth's PALETTE, hard-wired:
 * `RAISED` is `#141826`, a blue-black, and `LIT` is `#38bdf8`, sky blue.
 *
 * So the cutting room was green down to the bar and then navy inside every
 * bench, with a blue icon on each heading. Measured in the browser, the bench
 * body was `rgb(20, 24, 38)` against a room painted `rgb(5, 24, 15)`. Three
 * surfaces where she asked for one.
 *
 * The frame stays shared. Only the colours are the room's, passed in rather
 * than imported, so neither room can quietly take the other's.
 *
 * ── The numbers ──────────────────────────────────────────────────────────
 *
 * Same shape as `boothlook.ts` — a panel, a raised surface above it, an edge,
 * an ink and a light — at the room's own hue. `PANEL` is the colour the room,
 * the bar and the benches are all painted, which is the whole point: one
 * surface, top to bottom.
 */

/** The deepest ground. A real inset reads against this. */
export const VOID = '#020a06';

/**
 * The room, the bar and every bench. One colour, and `check:solidroom` holds
 * `page.tsx` to the same literal.
 *
 * rgb(5, 24, 15): green nineteen over red and nine over blue. It was `#09120d`
 * until 4 October, which is nine over red and five over blue — green in a
 * colour picker and black to an eye, and `audit/editor.mjs` said so.
 */
export const PANEL = '#05180f';

/**
 * A panel lifted off the room: the body of a bench, a card inside one.
 *
 * Deliberately a small step — four or five values — rather than the booth's
 * eleven. The booth is equipment and reads as stacked metal; this room is a
 * screen with one picture on it, and a body that jumps away from its own
 * header is the "three panels" look the rebuild was undoing.
 */
export const RAISED = '#0a2415';

/** Between things. Green rather than white, so it belongs to this room. */
export const EDGE = 'rgba(16,185,129,0.22)';

/** Words. */
export const INK = '#ecfdf5';

/**
 * Words that are not the point: a hint, a unit, a label beside a slider.
 *
 * **0.72, and it is not a taste.** It was 0.52, and at 0.52 on this panel a
 * label measures about 3.4:1 — under the 4.5 that body text needs, which is
 * most of why she said nothing was clear. The booth learnt the identical
 * lesson in September and its note says so: these stop being decoration the
 * moment the room fills the screen, and then they are body text.
 *
 * `audit/contrast.mjs` measures it with the benches open now, which is the
 * half it was missing.
 */
export const INK_DIM = 'rgba(236,253,245,0.72)';

/** Barely there: a disabled control, a tick on a ruler. Never a word to read. */
export const INK_FAINT = 'rgba(236,253,245,0.34)';

/** The light. Green, because this room is the green one. */
export const LIT = '#34d399';

/** Something costs credits. The same coin the booth uses, on purpose. */
export const COIN = 'rgba(250,204,21,0.9)';

/**
 * A button that looks pressable.
 *
 * Carli: *"'n button moet diepte hê en lyk soos 'n knoppie wat 'n mens druk."*
 *
 * Depth on a dark surface is not a drop shadow — a shadow under a near-black
 * button on a near-black panel is invisible. It is a light edge along the top
 * and a dark one along the bottom, which is how a real key catches a room
 * light, plus a fill a step above the panel so the button is a thing ON the
 * surface rather than a hole in it.
 *
 * `press` is the same two edges reversed, for `:active` — the button has to
 * move when it is pressed or it is a picture of a button.
 */
export const RAISE = '0 1px 0 0 rgba(236,253,245,0.14) inset, 0 -1px 0 0 rgba(0,0,0,0.45) inset, 0 1px 2px 0 rgba(0,0,0,0.45)';
export const PRESS = '0 1px 0 0 rgba(0,0,0,0.45) inset, 0 -1px 0 0 rgba(236,253,245,0.10) inset';

/** Everything above, in one object, for handing to a shared frame. */
export const CUT_LOOK = {
  VOID, PANEL, RAISED, EDGE, INK, INK_DIM, INK_FAINT, LIT, COIN,
} as const;

/** What a shared frame needs in order to be painted in a room's colours. */
export type Look = {
  readonly PANEL: string;
  readonly RAISED: string;
  readonly EDGE: string;
  readonly INK: string;
  readonly INK_DIM: string;
  readonly LIT: string;
  readonly COIN: string;
};

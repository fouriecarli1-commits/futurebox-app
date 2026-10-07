/**
 * The shape of a control inside a pop-out, and of the row it sits in.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 7 October 2026: *"Die pop out bars moet ook netjies gespasieer wees,
 * bars binne pop outs moet ewe groot en lank wees, en alles moet baie eenvoudig
 * en maklik wees. Dieselfde met video editor, asook probooth."*
 *
 * Three rooms have pop-outs — the Photo Editor, the Video Editor and the
 * ProBooth — and until today each one sized its own buttons. Nobody had made a
 * wrong decision: `min-h-[44px] … px-3.5 py-2` is a perfectly good button, and
 * so is `px-3 py-1.5`, and so is a 16-pixel slider the browser drew itself.
 * What came out of it was a pop-out holding controls 16, 32, 34, 36, 38 and 44
 * pixels tall, and four buttons in a row at four different widths because a
 * wrapping flex sizes each one to its own words.
 *
 * ── Why the shape and not the colour ─────────────────────────────────────
 *
 * The three rooms are deliberately different colours — the booth is black with
 * a blue line, the cutting room and the photo editor are the FutureBox green,
 * and the app's own theme reaches none of them. That was decided room by room
 * and is not a mistake to be merged away; `CutDock.tsx` has the longer note on
 * why those two docks are not one component.
 *
 * So this file carries no colour. It carries the height, the width behaviour,
 * the corner and the spacing — the things that have to AGREE between rooms for
 * a pop-out to read as tidy — and each room paints its own controls as before.
 *
 * ── Measured, not asserted ───────────────────────────────────────────────
 *
 * `audit/tidybars.mjs` opens every pop-out in all three rooms and measures what
 * is drawn: one height per pop-out, never under 44, and one width for every
 * control sharing a row. A rule about class names would have passed on the day
 * she wrote that message. These constants only help somebody write a control
 * that passes; the check is what says it did.
 */

/* ── Rows ────────────────────────────────────────────────────────────────
 *
 * A grid rather than a flex, which is the whole point. `flex flex-wrap gap-2`
 * gives every button the width of its own text: "Tall", "Wide" and "Square"
 * came out 53, 63 and 77 wide, and the right-hand edge of the row was ragged.
 * A grid gives each one the same column whatever it says.
 *
 * Choose the number of columns by what is in the row, not by how many things
 * there are: five frame rates fit across, two sentences do not.
 */
export const ROW2 = 'grid grid-cols-2 gap-2';
export const ROW3 = 'grid grid-cols-3 gap-2';
export const ROW4 = 'grid grid-cols-4 gap-2';
export const ROW5 = 'grid grid-cols-5 gap-2';

/** A stack of full-width controls, spaced like a row of them. */
export const STACK = 'grid gap-2';

/**
 * A control: 44 tall, the full width of its column, its words centred.
 *
 * `min-h-[44px]` rather than `h-11` so a control whose words wrap onto two
 * lines grows instead of clipping them — the Afrikaans of almost everything in
 * this app is longer than the English.
 *
 * No `py`: the flex centring does that, and padding on top of `min-h` is how a
 * control ends up 52 tall in one room and 44 in another.
 */
export const BAR = 'inline-flex min-h-[44px] w-full items-center justify-center'
  + ' gap-1.5 rounded-xl px-3 text-center text-sm font-semibold';

/**
 * The same, smaller words. For a row of five or more, where the full size
 * wraps "1080p" onto two lines on a 390-pixel phone.
 */
export const BAR_TIGHT = 'inline-flex min-h-[44px] w-full items-center justify-center'
  + ' gap-1 rounded-xl px-1.5 text-center text-xs font-semibold';

/**
 * A slider.
 *
 * The browser draws a range input about 16 pixels tall, which is a 16-pixel
 * strip to land a thumb on next to 44-pixel buttons. `h-11` makes the strip the
 * same as everything else in the pop-out; the track stays the thin line it was,
 * centred in it, so nothing looks different and the whole height is live.
 */
export const SLIDE = 'h-11 w-full cursor-pointer';

/** A box to type one line into. */
export const FIELD = 'min-h-[44px] w-full rounded-xl px-3 text-sm';

/** A swatch of colour, which is a control and not a decoration. */
export const SWATCH = 'h-11 w-14 cursor-pointer rounded-xl';

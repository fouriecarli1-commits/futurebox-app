/**
 * The booth's own colours, in one place.
 *
 * ── Why these are literals and not Tailwind tokens ───────────────────────
 *
 * Every other room follows the theme. This one must not. It is a piece of
 * studio equipment: black with a blue line, on whatever theme somebody has
 * picked — Carli's words, *"die booth se swart met die blou musieklyn sal 'n
 * unieke take wees vir die booth, dat dit heeltemal anders lyk as die res van
 * die app."*
 *
 * That is also the repair for a real bug. The app's Tailwind colours point at
 * CSS variables, and the shipped theme is LIGHT and inverts the surface ramp
 * — so `bg-zinc-950` resolves to near-white and the booth was a white room
 * pretending to be a dark one. `check:boothline` forbids `bg-zinc-*` and
 * `text-white` in the timeline for exactly that reason.
 *
 * ── Why one file and not four ────────────────────────────────────────────
 *
 * Because it was four, and they had already drifted: the timeline drew its
 * rules at `rgba(255,255,255,0.07)` and the dock at `0.08`, and dim text at
 * `0.45` against `0.5`. Nobody chose that. Two shades of the same line meeting
 * at the edge of two panels is the kind of thing that reads as "not quite
 * finished" without anybody being able to say why.
 */

/** Behind everything — the room itself. */
export const VOID = '#05060a';
/** A panel, a bar, a card: one step up from the void. */
export const PANEL = '#0b0d14';
/** One step up again, for a control sitting on a panel. */
export const RAISED = '#141826';
/** Every rule and border in the room. */
export const EDGE = 'rgba(255,255,255,0.08)';
/** Text. */
export const INK = '#eef2ff';
/** Text that is not the point of the sentence. */
export const INK_DIM = 'rgba(238,242,255,0.5)';
/** Text that is barely there — a unit, a placeholder. */
export const INK_FAINT = 'rgba(238,242,255,0.32)';
/** The blue: the playhead, an open desk, the line through the song. */
export const LIT = '#38bdf8';
/** What a paid control is marked with. */
export const COIN = 'rgba(250,204,21,0.9)';
/** Go: record, keep, mix it down. */
export const GO = '#10b981';

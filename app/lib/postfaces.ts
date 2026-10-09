/**
 * The faces a post can be written in.
 *
 * ── Why this is a file and not three strings in the studio ───────────────
 *
 * Carli asked for *"nice fonts"*. What was there was three system stacks —
 * `system-ui`, `Georgia`, `ui-monospace` — and the note above them said
 * "loaded by the page already, so nothing is fetched", which was true and
 * was the problem. Georgia is not on most Android phones. Neither is a
 * distinct `ui-monospace` on some. So she picks Serif, the browser hands back
 * the same sans it was already using, and the two choices draw the identical
 * picture with nothing anywhere saying so.
 *
 * That is the quiet kind of wrong: the control works, the state changes, the
 * canvas redraws, and the result is unchanged.
 *
 * ── Two things a canvas does not forgive ─────────────────────────────────
 *
 * 1. `ctx.font` does not resolve CSS variables. `font: 700 48px var(--x)` is
 *    not a parse error — the assignment is simply IGNORED and the canvas goes
 *    on drawing in its previous font. So the literal family name is what goes
 *    in here, which is what `next/font` hands back in `.style.fontFamily`.
 *
 * 2. A face that is declared but not yet downloaded is substituted silently
 *    on the first draw. `document.fonts.load` has to be awaited and the frame
 *    drawn again, or the first picture she sees — and the first one she could
 *    export — is in the fallback.
 *
 * ── Why each of these, and why not preloaded ─────────────────────────────
 *
 * One of each SHAPE, because a list of six near-identical sans faces is a
 * decision handed back to her rather than made. Six now, and the rule is
 * what keeps that honest: a poster face that is all caps and tall, a book
 * face with real serifs, a clean sans for everything else, a handwritten
 * one for a note or a birthday, a typewriter for a lyric sheet, and a
 * rounded one for the kids room. Nothing here can be made with another row
 * in this list, which is the test a seventh would have to pass. `preload: false` on the two display faces — they are
 * wanted on one screen out of thirty, and a face preloaded on every page is
 * bytes spent on people who never open the post studio.
 *
 * Self-hosted either way. `next/font` downloads them at build time and serves
 * them from this app's own origin, so no phone that opens a post ever asks
 * Google for anything.
 */
import { Anton, Baloo_2, Caveat, Courier_Prime, Inter, Playfair_Display } from 'next/font/google';

export const POSTER = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

export const BOOK = Playfair_Display({
  weight: '700',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

/* ── Three more shapes, 9 October 2026 ──────────────────────────────────
 
   Carli: *"Ek dink ook daar moet heelwat 'n verskeidenheid van teks opsies
   wees."* Measured before adding: three faces here and five in the cutting
   room, which was the thinnest list in the app.
 
   The rule above still holds and is the reason these are three and not
   twelve: a list of near-identical sans faces is a decision handed back to
   her rather than made. So each of these is a SHAPE the three could not
   make, and each has a post somebody actually makes in it.
 
   Handwritten, because a birthday or a note from a person is not a poster
   and Anton cannot pretend. Typewriter, because a lyric sheet wants even
   letters and a mono face is also the only one where a column of words
   lines up. Rounded, because the kids room and a children's story cover
   are soft and nothing here was.
 
   All `preload: false` for the reason the display faces already are: wanted
   on one screen out of thirty. */
export const HAND = Caveat({
  weight: '700',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

export const TYPE = Courier_Prime({
  weight: '700',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

export const ROUND = Baloo_2({
  weight: '800',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

/* The plain one IS preloaded, because it is the default a post opens in and
   the one most posts will keep. */
export const PLAIN = Inter({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export interface Face {
  readonly id: string;
  readonly name: string;
  /** The literal family list. Safe in `ctx.font`; a `var()` is not. */
  readonly css: string;
  /** What `document.fonts.load` has to be asked for before the first draw. */
  readonly weight: number;
}

/* `as const satisfies` and not `: readonly Face[]`.
 
   Annotating the array widens every `id` to `string`, so `FaceId` becomes
   `string` and `face: 'plian'` compiles — the typo ships, `faceOf` falls back
   to the first face, and the chip she pressed does nothing. `satisfies` keeps
   the literal types while still refusing a row that is not a `Face`. */
export const FACES = [
  { id: 'plain', name: 'Plain', css: `${PLAIN.style.fontFamily}, system-ui, sans-serif`, weight: 700 },
  { id: 'poster', name: 'Poster', css: `${POSTER.style.fontFamily}, Impact, system-ui, sans-serif`, weight: 400 },
  { id: 'book', name: 'Book', css: `${BOOK.style.fontFamily}, Georgia, serif`, weight: 700 },
  { id: 'hand', name: 'Handwritten', css: `${HAND.style.fontFamily}, cursive`, weight: 700 },
  { id: 'type', name: 'Typewriter', css: `${TYPE.style.fontFamily}, ui-monospace, monospace`, weight: 700 },
  { id: 'round', name: 'Rounded', css: `${ROUND.style.fontFamily}, system-ui, sans-serif`, weight: 800 },
] as const satisfies readonly Face[];

export type FaceId = (typeof FACES)[number]['id'];

/** The face by id, or the first one — never undefined at a draw site. */
export const faceOf = (id: string): Face => FACES.find((one) => one.id === id) ?? FACES[0];

/**
 * Every face downloaded, before anything is drawn in one.
 *
 * Asked for at the weight each face is actually drawn at, because
 * `document.fonts.load` matches on the whole shorthand: loading `400 16px X`
 * and then drawing `700 90px X` is a different request and can still be
 * served the fallback.
 *
 * The size in the request does not matter and `16px` is the convention;
 * what matters is that the family and weight are the ones the canvas will
 * ask for. Failures are swallowed on purpose — a face that will not load is
 * a post in the fallback, which is worse-looking and not broken.
 */
export async function faceReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    FACES.map((one) => document.fonts.load(`${one.weight} 16px ${one.css}`).catch(() => [])),
  );
}

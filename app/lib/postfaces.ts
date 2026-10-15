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
/* `next/font/local` and not `next/font/google` since 12 October 2026: the
   files are in `app/fonts/`, so a build asks nothing of Google's servers.
   See the note in `app/layout.tsx` and `app/fonts/README.md`. */
import localFont from 'next/font/local';

export const POSTER = localFont({
  src: [
    { path: '../fonts/anton-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/anton-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const BOOK = localFont({
  src: [
    { path: '../fonts/playfair-latin.woff2', weight: '400 900', style: 'normal' },
    { path: '../fonts/playfair-latin-ext.woff2', weight: '400 900', style: 'normal' },
  ],
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
export const HAND = localFont({
  src: [
    { path: '../fonts/caveat-latin.woff2', weight: '400 700', style: 'normal' },
    { path: '../fonts/caveat-latin-ext.woff2', weight: '400 700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const TYPE = localFont({
  src: [
    { path: '../fonts/courierprime-latin.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/courierprime-latin-ext.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const ROUND = localFont({
  src: [
    { path: '../fonts/baloo2-latin.woff2', weight: '400 800', style: 'normal' },
    { path: '../fonts/baloo2-latin-ext.woff2', weight: '400 800', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

/* The plain one IS preloaded, because it is the default a post opens in and
   the one most posts will keep. */
/**
 * The futuristic face — Carli, 13 October 2026: "amazing futuristic text".
 * Orbitron, the geometric display face Google's page set its neon words
 * in; local like the rest, latin only, which is all Google serves of it.
 */
export const FUTURE = localFont({
  src: [
    { path: '../fonts/orbitron-latin.woff2', weight: '500 900', style: 'normal' },
  ],
  display: 'swap',
});

export const PLAIN = localFont({
  src: [
    { path: '../fonts/inter-latin.woff2', weight: '100 900', style: 'normal' },
    { path: '../fonts/inter-latin-ext.woff2', weight: '100 900', style: 'normal' },
  ],
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

/* ── Eight more shapes, 15 October 2026 ─────────────────────────────────

   Carli: *"Die gedagte is ook om al hoe meer uit te brei oor tyd, meer text
   possibilities, meer templates."* The rule from 9 October still holds —
   each is a SHAPE none of the seven could make, with a post somebody makes
   in it: a script for a wedding or a love song, spray paint for the street
   and hip-hop, comic for a sale or a kids' party, classic capitals for a
   gospel night or a gala, retro for funk and the eighties, pixel for a
   game night, block letters for a sign, and a fashion-magazine face.
   All OFL, all from `app/fonts/` (README there), all `preload: false`. */
export const SCRIPT = localFont({
  src: [
    { path: '../fonts/pacifico-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/pacifico-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const SPRAY = localFont({
  src: [
    { path: '../fonts/rubikspray-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/rubikspray-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const COMIC = localFont({
  src: [
    { path: '../fonts/bangers-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/bangers-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const CLASSIC = localFont({
  src: [
    { path: '../fonts/cinzel-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/cinzel-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const RETRO = localFont({
  src: [
    { path: '../fonts/righteous-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/righteous-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const PIXEL = localFont({
  src: [
    { path: '../fonts/pressstart-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/pressstart-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const BLOCK = localFont({
  src: [
    { path: '../fonts/bungee-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/bungee-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

export const FASHION = localFont({
  src: [
    { path: '../fonts/abril-latin.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/abril-latin-ext.woff2', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
});

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
  { id: 'future', name: 'Future', css: `${FUTURE.style.fontFamily}, 'Orbitron', system-ui, sans-serif`, weight: 800 },
  { id: 'script', name: 'Script', css: `${SCRIPT.style.fontFamily}, cursive`, weight: 400 },
  { id: 'spray', name: 'Spray paint', css: `${SPRAY.style.fontFamily}, Impact, system-ui, sans-serif`, weight: 400 },
  { id: 'comic', name: 'Comic', css: `${COMIC.style.fontFamily}, Impact, system-ui, sans-serif`, weight: 400 },
  { id: 'classic', name: 'Classic', css: `${CLASSIC.style.fontFamily}, Georgia, serif`, weight: 400 },
  { id: 'retro', name: 'Retro', css: `${RETRO.style.fontFamily}, system-ui, sans-serif`, weight: 400 },
  { id: 'pixel', name: 'Pixel', css: `${PIXEL.style.fontFamily}, ui-monospace, monospace`, weight: 400 },
  { id: 'block', name: 'Block', css: `${BLOCK.style.fontFamily}, Impact, system-ui, sans-serif`, weight: 400 },
  { id: 'fashion', name: 'Fashion', css: `${FASHION.style.fontFamily}, Georgia, serif`, weight: 400 },
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

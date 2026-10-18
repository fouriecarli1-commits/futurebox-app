'use client';

/**
 * The photo room's faces, lent to the cutting room, and loaded before use.
 *
 * The owner, 15 October 2026: *"Die gedagte is ook om al hoe meer uit te brei oor
 * tyd, meer text possibilities, meer templates."*
 *
 * ── Why a file of its own ────────────────────────────────────────────────
 *
 * `videofonts.ts` cannot import `postfaces.ts` — that is `next/font/local`,
 * which only exists once the Next compiler has rewritten it, and the source
 * checks read `videofonts.ts` and `stitch.ts` under plain `tsx`. This file is
 * only ever imported by the editor, which Next builds, so it is the one place
 * that can hold both: it lends the real family names to `videofonts.ts` the
 * moment it is loaded, and says when they have arrived.
 *
 * ── Why the film waits for them ──────────────────────────────────────────
 *
 * `stitch.ts` paints the words onto a canvas, and a canvas asked for a face
 * the browser has not finished downloading does not wait: it draws the
 * fallback and says nothing. So the first second of a film would be in the
 * wrong face, and only on the day the network was slow. `wordsReady` is
 * awaited before the film is recorded, for exactly the faces it uses.
 */

import { FACES } from './postfaces';
import { FONTS, fontFor, lendFaces } from './videofonts';

lendFaces(FACES);

/** How long a film waits for a face before it is drawn in the fallback. */
const LONGEST_WAIT = 4000;

/**
 * Every face these words are set in, downloaded.
 *
 * Asked at the weight each is drawn at, because `document.fonts.load`
 * matches on the whole shorthand. Never throws and never hangs: a face that
 * will not load is a film in the fallback stack, which is plainer and not
 * broken, and a render that waited forever would be broken.
 */
export async function wordsReady(ids: readonly (string | undefined)[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))]
    .map((id) => fontFor(id))
    .filter((one) => Boolean(one.face));
  if (!wanted.length) return;
  const loads = Promise.all(
    wanted.map((one) => document.fonts.load(`${one.weight} 16px ${one.stack}`).catch(() => [])),
  ).then(() => undefined);
  await Promise.race([loads, new Promise<void>((done) => { setTimeout(done, LONGEST_WAIT); })]);
}

/** Every face on the words bench, for the buttons that show them. */
export function allWordsReady(): Promise<void> {
  return wordsReady(FONTS.map((one) => one.id));
}

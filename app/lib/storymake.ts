/**
 * Making one page of a storybook: its picture, and its reading.
 *
 * Two calls to routes this app already has, kept out of the room because a
 * component is not a thing a check can drive and these are the two places
 * money leaves. `check:storie` asserts what they ask for — chiefly that the
 * picture is asked for with NO lettering in it, which is the one instruction
 * a picture model will otherwise disregard on a page that is all words.
 */

import { accessToken } from './cloud';
import { packSome, type Measured } from './packpicture';
import { MOST_PICTURES } from './picturelimit';
import { pictureWords, type Page } from './storypages';

export interface Drawn {
  /** An object URL for the picture. The room owns revoking it. */
  readonly picture: string;
  readonly image: HTMLImageElement;
  /**
   * The picture itself.
   *
   * Kept alongside the URL because an object URL is a handle into THIS tab
   * and nothing else: it cannot be written to a database, and a story put on
   * the shelf with one in it comes back pointing at nothing. `storykeep.ts`
   * stores the Blob.
   */
  readonly blob: Blob;
}

/**
 * Which earlier pages to show the model again, so the child stays the child.
 *
 * ── The fault this fixes ─────────────────────────────────────────────────
 *
 * Every page was drawn from its own words and nothing else, so a storybook
 * came back with a different child on every page. The look of the book held
 * — `pictureWords` has always carried the style — but the CHARACTER did not,
 * and a character who changes face every page is the one thing a child
 * notices about a storybook.
 *
 * Gemini takes several pictures in a turn. That capability was sitting there
 * unused; this is the use for it.
 *
 * ── Why the first page and the page before, and not the last three ───────
 *
 * The first page is where the characters were established, so it is the
 * anchor and it never leaves. The page just before is what keeps a slow
 * change from accumulating — drift of a few percent a page is invisible
 * between neighbours and obvious across twelve.
 *
 * The three middle pages are not sent because each costs the other two
 * quality: `packpicture.ts` splits one budget between however many go, so a
 * third reference makes all three blurrier. Two sharp references hold a face
 * better than three soft ones.
 */
export function lookBack<T>(drawn: readonly T[]): T[] {
  if (drawn.length === 0) return [];
  const first = drawn[0];
  const previous = drawn[drawn.length - 1];
  /* On page two those are the same picture. Sending it twice would pay for
     the same bytes twice and halve the quality of both copies. */
  const out = previous === first ? [first] : [first, previous];
  return out.slice(0, MOST_PICTURES);
}

/**
 * Draw one page. The message, where there is one, is the engine's own.
 *
 * `before` is the pages already drawn, newest last. `lookBack` picks which of
 * them travel, and `packSome` shrinks them to fit one request body.
 */
export async function drawPage(
  page: Page,
  look: string,
  before: readonly Measured[] = [],
): Promise<Drawn | { says: string }> {
  const token = await accessToken();
  if (!token) return { says: 'Sign in first.' };
  /* Shrunk here rather than in the room, because the room has the pictures
     and this file is the only thing that knows what the request can carry. */
  const from = packSome(lookBack(before));
  try {
    const answer = await fetch('/api/google/picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      /* Square, because a page of a book is, and the film covers the frame
         with it rather than letterboxing — see `drawSpread`.

         The ratio is sent only on the FIRST page. On every page after it the
         earlier pictures go up instead, and they are already square: a ratio
         forced on top of a reference edit is how a model gets told two things
         about the same frame. */
      body: JSON.stringify(
        from.length
          ? { words: pictureWords(page, look, from.length), from }
          : { words: pictureWords(page, look), aspect: '1:1' },
      ),
    });
    if (!answer.ok) {
      const why = (await answer.json().catch(() => ({}))) as { message?: string };
      return { says: why.message ?? `That picture could not be drawn. (${answer.status})` };
    }
    const blob = await answer.blob();
    const url = URL.createObjectURL(blob);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('decode'));
      image.src = url;
    });
    return { picture: url, image, blob };
  } catch {
    return { says: 'That could not be sent. Check the connection and try again.' };
  }
}

/**
 * Read one page aloud.
 *
 * One call a page rather than one for the whole story, and that is what the
 * bill in `storypages.ts` already assumes: each page is its own reading, so
 * each pays `readCost`'s own minimum. It is a credit or two dearer than one
 * long call and it is the only way the room knows how long each page lasts —
 * and without that the pictures turn on a fixed interval and drift away from
 * the voice within three pages.
 */
export async function readPage(
  page: Page,
  voiceId: string,
  language?: string,
): Promise<{ audio: Blob } | { says: string }> {
  const token = await accessToken();
  if (!token) return { says: 'Sign in first.' };
  try {
    const answer = await fetch('/api/dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        turns: [{ voiceId, text: page.text }],
        ...(language ? { language } : {}),
      }),
    });
    if (!answer.ok) {
      const why = (await answer.json().catch(() => ({}))) as { message?: string };
      return { says: why.message ?? `That page could not be read. (${answer.status})` };
    }
    return { audio: await answer.blob() };
  } catch {
    return { says: 'That could not be sent. Check the connection and try again.' };
  }
}

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
import { pictureWords, type Page } from './storypages';

export interface Drawn {
  /** An object URL for the picture. The room owns revoking it. */
  readonly picture: string;
  readonly image: HTMLImageElement;
}

/** Draw one page. The message, where there is one, is the engine's own. */
export async function drawPage(
  page: Page,
  look: string,
): Promise<Drawn | { says: string }> {
  const token = await accessToken();
  if (!token) return { says: 'Sign in first.' };
  try {
    const answer = await fetch('/api/google/picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      /* Square, because a page of a book is, and the film covers the frame
         with it rather than letterboxing — see `drawSpread`. */
      body: JSON.stringify({ words: pictureWords(page, look), aspect: '1:1' }),
    });
    if (!answer.ok) {
      const why = (await answer.json().catch(() => ({}))) as { message?: string };
      return { says: why.message ?? `That picture could not be drawn. (${answer.status})` };
    }
    const url = URL.createObjectURL(await answer.blob());
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('decode'));
      image.src = url;
    });
    return { picture: url, image };
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

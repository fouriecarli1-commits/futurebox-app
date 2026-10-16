/**
 * The two paid pictures in the kids room: a drawing brought to life, and a
 * picture from the bubbles. Both go through `/api/google/picture`, both
 * cost `CREDITS.repaint`, and both are refused by `charge()` the moment the
 * allowance is spent — the same door every grown-up's picture goes through.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 13 October 2026: *"a drawing board that captures their shape and
 * makes their drawings realistically alive, but family friendly. And also
 * prompting images (kids friendly) so that they can really flex their
 * creative muscles."*
 *
 * ── Why nothing here is typed ────────────────────────────────────────────
 *
 * The room's rule (`check:kinderkamer`): every choice is a closed list
 * somebody wrote, and the one line a child may type goes to the song, not
 * to a picture engine. So "prompting" a picture means pressing a subject
 * and a style from the two lists below, and the words sent are these words
 * and no others — a child cannot ask Google for anything this file did not
 * already ask for. "Family friendly" is in every sentence that leaves.
 *
 * The drawing goes with fixed words too: keep the shapes and the colours
 * the child drew, in the same place, and make it warm and real. The whole
 * point is that the dinosaur on the paper is the dinosaur that comes back.
 */
import { accessToken } from './cloud';

export interface Choice {
  readonly id: string;
  readonly says: readonly [string, string];
  readonly words: string;
}

/** What a picture can be of. Each is a thing a child would draw. */
export const KID_SUBJECTS: readonly Choice[] = [
  { id: 'dog', says: ['kids.picDog', 'A dog'], words: 'a happy dog with a wagging tail' },
  { id: 'cat', says: ['kids.picCat', 'A cat'], words: 'a fluffy cat curled up and smiling' },
  { id: 'dinos', says: ['kids.picDino', 'A dinosaur'], words: 'a friendly green dinosaur' },
  { id: 'dragon', says: ['kids.picDragon', 'A dragon'], words: 'a small friendly dragon blowing tiny sparks' },
  { id: 'space', says: ['kids.picRocket', 'A rocket'], words: 'a rocket flying past the moon and the stars' },
  { id: 'robot', says: ['kids.picRobot', 'A robot'], words: 'a round friendly robot waving' },
  { id: 'castle', says: ['kids.picCastle', 'A castle'], words: 'a castle on a hill with flags flying' },
  { id: 'sea', says: ['kids.picMermaid', 'A mermaid'], words: 'a smiling mermaid under the sea with fish' },
  { id: 'unicorn', says: ['kids.picUnicorn', 'A unicorn'], words: 'a unicorn with a rainbow mane in a meadow' },
  { id: 'farm', says: ['kids.picFarm', 'A farm'], words: 'a farm with a cow, a sheep and a red barn' },
  { id: 'birthday', says: ['kids.picCake', 'A birthday cake'], words: 'a huge birthday cake with candles and balloons' },
  { id: 'treehouse', says: ['kids.picTreehouse', 'A treehouse'], words: 'a treehouse in a big tree with a rope ladder' },
];

/** How it is drawn. */
export const KID_STYLES: readonly Choice[] = [
  { id: 'cartoon', says: ['kids.styleCartoon', 'Cartoon'], words: 'bright cartoon style with bold outlines' },
  { id: 'crayon', says: ['kids.styleCrayon', 'Crayon'], words: 'drawn in thick wax crayon on white paper' },
  { id: 'clay', says: ['kids.styleClay', 'Clay'], words: 'made of colourful modelling clay, soft studio light' },
  { id: 'watercolour', says: ['kids.styleWater', 'Watercolour'], words: 'soft watercolour painting' },
  { id: 'plush', says: ['kids.stylePlush', 'Soft toy'], words: 'as a cuddly plush soft toy' },
  { id: 'pixel', says: ['kids.stylePixel', 'Pixel game'], words: 'in chunky pixel-art video game style' },
];

/** The sentence every picture from the bubbles ends with. */
export const FAMILY = 'Friendly, colourful and family-friendly, for a young child. No words, no letters, no logos.';

/** The words for a drawing brought to life. Fixed; the drawing is the prompt. */
export const ALIVE_WORDS =
  'This is a young child’s drawing. Bring it to life as a warm, friendly, realistic picture:'
  + ' keep every shape and every colour the child drew, in the same place and the same pose,'
  + ' and make it look like a real, soft, family-friendly scene. No words, no letters, no logos.';

export const pictureWords = (subject: Choice, style: Choice): string =>
  `${subject.words}, ${style.words}. ${FAMILY}`;

/** The side a drawing is sent at. The board is at most 480 CSS pixels anyway. */
const SEND_SIDE = 1024;

/** A PNG as the route takes it: a data URL and its type, downsized if huge. */
export async function packDrawing(drawing: Blob): Promise<{ data: string; mime: 'image/png' } | null> {
  const url = URL.createObjectURL(drawing);
  try {
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const one = new Image();
      one.onload = () => resolve(one);
      one.onerror = () => resolve(null);
      one.src = url;
    });
    if (!image) return null;
    const scale = Math.min(1, SEND_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ink = canvas.getContext('2d');
    if (!ink) return null;
    ink.fillStyle = '#ffffff';
    ink.fillRect(0, 0, canvas.width, canvas.height);
    ink.drawImage(image, 0, 0, canvas.width, canvas.height);
    /* Bare base64, past the comma. Carli, 13 October 2026, with a
       photograph of the room: *"Om 'n prent na lewe te bring wil nie werk
       nie"* — Google answered `Base64 decoding failed for "data:image/png;
       base64,…"`, because this sent the whole data URL and the route hands
       the string straight to `inline_data`. `packpicture.ts` had always cut
       the prefix; this did not. */
    const url = canvas.toDataURL('image/png');
    return { data: url.slice(url.indexOf(',') + 1), mime: 'image/png' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Ask for a picture. The route charges, draws, and refunds if the drawing
 * fails; a refusal comes back as its sentence, which the room shows.
 */
export async function makeKidPicture(
  words: string,
  from?: { data: string; mime: string } | null,
): Promise<{ picture: Blob } | { says: string }> {
  /* The header only when there is a session: `callerFrom` on the route
     reads it and answers "Sign in first" itself, in its own words, which
     is the one sentence and not two. */
  const token = await accessToken();
  const abort = new AbortController();
  const bell = setTimeout(() => abort.abort(), 120_000);
  try {
    const answer = await fetch('/api/google/picture', {
      signal: abort.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      /* Marked as the kids room's, so the route lets it through on a kids
         pack without a plan (`kidsCovers`). */
      body: JSON.stringify({ words, aspect: '1:1', kids: true, ...(from ? { from } : {}) }),
    });
    if (!answer.ok) {
      const detail = (await answer.json().catch(() => ({}))) as { message?: string };
      return { says: detail.message ?? 'That picture could not be made. Try another one.' };
    }
    return { picture: await answer.blob() };
  } catch {
    return { says: 'That could not be sent. Check the connection and try again.' };
  } finally {
    clearTimeout(bell);
  }
}

/**
 * Asking Gemini what is in a photograph.
 *
 * ── Why this is its own file ─────────────────────────────────────────────
 *
 * Because it is the only part that needs a key, and `lib/grabobject.ts` —
 * what to ask, how to read the answer, how to turn a mask into a cut — is
 * all the parts that do not. That split is what lets `check:gryp` drive
 * every rule that can go wrong without a network, a key, or a rand spent.
 *
 * The same shape as `lib/server/hearword.ts`, deliberately: one model, one
 * `generateContent`, JSON asked for by `responseMimeType`, and a refusal
 * that says what came back rather than "that did not work".
 */

import { addressOf, flashCall } from './google';
import { ASK, readFound, type Found } from '../grabobject';

/**
 * The model that looks.
 *
 * The same Flash that reads a spoken word for the pronunciation dictionary
 * — `hearword.ts` — and for the same reason: it is the one on her Model
 * Garden listing badged Serverless, which means it has an address, and it
 * takes a picture in the same turn as a question.
 */
export const LOOKER = 'gemini-2.5-flash';

/** The request, as its own function so a check can read it without a key. */
export function lookBody(picture: { data: string; mime: string }): string {
  return JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        /* The picture BEFORE the question. A model reads a turn in order,
           and `picture.ts` has the longer note about why that matters. */
        { inlineData: { mimeType: picture.mime, data: picture.data } },
        { text: ASK },
      ],
    }],
    generationConfig: {
      /* Nought. This is a measurement, not a composition: a model inventing
         variety here is a model inventing where things are. */
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });
}

export type Looked =
  | { readonly ok: true; readonly found: Found[] }
  | { readonly ok: false; readonly status: number; readonly message: string };

/** What the model said, read into boxes and masks. */
export async function lookAt(
  picture: { data: string; mime: string },
  wide: number,
  tall: number,
  model: string = LOOKER,
): Promise<Looked> {
  let answer: Response;
  try {
    /* Walks on to a later Flash if this one has been switched off. */
    ({ response: answer } = await flashCall((one) => fetch(addressOf(one, 'generateContent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '',
      },
      body: lookBody(picture),
    }), model));
  } catch {
    return { ok: false, status: 502, message: 'The engine could not be reached.' };
  }
  const text = await answer.text().catch(() => '');
  if (!answer.ok) {
    return {
      ok: false,
      status: answer.status,
      message: text.slice(0, 300) || `The engine answered ${answer.status}.`,
    };
  }

  /* The answer is wrapped in Gemini's envelope; the JSON this app wants is
     the text part inside it. Read defensively, because an envelope that
     changes shape is a thing to report rather than to crash on. */
  let said = '';
  try {
    const body = JSON.parse(text) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    said = body.candidates?.[0]?.content?.parts?.map((one) => one.text ?? '').join('') ?? '';
  } catch {
    said = '';
  }

  const found = readFound(said, wide, tall);
  if (!found.length) {
    return {
      ok: false,
      status: 502,
      /* Said rather than swallowed. "Nothing found" and "the answer was in a
         shape this app cannot read" look identical from a button, and only
         one of them is worth telling somebody to try another picture. */
      message: said
        ? 'The engine finished but named nothing this app could place in the'
          + ` picture. The answer began: ${said.slice(0, 200)}`
        : 'The engine answered in a shape this app could not read.',
    };
  }
  return { ok: true, found };
}

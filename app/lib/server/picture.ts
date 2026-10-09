/**
 * Nano Banana: a picture made from words, or a picture changed by words.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Ek dink ons moet dan lyria, nano banana en veo
 * gebruik."* Lyria makes the songs and Veo makes the clips. Nano Banana was
 * chosen the same day, named on the setup page, written into `CHOSEN.image`
 * — and nothing in the app ever called it. A model picked and never wired is
 * the sort of thing that reads as done for a month.
 *
 * ── The part that is new, and not album art ──────────────────────────────
 *
 * The photo editor crops, puts words on a still, and takes a background off,
 * all in the browser and all free. It deliberately does NOT make album art —
 * a cover is generated on the spot or bought from an artist, and that is a
 * decision about paying artists rather than a gap. Nothing here changes
 * that: cover art still goes through `lib/server/cover.ts`.
 *
 * What the editor cannot do at all is change what is IN a picture. Carli
 * sent a Model Garden sample on 9 October 2026 doing exactly that — a chat
 * where each turn hands back a new version of the same image. That is the
 * thing being built here: say what to change, get the picture back changed.
 *
 * ── The address, and why it is the unregional one ────────────────────────
 *
 * Her own Model Garden card gives `locations/global` and `generateContent`
 * for this model, which is a different shape again from the other two:
 * Lyria is `interactions`, Veo is a long-running publisher job, and this is
 * an ordinary Gemini call. `MODELS` in `google.ts` carries `where: 'global'`
 * on it so `addressOf` builds the unregional host, and a check holds that —
 * a regional host answers 404 for a global model, which reads exactly like
 * a wrong model name and costs an afternoon.
 *
 * ── camelCase on the wire, snake_case in her sample ──────────────────────
 *
 * Her sample is python, and the python SDK writes proto field names in
 * snake_case: `response_modalities`, `image_config`, `thinking_config`.
 * Google's JSON mapping accepts both spellings, and the REST documentation
 * is camelCase, so that is what goes out here. Both are read coming back,
 * because what a server actually sends is not a thing to be confident about:
 * `inlineData` and `inline_data` have both been seen off Vertex.
 */

import { MOST_PICTURES } from '../picturelimit';
import { CHOSEN, addressOf, configured as googleOn } from './google';

/**
 * The size asked for, and why it is asked for rather than left to the model.
 *
 * Carli sent the price layout on 9 October 2026, and the thing that matters
 * in it is not any one number — it is that **the price is per
 * resolution**. For this model, Nano Banana 2.1: about $0.0336 at 1K and
 * $0.0504 at 2K, with 4K unquoted.
 *
 * The first version of this file sent no size at all and let the model
 * decide. That is a cost this app cannot predict, counted against a ceiling
 * that is supposed to be predictable — and worse, it is the SAME fault as
 * every other one this week: not knowing a number and carrying on anyway.
 * The fix for an unknown price is not a bigger guess, it is to stop leaving
 * the choice to somebody else.
 *
 * 2K rather than 1K because what comes in here is a phone photograph, twelve
 * megapixels of it, and handing that back at 1024 across is a visible
 * softening of her own picture for the sake of a cent and a half. 2K is
 * 2048, which is larger than anything social media shows.
 */
const SIZE = '2K';

/**
 * Micro-dollars one picture costs us, at the size above.
 *
 * $0.06, against the $0.0504 quoted for 2.1 at 2K. The buffer is about a
 * fifth and it is deliberate: her figures come from fal.ai and a summary
 * site rather than from Google's own billing page, and there is a
 * grounding option that adds $0.015 a call for anybody who ever switches it
 * on. Over-counting binds our own ceiling early, which is an annoyance with
 * a visible cause. Under-counting is a bill nobody saw coming.
 *
 * ── What this was, and what that would have cost ────────────────────────
 *
 * 150 000. I set it at $0.15 on the rule that an unread price is taken at
 * the expensive end — and $0.15 turns out to be **Nano Banana Pro**, a
 * different model, three times this one. The rule was right and the number
 * was somebody else's. It would have made `GOOGLE_CAP_IMAGE` pause pictures
 * after 66 a month instead of 166, which is the harmless direction, but it
 * is still a figure that was never read.
 *
 * ── Pro is the one to remember ──────────────────────────────────────────
 *
 * $0.15 at 1K or 2K, and it is the "thinking" model — the one that is
 * good at complicated scenes and, the part that matters here, at **words
 * inside a picture**. A poster with text on it is exactly what this room
 * makes. Not built: the room sets its own words on top with a real font,
 * which is sharper than any model draws them. Written down in
 * `docs/OPEN-QUESTIONS.md` rather than guessed at later.
 *
 * Every call writes down what it was charged at as well as what ran, so the
 * first real Google bill replaces this with one query.
 */
export const PER_PICTURE = 60_000;

export function configured(): boolean {
  return googleOn();
}

/** A picture going in: base64 without the `data:` preamble, and its type. */
export interface Given {
  readonly data: string;
  readonly mime: string;
}

export type Drawn =
  | { readonly ok: true; readonly image: Buffer; readonly type: string; readonly under: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? value as Record<string, unknown> : null;

/**
 * Which field the picture came back under, on the last call that found one.
 *
 * The same device as `lyria.ts`: the response shape was never measured from
 * this machine, so the reader tries several and the route puts the winner in
 * a header. One real press then settles it without anybody reading a log.
 */
export let foundUnder: string | null = null;

/**
 * The picture out of whatever shape the answer takes.
 *
 * Exported so a check can drive it with no network at all. Guessing one
 * field name would mean a paid picture thrown away because the server called
 * it something else — which is exactly what nearly happened with video, and
 * `check:veo` only caught it because the reader was testable.
 */
export function pictureIn(body: unknown): { base64: string; mime: string; under: string } | null {
  const top = asRecord(body);
  if (!top) return null;
  const candidates = Array.isArray(top.candidates) ? top.candidates : [];
  for (const [index, one] of candidates.entries()) {
    const content = asRecord(asRecord(one)?.content);
    const parts = Array.isArray(content?.parts) ? content!.parts : [];
    for (const [at, part] of parts.entries()) {
      const row = asRecord(part);
      if (!row) continue;
      /* Both spellings. Vertex has answered in each of them. */
      const inline = asRecord(row.inlineData) ?? asRecord(row.inline_data);
      const data = inline?.data;
      if (typeof data !== 'string' || data.length < 1024) continue;
      const mime = inline?.mimeType ?? inline?.mime_type;
      return {
        base64: data,
        mime: typeof mime === 'string' && mime ? mime : 'image/png',
        under: `candidates[${index}].content.parts[${at}].`
          + (row.inlineData ? 'inlineData' : 'inline_data'),
      };
    }
  }
  return null;
}

/**
 * Anything the model said in words, which is sometimes the refusal.
 *
 * A safety block comes back as a 200 with text and no picture. Reporting
 * that as "the picture was not where this app looked for it" would send
 * somebody looking for a field-name bug that is not there, so the words are
 * read and handed on.
 */
export function wordsIn(body: unknown): string[] {
  const top = asRecord(body);
  const out: string[] = [];
  const candidates = Array.isArray(top?.candidates) ? top!.candidates : [];
  for (const one of candidates) {
    const content = asRecord(asRecord(one)?.content);
    const parts = Array.isArray(content?.parts) ? content!.parts : [];
    for (const part of parts) {
      const said = asRecord(part)?.text;
      if (typeof said === 'string' && said.trim()) out.push(said.trim());
    }
    /* Why it stopped, where it stopped for a reason. `SAFETY` and
       `PROHIBITED_CONTENT` arrive here and nowhere else. */
    const why = asRecord(one)?.finishReason ?? asRecord(one)?.finish_reason;
    if (typeof why === 'string' && why && why !== 'STOP') out.push(`(${why})`);
  }
  return out;
}

/**
 * Ask for a picture.
 *
 * @param words  What it should be, or what to change about `from`.
 * @param from   A picture to change. Leaving it out means draw a new one.
 * @param aspect Google's own aspect strings. Left out, the model decides,
 *               which is right for an edit: forcing a ratio on a picture
 *               somebody is editing crops their own photograph.
 */
/* How many pictures may go in at once, and why three: `lib/picturelimit.ts`.
   Re-exported so the route and this file name the same thing. */
export { MOST_PICTURES };

export async function makePicture(
  words: string,
  from?: Given | readonly Given[],
  aspect?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
  model: string = CHOSEN.image,
): Promise<Drawn> {
  if (!configured()) {
    return { ok: false, status: 503, message: 'The picture engine is not switched on yet.' };
  }

  /* The picture goes BEFORE the words, which is the one ordering detail in
     her sample that is not cosmetic: Gemini reads a conversation in order,
     and an instruction that arrives before the thing it is about is an
     instruction about nothing. */
  const parts: unknown[] = [];
  /* Every picture, in the order they were given. The order is not cosmetic:
     a model reading "put the first person into the second scene" needs them
     in the order the sentence names them. */
  const given = from ? (Array.isArray(from) ? from : [from as Given]) : [];
  for (const one of given.slice(0, MOST_PICTURES)) {
    parts.push({ inlineData: { mimeType: one.mime, data: one.data } });
  }
  parts.push({ text: words });

  let answer: Response;
  try {
    answer = await fetch(addressOf(model, 'generateContent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          /* Both, not IMAGE alone. The model is a chat model that happens to
             draw: asked for an image only, it has nowhere to put a refusal,
             and a refusal with nowhere to go comes back as an empty answer
             that reads like a broken reader. */
          responseModalities: ['TEXT', 'IMAGE'],
          /* The size always, the ratio only where one was asked for. A
             ratio forced onto a picture somebody is editing crops their own
             photograph; a size left out is a bill we cannot predict. */
          imageConfig: { imageSize: SIZE, ...(aspect ? { aspectRatio: aspect } : {}) },
        },
      }),
    });
  } catch {
    return { ok: false, status: 502, message: 'The picture engine could not be reached.' };
  }

  const text = await answer.text().catch(() => '');
  if (!answer.ok) {
    /* Google's own words. A sentence invented here would hide the one thing
       worth seeing, which is what they actually objected to. */
    return {
      ok: false,
      status: answer.status,
      message: text.slice(0, 300) || `The picture engine answered ${answer.status}.`,
    };
  }

  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  const got = pictureIn(body);
  if (!got) {
    const said = wordsIn(body);
    /* A 200 with no picture in it is the expensive failure: Google has been
       paid and the picture is on the floor. It is reported as itself, with
       whatever the model said, rather than as "that did not work". */
    return {
      ok: false,
      status: 502,
      message: said.length
        ? `The engine answered in words instead of a picture: ${said.join(' ').slice(0, 300)}`
        : `The engine finished but the picture was not where this app looked`
          + ` for it. The answer began: ${text.slice(0, 200)}`,
    };
  }
  foundUnder = got.under;
  return {
    ok: true,
    image: Buffer.from(got.base64, 'base64'),
    type: got.mime,
    under: got.under,
  };
}

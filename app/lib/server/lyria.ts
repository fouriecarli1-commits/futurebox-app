/**
 * A song out of Lyria, and reading an answer nobody here has seen.
 *
 * ── What is known and what is not ────────────────────────────────────────
 *
 * Known, because it was measured on 8 October 2026 against her own project:
 * `lyria-002` is there, it is allowed, and it refuses an empty body on its
 * contents. The address and the key both work.
 *
 * Not known: the exact field the audio comes back in. Google's page says the
 * response is base64 WAV and 32.8 seconds; what it does not say, anywhere
 * this machine can reach, is whether that lives under
 * `predictions[].bytesBase64Encoded`, `predictions[].audioContent`, or
 * something else again. The proxy here blocks Google's documentation.
 *
 * ── So the reader tries, and then says which one worked ──────────────────
 *
 * Guessing one name and shipping it means a successful, PAID call whose
 * audio is thrown away because the field was called something else — and a
 * member seeing "that did not work" for a song Google made and billed.
 *
 * `audioIn` tries every plausible name, and `foundUnder` reports which one
 * answered. The first real song settles it, and then this comment and that
 * list both get shorter.
 */

import { CHOSEN, configured, interactionsAddress } from './google';

/** Where the audio was found, so the guessing can stop after the first song. */
export let foundUnder: string | null = null;

/** Every name the bytes might be under, most likely first. */
export const FIELDS = [
  'bytesBase64Encoded',
  'audioContent',
  'audio',
  'content',
  'data',
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  (value && typeof value === 'object' ? value as Record<string, unknown> : null);

/**
 * The base64 audio out of whatever shape came back.
 *
 * Exported so `check:lyria` can drive it over every shape without a network
 * and without a key — which is the only way to test a reader for an answer
 * nobody has seen.
 */
export function audioIn(body: unknown): { base64: string; under: string } | null {
  const top = asRecord(body);
  if (!top) return null;
  /* ── `outputs`, and the row that calls itself audio ────────────────
 
     Measured, at last. Carli's own Model Garden page, 9 October 2026:
 
       { "status": "completed",
         "outputs": [ { "text": "LYRICS", "type": "text" },
                      { "text": "DESCRIPTION", "type": "text" },
                      { "mime_type": "", "data": "…", "type": "audio" } ] }
 
     So the song is in `outputs`, under `data`, in the row whose `type` is
     `audio` — and the list also carries the WORDS and a description, which
     is a feature nobody here knew about.
 
     Picking by `type` rather than by taking the first long string matters:
     the lyrics are a long string too, and a reader that grabbed the longest
     field would hand somebody a .wav full of text. */
  const outputs = Array.isArray(top.outputs) ? top.outputs : null;
  if (outputs) {
    for (const one of outputs) {
      const row = asRecord(one);
      if (!row || row.type !== 'audio') continue;
      const got = row.data;
      if (typeof got === 'string' && got.length > 512) return { base64: got, under: 'outputs[audio].data' };
    }
  }
  /* The older shapes, kept as a fallback. `lyria-002` is a publisher model
     on `:predict` and answers differently, and a project that has that one
     and not the new one should still make a song rather than meet a reader
     that only knows one API. */
  const list = Array.isArray(top.predictions) ? top.predictions
    : Array.isArray(top.candidates) ? top.candidates
      : [top];
  for (const one of list) {
    const row = asRecord(one);
    if (!row) continue;
    for (const name of FIELDS) {
      const got = row[name];
      /* Long enough to be audio rather than a status word. A field called
         `data` holding "ok" is not a song, and taking it would hand somebody
         a file of three bytes. */
      if (typeof got === 'string' && got.length > 512) return { base64: got, under: name };
    }
  }
  return null;
}

/**
 * The words Lyria wrote, when it wrote any.
 *
 * Her page shows the model answering with LYRICS and a DESCRIPTION beside
 * the audio. This app has never asked for either and has a whole lyric desk
 * of its own, so nothing acts on them yet — but they are read out here
 * rather than thrown away, because "the engine also sends the words" is a
 * fact worth having in one place when somebody wants them.
 */
export function wordsIn(body: unknown): string[] {
  const top = asRecord(body);
  const outputs = top && Array.isArray(top.outputs) ? top.outputs : [];
  return outputs
    .map((one) => asRecord(one))
    .filter((row): row is Record<string, unknown> => Boolean(row) && row?.type === 'text')
    .map((row) => (typeof row.text === 'string' ? row.text : ''))
    .filter(Boolean);
}

export type Made =
  | { readonly ok: true; readonly audio: Buffer; readonly type: string; readonly under: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

/**
 * Ask Lyria for a song.
 *
 * `negative` is the one dial Google's own page documents beside the prompt,
 * and it earns its place: "no vocals" is how an instrumental is asked for,
 * and this app's booth needs both.
 */
export async function makeSong(
  prompt: string,
  negative = '',
  seed?: number,
  model: string = CHOSEN.music,
): Promise<Made> {
  if (!configured()) {
    return { ok: false, status: 503, message: 'The music engine is not switched on yet.' };
  }
  /* ── The interactions API, which is not the publisher one ──────────
 
     From her own Model Garden page, 9 October 2026. The model goes in the
     BODY, the input is a list of typed parts, and the address has no model
     in it at all:
 
       POST …/v1beta1/projects/{project}/locations/global/interactions
       { "model": "lyria-3-pro-preview",
         "input": [ { "type": "text", "text": "…" } ] }
 
     `negative` and `seed` are dropped here rather than carried over from
     the `:predict` shape: nothing on her page shows where they go, and a
     field invented to look thorough is a 400 on the first real song, or
     worse, silently ignored while the booth believes it asked.
 
     `negative` mattered — it is how an instrumental is asked for — so it is
     folded into the words instead, which is the one place her page shows
     text going. Said out loud because it is a downgrade, not a translation.
 
     The curl on her page signs with `gcloud auth print-access-token`, an
     OAuth token, not an API key. Whether this endpoint takes the key this
     app holds is the one thing still unmeasured, and the first real song
     settles it: a 401 saying "API keys are not supported" is that answer,
     and it is a different fix from anything here. */
  const words = negative ? `${prompt}\n\nAvoid: ${negative}` : prompt;
  let response: Response;
  try {
    response = await fetch(interactionsAddress(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '',
      },
      body: JSON.stringify({
        model,
        input: [{ type: 'text', text: words }],
      }),
    });
  } catch {
    return { ok: false, status: 502, message: 'The music engine could not be reached.' };
  }

  const text = await response.text().catch(() => '');
  if (!response.ok) {
    /* Their words where there are any. A sentence invented here would hide
       the one thing worth seeing: what Google actually objected to. */
    return {
      ok: false,
      status: response.status,
      message: text.slice(0, 300) || `The music engine answered ${response.status}.`,
    };
  }

  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  const got = audioIn(body);
  if (!got) {
    /* A 200 with nothing readable in it is the expensive failure: Google has
       been paid and the audio is on the floor. It must not be reported as
       "that did not work" and left there. */
    return {
      ok: false,
      status: 502,
      message: 'The engine answered but the audio was not where this app looked for it.'
        + ` The answer began: ${text.slice(0, 200)}`,
    };
  }
  foundUnder = got.under;
  return {
    ok: true,
    audio: Buffer.from(got.base64, 'base64'),
    type: 'audio/wav',
    under: got.under,
  };
}

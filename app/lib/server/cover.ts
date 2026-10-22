/**
 * Cover art, through the key this app already has.
 *
 * `POST /v1/flows/image` is the same broker as the video: one ElevenLabs key,
 * several models behind it. A cover needs no new account and no new invoice,
 * which is most of why it is worth having at all.
 *
 * ── Why the cheapest model, deliberately ─────────────────────────────────
 *
 * A cover is a square that sits at 200 pixels on a card and 1400 on a store
 * page, seen for two seconds, and regenerated the moment somebody dislikes it.
 * The flash-lite model is the right instrument for that, and paying four times
 * as much for detail nobody will look at is a way to make covers too expensive
 * to offer at all. Set ELEVEN_IMAGE_MODEL to move it.
 *
 * ── Where it goes ────────────────────────────────────────────────────────
 *
 * Beside the audio in the `tracks` bucket, at `<owner>/<trackId>.cover.png`.
 * That is a deliberate choice over a column on the tracks table: no migration,
 * so this ships without waiting on anybody to run SQL, and account deletion
 * already sweeps every file under `<owner>/` so a cover cannot outlive the
 * account that made it.
 *
 * The wire format is read from @elevenlabs/elevenlabs-js's serializers, so the
 * names below are what actually goes on the wire.
 */

import { noteCost } from './eleven.ts';
import { call as askSupplier, ready } from './suppliers';

/* The path only — the host and the key belong to whoever serves
   `coverart`. See `lib/server/suppliers.ts`: this file having its own
   client is how this capability went uncounted. */
const BASE = '/v1/flows/image';

const key = (): string => (ready('coverart') ? 'set' : '');

const MODEL = process.env.ELEVEN_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';

export function configured(): boolean {
  return Boolean(key());
}

interface Envelope {
  id?: string;
  status?: string;
  content_url?: string;
  error_message?: string;
  detail?: unknown;
}

/**
 * @param note  What to file this call's real cost under, or nothing to file
 *              none. Only the call that starts a generation passes one; see
 *              the same parameter in `video/eleven.ts` for why a poll does not.
 */
async function call(
  path: string,
  init?: RequestInit,
  note?: string,
  credits?: number,
): Promise<Envelope | null> {
  if (!key()) return null;
  try {
    const response = await askSupplier('coverart', BASE + path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    /* A cover is the cheapest thing on the desk and was still the second of
       two ElevenLabs paths charging this account without writing down what it
       cost. Cheap is not the same as free, and "cheap" was itself a guess. */
    if (note) noteCost(response, note, credits);
    return (await response.json().catch(() => null)) as Envelope | null;
  } catch {
    return null;
  }
}

/**
 * The words that make a cover, from what is known about the song.
 *
 * Never the lyrics. A cover drawn from a lyric sheet turns out to be an
 * illustration of the words — a literal picture of a broken heart — which is
 * what an amateur sleeve looks like and what a real one never does. Sleeves
 * are made of mood, material and light. So this sends the style and the genre
 * and asks for an object or a place.
 *
 * ── The song's name, on the sleeve ────────────────────────────────────────
 *
 * It used to say "no text" on every cover, because image models wrote letters
 * that were almost words. The owner, 22 October 2026, sent the code she wants
 * it to follow: the title in quotes, asked for by name as "highly stylized,
 * unique, and readable typography". Image models spell a short quoted title
 * well now, so the name goes on by default — spelled exactly, once, and
 * nothing else written — and a person who wants a bare picture says so.
 */
export function coverPrompt(input: { title: string; genre: string; style: string; named?: boolean }): string {
  const feel = [input.genre, input.style].filter(Boolean).join(', ').slice(0, 300);
  /* Quotes and line breaks out of the title, so it cannot close the quote
     it sits in or carry an instruction of its own. */
  const title = input.title.replace(/["“”\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const named = input.named !== false && Boolean(title);
  return [
    'Professional album cover art. A single striking object or place, filling the frame.',
    feel ? `The mood is: ${feel}.` : '',
    'Strong directional light, deep shadow, cinematic, high quality.',
    named
      ? `The cover prominently features the song title "${title}", spelled exactly like that, in highly stylized, unique and readable typography that fits the mood. No other text, no logos, no faces, no people.`
      : 'No text, no letters, no words, no logos, no faces, no people.',
    'Square, printable, the kind of sleeve you would keep.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * The cover as Google's image model is asked for it: the song itself.
 *
 * The owner, 22 October 2026: *"Wanneer 'n liedjie op gemini gemaak word,
 * dan gooi hy dadelik dit uit met 'n relevante album art wat die liedjie
 * uitbeeld, met 'n titel op."* So this one is told what the song is about —
 * its words, cut short — and asked for a scene that captures its story and
 * feeling, not a literal drawing of every line, with the title lettered on
 * it the way her own code asks: quoted, exact, stylized and readable.
 */
export function songCoverPrompt(input: { title: string; genre: string; style: string; words?: string; named?: boolean }): string {
  const feel = [input.genre, input.style].filter(Boolean).join(', ').slice(0, 300);
  const title = input.title.replace(/["“”\n\r]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const named = input.named !== false && Boolean(title);
  /* Section markers out, lines joined: the model reads what the song says,
     not how the sheet is laid out. */
  const words = (input.words ?? '')
    .split('\n').map((line) => line.trim()).filter((line) => line && !/^\[[^\]]*\]$/.test(line))
    .join(' / ').slice(0, 900);
  return [
    'Create a professional, striking album cover for this song, square, the kind a label would release.',
    feel ? `The music is: ${feel}.` : '',
    words ? `The song's words, to show you what it is about (it may be in Afrikaans): ${words}` : '',
    'Capture the song\'s story and feeling in one strong image — a scene, place or symbol that fits it — rather than illustrating every line.',
    'Cinematic lighting, rich colour, high detail, a clear focal point.',
    named
      ? `Letter the title "${title}" on the cover, spelled exactly like that, in highly stylized, unique and readable typography that belongs to the image. No other text, no logos, no watermarks.`
      : 'No text, no letters, no logos, no watermarks.',
    'No real, recognisable people or celebrities.',
  ].filter(Boolean).join(' ');
}

export type Started =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

export async function startCover(prompt: string, credits?: number): Promise<Started> {
  if (!key()) {
    return { ok: false, status: 503, message: 'Cover art is not switched on for this app yet.' };
  }

  const body = await call('', {
    method: 'POST',
    body: JSON.stringify({
      model_id: MODEL,
      prompt: prompt.slice(0, 1500),
      aspect_ratio: '1:1',
      resolution: '1K',
    }),
  }, `image.${MODEL}`, credits);

  if (!body) return { ok: false, status: 502, message: 'The image engine could not be reached.' };
  if (!body.id) {
    const detail = body.detail as { message?: string } | string | undefined;
    const said =
      body.error_message ??
      (typeof detail === 'string' ? detail : detail?.message) ??
      null;
    return {
      ok: false,
      status: 502,
      message: said ? `The image engine refused it: ${said}` : 'The image engine refused it.',
    };
  }
  return { ok: true, id: body.id };
}

export type Progress =
  | { readonly state: 'running' }
  | { readonly state: 'done'; readonly url: string }
  | { readonly state: 'failed'; readonly message: string };

export async function checkCover(id: string): Promise<Progress> {
  const body = await call(`/${encodeURIComponent(id)}`);
  // Unreachable reads as still running, never as failed: guessing failure here
  // would charge somebody for a cover that was about to arrive.
  if (!body) return { state: 'running' };

  if (body.status === 'completed') {
    return body.content_url
      ? { state: 'done', url: body.content_url }
      : { state: 'failed', message: 'The engine finished but returned no image.' };
  }
  if (body.status === 'failed') {
    return { state: 'failed', message: body.error_message ?? 'The engine could not make that one.' };
  }
  return { state: 'running' };
}


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

const BASE = 'https://api.elevenlabs.io/v1/flows/image';

const key = (): string => process.env.ELEVENLABS_API_KEY ?? '';

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

async function call(path: string, init?: RequestInit): Promise<Envelope | null> {
  if (!key()) return null;
  try {
    const response = await fetch(BASE + path, {
      ...init,
      headers: { 'xi-api-key': key(), 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
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
 * and asks for an object or a place, and it says no text, because every image
 * model writes letters that are almost words and a cover with almost-words on
 * it is unusable.
 */
export function coverPrompt(input: { title: string; genre: string; style: string }): string {
  const feel = [input.genre, input.style].filter(Boolean).join(', ').slice(0, 300);
  return [
    'Album cover art. A single striking object or place, photographed, filling the frame.',
    feel ? `The mood is: ${feel}.` : '',
    'Strong directional light, deep shadow, one dominant colour.',
    'No text, no letters, no words, no logos, no faces, no people.',
    'Square, printable, the kind of sleeve you would keep.',
  ]
    .filter(Boolean)
    .join(' ');
}

export type Started =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

export async function startCover(prompt: string): Promise<Started> {
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
  });

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

export const COVER_MODEL = MODEL;

'use client';

/**
 * The song with the voice taken off it, and the voice on its own.
 *
 * Both halves earn their keep in the booth. The voice becomes a guide you can
 * sing next to and then turn down — people sing better beside somebody already
 * on the note, which is most of why choirs work — and it is a single voice, so
 * the melody can actually be read off it and put on the stave. The backing is
 * what your take gets mixed into, so the AI singer is not in the song you keep.
 *
 * Separating costs money upstream, so it happens once per song and is then
 * kept on the device next to the song itself, under its own ids.
 */

import { getAudio, putAudio } from './library';
import { accessToken } from './cloud';
import { TOO_BIG_TO_SEND, attach, dropWork } from './workfile';

export interface Stems {
  /** The AI voice on its own. */
  readonly vocals: Blob;
  /** Everything else: what your take is mixed into. */
  readonly music: Blob;
}

export const vocalsId = (id: string): string => `${id}:vocals`;
export const musicId = (id: string): string => `${id}:instrumental`;

/** What is already on this device, or null. */
export async function loadStems(id: string): Promise<Stems | null> {
  const [vocals, music] = await Promise.all([getAudio(vocalsId(id)), getAudio(musicId(id))]);
  return vocals && music ? { vocals, music } : null;
}

export interface Failed {
  readonly message: string;
  /** Set when the answer was "not you, not today" rather than a breakage. */
  readonly outOfAllowance?: boolean;
}

/**
 * Separate a song, keep both halves, hand them back.
 *
 * The whole audio file goes up, so this is deliberately not something a screen
 * does on its own — the booth asks first and says what it will spend.
 */
export async function separate(
  id: string,
  audio: Blob,
  seconds: number,
): Promise<Stems | Failed> {
  const form = new FormData();
  form.append('seconds', String(Math.round(seconds)));
  form.append('trackId', id);

  /* Over the wall, the song goes to storage first and only its key is posted.
     See `lib/workfile.ts`: a body over about four and a half megabytes is
     refused by the platform before the route runs, so the route's own
     twenty-five megabyte ceiling never got a word in. */
  const put = await attach(form, audio, 'file', 'song.mp3');
  if (!put.ok) return { message: TOO_BIG_TO_SEND };
  const key = put.key;

  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch('/api/stems', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch {
    return { message: 'Could not reach the app’s server. Check your connection and try again.' };
  }

  if (!response.ok) {
    if (key) void dropWork(key);
    /* A bare 413 is the platform refusing the body before the route ran, so
       there is no message in it to read — hence one written here. This is the
       number she saw. */
    let message =
      response.status === 413
        ? 'That song is too big to send in one piece. Try a shorter one.'
        : `The voice could not be separated (${response.status}).`;
    let outOfAllowance = false;
    try {
      const problem = (await response.json()) as { message?: string; error?: string };
      if (problem.message) message = problem.message;
      outOfAllowance = problem.error === 'out_of_allowance' || problem.error === 'signed_out';
    } catch {
      // The body was not json. The status line above already says enough.
    }
    return { message, outOfAllowance };
  }

  let form_: FormData;
  try {
    form_ = await response.formData();
  } catch {
    return { message: 'The separated song came back in a form the browser could not read.' };
  }
  const vocals = form_.get('vocals');
  const music = form_.get('instrumental');
  if (!(vocals instanceof Blob) || !(music instanceof Blob)) {
    return { message: 'The separated song came back without both halves in it.' };
  }

  await Promise.all([putAudio(vocalsId(id), vocals), putAudio(musicId(id), music)]);
  return { vocals, music };
}

export function failed(result: Stems | Failed): result is Failed {
  return typeof (result as Failed).message === 'string';
}

/** One part of a four-way split, under the name the service gave it. */
export interface Part {
  /** "vocals", "drums", "bass", "other" — Kits' own word for it. */
  readonly instrument: string;
  readonly audio: Blob;
}

/**
 * Split a song into its parts, not just its voice.
 *
 * ── Why this is a second function and not a flag on the first ────────────
 *
 * `separate` promises exactly two halves and its callers destructure them.
 * A flag that sometimes returned four would make every one of those callers
 * wrong in a way TypeScript could not see, because a `Stems` with extra
 * fields still type-checks.
 *
 * What they share is the route, the money path and the wall-avoiding upload —
 * `/api/stems` takes `parts=four` and does the rest.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does not keep anything. `separate` writes both halves into the device's
 * own store under the song's id, because the booth reads them back on the
 * next visit. Four parts arrive as four lanes in a session that is already
 * being edited; storing them under invented ids would leave four copies of
 * every song on the device with nothing that reads them again.
 *
 * And it never falls back to two. Kits' `stem-splits` is the only thing that
 * makes four; ElevenLabs makes the voice and the backing and no more. Handing
 * back two lanes to somebody who asked for four and paid for four is worse
 * than saying so — the route refuses and refunds, and the message arrives
 * here.
 */
export async function separateParts(
  audio: Blob,
  seconds: number,
): Promise<{ parts: Part[] } | Failed> {
  const form = new FormData();
  form.append('seconds', String(Math.round(seconds)));
  form.append('parts', 'four');

  const put = await attach(form, audio, 'file', 'song.mp3');
  if (!put.ok) return { message: TOO_BIG_TO_SEND };
  const key = put.key;

  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch('/api/stems', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch {
    return { message: 'Could not reach the app\u2019s server. Check your connection and try again.' };
  }

  if (!response.ok) {
    if (key) void dropWork(key);
    let message =
      response.status === 413
        ? 'That song is too big to send in one piece. Try a shorter one.'
        : `The song could not be split (${response.status}).`;
    let outOfAllowance = false;
    try {
      const problem = (await response.json()) as { message?: string; error?: string };
      if (problem.message) message = problem.message;
      outOfAllowance = problem.error === 'out_of_allowance' || problem.error === 'signed_out';
    } catch {
      // The body was not json. The status line above already says enough.
    }
    return { message, outOfAllowance };
  }

  let form_: FormData;
  try {
    form_ = await response.formData();
  } catch {
    return { message: 'The split came back in a form the browser could not read.' };
  }

  /* Every `parts` entry, named by its filename — which is the instrument the
     service called it. `getAll` rather than `get`: there is one field name
     and several values, which is how a multipart carries a list. */
  const parts: Part[] = [];
  for (const one of form_.getAll('parts')) {
    if (!(one instanceof File)) continue;
    parts.push({ instrument: one.name.replace(/\.[^.]+$/, ''), audio: one });
  }
  if (parts.length < 2) {
    return { message: 'The split came back with fewer parts than a split has.' };
  }
  return { parts };
}

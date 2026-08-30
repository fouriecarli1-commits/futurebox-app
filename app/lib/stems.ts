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
  form.append('file', audio, 'song.mp3');
  form.append('seconds', String(Math.round(seconds)));
  form.append('trackId', id);

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
    let message = `The voice could not be separated (${response.status}).`;
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

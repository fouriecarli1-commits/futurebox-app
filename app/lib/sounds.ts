/**
 * A sound of your own — what the browser knows about it.
 *
 * Training runs on ElevenLabs for five or ten minutes, so nothing here waits
 * for it. Creating hands back a row that says `pending`, and the screen asks
 * again while it is open. Everything else about a finetune — whose it is, how
 * many it is allowed to keep — is decided on the server, so this file makes no
 * claims about any of it.
 */

import { accessToken } from './cloud';

export interface Sound {
  readonly id: string;
  readonly name: string;
  readonly genre: string;
  /** 'channel' means trained on FutureBox's own songs; 'brought' on uploads. */
  readonly origin: string;
  readonly tracks: number;
  /** pending | in_progress | completed | failed | blocked. */
  readonly status: string;
  /** Their reason when it failed or was blocked. */
  readonly why?: string;
}

export interface Sounds {
  readonly configured: boolean;
  readonly signedIn: boolean;
  /** How many this plan may keep. Zero means the plan does not include it. */
  readonly keep: number;
  readonly mine: readonly Sound[];
}

export const NO_SOUNDS: Sounds = { configured: false, signedIn: false, keep: 0, mine: [] };

/** True while it is still training, which is the only reason to ask again. */
export function training(sound: Sound): boolean {
  return sound.status === 'pending' || sound.status === 'in_progress';
}

export async function loadSounds(): Promise<Sounds> {
  const token = await accessToken();
  const response = await fetch('/api/finetunes', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return NO_SOUNDS;

  const data = (await response.json().catch(() => null)) as Partial<Sounds> | null;
  if (!data) return NO_SOUNDS;
  return {
    configured: Boolean(data.configured),
    signedIn: Boolean(data.signedIn),
    keep: typeof data.keep === 'number' ? data.keep : 0,
    mine: data.mine ?? [],
  };
}

export interface TrainFrom {
  readonly blob: Blob;
  readonly filename: string;
}

/**
 * Send the songs up and start training.
 *
 * `origin` and the confirmation travel with the request because the server
 * refuses without them — a sound may only be trained on music the person owns,
 * and the confirmation is stored with the finetune.
 */
export async function train(
  name: string,
  genre: string,
  origin: 'channel' | 'brought',
  files: readonly TrainFrom[],
): Promise<{ ok: true; sound: Sound } | { ok: false; message: string; needsPlan?: boolean }> {
  const form = new FormData();
  form.append('name', name);
  form.append('genre', genre);
  form.append('origin', origin);
  form.append('confirm', 'my-music');
  for (const file of files) form.append('files', file.blob, file.filename);

  const token = await accessToken();
  const response = await fetch('/api/finetunes', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  }).catch(() => null);
  if (!response) return { ok: false, message: 'Could not reach the app. Try again in a moment.' };

  const data = (await response.json().catch(() => ({}))) as Partial<Sound> & {
    message?: string;
    needsPlan?: boolean;
  };
  if (!response.ok) {
    return { ok: false, message: data.message ?? 'That did not work.', needsPlan: data.needsPlan };
  }
  return {
    ok: true,
    sound: {
      id: data.id ?? '',
      name: data.name ?? name,
      genre: data.genre ?? genre,
      origin: data.origin ?? origin,
      tracks: data.tracks ?? files.length,
      status: data.status ?? 'pending',
    },
  };
}

export async function forgetSound(id: string): Promise<void> {
  const token = await accessToken();
  await fetch(`/api/finetunes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {});
}

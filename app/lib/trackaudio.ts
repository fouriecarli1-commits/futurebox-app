/**
 * Reading a track's audio, wherever it happens to live.
 *
 * A song made on this device is in IndexedDB. A song made on your phone has a
 * row on the account but no file here yet, so it is fetched once and kept, and
 * every screen after that finds it locally.
 */

import { getAudio, putAudio } from './library';
import { pullAudio } from './cloud';

export async function readAudio(id: string): Promise<Blob | null> {
  const local = await getAudio(id);
  if (local) return local;
  const remote = await pullAudio(id);
  if (remote) await putAudio(id, remote);
  return remote;
}

/**
 * How long a piece of audio actually is, read from the audio itself.
 *
 * The library prints a track's length, and arithmetic done before the file
 * exists only describes what was asked for. A real engine returns whatever it
 * returns. Null when the browser cannot decode it, so the caller can fall back
 * to what it asked for rather than showing nothing.
 */
export async function durationOf(blob: Blob): Promise<number | null> {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const context = new Ctx();
    try {
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      return decoded.duration;
    } finally {
      await context.close();
    }
  } catch {
    return null;
  }
}

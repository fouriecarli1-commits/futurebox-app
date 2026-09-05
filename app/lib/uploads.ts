/**
 * A song you brought in from a file, rather than made here.
 *
 * Every room that puts music under a picture — the video desk, the music
 * video room — read the channel and nothing else, so the only songs you
 * could use were the ones this app wrote. That is wrong for the obvious
 * case: somebody has a recording already and wants a video for it.
 *
 * These are kept apart from the channel on purpose. The channel is what you
 * made here; it syncs to your account, it is what gets posted, and a file
 * dragged in from a phone does not belong in it. So the audio goes into the
 * same IndexedDB store — that is what `readAudio` looks in, and every screen
 * that plays a song calls it — while the details live under their own key
 * and never reach the cloud.
 *
 * They persist, because a storyboard remembers which song is under it and a
 * board that reopened pointing at a song that had evaporated would be worse
 * than not offering this at all.
 */

import { deleteAudio, putAudio, type Track } from './library';
import { durationOf } from './trackaudio';

const KEY = 'futurebox.uploads.v1';

/** How big a file this will take. Bigger than any song, small enough to hold. */
export const BIGGEST_BYTES = 60 * 1024 * 1024;

/** How many are kept. The oldest goes when a new one arrives past this. */
const MOST = 12;

export function loadUploads(): Track[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Track[]) : [];
  } catch {
    return [];
  }
}

function saveUploads(list: readonly Track[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked. The song still works for this visit.
  }
}

/** The file's own name, without its extension, as the title. */
function titleOf(name: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
  return base.slice(0, 80) || 'Brought in';
}

/**
 * Take a file in and hand back the song it became.
 *
 * The length is read off the audio itself rather than guessed, because every
 * screen that uses this — the trim handles, the storyboard's runtime, the
 * clip start — does arithmetic with it. A file the browser cannot decode is
 * refused here rather than three screens later.
 */
export async function addUpload(file: File): Promise<Track> {
  if (file.size > BIGGEST_BYTES) throw new Error('too-big');
  const seconds = await durationOf(file);
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) throw new Error('unreadable');

  const id = `upload:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  await putAudio(id, file);

  const track: Track = {
    id,
    title: titleOf(file.name),
    genre: '',
    bpm: 0,
    key: '',
    lyrics: '',
    style: '',
    models: [],
    source: 'upload',
    seconds,
    createdAt: new Date().toISOString(),
    seed: 0,
  };

  const kept = [track, ...loadUploads()];
  for (const old of kept.slice(MOST)) await deleteAudio(old.id).catch(() => undefined);
  saveUploads(kept.slice(0, MOST));
  return track;
}

/** Take one back out, audio and all. */
export async function removeUpload(id: string): Promise<void> {
  saveUploads(loadUploads().filter((one) => one.id !== id));
  await deleteAudio(id).catch(() => undefined);
}

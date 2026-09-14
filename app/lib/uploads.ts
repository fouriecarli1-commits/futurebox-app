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

/**
 * A song somebody handed you, kept the way a brought-in file is.
 *
 * Not in the channel, for the same reason a file is not: the channel is what
 * you made, it syncs to your account, and it is what gets posted. Somebody
 * else's song is none of those. It is on your device because they put it in a
 * room with you, and `from` records whose it is so the app can say so wherever
 * it shows up rather than letting it quietly become yours.
 */
export async function keepGiven(
  track: Omit<Track, 'source'>,
  audio: Blob,
  from: string,
): Promise<Track> {
  const kept: Track = { ...track, source: 'upload', title: track.title, givenBy: from };
  await putAudio(kept.id, audio);
  const already = loadUploads().filter((one) => one.id !== kept.id);
  const list = [kept, ...already];
  for (const old of list.slice(MOST)) await deleteAudio(old.id).catch(() => undefined);
  saveUploads(list.slice(0, MOST));
  return kept;
}

/** Take one back out, audio and all. */
/**
 * Rename a brought-in song, name its artist, or keep the words that were
 * heard in it.
 *
 * ── Why an edit and not a re-add ─────────────────────────────────────────
 *
 * The title starts as the file's name with the extension taken off, which is
 * right for a first guess and wrong about as often as filenames are —
 * `WhatsApp Audio 2026-09-13 at 05.12.44` is not what a song is called. The
 * artist has never been asked at all.
 *
 * ── And the words ────────────────────────────────────────────────────────
 *
 * A brought-in song has no lyric sheet, so the words screen listens to it and
 * writes them out. That answer was kept only as timings, under the song's id
 * in `lyrictime`'s own store — which is enough to light a line while it plays
 * and not enough for the card outside to stop offering "Get the words" for
 * something already paid for. Writing them onto the row fixes both: the card
 * reads `lyrics` like it does for every other song, and a second press costs
 * nothing because `exactFor` finds them.
 *
 * Returns the new list, so a caller re-renders from what was written rather
 * than from what it hoped was written.
 */
export function editUpload(
  id: string,
  changes: { readonly title?: string; readonly by?: string; readonly lyrics?: string },
): Track[] {
  const list = loadUploads();
  const next = list.map((one) => {
    if (one.id !== id) return one;
    const title = changes.title?.trim();
    const by = changes.by?.trim();
    const lyrics = changes.lyrics?.trim();
    return {
      ...one,
      /* An empty title is not a rename, it is a typo somebody is halfway
         through. The old one stays rather than the card losing its name. */
      ...(title ? { title: title.slice(0, 80) } : {}),
      /* An emptied artist IS a change: clearing it is how somebody takes
         their name off a song they decided is not theirs to claim. */
      ...(changes.by === undefined ? {} : { by: by ? by.slice(0, 80) : undefined }),
      ...(lyrics ? { lyrics } : {}),
    };
  });
  saveUploads(next);
  return next;
}

export async function removeUpload(id: string): Promise<void> {
  saveUploads(loadUploads().filter((one) => one.id !== id));
  await deleteAudio(id).catch(() => undefined);
}

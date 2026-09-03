/**
 * Everything you made, in the room you made it in.
 *
 * Songs have had a library since the beginning. Nothing else has: a video, a
 * clip, a reading, a set of adverts — you either downloaded it in the minute it
 * appeared or it was gone. That is a bad deal at any price and an insulting one
 * at thirty credits, and it also removes the cheapest reassurance a paid button
 * can offer, which is seeing that the last three worked.
 *
 * ── Where things live ────────────────────────────────────────────────────
 *
 * The details here, the files in IndexedDB beside the songs. Same database,
 * same store, because a second one would mean two things to clear, two things
 * to quota, and two places to look when something is missing. `putAudio` is
 * named for what it first held rather than what it holds now; it takes a Blob
 * and does not care.
 *
 * Per device, like the song library, and for the same reason: there is no
 * account behind this. The rooms say so rather than letting somebody find out
 * on their phone.
 *
 * ── Why favourites are not decoration ────────────────────────────────────
 *
 * A history that grows without limit fills a browser's storage and then starts
 * failing writes — silently, on the write, which is the worst possible moment.
 * So it is capped, and something has to be thrown away.
 *
 * A favourite is the thing that is never thrown away. That is what the star
 * means here: not "I liked this" but "keep this when the rest goes". It makes
 * the cap safe to have, and it gives the star a job beyond sentiment.
 */

import { deleteAudio, getAudio, putAudio } from './library';
import type { SurfaceId } from './surfaces';

export type MakeKind = 'video' | 'clip' | 'audio' | 'text';

export interface Make {
  readonly id: string;
  /** The room it came out of. History is shown per room. */
  readonly surface: SurfaceId;
  readonly kind: MakeKind;
  readonly title: string;
  /** One line: the shot, the prompt, the angle. What it was made from. */
  readonly note?: string;
  readonly createdAt: string;
  readonly seconds?: number;
  /** For a file, so a download is named correctly. */
  readonly ext?: string;
  /** What it cost, so the history is also a receipt. */
  readonly credits?: number;
  /** Kept when the rest is evicted. See the note above. */
  readonly favourite?: boolean;
  /** For `text`, which is small enough to live here rather than in a blob. */
  readonly text?: string;
}

const KEY = 'futurebox.makes.v1';

/**
 * How many are kept per room.
 *
 * Enough to cover a working session and to compare a few attempts, not enough
 * to be an archive. An archive is a promise about somebody's storage that this
 * cannot keep — see the note about failing writes.
 */
const KEEP_PER_SURFACE = 24;

export function loadMakes(surface?: SurfaceId): Make[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Make[]) : [];
    const mine = surface ? all.filter((one) => one.surface === surface) : all;
    return mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function write(makes: readonly Make[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(makes));
  } catch {
    // Storage refused or full. The room keeps working for this visit; what it
    // must not do is throw in the middle of somebody's generation landing.
  }
}

/**
 * Keep this one, and drop what no longer fits.
 *
 * Eviction takes the oldest **unfavourited** entry in the same room, and the
 * files go with the details — an orphan blob in IndexedDB is invisible and
 * still counts against the quota, which is the worst kind of leak.
 */
export async function rememberMake(make: Make, blob?: Blob): Promise<void> {
  if (blob) await putAudio(make.id, blob);

  const all = loadMakes();
  const next = [make, ...all.filter((one) => one.id !== make.id)];

  const here = next.filter((one) => one.surface === make.surface);
  const over = here.length - KEEP_PER_SURFACE;
  const dropped: Make[] = [];
  if (over > 0) {
    // Oldest first among the ones nobody asked to keep.
    const candidates = here
      .filter((one) => !one.favourite)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    dropped.push(...candidates.slice(0, over));
  }

  const dropping = new Set(dropped.map((one) => one.id));
  write(next.filter((one) => !dropping.has(one.id)));
  await Promise.all(dropped.filter((one) => one.kind !== 'text').map((one) => deleteAudio(one.id)));
}

export async function forgetMake(id: string): Promise<void> {
  const all = loadMakes();
  const going = all.find((one) => one.id === id);
  write(all.filter((one) => one.id !== id));
  if (going && going.kind !== 'text') await deleteAudio(id);
}

/** Star it, or unstar it. Returns the list as it now stands. */
export function favouriteMake(id: string, yes: boolean): Make[] {
  const all = loadMakes().map((one) => (one.id === id ? { ...one, favourite: yes } : one));
  write(all);
  return all;
}

/** The file behind a make, or null when it has been evicted from under it. */
export function makeBlob(id: string): Promise<Blob | null> {
  return getAudio(id);
}

/** An id that sorts and reads sensibly, and cannot collide within a session. */
export function makeId(surface: SurfaceId): string {
  return `make:${surface}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

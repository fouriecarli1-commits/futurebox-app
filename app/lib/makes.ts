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
  /**
   * How big the file is, recorded when it was written.
   *
   * Because a count is the wrong cap for a room whose output is a whole film.
   * See `roomFor` below: twenty-four readings is a few megabytes and
   * twenty-four stitched films is most of a phone.
   */
  readonly bytes?: number;
}

const KEY = 'futurebox.makes.v1';

/**
 * How many are kept per room.
 *
 * Enough to cover a working session and to compare a few attempts, not enough
 * to be an archive. An archive is a promise about somebody's storage that this
 * cannot keep — see the note about failing writes.
 */
export const KEEP_PER_SURFACE = 24;

/**
 * And how many bytes, per room, which is the cap that actually binds.
 *
 * ── Why a count was not enough ───────────────────────────────────────────
 *
 * Twenty-four was written for clips, readings and sets of adverts: tens of
 * kilobytes to a few megabytes each, where a count is a fine proxy for size.
 * The cutting room's output is a whole stitched film — a two-minute upright
 * film at 1080p is about eighty megabytes — so twenty-four of those is nearly
 * two gigabytes, which is most of a browser's quota and all of some phones.
 *
 * And the way that fails is the way this file's own opening note warns about:
 * the quota runs out on the NEXT write, silently, at the moment somebody is
 * saving something. Filling her phone to avoid losing a film is a worse
 * outcome than losing the film.
 *
 * So the budget is bytes, the count stays as a second ceiling, and `roomFor`
 * honours both. Two hundred and fifty megabytes is three or four films, or
 * every reading and clip a working week produces.
 */
export const KEEP_BYTES_PER_SURFACE = 250 * 1024 * 1024;

/**
 * And the largest single thing worth keeping, which is half the budget.
 *
 * The same rule `brought.ts` arrived at for the same reason: without it one
 * enormous film evicts everything else in the room and then sits there as the
 * only thing in the history. A file bigger than this is not kept at all, and
 * the caller is told so — see `rememberMake`'s answer.
 */
export const MOST_ONE_MAKE = KEEP_BYTES_PER_SURFACE / 2;

/** What the things in one room's history add up to. */
export function usedBytes(here: readonly Make[]): number {
  return here.reduce((all, one) => all + (one.bytes ?? 0), 0);
}

/**
 * Who goes, so that one more fits — pure, with the writing kept out of it.
 *
 * Eviction is the part of a history that loses somebody's work, and it is
 * invisible until after it has: a history that drops the wrong thing looks
 * exactly like one that is working, right up to the moment she goes looking
 * for the film she starred. So the decision is a function with no storage in
 * it and `check:history` executes it, the way `check:brought` does `roomFor`.
 *
 * Starred things are never dropped. If the starred ones alone are over the
 * budget, nothing is dropped and the arriving file is refused rather than
 * something she asked to keep being taken — that is what the star promises.
 */
export function roomFor(
  here: readonly Make[],
  coming: Make,
): { readonly drop: readonly Make[]; readonly fits: boolean } {
  const size = coming.bytes ?? 0;
  if (size > MOST_ONE_MAKE) return { drop: [], fits: false };

  /* Oldest first among the ones nobody asked to keep, which is the order they
     are given up in. */
  const goable = here
    .filter((one) => !one.favourite && one.id !== coming.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const drop: Make[] = [];
  const left = () => here.filter((one) => !drop.some((gone) => gone.id === one.id) && one.id !== coming.id);

  /* Both ceilings, and the loop stops when there is nothing left it may take
     rather than when the sums come right — otherwise a room full of starred
     films is an endless loop. */
  for (const one of goable) {
    if (left().length + 1 <= KEEP_PER_SURFACE
      && usedBytes(left()) + size <= KEEP_BYTES_PER_SURFACE) break;
    drop.push(one);
  }

  const fits = left().length + 1 <= KEEP_PER_SURFACE
    && usedBytes(left()) + size <= KEEP_BYTES_PER_SURFACE;
  return { drop, fits };
}

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
/**
 * Put one away.
 *
 * Answers whether it was kept, rather than throwing or going quiet: a file too
 * big for the budget is a real case — one stitched film can be bigger than
 * half the room's allowance — and the room has to be able to say so instead of
 * leaving her to find an empty history later.
 *
 * The size is read off the blob rather than taken on trust, so the budget is
 * counted in the bytes actually written.
 */
export async function rememberMake(make: Make, blob?: Blob): Promise<boolean> {
  const sized: Make = blob ? { ...make, bytes: blob.size } : make;

  const all = loadMakes();
  const here = all.filter((one) => one.surface === sized.surface);
  const { drop, fits } = roomFor(here, sized);
  if (!fits) return false;

  if (blob) await putAudio(sized.id, blob);

  const next = [sized, ...all.filter((one) => one.id !== sized.id)];
  const dropping = new Set(drop.map((one) => one.id));
  write(next.filter((one) => !dropping.has(one.id)));
  await Promise.all(drop.filter((one) => one.kind !== 'text').map((one) => deleteAudio(one.id)));
  return true;
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

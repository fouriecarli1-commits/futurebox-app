'use client';

/**
 * The songs a child made, kept on the device.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Gaan aan met die kind se liedjies wat keepbaar
 * is."*
 *
 * A child's song played in the room and was gone when the page closed. That
 * is the fault `filmkeep.ts` calls the worst class this app can have — work
 * that stops existing — and it is worse here than anywhere else, because the
 * song cost real credits out of an allowance a parent set, and because the
 * person it happens to is six and will simply think the app ate it.
 *
 * ── Why not her library ──────────────────────────────────────────────────
 *
 * The studio's Library is her catalogue. A child's nine attempts at a song
 * about a dog are not, and the kids room has deliberately never written
 * there — `kidsallowance.ts` carries that decision, which is also why a
 * child's song has no cover: `/api/cover` needs a saved track and the room
 * does not save one.
 *
 * So a shelf of their own, on the device, beside the stories. Same
 * behaviour, same cap that refuses rather than deletes, and the same
 * property that matters most in that room: playing one back costs nothing,
 * because it was paid for when it was made.
 */

import { shelfOf, type Put } from './ondevice';

const DB_NAME = 'futurebox-kidsongs';
const SHELF = 'songs';

/**
 * How many songs one child's shelf holds.
 *
 * Eight. A minute of audio is a couple of megabytes, so the number is not
 * about space — it is about a shelf a child can still look at. Past about
 * eight it stops being "my songs" and becomes a list.
 */
export const MOST_SONGS = 8;

export type { Put };

export interface KeptSong {
  readonly id: string;
  /** What it is called on the shelf. */
  readonly title: string;
  readonly made: number;
  readonly audio: Blob;
  /** What it was about and how it sounds, so the shelf can draw the picture. */
  readonly topic: string;
  readonly sound: string;
}

/** Everything on the shelf, newest first. */
const shelf = shelfOf<KeptSong>({
  database: DB_NAME,
  store: SHELF,
  most: MOST_SONGS,
  /* A row with no audio is a half-written one, not a song. */
  sound: (one) => one.audio instanceof Blob && one.audio.size > 0,
});

export const keepSong = (song: KeptSong): Promise<Put> => shelf.keep(song);
export const allSongs = (): Promise<KeptSong[]> => shelf.all();
export const forgetSong = (id: string): Promise<void> => shelf.forget(id);

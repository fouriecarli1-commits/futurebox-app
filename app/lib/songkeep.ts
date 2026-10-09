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
 * So a shelf of their own, beside the stories. Same cap that refuses rather
 * than deletes, and the same property that matters most in that room:
 * playing one back costs nothing, because it was paid for when it was made.
 *
 * ── On the account since 9 October ───────────────────────────────────────
 *
 * It was on the device for a day. Carli, as soon as she saw it working:
 * *"Skuif die stories en liedjies na die server toe."* A song made on one
 * phone was not on another, which is not a shelf. `lib/shelfmove.ts` carries
 * up anything still sitting in the old one.
 */

import { cloudShelfOf } from './cloudshelf';
import { shelfOf, type Put, type Shelf } from './ondevice';

/* The device shelf these were kept on before 9 October. It is not written
   to any more — `lib/shelfmove.ts` reads it once, carries what is there up
   to the account, and empties it. The names must not change while anything
   could still be sitting in it. */
export const OLD_DB = 'futurebox-kidsongs';
export const OLD_STORE = 'songs';

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
/** The shelf these used to live on, for `shelfmove.ts` to empty. */
export const onDevice: Shelf<KeptSong> = shelfOf<KeptSong>({
  database: OLD_DB,
  store: OLD_STORE,
  most: MOST_SONGS,
  /* A row with no audio is a half-written one, not a song. */
  sound: (one) => one.audio instanceof Blob && one.audio.size > 0,
});

interface SongBody {
  readonly topic: string;
  readonly sound: string;
  readonly audio: string;
}

/**
 * The shelf itself: on the account, so a song is on every device she signs
 * in from rather than only the one it was made on.
 */
const shelf = cloudShelfOf<KeptSong, SongBody>({
  kind: 'song',
  most: MOST_SONGS,
  files: (one) => [{ name: 'audio', blob: one.audio }],
  body: (one, at) => ({ topic: one.topic, sound: one.sound, audio: at('audio') }),
  back: async (row, file) => {
    const audio = await file(row.body?.audio ?? '');
    /* No audio is not a song. Skipped rather than listed as one, so a
       half-uploaded row cannot become a button that plays nothing. */
    if (!audio) return null;
    return {
      id: row.id,
      title: row.title,
      made: row.made,
      audio,
      topic: String(row.body?.topic ?? ''),
      sound: String(row.body?.sound ?? ''),
    };
  },
});

/** The account's shelf, for `shelfmove.ts` to fill. */
export const onAccount: Shelf<KeptSong> = shelf;

export const keepSong = (song: KeptSong): Promise<Put> => shelf.keep(song);
export const allSongs = (): Promise<KeptSong[]> => shelf.all();
export const forgetSong = (id: string): Promise<void> => shelf.forget(id);

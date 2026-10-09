'use client';

/**
 * Stories kept on the device, so a child can be handed one.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Gaan aan met die shelf van stories in die kids
 * kamer."*
 *
 * Story mode makes a book and the book lives in a tab. Close it and the
 * pictures and the readings — which were paid for — stop existing. The kids
 * room could not reach one either, which is why its price list still says
 * story mode is not available there.
 *
 * ── Why on the device, and not in Supabase ───────────────────────────────
 *
 * Because of who is standing where. The grown-up writes the story on their
 * phone and then hands that phone to the child: it is one device, and the
 * story never needs to travel. Putting it on a server would mean a table, a
 * storage bucket that is not set up yet, a paste of SQL before anything
 * worked, and a monthly bill for holding pictures that one child looks at.
 *
 * It also means a kept story costs nothing to hear. The pictures and the
 * readings were paid for when the book was made; playing it again takes no
 * credits and no allowance, which is the right answer for the room where a
 * child presses things repeatedly.
 *
 * ── Why a database of its own ────────────────────────────────────────────
 *
 * `lib/library.ts` opens `futurebox` at version 1 and `lib/filmkeep.ts`
 * opens its own for the same reason: adding a store to an open database
 * means opening it at version 2, and every call that still asks for version
 * 1 then fails with a `VersionError` for the rest of the session. A third
 * database costs nothing and cannot do that to the songs or to the film.
 *
 * ── Why the machinery is not here any more ───────────────────────────────
 *
 * It was, until the songs needed the same shelf the next day. Two copies of
 * an IndexedDB wrapper is two places a cap is enforced and two places
 * somebody later fixes a bug in one of, so the behaviour moved to
 * `lib/ondevice.ts` and the names stayed here. The database and store names
 * are UNCHANGED on purpose: a story kept yesterday is still on the shelf.
 *
 * ── Why the blobs go in whole, unlike the film's ─────────────────────────
 *
 * `filmkeep.ts` keeps its clips apart from the edit because the edit changes
 * on every keystroke and the material never does — writing three hundred
 * megabytes each time somebody nudges a slider is not a save, it is a stall.
 *
 * A story is the opposite: made once, written once, never edited. So it goes
 * in as one record and comes out as one, which removes the whole class of
 * fault where a record points at a blob that is no longer there.
 */

import { cloudShelfOf } from './cloudshelf';
import { shelfOf, type Put, type Shelf } from './ondevice';

/* The device shelf these were kept on before 9 October. Not written to any
   more — `lib/shelfmove.ts` reads it once, carries what is there up to the
   account, and empties it. The names must not change while anything could
   still be sitting in it: a rename is every story kept before today quietly
   gone, with the shelf reporting nothing wrong. */
export const OLD_DB = 'futurebox-stories';
export const OLD_STORE = 'stories';

/**
 * How many stories one device holds.
 *
 * Twelve, which at a dozen pages each is a few hundred megabytes of
 * pictures and readings. Not a technical limit — a cap so that a phone does
 * not quietly fill up with books nobody plays.
 */
export const MOST_STORIES = 12;

export type { Put };

export interface KeptPage {
  readonly text: string;
  readonly picture: Blob;
  readonly audio: Blob;
  /** How long the reading is, so the shelf can turn pages without decoding. */
  readonly seconds: number;
}

export interface KeptStory {
  readonly id: string;
  /** What it is called on the shelf. Taken from its first words. */
  readonly title: string;
  /** When it was made, for ordering. */
  readonly made: number;
  readonly pages: readonly KeptPage[];
}

/** A name for the shelf, from the first words of the story. */
export function titleOf(firstPage: string): string {
  const words = firstPage.trim().split(/\s+/).slice(0, 6).join(' ');
  /* Trailing punctuation off, because "Once there was a small brown" reads as
     a title and "Once there was a small brown," reads as a mistake. */
  return words.replace(/[,;:.!?]+$/, '') || 'A story';
}

/** The shelf these used to live on, for `shelfmove.ts` to empty. */
export const onDevice: Shelf<KeptStory> = shelfOf<KeptStory>({
  database: OLD_DB,
  store: OLD_STORE,
  most: MOST_STORIES,
  /* A story with no pages is a half-written row, not a story. */
  sound: (one) => Array.isArray(one.pages) && one.pages.length > 0,
});

interface StoryBody {
  readonly pages: readonly {
    readonly text: string;
    readonly picture: string;
    readonly audio: string;
    readonly seconds: number;
  }[];
}

/**
 * The shelf itself: on the account.
 *
 * Carli, 9 October 2026: *"Skuif die stories en liedjies na die server
 * toe."* A story made on a laptop was not on the phone's shelf, because it
 * was never anywhere but the laptop.
 *
 * Two files a page, named by their page number so a story keeps its order
 * without the names carrying anything else. `check:plankserver` drives the
 * naming, because a page mis-numbered here is a book whose pictures and
 * readings belong to different pages — which plays, and is wrong.
 */
const shelf = cloudShelfOf<KeptStory, StoryBody>({
  kind: 'story',
  most: MOST_STORIES,
  files: (one) => one.pages.flatMap((page, i) => [
    { name: `page-${i}-picture`, blob: page.picture },
    { name: `page-${i}-audio`, blob: page.audio },
  ]),
  body: (one, at) => ({
    pages: one.pages.map((page, i) => ({
      text: page.text,
      picture: at(`page-${i}-picture`),
      audio: at(`page-${i}-audio`),
      seconds: page.seconds,
    })),
  }),
  back: async (row, file) => {
    const rows = row.body?.pages ?? [];
    if (!rows.length) return null;
    const pages: KeptPage[] = [];
    for (const page of rows) {
      const [picture, audio] = await Promise.all([file(page.picture), file(page.audio)]);
      /* A page missing either half is a book that opens to a broken picture
         or turns in silence. The whole story is skipped rather than shown
         with a hole in it. */
      if (!picture || !audio) return null;
      pages.push({ text: page.text, picture, audio, seconds: Number(page.seconds) || 0 });
    }
    return { id: row.id, title: row.title, made: row.made, pages };
  },
});

/**
 * Put a story on the shelf.
 *
 * Answers rather than throws, because the one thing a room must not do with
 * a failed save is nothing: a book that was paid for and did not save is a
 * sentence somebody needs to read while the tab is still open.
 */
/** The account's shelf, for `shelfmove.ts` to fill. */
export const onAccount: Shelf<KeptStory> = shelf;

export const keepStory = (story: KeptStory): Promise<Put> => shelf.keep(story);

/** Everything on the shelf, newest first. */
export const allStories = (): Promise<KeptStory[]> => shelf.all();

/** Take one off the shelf. */
export const forgetStory = (id: string): Promise<void> => shelf.forget(id);

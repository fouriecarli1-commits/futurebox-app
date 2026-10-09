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

const DB_NAME = 'futurebox-stories';
const SHELF = 'stories';

/**
 * How many stories one device holds.
 *
 * Twelve, which at a dozen pages each is a few hundred megabytes of
 * pictures and readings. Not a technical limit — a cap so that a phone does
 * not quietly fill up with books nobody plays.
 */
export const MOST_STORIES = 12;

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

export type Put = 'kept' | 'full' | 'shelfFull' | 'off';

/** A name for the shelf, from the first words of the story. */
export function titleOf(firstPage: string): string {
  const words = firstPage.trim().split(/\s+/).slice(0, 6).join(' ');
  /* Trailing punctuation off, because "Once there was a small brown" reads as
     a title and "Once there was a small brown," reads as a mistake. */
  return words.replace(/[,;:.!?]+$/, '') || 'A story';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const asked = indexedDB.open(DB_NAME, 1);
    asked.onupgradeneeded = () => {
      const db = asked.result;
      if (!db.objectStoreNames.contains(SHELF)) {
        db.createObjectStore(SHELF, { keyPath: 'id' });
      }
    };
    asked.onsuccess = () => resolve(asked.result);
    asked.onerror = () => reject(asked.error);
    /* A second tab upgrading, or a private window refusing outright. Neither
       is something the room can do anything about, and a promise that never
       settles would hang the save forever. */
    asked.onblocked = () => reject(new Error('blocked'));
  });
}

/**
 * Put a story on the shelf.
 *
 * Answers rather than throws, because the one thing a room must not do with
 * a failed save is nothing: a book that was paid for and did not save is a
 * sentence somebody needs to read while the tab is still open.
 *
 * `shelfFull` rather than quietly dropping the oldest. Deleting somebody's
 * story to make room for a new one is work that stops existing, which
 * `filmkeep.ts` calls the worst class of fault this app can have — and it
 * would be invisible, because the new story saves perfectly.
 */
export async function keepStory(story: KeptStory): Promise<Put> {
  if (typeof indexedDB === 'undefined') return 'off';
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const live = db;
    return await new Promise<Put>((resolve, reject) => {
      const tx = live.transaction([SHELF], 'readwrite');
      const shelf = tx.objectStore(SHELF);

      /* Counted inside this transaction rather than in a read beforehand: a
         look in one transaction and a write in the next leaves room for a
         second save to land between them, which is this cap being present
         and not holding. */
      const counted = shelf.count();
      counted.onsuccess = () => {
        if (counted.result >= MOST_STORIES) {
          tx.abort();
          resolve('shelfFull');
          return;
        }
        shelf.put(story);
      };

      tx.oncomplete = () => resolve('kept');
      tx.onabort = () => {
        /* A quota error is the disk, and anything else is not worth a
           different sentence to somebody holding a phone. */
        if (tx.error?.name === 'QuotaExceededError') resolve('full');
        else reject(tx.error ?? new Error('aborted'));
      };
    });
  } catch {
    return 'off';
  } finally {
    db?.close();
  }
}

/** Everything on the shelf, newest first. */
export async function allStories(): Promise<KeptStory[]> {
  if (typeof indexedDB === 'undefined') return [];
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const live = db;
    const found = await new Promise<KeptStory[]>((resolve, reject) => {
      const asked = live.transaction([SHELF], 'readonly').objectStore(SHELF).getAll();
      asked.onsuccess = () => resolve((asked.result ?? []) as KeptStory[]);
      asked.onerror = () => reject(asked.error);
    });
    return found
      .filter((one) => one && Array.isArray(one.pages) && one.pages.length > 0)
      .sort((a, b) => b.made - a.made);
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

/** Take one off the shelf. */
export async function forgetStory(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const live = db;
    await new Promise<void>((resolve) => {
      const tx = live.transaction([SHELF], 'readwrite');
      tx.objectStore(SHELF).delete(id);
      tx.oncomplete = () => resolve();
      /* A delete that fails leaves the story there, which the shelf will
         show on its next look. Nothing to tell anybody. */
      tx.onabort = () => resolve();
    });
  } catch {
    /* Nothing to do and nothing worth saying. */
  } finally {
    db?.close();
  }
}

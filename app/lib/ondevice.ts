'use client';

/**
 * A shelf on the device: a short list of things kept between visits.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `lib/storykeep.ts` was written first, for the stories a grown-up makes
 * and a child plays. The next day the same thing was needed for the songs a
 * child makes — Carli, 9 October 2026: *"Gaan aan met die kind se liedjies
 * wat keepbaar is"* — and the honest options were a second copy of that file
 * or this.
 *
 * Two copies of an IndexedDB wrapper is two places a cap is enforced, two
 * places a quota error is turned into a sentence, and two places somebody
 * will later fix a bug in one of.
 *
 * ── Why each shelf gets its own database, and that is not duplication ────
 *
 * `lib/library.ts` opens `futurebox` at version 1. Adding a store to it
 * would mean opening at version 2, and every call still asking for version 1
 * then fails with a `VersionError` for the rest of the session —
 * `filmkeep.ts` carries that note and took its own database for that reason.
 *
 * The same holds between two shelves: putting songs into the stories'
 * database means bumping its version, and any tab still running yesterday's
 * code breaks. A database per shelf costs nothing and cannot do that.
 *
 * So what is shared here is the BEHAVIOUR — the cap that refuses rather than
 * deletes, the count taken inside the write, the quota error turned into a
 * sentence — and what is not shared is the name, which is what keeps the two
 * apart.
 *
 * ── The one rule worth stating out loud ──────────────────────────────────
 *
 * A full shelf refuses. It does not drop the oldest to fit the newest.
 * Deleting somebody's work to make room is work that stops existing, which
 * `filmkeep.ts` calls the worst class of fault this app can have — and it is
 * invisible, because the new thing saves perfectly.
 */

export type Put = 'kept' | 'full' | 'shelfFull' | 'off';

export interface Shelf<T extends { id: string; made: number }> {
  /** Put one away. Answers rather than throws — see `Put`. */
  readonly keep: (one: T) => Promise<Put>;
  /** Everything on it, newest first. */
  readonly all: () => Promise<T[]>;
  /** Take one off. */
  readonly forget: (id: string) => Promise<void>;
  /** How many it holds. */
  readonly most: number;
}

export function shelfOf<T extends { id: string; made: number }>({
  database,
  store,
  most,
  sound,
}: {
  readonly database: string;
  readonly store: string;
  readonly most: number;
  /** Is this row worth showing? A half-written one is not. */
  readonly sound: (one: T) => boolean;
}): Shelf<T> {
  const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const asked = indexedDB.open(database, 1);
    asked.onupgradeneeded = () => {
      const db = asked.result;
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store, { keyPath: 'id' });
      }
    };
    asked.onsuccess = () => resolve(asked.result);
    asked.onerror = () => reject(asked.error);
    /* A second tab upgrading, or a private window refusing outright. Neither
       is something a room can do anything about, and a promise that never
       settles would hang the save forever. */
    asked.onblocked = () => reject(new Error('blocked'));
  });

  return {
    most,

    async keep(one: T): Promise<Put> {
      if (typeof indexedDB === 'undefined') return 'off';
      let db: IDBDatabase | null = null;
      try {
        db = await openDb();
        const live = db;
        return await new Promise<Put>((resolve, reject) => {
          const tx = live.transaction([store], 'readwrite');
          const shelf = tx.objectStore(store);

          /* Counted inside this transaction rather than in a read beforehand:
             a look in one transaction and a write in the next leaves room for
             a second save to land between them, which is this cap being
             present and not holding. */
          const counted = shelf.count();
          counted.onsuccess = () => {
            if (counted.result >= most) {
              tx.abort();
              resolve('shelfFull');
              return;
            }
            shelf.put(one);
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
    },

    async all(): Promise<T[]> {
      if (typeof indexedDB === 'undefined') return [];
      let db: IDBDatabase | null = null;
      try {
        db = await openDb();
        const live = db;
        const found = await new Promise<T[]>((resolve, reject) => {
          const asked = live.transaction([store], 'readonly').objectStore(store).getAll();
          asked.onsuccess = () => resolve((asked.result ?? []) as T[]);
          asked.onerror = () => reject(asked.error);
        });
        return found.filter((row) => row && sound(row)).sort((a, b) => b.made - a.made);
      } catch {
        return [];
      } finally {
        db?.close();
      }
    },

    async forget(id: string): Promise<void> {
      if (typeof indexedDB === 'undefined') return;
      let db: IDBDatabase | null = null;
      try {
        db = await openDb();
        const live = db;
        await new Promise<void>((resolve) => {
          const tx = live.transaction([store], 'readwrite');
          tx.objectStore(store).delete(id);
          tx.oncomplete = () => resolve();
          /* A delete that fails leaves it there, which the shelf shows on its
             next look. Nothing to tell anybody. */
          tx.onabort = () => resolve();
        });
      } catch {
        /* Nothing to do and nothing worth saying. */
      } finally {
        db?.close();
      }
    },
  };
}

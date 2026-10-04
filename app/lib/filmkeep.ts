'use client';

/**
 * The Video Editor's project, kept on the device between visits.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Die kamer onthou nie die projek nie. Ek het
 * perongeluk back gedruk en toe ek terug gaan was die projek weg."*
 *
 * The edit lived in React state and nowhere else. One press of Back — the
 * phone's own, not the room's — and an afternoon of trimming, words, looks
 * and a song went with it. Nothing warned her, because from the room's point
 * of view nothing failed: it was simply a new room with nothing on the clock.
 *
 * That is the worst class of fault this app can have. Everything else she has
 * reported is something looking wrong; this is work that stops existing.
 *
 * ── Why IndexedDB, and why not the one already open ──────────────────────
 *
 * The clips are Blobs — a minute of phone video is tens of megabytes — and
 * `localStorage` holds strings and about five megabytes of them. IndexedDB
 * stores a Blob as a Blob.
 *
 * `lib/library.ts` already opens a database called `futurebox` at version 1.
 * Adding a store to it would mean opening it at version 2, and every call in
 * that file asks for version 1 — which then fails with a `VersionError` for
 * the rest of the session. A second database costs nothing and cannot do
 * that to the songs.
 *
 * ── Why the blobs are kept apart from the edit ───────────────────────────
 *
 * Because the edit changes on every keystroke and the material never does.
 * Writing the whole project on each change would mean pushing three hundred
 * megabytes through a transaction every time she nudges a slider, which is a
 * room that stutters and a disk that never rests.
 *
 * So the material goes into `stuff`, once, under a key; and what goes into
 * `film` on every change is the edit with each Blob replaced by its key —
 * kilobytes. On the way back in, the keys become Blobs again.
 *
 * Keys are handed out per Blob OBJECT rather than per piece, and that is not
 * an optimisation: `duplicate` makes a new piece holding the SAME Blob, so
 * keying by piece id would write a copy of the material for every copy of the
 * shot. The map is rebuilt on load from what came back, so a project reopened
 * and duplicated again still shares one copy.
 */

import type { Edit, Piece } from './videoedit';

const DB_NAME = 'futurebox-film';
const FILM = 'film';
const STUFF = 'stuff';
const ONLY = 'current';

/** What a save did, in a word the room can show. */
export type Kept = 'kept' | 'held' | 'full' | 'off';

/**
 * What a read found, which is three things and not two.
 *
 * Carli, 5 October 2026: *"Ek het nou 'n video gemaak op editor. Toe ek
 * channel toe gaan is dit nie daar nie. Toe ek terug na die editor gaan is
 * dit ook nie meer daar nie."*
 *
 * The second half of that was this type being missing. `loadFilm` answered
 * `null` for "nothing was ever kept" AND for "the read failed", so the room
 * could not tell an empty disk from a disk it could not read. It opened with
 * an empty clock either way — and nine hundred milliseconds later the save
 * wrote that empty clock over the real film and deleted every clip the empty
 * film did not point at, which is all of them.
 *
 * `none` is a first visit and is not a failure. `broke` is a failure, and the
 * room's answer to it is to stop writing and say so, because the film on the
 * disk may be perfectly good and this session is the thing that must not land
 * on top of it.
 */
export type Found =
  | { readonly how: 'had'; readonly edit: Edit }
  | { readonly how: 'none' }
  | { readonly how: 'broke' };

/**
 * Which key each Blob was stored under.
 *
 * A `WeakMap`, so a clip she has taken off the clock stops being referenced
 * here the moment nothing else holds it. Rebuilt on load — see the note above
 * on duplicates.
 */
const keyFor = new WeakMap<Blob, string>();
let counted = 0;

function keyOf(blob: Blob): string {
  const had = keyFor.get(blob);
  if (had) return had;
  counted += 1;
  const made = `b${Date.now().toString(36)}-${counted}-${Math.random().toString(36).slice(2, 8)}`;
  keyFor.set(blob, made);
  return made;
}

/** The edit with every Blob swapped for the key it is stored under. */
interface ThinPiece extends Omit<Piece, 'clip'> {
  readonly clipAt: string;
}
interface Thin extends Omit<Edit, 'pieces' | 'cover' | 'under'> {
  readonly pieces: readonly ThinPiece[];
  readonly coverAt?: string;
  readonly underAt?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const asked = indexedDB.open(DB_NAME, 1);
    asked.onupgradeneeded = () => {
      const db = asked.result;
      if (!db.objectStoreNames.contains(FILM)) db.createObjectStore(FILM);
      if (!db.objectStoreNames.contains(STUFF)) db.createObjectStore(STUFF);
    };
    asked.onsuccess = () => resolve(asked.result);
    asked.onerror = () => reject(asked.error);
    /* A second tab upgrading, or a private window refusing the database
       outright. Neither is an error the room can do anything about, and a
       promise that never settles would hang the save forever. */
    asked.onblocked = () => reject(new Error('blocked'));
  });
}

/**
 * Put the project away.
 *
 * Answers rather than throws, because the one thing the room must not do with
 * a failed save is nothing: a disk that is full is a sentence she needs to
 * read while there is still a chance to export. `full` is that case; `off` is
 * a browser with no IndexedDB at all, which is a private window on some
 * phones.
 */
export async function keepFilm(edit: Edit, anyway = false): Promise<Kept> {
  if (typeof indexedDB === 'undefined') return 'off';
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const thin: Thin = {
      ...edit,
      pieces: edit.pieces.map(({ clip, ...rest }) => ({ ...rest, clipAt: keyOf(clip) })),
      ...(edit.cover ? { coverAt: keyOf(edit.cover) } : {}),
      ...(edit.under ? { underAt: keyOf(edit.under) } : {}),
    };
    delete (thin as { cover?: unknown }).cover;
    delete (thin as { under?: unknown }).under;

    const wanted = new Map<string, Blob>();
    for (const piece of edit.pieces) wanted.set(keyOf(piece.clip), piece.clip);
    if (edit.cover) wanted.set(keyOf(edit.cover), edit.cover);
    if (edit.under) wanted.set(keyOf(edit.under), edit.under);

    const live = db;
    let held = false;
    await new Promise<void>((resolve, reject) => {
      const tx = live.transaction([FILM, STUFF], 'readwrite');
      const stuff = tx.objectStore(STUFF);
      const film = tx.objectStore(FILM);

      /* ── The one write this function will refuse ─────────────────────────

         An empty film going down deletes every clip, because the write and
         the delete are the same transaction. So an empty film is never
         allowed on top of a film that has shots in it unless somebody said
         `anyway` — which only New project does, through `forgetFilm`.

         It is read HERE, inside the readwrite transaction, and not in a
         `loadFilm` beforehand: a look in one transaction and a write in the
         next leaves room for a second save to land between them, which is
         this guard being present and not holding.

         What this buys is that the fault she hit is survivable. A read that
         goes wrong costs a session; before this it cost the material. */
      const standing = film.get(ONLY);
      standing.onsuccess = () => {
        const was = (standing.result as Thin | undefined) ?? null;
        if (!anyway && edit.pieces.length === 0 && (was?.pieces?.length ?? 0) > 0) {
          held = true;
          return;
        }
        stuff.getAllKeys().onsuccess = (event) => {
          const already = new Set(
            ((event.target as IDBRequest<IDBValidKey[]>).result ?? []).map(String),
          );
          /* Only what is new, and only what is still referenced. A clip taken
             off the clock has to go, or the disk fills with material from
             films she finished weeks ago. */
          for (const [key, blob] of wanted) if (!already.has(key)) stuff.put(blob, key);
          for (const key of already) if (!wanted.has(key)) stuff.delete(key);
        };
        film.put(thin, ONLY);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('save'));
      tx.onabort = () => reject(tx.error ?? new Error('abort'));
    });
    if (held) return 'held';
    return 'kept';
  } catch (why) {
    return (why as DOMException)?.name === 'QuotaExceededError' ? 'full' : 'off';
  } finally {
    db?.close();
  }
}

/**
 * Take the project back out.
 *
 * `none` for "there was nothing", which is a first visit and is not a
 * failure. `broke` for a read that could not happen, which IS one, and the
 * difference between those two is the whole second half of her report — see
 * `Found` above.
 *
 * A film whose material has gone — the browser evicted the database under
 * storage pressure, which it may do — comes back as the pieces that still
 * have their clips rather than as a failure: half a film is worth more than
 * none, and the room shows what is there.
 */
export async function loadFilm(): Promise<Found> {
  /* A private window on some phones. Not a first visit: nothing will be kept
     this session either, and the room has to be able to say so. */
  if (typeof indexedDB === 'undefined') return { how: 'broke' };
  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const live = db;
    const thin = await new Promise<Thin | null>((resolve, reject) => {
      const tx = live.transaction(FILM, 'readonly');
      const asked = tx.objectStore(FILM).get(ONLY);
      asked.onsuccess = () => resolve((asked.result as Thin) ?? null);
      asked.onerror = () => reject(asked.error ?? new Error('read'));
    });
    if (!thin) return { how: 'none' };

    const stuff = await new Promise<Map<string, Blob>>((resolve, reject) => {
      const tx = live.transaction(STUFF, 'readonly');
      const store = tx.objectStore(STUFF);
      const keys = store.getAllKeys();
      const values = store.getAll();
      tx.oncomplete = () => {
        const out = new Map<string, Blob>();
        const all = (keys.result ?? []).map(String);
        all.forEach((key, index) => {
          const blob = (values.result ?? [])[index] as Blob | undefined;
          if (blob) out.set(key, blob);
        });
        resolve(out);
      };
      tx.onerror = () => reject(tx.error ?? new Error('read'));
    });

    /* The key map rebuilt from what came back, so a piece duplicated after a
       reload still shares one copy of its material rather than writing a
       second one on the next save. */
    for (const [key, blob] of stuff) if (!keyFor.has(blob)) keyFor.set(blob, key);

    const pieces: Piece[] = [];
    for (const { clipAt, ...rest } of thin.pieces) {
      const clip = stuff.get(clipAt);
      if (clip) pieces.push({ ...rest, clip });
    }
    const edit: Edit = {
      ...(thin as unknown as Edit),
      pieces,
      ...(thin.coverAt && stuff.get(thin.coverAt) ? { cover: stuff.get(thin.coverAt) } : {}),
      ...(thin.underAt && stuff.get(thin.underAt) ? { under: stuff.get(thin.underAt) } : {}),
    };
    delete (edit as { coverAt?: unknown }).coverAt;
    delete (edit as { underAt?: unknown }).underAt;
    return { how: 'had', edit };
  } catch {
    /* A database that cannot be read is NOT a first visit, and the room must
       not treat it as one. It opens with an empty clock either way, but on
       this branch the film on the disk may be perfectly good, so the room
       stops writing and says out loud that it is not keeping anything. */
    return { how: 'broke' };
  } finally {
    db?.close();
  }
}

/* There was a `forgetFilm()` here, which called `keepFilm(NOTHING, true)` so
   that New project could empty the disk on the press.
 *
 * It is gone on purpose. With it there, the room had TWO ways to write an
 * empty film — one through this door with `anyway` hardcoded, one through the
 * ordinary save — and the browser walk that proves New project really empties
 * the disk went through this door. So the room's own rule for when an empty
 * film is deliberate was never being exercised by anything: breaking it left
 * every check green. That is the exact shape of a check that passes because
 * it measures something next to the thing.
 *
 * One door now. The room says whether it means it, the walk proves the room
 * says it right, and `anyway` has one caller instead of a spare entrance with
 * the guard already disarmed. */

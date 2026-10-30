/**
 * A Pro Booth session that survives leaving the room.
 *
 * ── What happened ────────────────────────────────────────────────────────
 *
 * The owner, 9 September 2026: "ek het nou links geswipe toe kom die voice cloning
 * goed op … toe ek terug swipe of back druk, dan gooi hy mens heeltemal uit na
 * die home screen toe en jy verloor jou hele projek. 'n projek waarmee mens
 * besig is moet half kan stoor, en restart waar 'n mens is."
 *
 * The room held everything in React state and nothing else. Leaving it — by
 * the phone's back gesture, by a tab, by a reload, by the browser deciding the
 * page had been in the background long enough — threw away every take.
 * Recordings that only exist in one component's memory are recordings on
 * borrowed time.
 *
 * ── Why IndexedDB and not localStorage ───────────────────────────────────
 *
 * Takes are audio. `localStorage` holds strings, so audio would have to be
 * base64 — a third larger, and against a quota of about five megabytes, which
 * is four seconds of one stereo take. IndexedDB stores a Blob as a Blob and
 * its quota is a share of the disk.
 *
 * ── Why WAV and not the AudioBuffer ──────────────────────────────────────
 *
 * An `AudioBuffer` belongs to an audio context and cannot be stored. WAV is
 * what every other path in this app already writes — `lib/wav.ts` — so a saved
 * lane and a lane sent to a supplier are the same bytes, and there is one
 * encoder to be wrong rather than two.
 *
 * It is not small: about ten megabytes a minute in stereo. That is the price
 * of keeping the recording rather than a lossy copy of it, and a member who
 * has just sung three takes would rather have them.
 *
 * ── One session a song, and only a few songs ─────────────────────────────
 *
 * The store held ONE session, under one key, and that was the fault found on
 * 15 October 2026 when the owner asked for every function in the booth to be
 * looked at properly (*"Kyk mooi of elke funksie in … probooth … werk."*).
 * Opening the booth on song B found nothing for B — right — and then, two
 * seconds later, wrote B's lanes over the only slot there was. Song A's takes
 * were gone, by a room that had promised on screen that leaving would not
 * lose them.
 *
 * So each song has its own entry, keyed by the song's id where the room is
 * given one and by its title where it is not (the probe page, and anything
 * made before songs carried ids into the booth). The old single entry is
 * still read once, for the song it belongs to, so a session saved before this
 * change comes back rather than being stranded.
 *
 * A list of past sessions is still not a feature here — no screen, no delete,
 * no quota conversation. What is kept is the work on the last `KEEP` songs,
 * newest first, and the oldest goes when a newer one is written. Keeping a
 * few and saying so is honest; keeping every song ever opened, silently,
 * until the disk fills is not.
 *
 * ── Nothing here may break the room ──────────────────────────────────────
 *
 * Every call resolves rather than throws. A browser in private mode, a quota
 * that is full, a store that will not open: all of them mean "not saved", and
 * the room says so instead of losing the take it was in the middle of.
 */

import type { Master } from './session';
import type { HumNote } from './humnotes';
import type { Meter } from './tempo';
import type { Clean, Tone } from './tone';
import type { Fx } from './fx';
import { encodeWav } from './wav';

const DB = 'futurebox.probooth';
const STORE = 'sessions';
/** Where the one session lived before each song had its own. Read, never written. */
const LEGACY = 'current';
const VERSION = 1;
/** How many songs' sessions are kept on the device at once. */
export const KEEP = 4;

/** Which song a session belongs to: its id where there is one, else its title. */
export interface SongKey {
  readonly id?: string;
  readonly title: string;
}

/** The store key for one song. Prefixed so an id and a title can never collide. */
export function keyOf(song: SongKey): string {
  return song.id ? `song:${song.id}` : `title:${song.title}`;
}

/** A lane as it is written down: everything but the audio, plus the audio. */
export interface KeptLane {
  readonly id: string;
  readonly name: string;
  readonly wav: Blob;
  readonly at: number;
  readonly gain: number;
  readonly muted: boolean;
  readonly soloed: boolean;
  readonly backing?: boolean;
  readonly from?: number;
  readonly to?: number;
  /**
   * ── Four fields that were being dropped ───────────────────────────────
   *
   * `repeat`, `fx`, `clean` and `link` all belong to the lane and none of
   * them was written down. A clip dragged out to go round four times came
   * back going round once; a rack with an EQ, a compressor and a reverb set
   * on it came back empty; two lanes locked together came back loose. The
   * save reported success every time, because it did save — it saved a lane
   * that was missing the work.
   *
   * Found while adding `link`, which is the fourth of them and the reason
   * the other three are here: the list a lane is written down as has to be
   * the list a lane HAS, or the next field added quietly joins them.
   */
  readonly repeat?: number;
  readonly fx?: Fx;
  readonly clean?: Clean;
  readonly link?: string;
  readonly pan?: number;
  readonly tone?: Tone;
  /* The corner fades and the notes a hummed lane was built from. Both were
     on the lane and neither was written down (found 15 October 2026), so a
     lane faded in came back starting at full level, and a hummed bass came
     back with "download MIDI" re-transcribing its own synthesis instead of
     handing back the notes it was made from. Plain numbers, so they go
     into IndexedDB as they are. */
  readonly fadeIn?: number;
  readonly fadeOut?: number;
  /* The sends to the shared room and echo (29 October 2026). */
  readonly sends?: { readonly space?: number; readonly echo?: number };
  /* Which lane ducks this one, and how far (29 October 2026). The hits are
     worked out from the key each time it plays, so they are not kept. */
  readonly duck?: { readonly by: string; readonly depth: number };
  /* The row the lane is drawn on, when it shares one (30 October 2026). */
  readonly track?: string;
  /* A drum-pad lane's pattern, so it can be changed after a visit. */
  readonly beat?: import('./beatbox').Beat;
  /* The automation lines (29 October 2026): plain points, as they are. */
  readonly auto?: { readonly gain?: readonly { readonly t: number; readonly v: number }[]; readonly pan?: readonly { readonly t: number; readonly v: number }[] };
  readonly notes?: readonly HumNote[];
  /* The amp is kept as the rendered audio, the same way the lane keeps it.
     Re-running the capture would need the .nam file, which is on whichever
     machine loaded it — so the choice is keeping the bytes or silently
     handing back a lane that sounds different from the one she left. */
  readonly ampedName?: string;
  readonly ampedWav?: Blob;
}

export interface KeptSession {
  readonly title: string;
  /** The song's id, where the room was given one. Absent on older entries. */
  readonly songId?: string;
  readonly savedAt: number;
  readonly meter: Meter;
  readonly master: Master;
  readonly lanes: readonly KeptLane[];
  /** The session's markers, in seconds. Absent on entries from before them. */
  readonly markers?: readonly number[];
}

/** What a save did. `full` is a quota that is out, which needs saying. */
export type Kept =
  | { readonly ok: true }
  | { readonly ok: false; readonly why: 'unavailable' | 'full' | 'failed' };

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const factory = typeof indexedDB === 'undefined' ? null : indexedDB;
    if (!factory) {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(DB, VERSION);
    } catch {
      /* Firefox in private browsing throws here rather than failing the
         request, which is a different shape of the same "no storage". */
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    /* A blocked upgrade is another tab holding the old version. Rather than
       hanging on a promise nobody resolves, it is "not available". */
    request.onblocked = () => resolve(null);
  });
}

/**
 * Write the session down.
 *
 * `lanes` are the room's own lanes; their audio is encoded here so a caller
 * cannot forget to and store something that will not decode.
 */
export async function keepSession(
  song: SongKey,
  meter: Meter,
  master: Master,
  lanes: readonly {
    id: string;
    name: string;
    audio: AudioBuffer;
    at: number;
    gain: number;
    muted: boolean;
    soloed: boolean;
    backing?: boolean;
    from?: number;
    to?: number;
    repeat?: number;
    fx?: Fx;
    clean?: Clean;
    link?: string;
    pan?: number;
    tone?: Tone;
    fadeIn?: number;
    fadeOut?: number;
    sends?: { readonly space?: number; readonly echo?: number };
    duck?: { readonly by: string; readonly depth: number };
    track?: string;
    auto?: { readonly gain?: readonly { readonly t: number; readonly v: number }[]; readonly pan?: readonly { readonly t: number; readonly v: number }[] };
    beat?: import('./beatbox').Beat;
    notes?: readonly HumNote[];
    amped?: { name: string; audio: AudioBuffer };
  }[],
  /* The markers on the ruler. Last and optional, so every caller that
     does not have any is unchanged. */
  markers: readonly number[] = [],
): Promise<Kept> {
  const db = await open();
  if (!db) return { ok: false, why: 'unavailable' };

  let session: KeptSession;
  try {
    session = {
      title: song.title,
      ...(song.id ? { songId: song.id } : {}),
      savedAt: Date.now(),
      meter,
      master,
      ...(markers.length ? { markers: [...markers] } : {}),
      lanes: lanes.map((lane) => ({
        id: lane.id,
        name: lane.name,
        wav: encodeWav(lane.audio),
        at: lane.at,
        gain: lane.gain,
        muted: lane.muted,
        soloed: lane.soloed,
        ...(lane.backing ? { backing: true } : {}),
        ...(lane.from === undefined ? {} : { from: lane.from }),
        ...(lane.to === undefined ? {} : { to: lane.to }),
        ...(lane.repeat === undefined ? {} : { repeat: lane.repeat }),
        /* Plain numbers and booleans all the way down, both of them — which
           is why they can go straight into IndexedDB. Structured clone takes
           those and refuses an AudioBuffer, which is the reason the audio
           next to them is encoded to a WAV first. */
        ...(lane.fx === undefined ? {} : { fx: lane.fx }),
        ...(lane.clean === undefined ? {} : { clean: lane.clean }),
        ...(lane.link === undefined ? {} : { link: lane.link }),
        ...(lane.pan === undefined ? {} : { pan: lane.pan }),
        ...(lane.tone ? { tone: lane.tone } : {}),
        ...(lane.fadeIn ? { fadeIn: lane.fadeIn } : {}),
        ...(lane.fadeOut ? { fadeOut: lane.fadeOut } : {}),
        ...(lane.sends ? { sends: { ...lane.sends } } : {}),
        ...(lane.duck ? { duck: { by: lane.duck.by, depth: lane.duck.depth } } : {}),
        ...(lane.track ? { track: lane.track } : {}),
        ...(lane.beat ? { beat: JSON.parse(JSON.stringify(lane.beat)) } : {}),
        ...(lane.auto ? { auto: { gain: lane.auto.gain?.map((one) => ({ ...one })), pan: lane.auto.pan?.map((one) => ({ ...one })) } } : {}),
        ...(lane.notes?.length ? { notes: lane.notes.map((one) => ({ ...one })) } : {}),
        ...(lane.amped
          ? { ampedName: lane.amped.name, ampedWav: encodeWav(lane.amped.audio) }
          : {}),
      })),
    };
  } catch {
    db.close();
    return { ok: false, why: 'failed' };
  }

  return new Promise<Kept>((resolve) => {
    let deal: IDBTransaction;
    try {
      deal = db.transaction(STORE, 'readwrite');
    } catch {
      db.close();
      resolve({ ok: false, why: 'failed' });
      return;
    }
    deal.oncomplete = () => {
      db.close();
      resolve({ ok: true });
    };
    /* QuotaExceededError is the one worth telling apart. "There is no room on
       this device" is something a person can act on — delete something, mix
       down, use a shorter take. "It did not save" is not. */
    deal.onerror = () => {
      const name = deal.error?.name ?? '';
      db.close();
      resolve({ ok: false, why: name === 'QuotaExceededError' ? 'full' : 'failed' });
    };
    deal.onabort = () => {
      const name = deal.error?.name ?? '';
      db.close();
      resolve({ ok: false, why: name === 'QuotaExceededError' ? 'full' : 'failed' });
    };
    const store = deal.objectStore(STORE);
    const mine = keyOf(song);
    store.put(session, mine);
    /* The oldest songs beyond `KEEP` go, in the same transaction, so a full
       disk is never the way this store finds out it has too many. A cursor
       hands back each record's Blobs as handles rather than bytes, so
       walking it to read `savedAt` is cheap. The legacy entry counts like
       any other: it is somebody's song too. */
    const seen: { key: IDBValidKey; savedAt: number }[] = [];
    const walk = store.openCursor();
    walk.onsuccess = () => {
      const here = walk.result;
      if (here) {
        const value = here.value as KeptSession | undefined;
        /* The old single entry, once this song has been written under its
           own key, is a second copy of the same work — dropped, so it can
           never be read back over newer takes. */
        if (here.key === LEGACY && legacyIsMine(value ?? null, song)) store.delete(LEGACY);
        else if (here.key !== mine) {
          seen.push({ key: here.key, savedAt: typeof value?.savedAt === 'number' ? value.savedAt : 0 });
        }
        here.continue();
        return;
      }
      seen.sort((a, b) => b.savedAt - a.savedAt);
      for (const old of seen.slice(KEEP - 1)) store.delete(old.key);
    };
  });
}

/** One record by its key, or null. */
function readOne(db: IDBDatabase, key: string): Promise<KeptSession | null> {
  return new Promise<KeptSession | null>((resolve) => {
    let deal: IDBTransaction;
    try {
      deal = db.transaction(STORE, 'readonly');
    } catch {
      resolve(null);
      return;
    }
    const asked = deal.objectStore(STORE).get(key);
    asked.onsuccess = () => resolve((asked.result as KeptSession | undefined) ?? null);
    asked.onerror = () => resolve(null);
  });
}

/**
 * Whether the old single entry is this song's.
 *
 * By title, which is all it ever carried — and by id too when it happens to
 * carry one, so two songs that share a title cannot inherit each other's.
 */
function legacyIsMine(got: KeptSession | null, song: SongKey): boolean {
  if (!got || got.title !== song.title) return false;
  return !(got.songId && song.id && got.songId !== song.id);
}

/** What was written down for this song, or null. Does not decode — see `soundOf`. */
export async function keptSession(song: SongKey): Promise<KeptSession | null> {
  const db = await open();
  if (!db) return null;
  try {
    const got = await readOne(db, keyOf(song));
    if (got) return got;
    /* Saved before each song had its own entry. A session for another song
       is not this room's to restore — treated as nothing rather than
       offered, because "carry on where you left off" on somebody else's
       song is worse than starting clean. */
    const old = await readOne(db, LEGACY);
    return legacyIsMine(old, song) ? old : null;
  } finally {
    db.close();
  }
}

/** Throw this song's away. Called from "Start fresh". */
export async function forgetSession(song: SongKey): Promise<void> {
  const db = await open();
  if (!db) return;
  const legacyToo = legacyIsMine(await readOne(db, LEGACY), song);
  await new Promise<void>((resolve) => {
    let deal: IDBTransaction;
    try {
      deal = db.transaction(STORE, 'readwrite');
    } catch {
      db.close();
      resolve();
      return;
    }
    deal.oncomplete = () => {
      db.close();
      resolve();
    };
    deal.onerror = () => {
      db.close();
      resolve();
    };
    const store = deal.objectStore(STORE);
    store.delete(keyOf(song));
    /* And the old single entry when it is this song's, or "Start fresh"
       would be undone by the next visit reading it back. */
    if (legacyToo) store.delete(LEGACY);
  });
}

/**
 * A stored WAV back into playable audio.
 *
 * Separate from reading the record because decoding needs the room's own audio
 * context, and because a lane that will not decode should cost that lane
 * rather than the whole session.
 */
export async function soundOf(wav: Blob, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
  try {
    return await ctx.decodeAudioData(await wav.arrayBuffer());
  } catch {
    return null;
  }
}

/** How much of the disk a saved session is using, roughly, in megabytes. */
export function sizeOf(session: KeptSession): number {
  let bytes = 0;
  for (const lane of session.lanes) bytes += lane.wav.size + (lane.ampedWav?.size ?? 0);
  return bytes / (1024 * 1024);
}

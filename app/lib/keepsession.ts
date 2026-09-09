/**
 * A Pro Booth session that survives leaving the room.
 *
 * ── What happened ────────────────────────────────────────────────────────
 *
 * Carli, 9 September 2026: "ek het nou links geswipe toe kom die voice cloning
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
 * ── One session, and why ─────────────────────────────────────────────────
 *
 * The store holds the current session and no history. A list of past sessions
 * is a feature with a screen, a delete, and a quota conversation attached; what
 * she asked for is that the work is still there when she comes back. Keeping
 * one and saying so is honest. Keeping ten silently until the disk fills is
 * not.
 *
 * ── Whose session it is ──────────────────────────────────────────────────
 *
 * Keyed by the song's title, because that is the only handle the room is given.
 * Opening the booth on a *different* song must never restore the last one over
 * it, so a mismatch is treated as no saved session at all rather than as
 * something to offer. When songs get ids, this is where it changes.
 *
 * ── Nothing here may break the room ──────────────────────────────────────
 *
 * Every call resolves rather than throws. A browser in private mode, a quota
 * that is full, a store that will not open: all of them mean "not saved", and
 * the room says so instead of losing the take it was in the middle of.
 */

import type { Master } from './session';
import type { Meter } from './tempo';
import type { Tone } from './tone';
import { encodeWav } from './wav';

const DB = 'futurebox.probooth';
const STORE = 'sessions';
const ONLY = 'current';
const VERSION = 1;

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
  readonly pan?: number;
  readonly tone?: Tone;
  /* The amp is kept as the rendered audio, the same way the lane keeps it.
     Re-running the capture would need the .nam file, which is on whichever
     machine loaded it — so the choice is keeping the bytes or silently
     handing back a lane that sounds different from the one she left. */
  readonly ampedName?: string;
  readonly ampedWav?: Blob;
}

export interface KeptSession {
  readonly title: string;
  readonly savedAt: number;
  readonly meter: Meter;
  readonly master: Master;
  readonly lanes: readonly KeptLane[];
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
  title: string,
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
    pan?: number;
    tone?: Tone;
    amped?: { name: string; audio: AudioBuffer };
  }[],
): Promise<Kept> {
  const db = await open();
  if (!db) return { ok: false, why: 'unavailable' };

  let session: KeptSession;
  try {
    session = {
      title,
      savedAt: Date.now(),
      meter,
      master,
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
        ...(lane.pan === undefined ? {} : { pan: lane.pan }),
        ...(lane.tone ? { tone: lane.tone } : {}),
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
    deal.objectStore(STORE).put(session, ONLY);
  });
}

/** What was written down, or null. Does not decode — see `soundOf`. */
export async function keptSession(title: string): Promise<KeptSession | null> {
  const db = await open();
  if (!db) return null;
  return new Promise<KeptSession | null>((resolve) => {
    let deal: IDBTransaction;
    try {
      deal = db.transaction(STORE, 'readonly');
    } catch {
      db.close();
      resolve(null);
      return;
    }
    const asked = deal.objectStore(STORE).get(ONLY);
    asked.onsuccess = () => {
      const got = asked.result as KeptSession | undefined;
      db.close();
      /* A session for another song is not this room's to restore. Treated as
         nothing rather than offered, because "carry on where you left off" on
         somebody else's song is worse than starting clean. */
      resolve(got && got.title === title ? got : null);
    };
    asked.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

/** Throw it away. Called once the session has been mixed down and kept. */
export async function forgetSession(): Promise<void> {
  const db = await open();
  if (!db) return;
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
    deal.objectStore(STORE).delete(ONLY);
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

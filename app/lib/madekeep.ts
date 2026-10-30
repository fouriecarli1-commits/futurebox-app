/**
 * What "Make a picture" made, kept on the device, and the making itself kept
 * going when the sheet is shut.
 *
 * The owner, 30 October 2026: *"Ek het nou net 'n ai foto gegenerate. Toe sê
 * ek make it. Toe laai dit en toe ek exit om te kyk of dit op die hoof skerm
 * wys toe is dit nie daar nie. Toe ek terug gaan om weer die generated foto te
 * gaan kry, toe is dit weg."* The answer came back to a sheet that was no
 * longer there, and the drafts lived only in that sheet. Paid for and lost.
 *
 * So the request belongs to the page, not to the sheet (`startMaking`): it
 * finishes whether the sheet is open or not, what it made is written here
 * before anything else happens to it, and the finished picture is handed to
 * whoever is listening (the Photo Editor) the moment it arrives. Opening the
 * sheet again shows the last drafts and the finished one, and a making still
 * under way, as they are.
 *
 * Kept in IndexedDB, on this device only: the pictures are data addresses of
 * a megabyte or two, more than local storage holds.
 */

export interface Made {
  readonly kind: string;
  readonly look: string;
  readonly mood: string;
  readonly idea: string;
  readonly drafts: readonly string[];
  readonly chosen: number | null;
  readonly final: string | null;
  /** When it was kept, ms. */
  readonly at: number;
}

const DB = 'futurebox-made';
const STORE = 'made';
const KEY = 'last';
/** A week: long enough to come back for it, short enough not to haunt the sheet. */
export const KEEP_MS = 7 * 24 * 3600 * 1000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function keepMade(made: Made): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(made, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* A private window or a full disk: the picture still goes to the editor. */
  }
}

export async function lastMade(now = Date.now()): Promise<Made | null> {
  try {
    const db = await open();
    const made = await new Promise<Made | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as Made) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return made && now - made.at < KEEP_MS ? made : null;
  } catch {
    return null;
  }
}

/* ── The making under way, owned by the page ─────────────────────────── */

export type Step = 'draft' | 'final';

export interface Outcome {
  readonly made: Made | null;
  /** Why it did not work, in words for the person; empty when it did. */
  readonly said: string;
}

let flight: { readonly step: Step; readonly done: Promise<Outcome> } | null = null;
let deliver: ((url: string) => void) | null = null;

/** The making under way, if any: the sheet shows it when opened again. */
export const underWay = (): typeof flight => flight;

/** Where a finished picture goes the moment it arrives. The Photo Editor sets it. */
export function deliverTo(to: ((url: string) => void) | null): void {
  deliver = to;
}

/**
 * Starts a making that outlives the sheet. `run` does the asking; whatever it
 * makes is kept before it is shown, and a finished picture is handed on.
 */
export function startMaking(step: Step, run: () => Promise<Outcome>): Promise<Outcome> {
  const done = run()
    .then(async (outcome) => {
      if (outcome.made) await keepMade(outcome.made);
      if (step === 'final' && outcome.made?.final && deliver) deliver(outcome.made.final);
      return outcome;
    })
    .finally(() => {
      if (flight?.done === done) flight = null;
    });
  flight = { step, done };
  return done;
}

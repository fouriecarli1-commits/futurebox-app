'use client';

/**
 * The amps you keep, so a capture is found once rather than every time.
 *
 * ── The fault this fixes ─────────────────────────────────────────────────
 *
 * Carli, 23 September 2026: *"ek wil 'n ordentlike probooth bou en voel ons
 * moet ook nog amp modellers in bring."*
 *
 * The amp modelling itself has been built and verified since September —
 * `lib/nam.ts` runs real neural captures in the browser and `check:nam` holds
 * it to 12 000 samples changed and block-size independence. What was never
 * built is anywhere to keep one.
 *
 * The booth read a `.nam` file, ran the lane through it, and kept the RESULT:
 *
 *     onChange({ amped: { name: ampName(json), audio } });
 *
 * The capture itself — the thing somebody downloaded, chose, and liked — was
 * dropped on the floor. So putting the same amp on a second lane meant finding
 * the same file again in the file manager, and a take re-recorded after that
 * could not get its amp back at all, because nothing in the session knew what
 * the amp had been.
 *
 * Which is the identical fault `lib/assets.ts` was written for, in its own
 * words: *"the picture is read, sent, and forgotten, so the second clip that
 * is meant to cut against the first needs the same file found and chosen
 * again."* A studio is not a set of one-off presses; a guitar sound belongs to
 * a session, not to a lane.
 *
 * ── Why this is its own file and not an `AssetKind` ──────────────────────
 *
 * `assets.ts` keeps a data URL and a thumbnail because every room that uses it
 * hands a data URL straight to a request. A capture is neither: it is JSON,
 * read once and passed to the inference engine as a string, and it has nothing
 * to draw. Squeezing it into that shape would mean a `thumb` that is always
 * empty and a `mime` that is always the same — two fields lying in every row
 * to avoid one small file.
 *
 * ── What is stored, and where ────────────────────────────────────────────
 *
 * The details in localStorage, the bytes in IndexedDB beside the songs, the
 * makes and the pictures. Same database and same store as all three, for the
 * reason `assets.ts` gives: a second one would be a second thing to clear, a
 * second thing to count against the quota, and a second place to look when
 * something is missing.
 *
 * Per device, because there is no account behind this, and every room that
 * shows these says so rather than letting somebody find out on their other
 * phone.
 */

import { deleteAudio, getAudio, putAudio } from './library';

export interface Amp {
  readonly id: string;
  /** What the capture calls itself — `ampName` reads it out of the file. */
  readonly name: string;
  /** The filename it arrived as, so two captures of one amp are told apart. */
  readonly from: string;
  readonly bytes: number;
  readonly createdAt: string;
  /** Kept when the rest is evicted. */
  readonly favourite?: boolean;
}

const KEY = 'futurebox.amps.v1';

/**
 * How many are kept.
 *
 * Lower than the pictures' twenty, and not for space: a capture is tens of
 * kilobytes and the whole shelf is smaller than one photograph. It is about
 * the row. Somebody with forty amps on a phone screen is somebody who cannot
 * find the one they use, and the answer to a real collection is TONE3000's own
 * library rather than a longer strip here.
 */
export const KEEP = 12;

/**
 * The largest capture worth taking.
 *
 * A NAM file is weights as JSON text; a standard WaveNet capture is a few
 * hundred kilobytes and the biggest architectures run to a couple of megabytes.
 * Eight is generous and still small enough that a bad file — somebody's wav
 * renamed, a zip — is refused before it is parsed rather than after.
 */
export const AMP_MAX_BYTES = 8 * 1024 * 1024;

export function loadAmps(): Amp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Amp[]) : [];
  } catch {
    return [];
  }
}

function write(all: readonly Amp[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // A shelf that cannot be written is a shelf that forgets, which is the
    // state this replaces rather than a new failure. Nothing to say.
  }
}

/**
 * Keep one, and drop the oldest unkept if that puts us over the cap.
 *
 * The bytes go first and the details second. The other way round leaves a row
 * pointing at nothing, which draws an amp somebody cannot use and gives no
 * reason — and that is worse than not having kept it.
 */
export async function rememberAmp(amp: Amp, json: string): Promise<void> {
  await putAudio(amp.id, new Blob([json], { type: 'application/json' }));

  const all = loadAmps();
  const next = [amp, ...all.filter((one) => one.id !== amp.id)];
  /* Eviction walks from the END, which is the oldest, and skips anything
     kept. A shelf that evicted the favourite would be a shelf that throws
     away the one thing somebody said to hold on to. */
  while (next.length > KEEP) {
    const at = next.map((one) => Boolean(one.favourite)).lastIndexOf(false);
    if (at === -1) break;
    const going = next.splice(at, 1)[0];
    if (going) await deleteAudio(going.id);
  }
  write(next);
}

export async function forgetAmp(id: string): Promise<void> {
  write(loadAmps().filter((one) => one.id !== id));
  await deleteAudio(id);
}

export function favouriteAmp(id: string, yes: boolean): Amp[] {
  const all = loadAmps().map((one) => (one.id === id ? { ...one, favourite: yes } : one));
  write(all);
  return all;
}

export function renameAmp(id: string, name: string): Amp[] {
  const said = name.trim().slice(0, 60);
  if (!said) return loadAmps();
  const all = loadAmps().map((one) => (one.id === id ? { ...one, name: said } : one));
  write(all);
  return all;
}

/**
 * The capture itself, as the string the engine takes.
 *
 * Null when the bytes are gone — a browser's storage can be cleared without
 * the details going with it, and the caller has to be able to say so rather
 * than hand `null` to the engine and get an unexplained refusal.
 */
export async function ampJson(id: string): Promise<string | null> {
  const blob = await getAudio(id);
  if (!blob) return null;
  try {
    return await blob.text();
  } catch {
    return null;
  }
}

export function ampId(): string {
  return `amp:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

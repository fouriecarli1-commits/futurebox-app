/**
 * A shelf for the sound and the video somebody carried in from outside.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md`, since the asset library was written: *"Still
 * open: audio and video files. Nothing yet keeps a piece of music somebody
 * brought in from outside, and the makes list is per-room history rather than
 * a library you file into."* `docs/GOING_LIVE.md` carries the same line under
 * what is not finished.
 *
 * It is not an abstract gap. A song put under one film has to be found on the
 * phone again for the next one. The clip that opens every advert is chosen
 * from the picker every single time. `lib/assets.ts` solved exactly this for
 * pictures and said in its own opening why it mattered: a library is what
 * turns one-off attachments into a set that share a look.
 *
 * ── Why this is not `assets.ts` with another `kind` ──────────────────────
 *
 * Because the one decision that matters is different, and putting both under
 * one cap would get that decision wrong for both.
 *
 * A picture is tens of kilobytes and `assets.ts` keeps twenty of them by
 * COUNT. A minute of phone video is tens of megabytes, so twenty of those is
 * most of a browser's quota — and a quota that runs out fails the next write,
 * silently, at the moment somebody is saving. So this shelf is capped by
 * BYTES first and by count second, and a file too big to fit the whole budget
 * is refused rather than allowed to evict everything on its way in.
 *
 * The pictures keep a data URL in the details because the rooms hand one
 * straight to a request. Nothing here can do that: a data URL of a video is
 * the video, in a string, in localStorage, which has about five megabytes in
 * it. Bytes go to IndexedDB and the details keep only a poster.
 *
 * ── Where it is stored ───────────────────────────────────────────────────
 *
 * Details in localStorage, bytes in the same IndexedDB store as the songs,
 * the makes and the pictures — through `putAudio`, whose name is older than
 * what it holds. One store, on purpose: a second is a second thing to clear,
 * a second thing counted against the quota and a second place to look when
 * something is missing.
 *
 * Per device, because there is no account behind it. Every room that shows
 * this says so rather than letting somebody find out on their other phone.
 */

import { deleteAudio, getAudio, putAudio } from './library';

export type BroughtKind = 'audio' | 'video';

export interface Brought {
  readonly id: string;
  readonly kind: BroughtKind;
  /** What it is called. Taken from the filename. */
  readonly name: string;
  readonly mime: string;
  readonly bytes: number;
  /** How long it runs, where that could be measured. Nought when it could not. */
  readonly seconds: number;
  readonly createdAt: string;
  /** A small JPEG data URL for video, so a strip costs one read rather than ten. */
  readonly thumb?: string;
  /** Kept when the rest is evicted. */
  readonly favourite?: boolean;
  /** Which room it first arrived in, so a room can offer its own first. */
  readonly from?: string;
}

const KEY = 'futurebox.brought.v1';

/**
 * How much of the disk this shelf may use, and how many things may be on it.
 *
 * The bytes are the real limit and the count is a second fence. Four hundred
 * megabytes is roughly a dozen minutes of phone video — enough to hold the
 * working set of one project without being a promise about somebody else's
 * disk that this cannot keep.
 *
 * `MOST_ONE` is the other half, and it is the rule that stops the cap being
 * useless: a single file bigger than that could only be filed by evicting
 * everything else, and would then be the only thing on a shelf meant to hold
 * a working set.
 */
export const KEEP_BYTES = 400 * 1024 * 1024;
export const KEEP_ITEMS = 12;
export const MOST_ONE = Math.round(KEEP_BYTES / 2);

/** The longest edge of a stored poster, in pixels. */
const THUMB = 240;

export function loadBrought(): Brought[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Brought[]) : [];
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function write(all: readonly Brought[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* Refused or full. The room keeps working for this visit; what it must
       not do is throw in the middle of somebody bringing a file in. */
  }
}

/**
 * What the shelf would look like with this one on it.
 *
 * Pure, and separate from the writing, so `check:brought` can put a shelf and
 * a file through it without a browser: eviction is the part that silently
 * loses somebody's work when it is wrong, and it is exactly the part that
 * cannot be seen on screen until it has already happened.
 *
 * Oldest unkept first, and a starred item is never taken — the same bargain
 * `makes.ts` and `assets.ts` strike, in the same words, so there is one rule
 * to learn.
 */
export function roomFor(
  all: readonly Brought[],
  one: Brought,
): { readonly keep: readonly Brought[]; readonly drop: readonly Brought[] } {
  const without = all.filter((had) => had.id !== one.id);
  const keep: Brought[] = [one, ...without];
  const drop: Brought[] = [];

  const tooMuch = (): boolean =>
    keep.reduce((sum, had) => sum + had.bytes, 0) > KEEP_BYTES || keep.length > KEEP_ITEMS;

  while (tooMuch()) {
    /* ── The oldest by its DATE, not by where it sits in the array ──────

       The first version of this walked the list from the back, which is only
       "oldest" if the list is in the order `loadBrought` returns. It is, and
       the function was still wrong: a pure function that reads an order
       nobody passed it is a function that works where it was written and
       quietly picks the wrong file anywhere else. `check:brought` handed it a
       shelf in the other order and it threw away the newest thing on it.

       Never index nought, which is the file arriving: a loop that could pick
       that would delete what it was asked to keep. Never a starred one, and
       it stops when there is nothing left it may take — a loop that can pick
       nothing has to end rather than take one anyway. */
    let oldest = -1;
    for (let at = 1; at < keep.length; at += 1) {
      if (keep[at].favourite) continue;
      if (oldest === -1 || keep[at].createdAt < keep[oldest].createdAt) oldest = at;
    }
    if (oldest === -1) break;
    drop.push(keep[oldest]);
    keep.splice(oldest, 1);
  }
  return { keep, drop };
}

/** What a save did, in a word the room can show. */
export type Filed = 'kept' | 'too-big' | 'full';

/**
 * Put a file on the shelf, and drop what no longer fits.
 *
 * A dropped item's bytes go with its details. An orphan blob in IndexedDB is
 * invisible and still counts against the quota, which is the worst kind of
 * leak — `assets.ts` learnt that one first.
 */
export async function fileIt(one: Brought, blob: Blob): Promise<Filed> {
  if (one.bytes > MOST_ONE) return 'too-big';
  try {
    await putAudio(one.id, blob);
  } catch {
    return 'full';
  }
  const { keep, drop } = roomFor(loadBrought(), one);
  write(keep);
  for (const gone of drop) await deleteAudio(gone.id).catch(() => undefined);
  return 'kept';
}

/** The bytes back, or null when the shelf has them listed and the disk does not. */
export async function readBrought(id: string): Promise<Blob | null> {
  try {
    return await getAudio(id);
  } catch {
    return null;
  }
}

/** Take one off the shelf, details and bytes together. */
export async function dropBrought(id: string): Promise<void> {
  write(loadBrought().filter((one) => one.id !== id));
  await deleteAudio(id).catch(() => undefined);
}

/** Star it, or unstar it. A starred item is what eviction never takes. */
export function starBrought(id: string, on: boolean): Brought[] {
  const next = loadBrought().map((one) => (one.id === id ? { ...one, favourite: on } : one));
  write(next);
  return next;
}

/** How much of the shelf is used, for a line that says so. */
export const usedBytes = (all: readonly Brought[]): number =>
  all.reduce((sum, one) => sum + one.bytes, 0);

/**
 * A poster for a video, drawn one frame in.
 *
 * One frame in and not nought: the first frame of a phone video is very often
 * black or a blur, and a strip of black squares is a strip nobody can pick
 * from. JPEG at seven tenths for the same reason `assets.ts` uses it — this is
 * a thumbnail and nobody is inspecting it.
 */
export function posterOf(file: Blob): Promise<string | undefined> {
  return new Promise((done) => {
    if (typeof document === 'undefined') { done(undefined); return; }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;
    const end = (said?: string): void => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      done(said);
    };
    video.onloadeddata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 2); };
    video.onseeked = () => {
      try {
        const scale = Math.min(1, THUMB / Math.max(video.videoWidth || 1, video.videoHeight || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((video.videoWidth || 1) * scale));
        canvas.height = Math.max(1, Math.round((video.videoHeight || 1) * scale));
        const pen = canvas.getContext('2d');
        if (!pen) { end(); return; }
        pen.drawImage(video, 0, 0, canvas.width, canvas.height);
        end(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        end();
      }
    };
    video.onerror = () => end();
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
  });
}

/** The details for a file somebody just brought in. */
export function broughtFrom(
  file: File | Blob,
  kind: BroughtKind,
  name: string,
  seconds: number,
  from?: string,
): Brought {
  return {
    id: `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    name: name.replace(/\.[^.]+$/, '').slice(0, 80) || 'untitled',
    mime: file.type || (kind === 'audio' ? 'audio/mpeg' : 'video/mp4'),
    bytes: file.size,
    seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 0,
    createdAt: new Date().toISOString(),
    ...(from ? { from } : {}),
  };
}

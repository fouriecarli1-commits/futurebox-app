/**
 * Pictures you keep, so a room does not ask for the same file twice.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md` calls the missing asset library the single
 * largest structural gap in the app, because several other things are blocked
 * behind it. It is not an abstract gap. Attaching a start frame to a video
 * works now — and the picture is read, sent, and forgotten, so the second clip
 * that is meant to cut against the first needs the same file found and chosen
 * again. A logo for an advert is the same story. So is a photograph somebody
 * wants as a cover.
 *
 * A library is what turns one-off attachments into a set of clips that share a
 * look, which is the difference between a tool that makes shots and one that
 * makes a campaign.
 *
 * ── What is stored, and where ────────────────────────────────────────────
 *
 * The details in localStorage, the bytes in IndexedDB beside the songs and the
 * makes. The same database and the same store as both, on purpose: a second
 * one would be a second thing to clear, a second thing to count against the
 * quota, and a second place to look when something is missing.
 *
 * Per device, because there is no account behind this. Every room that shows
 * these says so rather than letting somebody discover it on their other phone.
 *
 * ── Why there is a cap and what it protects ──────────────────────────────
 *
 * Storage that grows without limit fills up and then fails writes — silently,
 * on the write, which is the worst possible moment. So it is capped, and a
 * kept item is what eviction never takes, exactly as in `makes.ts`. The number
 * is lower here than the history's because these are pictures rather than
 * references to them, and a browser's quota is not ours to spend freely.
 *
 * ── Why a data URL rather than a Blob in the details ─────────────────────
 *
 * The rooms that use these hand a data URL straight to a request — the video
 * desk's start frame is a `data:` string on the wire. Keeping the bytes as a
 * blob and converting on every read would mean an async hop in the middle of
 * a click. The thumbnail is kept small and separate for the same reason: a
 * picker showing twelve full-size pictures would read twelve megabytes to draw
 * a row of squares.
 */

import { deleteAudio, getAudio, putAudio } from './library';

export type AssetKind = 'picture';

export interface Asset {
  readonly id: string;
  readonly kind: AssetKind;
  /** What it is called. Taken from the filename, and editable. */
  readonly name: string;
  /** image/png, image/jpeg, image/webp. */
  readonly mime: string;
  readonly bytes: number;
  readonly createdAt: string;
  /** A small data URL for the picker, so a grid does not read every full file. */
  readonly thumb: string;
  /** Kept when the rest is evicted. */
  readonly favourite?: boolean;
  /** Where it was first used, so a room can offer its own first. */
  readonly from?: string;
}

const KEY = 'futurebox.assets.v1';

/**
 * How many pictures are kept.
 *
 * Deliberately modest. These are files rather than pointers to files, and a
 * browser gives every origin a fixed and undeclared amount of room. Twenty is
 * enough for a brand kit and a working set; an archive is a promise about
 * somebody else's disk that this cannot keep.
 */
export const KEEP = 20;

/** The longest edge of a stored thumbnail, in pixels. */
const THUMB = 240;

export function loadAssets(): Asset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const all = raw ? (JSON.parse(raw) as Asset[]) : [];
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function write(assets: readonly Asset[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(assets));
  } catch {
    // Refused or full. The room keeps working for this visit; what it must not
    // do is throw in the middle of somebody saving a picture.
  }
}

/**
 * A small picture of a big one, drawn in a canvas.
 *
 * Kept in the details so a grid of twenty costs one read rather than twenty.
 * JPEG at seven tenths because this is a thumbnail and nobody is inspecting
 * it; PNG at this size is several times larger for no visible gain.
 */
export function thumbnailOf(dataUrl: string): Promise<string> {
  return new Promise((done) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, THUMB / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const pen = canvas.getContext('2d');
      if (!pen) return done(dataUrl);
      pen.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        done(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        // A tainted canvas cannot be read back. Ours never is — the source is
        // a data URL from this device — but falling back beats throwing.
        done(dataUrl);
      }
    };
    image.onerror = () => done(dataUrl);
    image.src = dataUrl;
  });
}

/**
 * A data URL back into bytes, without asking the network for it.
 *
 * The obvious line is `await (await fetch(dataUrl)).blob()`, and it is wrong
 * here: `fetch` on a `data:` URL is a connect, and this app's
 * Content-Security-Policy sets `connect-src 'self' https://*.supabase.co`. The
 * browser refuses it, the promise rejects, and saving a picture fails with
 * nothing on screen to say why — which is exactly how it was found, by
 * attaching one in a browser rather than by reading this file.
 *
 * Widening the policy to allow `data:` would fix the symptom and make every
 * other fetch in the app able to read one. Decoding it here costs six lines
 * and needs no permission at all.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const head = dataUrl.slice(0, comma);
  const mime = head.slice(head.indexOf(':') + 1, head.indexOf(';')) || 'application/octet-stream';
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Keep a picture, and drop what no longer fits.
 *
 * Eviction takes the oldest unkept one, and its bytes go with its details: an
 * orphan blob in IndexedDB is invisible and still counts against the quota,
 * which is the worst kind of leak.
 */
export async function rememberAsset(asset: Asset, dataUrl: string): Promise<void> {
  await putAudio(asset.id, dataUrlToBlob(dataUrl));

  const all = loadAssets();
  const next = [asset, ...all.filter((one) => one.id !== asset.id)];

  const over = next.length - KEEP;
  const dropped: Asset[] = [];
  if (over > 0) {
    const candidates = next
      .filter((one) => !one.favourite)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    dropped.push(...candidates.slice(0, over));
  }

  const dropping = new Set(dropped.map((one) => one.id));
  write(next.filter((one) => !dropping.has(one.id)));
  await Promise.all(dropped.map((one) => deleteAudio(one.id)));
}

export async function forgetAsset(id: string): Promise<void> {
  const all = loadAssets();
  write(all.filter((one) => one.id !== id));
  await deleteAudio(id);
}

/** Keep it, or stop keeping it. Returns the list as it now stands. */
export function favouriteAsset(id: string, yes: boolean): Asset[] {
  const all = loadAssets().map((one) => (one.id === id ? { ...one, favourite: yes } : one));
  write(all);
  return all;
}

/** Rename it. An empty name is refused rather than stored. */
export function renameAsset(id: string, name: string): Asset[] {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return loadAssets();
  const all = loadAssets().map((one) => (one.id === id ? { ...one, name: trimmed } : one));
  write(all);
  return all;
}

/**
 * The full picture, as a data URL, or null when it has been evicted from
 * under its own details.
 */
export async function assetDataUrl(id: string): Promise<string | null> {
  const blob = await getAudio(id);
  if (!blob) return null;
  return new Promise((done) => {
    const reader = new FileReader();
    reader.onerror = () => done(null);
    reader.onload = () => done(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(blob);
  });
}

export function assetId(): string {
  return `asset:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

/** What the library will take, said in one place so every caller agrees. */
export const ASSET_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const ASSET_MAX_BYTES = 4 * 1024 * 1024;

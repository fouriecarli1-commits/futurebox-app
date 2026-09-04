/**
 * A picture for a channel: chosen on the phone, squared, shrunk, uploaded.
 *
 * ── Why the browser does the work ────────────────────────────────────────
 *
 * A photo straight off a phone is three to eight megabytes of 4032×3024 JPEG.
 * Sent as-is that is a slow upload on a South African mobile connection, a
 * bucket that fills up, and a 4000-pixel image being scaled to 96 pixels on
 * every single view. Squaring and shrinking it here costs one canvas draw and
 * turns all three problems into one 40kB file.
 *
 * It also strips the metadata, which is the part worth saying out loud — see
 * `lib/imagefile.ts`, which does the reading, the shaping and the re-encoding
 * for this and for the cast. A phone photo carries EXIF, EXIF routinely
 * carries GPS coordinates, and this bucket is public: uploading the original
 * would publish somebody's home address alongside their face.
 *
 * ── The stamp on the name ────────────────────────────────────────────────
 *
 * The path carries the time it was written: `<owner>/<stamp>.webp`. It could
 * have been a fixed name, and then replacing a photo would leave the old one
 * on screen behind a cached URL — the classic "I changed it and nothing
 * happened", followed by a support message. A new name every time means the
 * browser has never seen it, so it always shows what was just uploaded. The
 * previous file is deleted in the same breath so the bucket does not grow a
 * copy per change.
 */

import { accessToken, configured, currentAccount, getStorageClient } from './cloud';
import { ACCEPTS as IMAGE_ACCEPTS, square } from './imagefile';

const BUCKET = 'avatars';

/** Big enough for a retina header, small enough to be nothing. */
const SIDE = 512;

/** Re-exported so a component takes one import to offer the right file types. */
export const ACCEPTS = IMAGE_ACCEPTS;

export type Chosen =
  | { readonly ok: true; readonly blob: Blob; readonly preview: string }
  | { readonly ok: false; readonly why: 'too_big' | 'not_an_image' | 'unreadable' };

/** Read the file the person picked, square it, shrink it, re-encode it. */
export async function squared(file: File): Promise<Chosen> {
  const made = await square(file, SIDE);
  return made.ok ? { ok: true, blob: made.blob, preview: made.preview } : made;
}

export type Saved =
  | { readonly ok: true; readonly path: string; readonly url: string }
  | { readonly ok: false; readonly why: string };

/**
 * Put it in the bucket and hand back where it went.
 *
 * The row is not written here. `Channel` saves the path through
 * `/api/creator` with everything else about the profile, so a photo and a name
 * changed together are one write rather than two that can half-fail.
 */
export async function upload(blob: Blob, replacing: string | null): Promise<Saved> {
  if (!configured()) return { ok: false, why: 'not_configured' };
  const storage = getStorageClient();
  const account = await currentAccount();
  if (!storage || !account) return { ok: false, why: 'signed_out' };

  const path = `${account.id}/${Date.now()}.webp`;
  const put = await storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    // A stamped name is new every time, so there is nothing to overwrite —
    // and saying so lets the storage layer reject a genuine collision rather
    // than silently clobbering it.
    upsert: false,
    // A year. The name changes when the picture does, so the old one being
    // held forever is the point rather than a risk.
    cacheControl: '31536000',
  });
  if (put.error) return { ok: false, why: put.error.message };

  /* The one it replaces goes now.

     Best effort on purpose: if the delete fails the new photo is still up and
     correct, and an orphaned 40kB file is not worth failing a save over. The
     path is checked to be theirs before asking, because the value came back
     from a row and a row is not a place to trust a path from. */
  if (replacing && replacing.startsWith(`${account.id}/`)) {
    await storage.from(BUCKET).remove([replacing]).catch(() => undefined);
  }

  return { ok: true, path, url: publicUrl(path) };
}

/** Take the picture down, and the file with it. */
export async function remove(path: string): Promise<boolean> {
  const storage = getStorageClient();
  const account = await currentAccount();
  if (!storage || !account) return false;
  if (!path.startsWith(`${account.id}/`)) return false;
  const { error } = await storage.from(BUCKET).remove([path]);
  return !error;
}

/**
 * Where a stored path can be looked at.
 *
 * Built rather than fetched: the bucket is public, so the URL is a pure
 * function of the path and asking the server for it would be a round trip per
 * avatar in a list.
 */
export function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!base || !path) return '';
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** So a caller can tell "not signed in" from "signed in, no photo". */
export async function signedIn(): Promise<boolean> {
  return Boolean(await accessToken());
}

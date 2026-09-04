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
 * It also strips the metadata, which is the part worth saying out loud. A
 * phone photo carries EXIF, and EXIF routinely carries GPS coordinates —
 * where the picture was taken, to within a few metres. Uploading the original
 * to a **public** bucket would publish somebody's home address alongside their
 * face, and nobody choosing a profile picture is thinking about that. Drawing
 * to a canvas and re-encoding keeps the pixels and discards everything else.
 *
 * ── Squared by cropping, not squashing ───────────────────────────────────
 *
 * The centre square is taken and the rest dropped. Scaling a portrait into a
 * square instead would make every face too wide, which is worse than losing
 * some background — and a crop is what the round frame on the channel shows
 * anyway.
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

const BUCKET = 'avatars';

/** Big enough for a retina header, small enough to be nothing. */
const SIDE = 512;

/** What a phone camera hands over, and what browsers can all decode. */
export const ACCEPTS = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/**
 * Refused before anything is read.
 *
 * Twelve megabytes is a generous phone photo. The point is not to save the
 * bucket — the file that lands is 40kB whatever came in — it is that decoding
 * a 100-megapixel image in a phone browser is how a tab runs out of memory and
 * dies, taking the unsaved page with it.
 */
const MAX_BYTES = 12 * 1024 * 1024;

export type Chosen =
  | { readonly ok: true; readonly blob: Blob; readonly preview: string }
  | { readonly ok: false; readonly why: 'too_big' | 'not_an_image' | 'unreadable' };

/** Read the file the person picked, square it, shrink it, re-encode it. */
export async function squared(file: File): Promise<Chosen> {
  if (!file.type.startsWith('image/')) return { ok: false, why: 'not_an_image' };
  if (file.size > MAX_BYTES) return { ok: false, why: 'too_big' };

  let bitmap: ImageBitmap;
  try {
    // `createImageBitmap` decodes off the main thread and honours the EXIF
    // orientation flag, so a photo taken sideways is not stored sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // HEIC on a browser that cannot decode it lands here, which is the common
    // case on an iPhone talking to a non-Safari browser.
    return { ok: false, why: 'unreadable' };
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const left = Math.round((bitmap.width - side) / 2);
  const top = Math.round((bitmap.height - side) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return { ok: false, why: 'unreadable' };
  }
  context.drawImage(bitmap, left, top, side, side, 0, 0, SIDE, SIDE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    // WebP at 0.85 is visually clean at this size and about a third of the
    // JPEG. Every browser that can run this app can display it.
    canvas.toBlob(resolve, 'image/webp', 0.85),
  );
  if (!blob) return { ok: false, why: 'unreadable' };

  return { ok: true, blob, preview: canvas.toDataURL('image/webp', 0.85) };
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

/**
 * Reading a picture somebody chose, and getting it down to a sensible file.
 *
 * ── Why this is shared ───────────────────────────────────────────────────
 *
 * Two places take a picture off a phone and both need the same three things
 * done to it, for the same reasons — a profile picture (`lib/avatar.ts`) and a
 * cast member (`lib/cast.ts`). They differ in exactly one way: a profile
 * picture is cropped to a square, and a cast member keeps its shape because it
 * is a reference for what a clip should look like and cropping a wide product
 * shot into a square throws away the composition.
 *
 * That one difference is `square` versus `fit`. Everything else — the size
 * limit, the decode, the orientation, the re-encode — is identical, and having
 * it written twice is how the two quietly stop agreeing.
 *
 * ── The three things ─────────────────────────────────────────────────────
 *
 * **Refused before decoding.** Twelve megabytes is a generous phone photo. The
 * point is not to save bandwidth — what leaves is small whatever came in — it
 * is that decoding a hundred-megapixel image in a phone browser is how a tab
 * runs out of memory and dies, taking the unsaved page with it.
 *
 * **Decoded with its orientation.** `createImageBitmap` does it off the main
 * thread and honours the EXIF orientation flag, so a photo taken sideways is
 * not stored sideways.
 *
 * **Re-encoded, which is what drops the metadata.** A phone photo carries EXIF
 * and EXIF routinely carries GPS coordinates — where the picture was taken, to
 * within a few metres. Drawing to a canvas and encoding from that keeps the
 * pixels and nothing else. For a profile picture on a public bucket that is
 * the difference between a face and a home address; for a cast member it is
 * one less thing travelling to an engine we do not run.
 */

/** What a phone camera hands over, and what browsers can all decode. */
export const ACCEPTS = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/** See the note above: this is a memory ceiling, not a bandwidth one. */
export const MAX_BYTES = 12 * 1024 * 1024;

export type Why = 'too_big' | 'not_an_image' | 'unreadable';

export type Made =
  | { readonly ok: true; readonly blob: Blob; readonly preview: string; readonly width: number; readonly height: number }
  | { readonly ok: false; readonly why: Why };

/** WebP at this quality is visually clean at these sizes and a third of a JPEG. */
const QUALITY = 0.85;

async function decode(file: File): Promise<ImageBitmap | Why> {
  if (!file.type.startsWith('image/')) return 'not_an_image';
  if (file.size > MAX_BYTES) return 'too_big';
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // HEIC on a browser that cannot decode it lands here, which is the common
    // case on an iPhone talking to something other than Safari.
    return 'unreadable';
  }
}

function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
}

async function draw(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  paint: (context: CanvasRenderingContext2D) => void,
): Promise<Made> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return { ok: false, why: 'unreadable' };
  }
  paint(context);
  bitmap.close();
  const blob = await encode(canvas);
  if (!blob) return { ok: false, why: 'unreadable' };
  return { ok: true, blob, preview: canvas.toDataURL('image/webp', QUALITY), width, height };
}

/**
 * The centre square, at `side` across.
 *
 * Cropped rather than squashed. Scaling a portrait into a square makes every
 * face too wide, which is worse than losing some background — and a crop is
 * what a round frame shows anyway.
 */
export async function square(file: File, side: number): Promise<Made> {
  const bitmap = await decode(file);
  if (typeof bitmap === 'string') return { ok: false, why: bitmap };

  const from = Math.min(bitmap.width, bitmap.height);
  const left = Math.round((bitmap.width - from) / 2);
  const top = Math.round((bitmap.height - from) / 2);
  return draw(bitmap, side, side, (context) =>
    context.drawImage(bitmap, left, top, from, from, 0, 0, side, side),
  );
}

/**
 * The whole picture, with its longest edge at `longest`.
 *
 * Nothing cropped, because this one is a reference for what a shot should look
 * like: the framing of a product shot is half of what it is being used to say.
 * A picture already smaller than the limit is left at its own size rather than
 * being scaled up into softness.
 */
export async function fit(file: File, longest: number): Promise<Made> {
  const bitmap = await decode(file);
  if (typeof bitmap === 'string') return { ok: false, why: bitmap };

  const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  return draw(bitmap, width, height, (context) => context.drawImage(bitmap, 0, 0, width, height));
}

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
 * **Refused before decoding, by PIXELS and not by bytes.** The point is not to
 * save bandwidth — what leaves is small whatever came in — it is that
 * decoding a hundred-megapixel image in a phone browser is how a tab runs out
 * of memory and dies, taking the unsaved page with it.
 *
 * That was the stated reason from the day this file was written, and the
 * guard that was supposed to enforce it measured **file size**. The two are
 * not the same thing and JPEG is why: compression means a 200-megapixel photo
 * off a modern phone lands at ten or twelve megabytes on disk, sails through a
 * twelve-megabyte ceiling, and then asks the browser for 200,000,000 pixels
 * × 4 bytes — **eight hundred megabytes** in one allocation. The tab does not
 * throw. It is killed, which is a white screen with no error in it, because
 * the thing that would have drawn the error died too.
 *
 * Carli, 14 September 2026, choosing a photo on her phone: *"Toe ek 'n foto
 * kies op my foon maak die skerm so blank."* Scrolling did nothing, a reload
 * fixed it, and the picture was never saved — which is exactly the shape of a
 * process that stopped existing rather than a render that failed.
 *
 * So the size of the picture is read out of its own header first, before any
 * decoder is asked for anything, and the dimensions go into the decode as a
 * resize request so the browser can scale while decoding rather than after.
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

/**
 * A bytes ceiling, which is a real one — it just is not the memory one.
 *
 * Kept because reading a 200MB file into a browser is its own problem, and
 * because a file this big is almost always a mistake. It is no longer doing
 * the job the comment above used to claim for it.
 */
export const MAX_BYTES = 12 * 1024 * 1024;

/**
 * The memory ceiling, in pixels, which is what actually kills a tab.
 *
 * Four bytes a pixel, so eighty megapixels is a 320MB allocation at worst.
 * That is above every ordinary camera mode — 12MP, 48MP and 50MP all pass —
 * and below the 108MP and 200MP modes that are the ones doing the killing.
 *
 * A backstop, not the main defence: the decode below asks for a scaled result,
 * and where the browser honours that during decoding rather than after, even a
 * 200MP file never allocates in full. This number is what happens when it does
 * not, and a clear sentence about the camera mode beats a dead tab. It can be
 * raised once a scaled decode has been watched working on a real phone.
 */
export const MAX_PIXELS = 80 * 1000 * 1000;

/**
 * The largest edge any caller here ever keeps.
 *
 * `square()` and `fit()` both pass their own number, and both are at or below
 * this — 1024 for a cast member, less for an avatar. Decoding bigger than the
 * biggest thing anybody stores is work done to be thrown away, and on a phone
 * it is the work that kills the tab.
 */
const BIGGEST_EDGE = 2048;

export type Why = 'too_big' | 'too_many_pixels' | 'not_an_image' | 'unreadable';

export type Made =
  | { readonly ok: true; readonly blob: Blob; readonly preview: string; readonly width: number; readonly height: number }
  | { readonly ok: false; readonly why: Why };

/** WebP at this quality is visually clean at these sizes and a third of a JPEG. */
const QUALITY = 0.85;

/**
 * How big the picture is, read out of its own first bytes.
 *
 * Every format here writes its dimensions near the front, so this reads a
 * slice rather than the file: 256KB covers a JPEG whose EXIF thumbnail runs
 * long before the frame header, and is nothing to read off a phone.
 *
 * Returns null when it cannot tell — HEIC, most obviously, whose dimensions
 * are inside an ISO-BMFF box tree that is not worth a parser here. Null means
 * "unknown", never "fine": the caller decides, and what it decides is to go
 * ahead, because refusing every HEIC on a suspicion would refuse every iPhone
 * photo. HEIC is also the case a browser most often cannot decode at all,
 * which fails safely two lines later.
 */
export async function measure(file: Blob): Promise<{ width: number; height: number } | null> {
  const head = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
  const byte = (at: number): number => (at < head.byteLength ? head.getUint8(at) : -1);

  /* PNG: an 8-byte signature, then IHDR, whose first two fields are the
     dimensions as big-endian 32-bit. Always at 16 and 20. */
  if (byte(0) === 0x89 && byte(1) === 0x50 && byte(2) === 0x4e && byte(3) === 0x47) {
    if (head.byteLength < 24) return null;
    return { width: head.getUint32(16), height: head.getUint32(20) };
  }

  /* WebP: 'RIFF' ... 'WEBP', then one of three chunk types, each of which
     writes its size in a different place and a different way. */
  if (byte(0) === 0x52 && byte(1) === 0x49 && byte(2) === 0x46 && byte(3) === 0x46
      && byte(8) === 0x57 && byte(9) === 0x45 && byte(10) === 0x42 && byte(11) === 0x50) {
    const kind = String.fromCharCode(byte(12), byte(13), byte(14), byte(15));
    if (kind === 'VP8 ' && head.byteLength > 30) {
      return { width: head.getUint16(26, true) & 0x3fff, height: head.getUint16(28, true) & 0x3fff };
    }
    if (kind === 'VP8L' && head.byteLength > 25) {
      const bits = head.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8X' && head.byteLength > 30) {
      /* Three bytes each, little-endian, and stored one less than they are. */
      const w = byte(24) | (byte(25) << 8) | (byte(26) << 16);
      const h = byte(27) | (byte(28) << 8) | (byte(29) << 16);
      return { width: w + 1, height: h + 1 };
    }
    return null;
  }

  /* JPEG: walk the markers to a start-of-frame, which is where the size is.
     Everything before it — EXIF, a thumbnail, colour profiles — is skipped by
     its own length, which is why this cannot just look at a fixed offset. */
  if (byte(0) === 0xff && byte(1) === 0xd8) {
    let at = 2;
    while (at + 9 < head.byteLength) {
      if (byte(at) !== 0xff) { at += 1; continue; }
      const marker = byte(at + 1);
      /* Padding, and the two markers that carry no length. */
      if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { at += 2; continue; }
      const length = head.getUint16(at + 2);
      /* Any start-of-frame: baseline, progressive, lossless, arithmetic — but
         not DHT (c4), DAC (cc) or the restart markers, which sit in the same
         numeric range and are not frames. */
      const frame = (marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (frame) return { height: head.getUint16(at + 5), width: head.getUint16(at + 7) };
      if (length < 2) return null;
      at += 2 + length;
    }
    return null;
  }

  return null;
}

async function decode(file: File): Promise<ImageBitmap | Why> {
  if (!file.type.startsWith('image/')) return 'not_an_image';
  if (file.size > MAX_BYTES) return 'too_big';

  /* Before any decoder is asked for anything. A tab that is killed here does
     not throw, so there is no catch that helps — the only defence is not
     making the request. */
  const size = await measure(file).catch(() => null);
  if (size && size.width * size.height > MAX_PIXELS) return 'too_many_pixels';

  try {
    /* The resize goes INTO the decode. Where a browser honours it — Chrome
       does for JPEG — the full-size bitmap is never allocated at all, which
       is the difference between a scaled decode and a decode followed by a
       scale. Asked for only when the size is known, because both edges have
       to be given for the aspect to survive. */
    const scaled = size
      ? (() => {
          const shrink = Math.min(1, BIGGEST_EDGE / Math.max(size.width, size.height));
          return shrink < 1
            ? {
                resizeWidth: Math.max(1, Math.round(size.width * shrink)),
                resizeHeight: Math.max(1, Math.round(size.height * shrink)),
                resizeQuality: 'high' as const,
              }
            : {};
        })()
      : {};
    return await createImageBitmap(file, { imageOrientation: 'from-image', ...scaled });
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
 * The centre square with something painted over it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 20 September 2026, about the art market: *"Screenshots gaan die
 * kunswerke skade doen."* She is right, and the honest position is that
 * neither a screenshot nor a phone camera pointed at the screen can be
 * stopped by anything a web page is able to do. What CAN be done is make
 * the copy worthless: show a marked, downsized preview to everybody and
 * release the clean file only to the person who paid for it.
 *
 * That is what every stock library does, for exactly this reason, and it
 * is the only measure that works against a camera as well as a capture.
 *
 * The mark is drawn INTO the pixels at upload, not over the picture in
 * CSS. A CSS overlay is one line in a browser's inspector away from gone,
 * and the clean bytes were on the wire the whole time.
 */
export async function squareMarked(
  file: File,
  side: number,
  paintMark: (context: CanvasRenderingContext2D, side: number) => void,
): Promise<Made> {
  const bitmap = await decode(file);
  if (typeof bitmap === 'string') return { ok: false, why: bitmap };

  const from = Math.min(bitmap.width, bitmap.height);
  const left = Math.round((bitmap.width - from) / 2);
  const top = Math.round((bitmap.height - from) / 2);
  return draw(bitmap, side, side, (context) => {
    context.drawImage(bitmap, left, top, from, from, 0, 0, side, side);
    paintMark(context, side);
  });
}

/**
 * The whole picture, with its longest edge at `longest`.
 *
 * Nothing cropped, because this one is a reference for what a shot should look
 * like: the framing of a product shot is half of what it is being used to say.
 * A picture already smaller than the limit is left at its own size rather than
 * being scaled up into softness.
 */
/**
 * The arithmetic of fitting, on its own, so it can be checked.
 *
 * ── Why this is not inside `fit` any more ────────────────────────────────
 *
 * Carli has reported the cast strip three times. `audit/cast.mjs` claimed to
 * hold the rule that matters most about it — *a wide picture stays wide, it
 * is fitted and not cropped square* — by uploading 1600×900 and measuring
 * what came back out of the bucket. The bucket in that probe is a stub that
 * answers every download with a one-pixel PNG. So the assertion was reading
 * the stub, and the day it started reading the right element it said 1×1 and
 * went red on a room that was doing the right thing.
 *
 * A measurement that can only be taken in a browser, against a stub, is a
 * measurement nobody can check — the same sentence `check:photo` opens with.
 * The sizing is arithmetic, so it comes out here where a source check can
 * put numbers through it, and `fit` keeps the part that genuinely needs a
 * canvas.
 */
export function fitTo(
  width: number,
  height: number,
  longest: number,
): { readonly width: number; readonly height: number } {
  const biggest = Math.max(width, height);
  /* Never up. A 300-pixel picture stretched to 1024 is a 300-pixel picture
     with more bytes, and the engine reads the detail that is there. */
  const scale = biggest > 0 ? Math.min(1, longest / biggest) : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function fit(file: File, longest: number): Promise<Made> {
  const bitmap = await decode(file);
  if (typeof bitmap === 'string') return { ok: false, why: bitmap };

  const { width, height } = fitTo(bitmap.width, bitmap.height, longest);
  return draw(bitmap, width, height, (context) => context.drawImage(bitmap, 0, 0, width, height));
}

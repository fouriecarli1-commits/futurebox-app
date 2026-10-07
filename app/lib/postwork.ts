/**
 * Three things done TO a photograph: turned, sharpened, made bigger.
 *
 * ── Why these three are in one file ──────────────────────────────────────
 *
 * Not because they are alike — turning a picture is geometry and sharpening
 * it is arithmetic over every pixel — but because they share the one thing
 * that actually goes wrong, which is size. Each of them writes a new canvas
 * the size of the old one or larger, on a device with a hard ceiling on how
 * many pixels a canvas may hold, and the ceiling is lower on a phone than
 * anywhere a developer tests.
 *
 * `imagefile.ts` already names that ceiling and refuses a photograph above it
 * on the way in. Everything here is held to the same number, so a picture
 * that was allowed in cannot be turned into one that would not have been.
 *
 * ── None of this is AI, and the screen says so ───────────────────────────
 *
 * Carli listed an "upscaler" among the modern tools she wanted, and the
 * honest version of that is two different products. One guesses detail that
 * was never in the photograph, needs a model and a supplier, and costs money
 * per press. The other resamples what is there, runs on the phone in a
 * moment and costs nothing — it makes a picture bigger without making it
 * sharper, which is what somebody printing a post actually needs.
 *
 * This is the second one. Calling it an upscaler would be the app claiming
 * the first, and `check:ownwords` exists because this codebase does not do
 * that.
 */

import { MAX_PIXELS } from './imagefile';

/** Enough of an image to measure and draw. Real images and canvases satisfy this. */
export interface Drawable {
  readonly naturalWidth?: number;
  readonly naturalHeight?: number;
  readonly width: number;
  readonly height: number;
}

export const sizeOf = (of: Drawable): { readonly width: number; readonly height: number } => ({
  width: of.naturalWidth || of.width || 1,
  height: of.naturalHeight || of.height || 1,
});

/** A quarter turn clockwise, counted 0 to 3. */
export type Quarter = 0 | 1 | 2 | 3;

export const nextQuarter = (now: Quarter, by: number): Quarter =>
  (((now + by) % 4) + 4) % 4 as Quarter;

/**
 * What a turn does to the size.
 *
 * An odd number of quarter turns swaps the sides. Separated from the drawing
 * so the room can say what the picture is about to become, and so the
 * arithmetic can be checked without a canvas.
 */
export const turnedSize = (
  of: { readonly width: number; readonly height: number },
  quarter: Quarter,
): { readonly width: number; readonly height: number } =>
  (quarter % 2 === 0 ? { width: of.width, height: of.height } : { width: of.height, height: of.width });

/**
 * The picture turned, and flipped if asked.
 *
 * One canvas and one transform rather than a turn followed by a flip. Two
 * passes means two resamples of the same pixels, and on a photograph that is
 * visible: every one costs a little sharpness, and somebody straightening a
 * picture presses this four times getting it right.
 */
export function turned(
  picture: CanvasImageSource & Drawable,
  quarter: Quarter,
  mirror = false,
): HTMLCanvasElement | null {
  const of = sizeOf(picture);
  const out = turnedSize(of, quarter);
  const made = document.createElement('canvas');
  made.width = out.width;
  made.height = out.height;
  const ctx = made.getContext('2d');
  if (!ctx) return null;

  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((quarter * Math.PI) / 2);
  /* Mirrored after the turn, so "flip" always means left-for-right as it
     looks on the screen now — not as it looked before she turned it, which
     is the behaviour that makes a flip button feel broken. */
  if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(picture, -of.width / 2, -of.height / 2, of.width, of.height);
  return made;
}

/**
 * How much sharper, as the share of the difference that is added back.
 *
 * An unsharp mask adds the difference between the picture and a blurred copy
 * of itself. At 1 the difference is doubled, which on a phone photograph is
 * already more than anybody wants; the three rungs below are what the room
 * offers, and the names are what they do rather than numbers.
 */
export const SHARPEN = { gentle: 0.5, normal: 0.9, strong: 1.5 } as const;
export type Sharpness = keyof typeof SHARPEN;

/**
 * The picture, sharpened.
 *
 * ── An unsharp mask, which is not a 3x3 kernel ───────────────────────────
 *
 * The obvious implementation is a nine-tap convolution per pixel. On a
 * 4032x3024 photograph that is a hundred million multiplications in
 * JavaScript, and it sharpens at exactly one scale — the scale of one pixel
 * — which on a big photograph is grain rather than edges.
 *
 * An unsharp mask is the same idea done properly and faster: blur a copy,
 * then add back the difference. One pass over the pixels, and the radius of
 * the blur decides what counts as an edge. The browser's own blur does the
 * expensive half, in C.
 *
 * The radius is a share of the picture rather than a number of pixels, for
 * the same reason the cut edge is: two pixels is a fine detail on a
 * thumbnail and invisible grain on a photograph off a camera.
 */
export function sharpened(
  picture: CanvasImageSource & Drawable,
  how: Sharpness,
): HTMLCanvasElement | null {
  const of = sizeOf(picture);
  const made = document.createElement('canvas');
  made.width = of.width;
  made.height = of.height;
  const ctx = made.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(picture, 0, 0, of.width, of.height);

  const soft = document.createElement('canvas');
  soft.width = of.width;
  soft.height = of.height;
  const blur = soft.getContext('2d', { willReadFrequently: true });
  if (!blur) return null;
  blur.filter = `blur(${Math.max(1, Math.min(of.width, of.height) * 0.0025)}px)`;
  blur.drawImage(picture, 0, 0, of.width, of.height);
  blur.filter = 'none';

  const sharp = ctx.getImageData(0, 0, of.width, of.height);
  const base = blur.getImageData(0, 0, of.width, of.height);
  const by = SHARPEN[how];
  const a = sharp.data;
  const b = base.data;
  for (let i = 0; i < a.length; i += 4) {
    /* Three channels, not four. Alpha is not detail — pushing it is how a
       feathered cut-out grows a hard halo round the edge it was feathered
       to avoid. */
    a[i] = Math.max(0, Math.min(255, a[i] + (a[i] - b[i]) * by));
    a[i + 1] = Math.max(0, Math.min(255, a[i + 1] + (a[i + 1] - b[i + 1]) * by));
    a[i + 2] = Math.max(0, Math.min(255, a[i + 2] + (a[i + 2] - b[i + 2]) * by));
  }
  ctx.putImageData(sharp, 0, 0);
  return made;
}

/** The sizes a picture can be made, as multiples of itself. */
export const BIGGER = [1.5, 2, 3] as const;
export type Times = (typeof BIGGER)[number];

/** Would this come out above the ceiling a phone can hold? */
export const tooBig = (of: { readonly width: number; readonly height: number }, times: number): boolean =>
  Math.round(of.width * times) * Math.round(of.height * times) > MAX_PIXELS;

/**
 * The picture, made bigger.
 *
 * ── Doubling steps, not one jump ─────────────────────────────────────────
 *
 * `drawImage` from 1000 pixels straight to 3000 asks the browser to invent
 * two pixels out of every three in one go, and what it does — even at
 * `imageSmoothingQuality: 'high'` — is soft and slightly blocky on a
 * diagonal. Going up in steps of no more than two at a time gives each step
 * a job it is good at, and the result is visibly cleaner on the one thing
 * anybody looks at, which is an edge at forty-five degrees.
 *
 * The same reason, and the same arithmetic, as the feather in `cutout.ts`
 * growing in doubling steps.
 */
export function bigger(
  picture: CanvasImageSource & Drawable,
  times: Times,
): HTMLCanvasElement | null {
  const of = sizeOf(picture);
  if (tooBig(of, times)) return null;

  let from: CanvasImageSource & Drawable = picture;
  let wide = of.width;
  let tall = of.height;
  const want = { width: Math.round(of.width * times), height: Math.round(of.height * times) };
  let made: HTMLCanvasElement | null = null;

  while (wide < want.width) {
    const step = Math.min(2, want.width / wide);
    wide = Math.round(wide * step);
    tall = Math.round(tall * step);
    /* The last step lands exactly on what was asked for, rather than within
       a pixel of it: a 1.5x of a 999-wide picture is 1498.5, and rounding
       each step separately walks away from the answer. */
    if (wide >= want.width) {
      wide = want.width;
      tall = want.height;
    }
    const to = document.createElement('canvas');
    to.width = wide;
    to.height = tall;
    const ctx = to.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(from, 0, 0, wide, tall);
    made = to;
    from = to;
  }
  return made;
}

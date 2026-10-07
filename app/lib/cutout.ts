/**
 * Taking the background out, on the phone, for nothing.
 *
 * ── What it is and what it is not ────────────────────────────────────────
 *
 * Carli, 7 October 2026: *"BG remover"*, in her list of what a modern editor
 * has. This is the second of the free half of that list, and the one with a
 * limit worth saying out loud in the room rather than burying here:
 *
 *   **it looks for a PERSON.**
 *
 * The model is MediaPipe's selfie segmentation. It is very good at a person
 * against anything, and it knows nothing about a guitar, a bottle or a dog.
 * A background remover that silently does nothing on a photograph of a
 * guitar would be worse than no button, so `cutOut` refuses with a reason
 * when it finds nobody rather than handing back an empty picture.
 *
 * That refusal is not politeness. Cutting a picture with no person in it
 * leaves a frame that is entirely transparent — and on a dark phone screen a
 * fully transparent picture and a deleted picture look exactly the same.
 *
 * ── 6 MB, and why this model rather than the newer one ───────────────────
 *
 * Google's current Tasks API ships a 13 MB WebAssembly bundle, because it
 * carries hands, face, pose and everything else alongside segmentation. This
 * older solution is 6 MB for the same answer. It is deprecated, and
 * self-hosting freezes it: the files are in `public/segment/` and will go on
 * working exactly as they do today whatever Google does next.
 *
 * Six megabytes is still six megabytes, and her members are on prepaid data.
 * So nothing is fetched until the button is pressed, and the room says the
 * first press takes a moment.
 *
 * ── Everything is served from this app, for the same reason as the reader ─
 *
 * `connect-src 'self'`. The loader's default is a CDN and would be refused
 * by the browser with a console line nobody reads. `locateFile` points every
 * one of its requests at `/segment/`. See `lib/ocr.ts` for the same fight
 * fought once already.
 */

/** Where the self-hosted model lives. */
const HERE = '/segment';

/**
 * How much of the frame has to be a person before this is worth doing.
 *
 * Below this the answer is "nobody in this picture", not "here is your
 * photograph with almost all of it removed". Two per cent is low on purpose:
 * somebody small in a wide shot is still somebody, and the failure this
 * guards against is a mask that found nothing at all.
 */
export const ENOUGH = 0.02;

export type Cut =
  | { readonly ok: true; readonly canvas: HTMLCanvasElement; readonly kept: number }
  | { readonly ok: false; readonly why: 'nobody' | 'failed' };

/**
 * What share of a mask is foreground.
 *
 * Pure, and separate from everything else, because it is the number the
 * refusal above turns on and the only way to test that refusal without a
 * photograph of a person.
 *
 * The mask comes back as a greyscale picture: white where the model is sure
 * it is a person, black where it is sure it is not, and grey at the edge of
 * the hair. Half way is the fairest line through that, and the same line the
 * compositing uses — so what is counted here is exactly what is kept.
 */
export function shareKept(mask: Uint8ClampedArray): number {
  if (mask.length < 4) return 0;
  let kept = 0;
  const pixels = mask.length / 4;
  for (let i = 0; i < mask.length; i += 4) {
    if (mask[i] >= 128) kept += 1;
  }
  return kept / pixels;
}

/**
 * The picture with everything outside the mask made transparent.
 *
 * Exported on its own so it can be proved with a mask made by hand, which is
 * the only way to test the compositing without depending on the model being
 * good at its job. What the model finds is Google's problem; that what it
 * finds is what gets kept is ours.
 *
 * `destination-in` keeps the destination where the source is opaque, which
 * is the mask applied in one composite rather than a loop over two million
 * pixels in JavaScript — the same reason `postlook.ts` uses `ctx.filter`.
 */
export function maskOnto(
  picture: CanvasImageSource,
  mask: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  ctx.drawImage(picture, 0, 0, width, height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/** The loader, kept between presses so the second one is instant. */
let engine: unknown = null;
let loading: Promise<unknown> | null = null;

/**
 * The library, fetched as a script from this app rather than imported.
 *
 * It is a Closure-compiled bundle that ends `Aa("SelfieSegmentation", nd)` —
 * it attaches a global and exports nothing. `await import()` of it therefore
 * hands back a module object with no `SelfieSegmentation` on it, the `new`
 * throws, and the screen says "the background could not be taken out" for a
 * reason that has nothing to do with the picture. That is how this first
 * failed, and the message was honest and useless.
 *
 * A `<script src="/segment/...">` is what the file actually is. It is
 * same-origin, so `script-src 'self'` allows it; it keeps six megabytes out
 * of the bundler entirely; and it is fetched from the same place as the wasm
 * and the model, so there is one directory to get right rather than two
 * mechanisms to keep in step.
 */
function library(): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const had = (window as unknown as Record<string, unknown>).SelfieSegmentation;
  if (had) return Promise.resolve(had);
  if (loading) return loading;
  loading = new Promise((done, fail) => {
    const tag = document.createElement('script');
    tag.src = `${HERE}/selfie_segmentation.js`;
    tag.async = true;
    tag.onload = () => done((window as unknown as Record<string, unknown>).SelfieSegmentation ?? null);
    tag.onerror = () => fail(new Error('segment script'));
    document.head.appendChild(tag);
  });
  return loading;
}

/**
 * Cut the background out of a picture.
 *
 * @param onStep called with 0..1 while the model loads. The first press
 *   fetches six megabytes, and a screen with nothing moving on it reads as
 *   broken rather than busy.
 */
export async function cutOut(
  picture: HTMLImageElement | HTMLCanvasElement,
  onStep?: (part: number) => void,
): Promise<Cut> {
  try {
    onStep?.(0.05);
    const Maker = (await library()) as (new (opts: {
      locateFile: (file: string) => string;
    }) => unknown) | null;
    if (!Maker) return { ok: false, why: 'failed' };

    type Runner = {
      setOptions: (o: { modelSelection: number; selfieMode: boolean }) => void;
      onResults: (fn: (r: { segmentationMask: CanvasImageSource }) => void) => void;
      send: (i: { image: CanvasImageSource }) => Promise<void>;
      initialize?: () => Promise<void>;
    };

    if (!engine) {
      /* Every file, from here. The default is a CDN and this app's
         connect-src is 'self'. */
      const made = new Maker({ locateFile: (file: string) => `${HERE}/${file}` }) as Runner;
      /* Model 0, the general one, and the number matters more than it looks.
 
         Model 1 is the LANDSCAPE model and asks the server for
         `selfie_segmentation_landscape.tflite`, which was not among the files
         copied here — so the wasm aborted deep inside itself, the callback
         never fired, and the screen said "the background could not be taken
         out of that picture", which is honest and useless: it is not the
         picture, it is a 404 on a file nobody had listed.
 
         Model 0 is also the better of the two for a still. It reads at
         256x256 against the landscape model's 144x256, and quality matters
         more than speed for one photograph somebody is going to post. */
      made.setOptions({ modelSelection: 0, selfieMode: false });
      await made.initialize?.();
      engine = made;
    }
    onStep?.(0.5);
    const runner = engine as Runner;

    const width = 'naturalWidth' in picture
      ? (picture.naturalWidth || picture.width)
      : picture.width;
    const height = 'naturalHeight' in picture
      ? (picture.naturalHeight || picture.height)
      : picture.height;

    const mask = await new Promise<CanvasImageSource | null>((done) => {
      /* A ceiling on the wait. `onResults` is a callback with no error path,
         so a model that loads and then never answers would leave the button
         spinning for ever — which is the shape of failure this whole file is
         written against. */
      const giveUp = window.setTimeout(() => done(null), 30_000);
      runner.onResults((r) => {
        window.clearTimeout(giveUp);
        done(r.segmentationMask ?? null);
      });
      void runner.send({ image: picture });
    });
    if (!mask) return { ok: false, why: 'failed' };
    onStep?.(0.9);

    /* Read the mask at a small size. The share of the frame that is a person
       is the same answer at 128 pixels across as at four thousand, and
       reading two million pixels to get one number is time somebody waits
       for. */
    const small = document.createElement('canvas');
    small.width = 128;
    small.height = Math.max(1, Math.round(128 * (height / Math.max(1, width))));
    const look = small.getContext('2d', { willReadFrequently: true });
    if (!look) return { ok: false, why: 'failed' };
    look.drawImage(mask, 0, 0, small.width, small.height);
    const kept = shareKept(look.getImageData(0, 0, small.width, small.height).data);
    if (kept < ENOUGH) return { ok: false, why: 'nobody' };

    return { ok: true, canvas: maskOnto(picture, mask, width, height), kept };
  } catch {
    return { ok: false, why: 'failed' };
  }
}

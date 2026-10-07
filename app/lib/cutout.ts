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
  | {
    readonly ok: true;
    readonly canvas: HTMLCanvasElement;
    readonly kept: number;
    /**
     * The model's own answer, kept so the edge can be changed without
     * asking it again.
     *
     * Copied rather than handed on: the engine reuses its own canvas for the
     * next picture, so holding its reference means holding something that
     * silently becomes somebody else's mask.
     */
    readonly mask: HTMLCanvasElement;
  }
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
  softness: number = SOFTNESS,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  /* High, and not the default.
 
     Carli, 7 October 2026, with a photograph of herself cut out: *"Its not
     looking perfect."* The edges were stair-stepped and her shoulders were
     streaking sideways.
 
     The model answers at 256 by 256 whatever it was given. A phone photograph
     is ten or more times that on each side, so each mask pixel covers a block
     of ten by ten of her — and the browser's DEFAULT smoothing quality is
     `low`, which on a blow-up that large is close to drawing the blocks. The
     streaks on her shoulder were one row of mask being stretched across a
     hundred rows of photograph. */
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(picture, 0, 0, width, height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(feathered(mask, width, height, softness), 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/**
 * How soft the cut edge is, as a share of a single mask pixel.
 *
 * A fraction of one mask pixel rather than a number of picture pixels,
 * because the fault being softened is the SIZE of a mask pixel: a blur fixed
 * in picture pixels is far too much on a small photograph and nothing at all
 * on a large one.
 *
 * A third is enough to turn a staircase into an edge and little enough that
 * nothing of her is eaten. Anything approaching a whole mask pixel starts
 * dissolving hair, which is the part everybody looks at.
 */
export const SOFTNESS = 1.6;

/**
 * How soft the edge is, as a choice rather than a guess.
 *
 * Carli photographed the fault and I cannot photograph the fix: how an edge
 * reads depends on the picture, on how much of the frame the person fills and
 * on the hair. One number chosen from one screenshot is a guess that costs
 * her a day to disprove.
 *
 * A fraction of a MASK pixel in every case, so the same choice means the same
 * thing on a small photograph and a large one.
 */
export const EDGES = [
  { id: 'tight', soft: 0.8 },
  { id: 'normal', soft: 1.6 },
  { id: 'soft', soft: 3 },
] as const;

export type EdgeId = (typeof EDGES)[number]['id'];

export const edgeOf = (id: string): number =>
  (EDGES.find((one) => one.id === id) ?? EDGES[1]).soft;

/**
 * The mask, blown up to the picture's size with a soft edge.
 *
 * Drawn in two steps rather than one. Blurring while scaling blurs by the
 * OUTPUT's pixels, which is the thing that cannot be reasoned about: the same
 * setting is a different softness on every photograph. Scaling first and then
 * blurring by a share of what one mask pixel has become is a softness that
 * means the same thing whatever came in.
 */
export function feathered(
  mask: CanvasImageSource,
  width: number,
  height: number,
  softness: number = SOFTNESS,
): HTMLCanvasElement {
  const was = Math.max(1, (mask as { width?: number }).width ?? 1);
  const tall = Math.max(1, (mask as { height?: number }).height ?? 1);

  /* ── Softened at the MASK's own size, before anything is stretched ────
 
     Carli, 7 October 2026, twice, with photographs of herself: *"Its not
     looking perfect"*, then *"Nogsteeds rowwe edges"* — and the second
     picture showed the answer. The rough edges were HORIZONTAL streaks
     along her collar.
 
     The model takes a square. A portrait photograph is squashed into 256 by
     256 to be read and the mask comes back square, so stretching it back
     makes every mask pixel a TALL rectangle — wider than high in one axis
     and the reverse in the other. The first feather was computed from the
     width alone and blurred after the stretch, which is wrong twice: a round
     blur cannot soften a rectangle evenly, and the number was right for only
     one of the two axes. Vertically it was barely blurring at all, which is
     exactly a horizontal streak.
 
     Blurred at 256 by 256, one mask pixel is one pixel in BOTH directions.
     Whatever the stretch does afterwards, it does to an edge that is already
     soft, and it does it proportionally. */
  const soft = document.createElement('canvas');
  soft.width = was;
  soft.height = tall;
  const near = soft.getContext('2d');
  if (!near) return soft;
  /* Nothing to soften when nothing is being enlarged.
 
     The staircase IS the blow-up. A mask already at the picture's size has
     no stairs in it, so blurring it would only eat the edge it was given —
     and the bench proves a same-size mask keeps exactly what it covers and
     nothing else, which that would quietly break. */
  const enlarging = width > was || height > tall;
  const amount = enlarging ? Math.max(0, softness) : 0;
  if (amount > 0.05) near.filter = `blur(${amount.toFixed(2)}px)`;
  near.drawImage(mask, 0, 0);
  near.filter = 'none';

  /* ── Grown in steps, not in one jump ─────────────────────────────────
 
     A browser doubling a picture does a good job; asked for twelve times at
     once it reaches for far-apart source pixels and the staircase survives
     however high the quality is set. Doubling until the last step is under
     two smooths each stair into the one beside it, which is the difference
     between a soft staircase and an edge. */
  let from: HTMLCanvasElement = soft;
  let now = was;
  let nowTall = tall;
  while (now * 2 < width && nowTall * 2 < height) {
    const step = document.createElement('canvas');
    step.width = now * 2;
    step.height = nowTall * 2;
    const draw = step.getContext('2d');
    if (!draw) break;
    draw.imageSmoothingEnabled = true;
    draw.imageSmoothingQuality = 'high';
    draw.drawImage(from, 0, 0, step.width, step.height);
    from = step;
    now = step.width;
    nowTall = step.height;
  }

  const big = document.createElement('canvas');
  big.width = width;
  big.height = height;
  const ctx = big.getContext('2d');
  if (!ctx) return big;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(from, 0, 0, width, height);
  return big;
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
  softness: number = SOFTNESS,
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

    /* The model's answer, copied at its own size — a few hundred pixels
       square, so this costs nothing and makes changing the edge instant
       instead of a second of waiting and six megabytes of engine. */
    const keep = document.createElement('canvas');
    const maskWide = (mask as { width?: number }).width ?? 0;
    const maskTall = (mask as { height?: number }).height ?? 0;
    keep.width = Math.max(1, maskWide);
    keep.height = Math.max(1, maskTall);
    keep.getContext('2d')?.drawImage(mask, 0, 0);

    return {
      ok: true,
      canvas: maskOnto(picture, mask, width, height, softness),
      kept,
      mask: keep,
    };
  } catch {
    return { ok: false, why: 'failed' };
  }
}

/**
 * How far behind the person goes out of focus.
 *
 * As a share of the picture's shorter side, for the reason every radius in
 * this app is: eight pixels is a strong blur on a thumbnail and almost
 * nothing on a photograph off a camera.
 */
export const BEHIND = [
  { id: 'soft', share: 0.004 },
  { id: 'misty', share: 0.010 },
  { id: 'gone', share: 0.022 },
] as const;
export type BehindId = (typeof BEHIND)[number]['id'];

export const behindOf = (id: string, of: { readonly width: number; readonly height: number }): number =>
  Math.max(1, Math.min(of.width, of.height)
    * (BEHIND.find((one) => one.id === id)?.share ?? BEHIND[1].share));

/**
 * The person kept sharp and everything behind them put out of focus.
 *
 * ── Why this is here and not a filter ────────────────────────────────────
 *
 * Carli listed "auto focus, blur" among the tools a modern editor has. The
 * blur that `postlook.ts` already had is the whole picture, which is a mood;
 * this is the one people actually mean by it — the thing a phone's portrait
 * mode does, where the subject stays sharp and the room behind them does not.
 *
 * ── Built out of the two pieces that already exist ───────────────────────
 *
 * The mask is the one the background remover already fetched, and `maskOnto`
 * is the same feathering that cut-out uses. So this is a blurred copy of the
 * photograph with the sharp person drawn back on top of it, and the edge
 * between them is the edge that was already measured, argued about and
 * photographed twice.
 *
 * Nothing new to get wrong, and nothing new to download: the model is already
 * in hand by the time this can be pressed.
 *
 * ── The one thing that is not obvious ────────────────────────────────────
 *
 * The blurred copy is drawn from a canvas that is BIGGER than the frame and
 * then cropped back, because `filter: blur()` samples transparency outside
 * the edges of the source and leaves a pale band all the way round. Drawing
 * the picture oversized and taking the middle out is the standard answer and
 * the only one that does not need a second pass.
 */
export function blurBehind(
  picture: CanvasImageSource,
  mask: CanvasImageSource,
  width: number,
  height: number,
  radius: number,
  softness: number = SOFTNESS,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  /* The margin is the blur's own reach. Anything less and the band is
     narrower rather than gone, which is the version that ships. */
  const edge = Math.ceil(radius * 3);
  const wide = document.createElement('canvas');
  wide.width = width + edge * 2;
  wide.height = height + edge * 2;
  const over = wide.getContext('2d');
  if (!over) return out;
  /* Stretched to cover the margin rather than mirrored into it. A mirror is
     the better answer for a photograph being blurred on its own; here the
     margin is thrown away a line later, and the only thing it has to be is
     opaque. */
  over.drawImage(picture, 0, 0, wide.width, wide.height);

  const soft = document.createElement('canvas');
  soft.width = wide.width;
  soft.height = wide.height;
  const blur = soft.getContext('2d');
  if (!blur) return out;
  blur.filter = `blur(${radius}px)`;
  blur.drawImage(wide, 0, 0);
  blur.filter = 'none';

  ctx.drawImage(soft, edge, edge, width, height, 0, 0, width, height);
  /* And the person, sharp, on top — through the same feather the cut-out
     uses, so the two tools cannot disagree about where somebody's edge is. */
  ctx.drawImage(maskOnto(picture, mask, width, height, softness), 0, 0);
  return out;
}

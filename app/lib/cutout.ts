/**
 * Taking the background out, on the phone, for nothing.
 *
 * ── What it is and what it is not ────────────────────────────────────────
 *
 * The owner, 7 October 2026: *"BG remover"*, in her list of what a modern editor
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
 * The person-parts model, 15 October 2026.
 *
 * The owner: *"Ek kan sien die BG remover werk ook nogsteeds nie."* It was the old
 * MediaPipe selfie model — made for a webcam call, a face close up against a
 * wall — and on her studio photograph it kept the microphone and left dark
 * patches round the shoulders. `selfie_multiclass_256x256` is trained on
 * photographs and answers per part (hair, face, body, clothes, everything
 * else); run side by side on that same photograph it cut her cleanly, hair
 * and all, with the microphone gone. Everything that is not "background" is
 * kept.
 */
const MODEL = `${HERE}/selfie_multiclass_256x256.tflite`;
/** The engine's own wasm, copied out of the package at build time. */
const VISION = '/vision';
/** The longest side the picture is read at: the model reads 256, so more is waste. */
const READ_AT = 512;

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
 
     The owner, 7 October 2026, with a photograph of herself cut out: *"Its not
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
 * Where "probably her" becomes "her", and "probably not" becomes "not".
 *
 * ── The fault this fixes ─────────────────────────────────────────────────
 *
 * The owner, 8 October 2026, with a photograph of her own face cut out: *"Dit is
 * hoe die bg remover nou lyk."* The checkerboard was showing THROUGH her.
 * Her face was a ghost of itself and everything below her chin had gone.
 *
 * The model does not answer "person" or "background". It answers a
 * PROBABILITY, pixel by pixel, and this file was passing that straight
 * through as the alpha channel. So a pixel the model was sixty per cent sure
 * about came out sixty per cent opaque — and a face the model is unsure
 * about does not come out wrong, it comes out see-through. Where it was less
 * sure still, her shoulders faded to nothing without ever being decided
 * against.
 *
 * That is a probability map being used as a picture. They are not the same
 * thing. A cut-out has to make up its mind.
 *
 * ── Why a band and not a single threshold ────────────────────────────────
 *
 * One number would give a hard edge, and a hard edge on a 256-pixel mask
 * blown up to a phone photograph is the staircase this file already spent
 * two rounds softening out. So: everything the model is more than `SURE`
 * about is fully her, everything under `UNSURE` is fully gone, and the
 * narrow band between them keeps its gradient and is what the feather then
 * softens.
 *
 * The band sits a little below the middle rather than around it. A model
 * that is unsure tends to be unsure INWARDS — hair, a shoulder against a
 * similar colour — so a centred band eats the person at exactly the places
 * somebody looks. Losing a little background is invisible; losing a
 * shoulder is what she photographed.
 */
export const UNSURE = 0.30;
export const SURE = 0.62;

/**
 * The mask with its mind made up, at its own size.
 *
 * Separate and exported so it can be proved on a mask made by hand, which is
 * the only way to test this without depending on the model's opinion of a
 * particular photograph — the same reason `maskOnto` is exported.
 *
 * Returns a NEW canvas and never touches what it was given: the engine reuses
 * its own canvas for the next picture, and writing into it would corrupt a
 * mask somebody else is still holding.
 */
export function decided(
  mask: CanvasImageSource,
  unsure: number = UNSURE,
  sure: number = SURE,
): HTMLCanvasElement {
  const wide = Math.max(1, (mask as { width?: number }).width ?? 1);
  const tall = Math.max(1, (mask as { height?: number }).height ?? 1);
  const out = document.createElement('canvas');
  out.width = wide;
  out.height = tall;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return out;
  ctx.drawImage(mask, 0, 0);

  /* A few hundred pixels square, so reading every one of them costs nothing
     — unlike the picture itself, which is why `maskOnto` composites instead
     of looping. This is the one place a loop is the cheaper answer. */
  const got = ctx.getImageData(0, 0, wide, tall);
  const px = got.data;
  const lo = Math.max(0, Math.min(1, unsure)) * 255;
  const hi = Math.max(lo + 1, Math.min(1, sure) * 255);
  const span = hi - lo;
  for (let i = 0; i < px.length; i += 4) {
    /* The alpha channel is what `destination-in` reads and what MediaPipe
       puts its answer in — the same channel its own documented example
       composites against. The colour channels are left alone: nothing
       downstream looks at them, and a mask that is white where it is opaque
       is easier to look at when something goes wrong. */
    const was = px[i + 3];
    px[i + 3] = was <= lo ? 0 : was >= hi ? 255 : Math.round(((was - lo) / span) * 255);
  }
  ctx.putImageData(got, 0, 0);
  return out;
}

/**
 * How soft the edge is, as a choice rather than a guess.
 *
 * The owner photographed the fault and I cannot photograph the fix: how an edge
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
 
     The owner, 7 October 2026, twice, with photographs of herself: *"Its not
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
  /* Made up its mind BEFORE it is softened, and that order is the whole
     point. Deciding after the blur would throw away the gradient the blur
     just made and put the staircase back; deciding first leaves a mask that
     is solid in the middle, empty outside, and gradual only across the band
     — which is exactly the edge the feather is for. */
  near.drawImage(decided(mask), 0, 0);
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
type Mask = { readonly width: number; readonly height: number; getAsFloat32Array(): Float32Array };
type Segmenter = {
  segment(image: CanvasImageSource): { readonly confidenceMasks?: readonly Mask[]; close?: () => void };
};
let engine: Segmenter | null = null;
let loading: Promise<Segmenter | null> | null = null;

/**
 * The engine, from this app only.
 *
 * The package is imported (it is a real module, unlike the old selfie bundle,
 * which attached a global and exported nothing), and every file it fetches —
 * its wasm and the model — comes from this app: `/vision` is copied out of
 * the package at build time by `scripts/nam-copy.mjs`, and the model is in
 * `public/segment`. The app's connect-src is 'self'; a CDN would be refused.
 */
function library(): Promise<Segmenter | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  loading = (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const files = await vision.FilesetResolver.forVisionTasks(VISION);
    const made = await vision.ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
      runningMode: 'IMAGE',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
    engine = made as unknown as Segmenter;
    return engine;
  })().catch(() => {
    /* Let the next press try again rather than remembering a failure. */
    loading = null;
    return null;
  });
  return loading;
}

/**
 * Cut the background out of a picture.
 *
 * @param onStep called with 0..1 while the model loads. The first press
 *   fetches the model and its engine, and a screen with nothing moving on it
 *   reads as broken rather than busy.
 */
export async function cutOut(
  picture: HTMLImageElement | HTMLCanvasElement,
  onStep?: (part: number) => void,
  softness: number = SOFTNESS,
): Promise<Cut> {
  try {
    onStep?.(0.05);
    /* A ceiling on the wait: a model that never arrives must not leave the
       button spinning for ever, which is the shape of failure this whole
       file is written against. */
    const runner = await Promise.race([
      library(),
      new Promise<null>((done) => { window.setTimeout(() => done(null), 60_000); }),
    ]);
    if (!runner) return { ok: false, why: 'failed' };
    onStep?.(0.5);

    const width = 'naturalWidth' in picture
      ? (picture.naturalWidth || picture.width)
      : picture.width;
    const height = 'naturalHeight' in picture
      ? (picture.naturalHeight || picture.height)
      : picture.height;

    /* Read small: the model sees 256 pixels across whatever it is given, and
       a mask the size of a camera photograph is two million pixels to loop
       over for nothing. The feather below blows it back up to the picture. */
    const scale = Math.min(1, READ_AT / Math.max(1, width, height));
    const input = document.createElement('canvas');
    input.width = Math.max(1, Math.round(width * scale));
    input.height = Math.max(1, Math.round(height * scale));
    input.getContext('2d')?.drawImage(picture, 0, 0, input.width, input.height);

    const answer = runner.segment(input);
    const background = answer.confidenceMasks?.[0];
    if (!background) { answer.close?.(); return { ok: false, why: 'failed' }; }

    /* Everything that is not background, as alpha — what `decided`,
       `feathered` and `maskOnto` read — and as grey as well, because
       `shareKept` reads the colour: one number in all four channels. */
    const wide = background.width;
    const tall = background.height;
    const sure = background.getAsFloat32Array();
    const keep = document.createElement('canvas');
    keep.width = Math.max(1, wide);
    keep.height = Math.max(1, tall);
    const paint = keep.getContext('2d');
    if (!paint) { answer.close?.(); return { ok: false, why: 'failed' }; }
    const out = paint.createImageData(keep.width, keep.height);
    for (let i = 0; i < sure.length; i += 1) {
      const at = i * 4;
      const person = Math.round(Math.max(0, Math.min(1, 1 - sure[i])) * 255);
      out.data[at] = person;
      out.data[at + 1] = person;
      out.data[at + 2] = person;
      out.data[at + 3] = person;
    }
    paint.putImageData(out, 0, 0);
    answer.close?.();
    onStep?.(0.9);

    /* The share of the frame that is a person, read small. */
    const small = document.createElement('canvas');
    small.width = 128;
    small.height = Math.max(1, Math.round(128 * (height / Math.max(1, width))));
    const look = small.getContext('2d', { willReadFrequently: true });
    if (!look) return { ok: false, why: 'failed' };
    look.drawImage(keep, 0, 0, small.width, small.height);
    const kept = shareKept(look.getImageData(0, 0, small.width, small.height).data);
    if (kept < ENOUGH) return { ok: false, why: 'nobody' };

    return {
      ok: true,
      canvas: maskOnto(picture, keep, width, height, softness),
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
 * The owner listed "auto focus, blur" among the tools a modern editor has. The
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

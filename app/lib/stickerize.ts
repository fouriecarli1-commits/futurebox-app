/**
 * A thing in a photo, cut out by its mask and made into a sticker.
 *
 * The engine (`fal-ai/sam-3/image`, `lib/becomes.ts`) only finds the thing:
 * it answers with a mask. Everything after that happens here, on the phone,
 * at the photo's full size: the cut, the white die-cut edge every sticker
 * has, and the box it sat in, so it can be peeled off from exactly where it
 * was.
 */

/** The photo, made small enough to send: a JPEG of up to `side` pixels. */
export function sendable(picture: HTMLImageElement, side: number): { readonly data: string; readonly width: number; readonly height: number } | null {
  const wide = picture.naturalWidth || picture.width;
  const tall = picture.naturalHeight || picture.height;
  if (!wide || !tall) return null;
  const scale = Math.min(1, side / Math.max(wide, tall));
  const width = Math.max(1, Math.round(wide * scale));
  const height = Math.max(1, Math.round(tall * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(picture, 0, 0, width, height);
  return { data: canvas.toDataURL('image/jpeg', 0.9), width, height };
}

/** A picture from an address the engine gave back (a data URI or https). */
export function loadPicture(src: string): Promise<HTMLImageElement> {
  return new Promise((done, fail) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => done(img);
    img.onerror = () => fail(new Error('the picture would not load'));
    img.src = src;
  });
}

/** Where the thing sat, as shares of the photo. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Cut {
  /** The thing alone, see-through around it: what a 3D model is made from. */
  readonly bare: HTMLCanvasElement;
  /** The same with a white die-cut edge and a soft shadow: the sticker. */
  readonly sticker: HTMLCanvasElement;
  /** Where the thing sat in the photo. */
  readonly box: Box;
  /** How much of the sticker is edge, as a share of its width and height. */
  readonly edge: { readonly x: number; readonly y: number };
}

/**
 * The mask as see-through: some engines answer with white on black, some
 * with a real alpha channel. Whichever it is, the thing comes out solid and
 * the rest clear.
 */
function maskAlpha(mask: HTMLImageElement, width: number, height: number): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(mask, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const d = pixels.data;
  let seeThrough = false;
  for (let i = 3; i < d.length; i += 4 * 97) {
    if (d[i] < 250) { seeThrough = true; break; }
  }
  for (let i = 0; i < d.length; i += 4) {
    const solid = seeThrough ? d[i + 3] : Math.max(d[i], d[i + 1], d[i + 2]);
    d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
    d[i + 3] = solid;
  }
  return pixels;
}

/** The smallest box round everything the mask keeps, or null if it keeps nothing. */
function boxOf(alpha: ImageData): { left: number; top: number; right: number; bottom: number } | null {
  const { width, height, data } = alpha;
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 127) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, right: right + 1, bottom: bottom + 1 };
}

export function cutOut(picture: HTMLImageElement, mask: HTMLImageElement): Cut | null {
  const wide = picture.naturalWidth || picture.width;
  const tall = picture.naturalHeight || picture.height;
  /* The box is found on a small copy of the mask (fast), the cut made at
     the photo's own size (sharp). */
  const probeScale = Math.min(1, 512 / Math.max(wide, tall));
  const probe = maskAlpha(mask, Math.max(1, Math.round(wide * probeScale)), Math.max(1, Math.round(tall * probeScale)));
  if (!probe) return null;
  const found = boxOf(probe);
  if (!found) return null;
  const pad = Math.round(Math.max(wide, tall) * 0.01);
  const left = Math.max(0, Math.floor(found.left / probeScale) - pad);
  const top = Math.max(0, Math.floor(found.top / probeScale) - pad);
  const right = Math.min(wide, Math.ceil(found.right / probeScale) + pad);
  const bottom = Math.min(tall, Math.ceil(found.bottom / probeScale) + pad);
  const w = right - left;
  const h = bottom - top;
  if (w < 4 || h < 4) return null;

  /* The mask at full size, then the photo kept only where it says. */
  const full = maskAlpha(mask, wide, tall);
  if (!full) return null;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = wide;
  maskCanvas.height = tall;
  maskCanvas.getContext('2d')?.putImageData(full, 0, 0);

  const bare = document.createElement('canvas');
  bare.width = w;
  bare.height = h;
  const bctx = bare.getContext('2d');
  if (!bctx) return null;
  bctx.drawImage(picture, left, top, w, h, 0, 0, w, h);
  bctx.globalCompositeOperation = 'destination-in';
  bctx.drawImage(maskCanvas, left, top, w, h, 0, 0, w, h);
  bctx.globalCompositeOperation = 'source-over';

  /* The die-cut edge: the thing's own outline, filled white and drawn a
     ring of times round itself, under the thing. */
  const edge = Math.max(3, Math.round(Math.max(w, h) * 0.025));
  const room = edge * 2 + Math.round(edge * 0.8);
  const sticker = document.createElement('canvas');
  sticker.width = w + room * 2;
  sticker.height = h + room * 2;
  const sctx = sticker.getContext('2d');
  if (!sctx) return null;
  const white = document.createElement('canvas');
  white.width = w;
  white.height = h;
  const wctx = white.getContext('2d');
  if (!wctx) return null;
  wctx.drawImage(bare, 0, 0);
  wctx.globalCompositeOperation = 'source-in';
  wctx.fillStyle = '#ffffff';
  wctx.fillRect(0, 0, w, h);
  sctx.save();
  sctx.shadowColor = 'rgba(0,0,0,0.35)';
  sctx.shadowBlur = edge * 1.6;
  sctx.shadowOffsetY = edge * 0.6;
  for (let turn = 0; turn < 24; turn += 1) {
    const a = (turn / 24) * Math.PI * 2;
    sctx.drawImage(white, room + Math.cos(a) * edge, room + Math.sin(a) * edge);
    if (turn === 0) { sctx.shadowColor = 'transparent'; }
  }
  sctx.restore();
  sctx.drawImage(bare, room, room);

  return {
    bare,
    sticker,
    box: { x: left / wide, y: top / tall, w: w / wide, h: h / tall },
    edge: { x: room / sticker.width, y: room / sticker.height },
  };
}

/**
 * Select a part of the photograph, and change only that.
 *
 * The owner's screenshots of another editor's Select: an element, an area, the
 * foreground — then every edit lands on that part alone. Here a selection is
 * an alpha mask the size of the photograph: opaque where the edit goes,
 * clear where it does not, soft at the edge. It comes from what the room
 * already knows how to find — the person the background remover finds (or
 * everything but the person), what was painted with the magic brush, or a
 * thing Grab found — and Adjust and Filters draw their look through it.
 *
 * Pixels and arithmetic only; the masks are made on the phone.
 */
import { filterFor, paintWashes, washesOf, type Look } from './postlook';

export type SelectWhat = 'person' | 'background' | 'painted' | 'thing';

export interface Selection {
  /** The photograph this mask belongs to; any other photograph is not selected. */
  readonly of: HTMLImageElement;
  /** Alpha mask at the photograph's own size: opaque is selected. */
  readonly mask: HTMLCanvasElement;
  readonly what: SelectWhat;
}

const sheet = (w: number, h: number): HTMLCanvasElement => {
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w));
  out.height = Math.max(1, Math.round(h));
  return out;
};

/**
 * A greyscale answer (white is the thing) as an alpha mask at `w` × `h`.
 * `invert` selects everything else instead — the background behind a person.
 */
export function maskFromGrey(grey: CanvasImageSource, w: number, h: number, invert = false): HTMLCanvasElement {
  const out = sheet(w, h);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return out;
  ctx.drawImage(grey, 0, 0, out.width, out.height);
  const px = ctx.getImageData(0, 0, out.width, out.height);
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    /* The darkest of what came, so a grey answer on a see-through ground
       counts its alpha as well as its colour. */
    const v = Math.min(d[i], d[i + 3]);
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = invert ? 255 - v : v;
  }
  ctx.putImageData(px, 0, 0);
  return out;
}

/** What the magic brush painted, as a soft alpha mask at the photograph's size. */
export function maskFromStrokes(
  strokes: readonly (readonly { readonly x: number; readonly y: number }[])[],
  r: number,
  w: number,
  h: number,
): HTMLCanvasElement {
  const out = sheet(w, h);
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  const side = r * Math.min(w, h);
  ctx.filter = `blur(${Math.max(1, Math.round(side * 0.25))}px)`;
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, side * 2);
  ctx.beginPath();
  for (const stroke of strokes) {
    stroke.forEach((p, i) => {
      if (i === 0) { ctx.moveTo(p.x * w, p.y * h); ctx.lineTo(p.x * w + 0.01, p.y * h); } else ctx.lineTo(p.x * w, p.y * h);
    });
  }
  ctx.stroke();
  return out;
}

/** A found thing's own mask, laid into its box on a mask the photograph's size. */
export function maskFromBox(
  grey: CanvasImageSource,
  box: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number },
  w: number,
  h: number,
): HTMLCanvasElement {
  const inBox = maskFromGrey(grey, Math.max(1, box.right - box.left), Math.max(1, box.bottom - box.top));
  const out = sheet(w, h);
  out.getContext('2d')?.drawImage(inBox, box.left, box.top);
  return out;
}

/** How much of a mask is selected, nought to one — read small, for a sentence. */
export function shareSelected(mask: HTMLCanvasElement): number {
  const small = sheet(64, 64);
  const ctx = small.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.drawImage(mask, 0, 0, 64, 64);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  let on = 0;
  for (let i = 3; i < d.length; i += 4) on += d[i];
  return on / (255 * 64 * 64);
}

/** The longest side the masked look is worked at — enough for a post, cheap enough to redraw on every change. */
const MOST_SIDE = 2400;

/**
 * The photograph with `look` on it, only where the mask is, ready to be drawn
 * over the plain photograph at `w` × `h`. `scale` is the same blur scale the
 * room's own `filterFor` is given.
 */
export function lookThrough(
  picture: CanvasImageSource,
  w: number,
  h: number,
  look: Look,
  scale: number,
  mask: HTMLCanvasElement,
): HTMLCanvasElement {
  const shrink = Math.min(1, MOST_SIDE / Math.max(1, w, h));
  const out = sheet(w * shrink, h * shrink);
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  ctx.filter = filterFor(look, scale * shrink);
  ctx.drawImage(picture, 0, 0, out.width, out.height);
  ctx.filter = 'none';
  if (washesOf(look).length) {
    paintWashes(ctx, look, 0, 0, out.width, out.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(picture, 0, 0, out.width, out.height);
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0, out.width, out.height);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

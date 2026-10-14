/**
 * Magic touch: the AI works on one part of a photograph, not all of it.
 *
 * Carli, 14 October 2026: *"Ek dink ook daar moet 'n magic mouse tool wees
 * wat op dele kliek en Ai kan dan die gedeelte verbeter (daar moet dan seker
 * opsies wees)."* And of the grabs: *"Die objek moet geskuif kan word, of ai
 * gevra word om iets anders te generate."*
 *
 * The picture engine takes a whole picture and gives a whole picture back;
 * it has no brush. So the part she tapped is cut out of the photograph with
 * some room round it, sent on its own, and what comes back is laid into the
 * same place with a soft edge — the rest of the photograph is never sent and
 * never changed. The edge is feathered so the seam is not a hard line where
 * the engine's light and the photograph's light differ.
 *
 * Everything here is pixels and arithmetic; the request itself goes through
 * the same paid route as "Change it", at the same price.
 */

/** A part of the photograph, in the photograph's own pixels. */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** What the engine is asked to do with the part, in plain words. */
export const MAGIC_ASKS = {
  better:
    'Improve this part of the photograph: sharper detail, cleaner, better light and colour. Keep exactly what it is, where it is and its size. Do not add or remove anything.',
  change: (into: string): string =>
    `In this part of the photograph, change the main thing into: ${into}. Keep the same light, angle, size and perspective so it fits back into the photograph. Keep the edges of the picture as they are.`,
  replace: (what: string, into: string): string =>
    `Replace the ${what} in this picture with ${into}. Same position, size, light and perspective; keep everything around it exactly as it is.`,
  fill:
    'Fill this part of the photograph naturally with what would be behind it, matching the surroundings. Keep the edges of the picture as they are.',
} as const;

/**
 * The rect grown by a share of its size on every side, kept inside the
 * photograph. The engine needs some of what is around a part to make it fit.
 */
export function padded(rect: Rect, wide: number, tall: number, share = 0.2): Rect {
  const padX = rect.width * share;
  const padY = rect.height * share;
  const left = Math.max(0, Math.floor(rect.left - padX));
  const top = Math.max(0, Math.floor(rect.top - padY));
  const right = Math.min(wide, Math.ceil(rect.left + rect.width + padX));
  const bottom = Math.min(tall, Math.ceil(rect.top + rect.height + padY));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/** The square around a tapped spot, given as shares of the photograph. */
export function spotRect(x: number, y: number, r: number, wide: number, tall: number): Rect {
  const side = r * Math.min(wide, tall);
  const left = Math.max(0, Math.round(x * wide - side));
  const top = Math.max(0, Math.round(y * tall - side));
  const right = Math.min(wide, Math.round(x * wide + side));
  const bottom = Math.min(tall, Math.round(y * tall + side));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/** That part of the picture, on a canvas of its own. */
export function cropOf(picture: CanvasImageSource, rect: Rect): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = rect.width;
  out.height = rect.height;
  out.getContext('2d')?.drawImage(picture, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return out;
}

/**
 * The photograph with `result` laid into `rect`, softly.
 *
 * `shape` decides the soft mask: a circle for a tapped spot, a box for a
 * found thing. The softness is a share of the shorter side, so a small spot
 * gets a small feather and a big one a big one.
 */
export function laidIn(
  picture: CanvasImageSource & { width: number; height: number },
  wide: number,
  tall: number,
  result: CanvasImageSource,
  rect: Rect,
  shape: 'circle' | 'box',
  soft = 0.16,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = wide;
  out.height = tall;
  const ctx = out.getContext('2d');
  if (!ctx) return out;
  ctx.drawImage(picture, 0, 0, wide, tall);

  const piece = document.createElement('canvas');
  piece.width = rect.width;
  piece.height = rect.height;
  const pen = piece.getContext('2d');
  if (!pen) return out;
  pen.drawImage(result, 0, 0, rect.width, rect.height);

  /* The soft mask: the shape drawn smaller than the piece and blurred, so
     its edge fades to nothing before the piece's own edge. */
  const feather = Math.max(2, Math.round(Math.min(rect.width, rect.height) * soft));
  const mask = document.createElement('canvas');
  mask.width = rect.width;
  mask.height = rect.height;
  const m = mask.getContext('2d');
  if (!m) return out;
  m.filter = `blur(${Math.round(feather / 2)}px)`;
  m.fillStyle = '#fff';
  if (shape === 'circle') {
    m.beginPath();
    m.ellipse(rect.width / 2, rect.height / 2, Math.max(1, rect.width / 2 - feather), Math.max(1, rect.height / 2 - feather), 0, 0, Math.PI * 2);
    m.fill();
  } else {
    m.fillRect(feather, feather, Math.max(1, rect.width - feather * 2), Math.max(1, rect.height - feather * 2));
  }
  pen.globalCompositeOperation = 'destination-in';
  pen.drawImage(mask, 0, 0);
  pen.globalCompositeOperation = 'source-over';

  ctx.drawImage(piece, rect.left, rect.top);
  return out;
}

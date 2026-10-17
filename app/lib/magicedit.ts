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
  /* The whole photograph, when nothing is painted. */
  wholeBetter:
    'Improve this whole photograph: sharper detail, cleaner, better light and colour. Keep exactly what is in it and where; do not add or remove anything.',
  theme: (into: string): string =>
    `Restyle this whole photograph as: ${into}. Keep every person, their face, pose and expression, and the composition exactly as they are; change the style, setting, clothing and mood to match.`,
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

/**
 * Paint over the part, rather than a box round it.
 *
 * Carli, 16 October 2026: *"Magic se crop box werk nie, moet dit in elkgeval
 * nie 'n paint brush wees wat oor 'n gedeelte verf en dit word dan ai gemaster
 * en gefix."* Each stroke is the points her finger went through, as shares of
 * the photograph; `r` is the brush's half-width as a share of the shorter
 * side. The box sent is the strokes' reach, and only what was painted is laid
 * back.
 */
export interface Brush {
  readonly strokes: readonly (readonly { readonly x: number; readonly y: number }[])[];
  readonly r: number;
}

/** The box that holds every painted stroke, brush width and all, in the photograph's pixels. */
export function brushRect(brush: Brush, wide: number, tall: number): Rect | null {
  const side = brush.r * Math.min(wide, tall);
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const stroke of brush.strokes) {
    for (const p of stroke) {
      left = Math.min(left, p.x * wide - side);
      top = Math.min(top, p.y * tall - side);
      right = Math.max(right, p.x * wide + side);
      bottom = Math.max(bottom, p.y * tall + side);
    }
  }
  if (!Number.isFinite(left)) return null;
  const l = Math.max(0, Math.floor(left));
  const t = Math.max(0, Math.floor(top));
  const r = Math.min(wide, Math.ceil(right));
  const b = Math.min(tall, Math.ceil(bottom));
  if (r - l < 1 || b - t < 1) return null;
  return { left: l, top: t, width: r - l, height: b - t };
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
 * found thing, or the painted strokes themselves. The softness is a share of
 * the shorter side, so a small spot gets a small feather and a big one a big
 * one; a brush is feathered by its own width instead.
 */
export function laidIn(
  picture: CanvasImageSource & { width: number; height: number },
  wide: number,
  tall: number,
  result: CanvasImageSource,
  rect: Rect,
  shape: 'circle' | 'box' | Brush,
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
  if (typeof shape === 'object') {
    /* The strokes, where they lie in the piece, a little thinner than the
       brush so the blur fades them to nothing at the brush's own edge. */
    const side = shape.r * Math.min(wide, tall);
    const edge = Math.max(2, Math.round(side * 0.5));
    m.filter = `blur(${Math.round(edge / 2)}px)`;
    m.strokeStyle = '#fff';
    m.lineCap = 'round';
    m.lineJoin = 'round';
    m.lineWidth = Math.max(2, side * 2 - edge);
    m.beginPath();
    for (const stroke of shape.strokes) {
      stroke.forEach((p, i) => {
        const x = p.x * wide - rect.left;
        const y = p.y * tall - rect.top;
        if (i === 0) { m.moveTo(x, y); m.lineTo(x + 0.01, y); } else m.lineTo(x, y);
      });
    }
    m.stroke();
  } else if (shape === 'circle') {
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

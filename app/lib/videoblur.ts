/**
 * A blurred patch over part of the picture: a face, a plate, a screen.
 *
 * ── Why this exists when a blur dial already did ─────────────────────────
 *
 * Carli, 8 October 2026: *"Dit laat my dink dat video editor ook 'n blur
 * funksie nodig het."* So the `sharp` dial in `videoadjust.ts` was renamed
 * Blur and its ceiling raised from three pixels to twenty.
 *
 * Then, 10 October 2026: *"Ek sien ook nogsteeds nie 'n blur funksie nie."*
 *
 * She is right, and the first answer was the wrong feature. That dial blurs the
 * WHOLE FRAME, which is a mood — a dream, a flashback, a wash behind a title.
 * What anybody means by "a blur function" in an editor is a patch over one
 * thing: the face of somebody who did not agree to be filmed, a number plate, a
 * name on a parcel, a phone screen with a message on it. A dial that softens
 * everything cannot do any of those, and the photo room has had the right shape
 * of it since September — `blurBehind` in `cutout.ts` keeps the subject sharp
 * and softens what is behind them, which is the same insight applied the other
 * way round.
 *
 * ── Shares of the frame, never pixels ───────────────────────────────────
 *
 * The preview is about 300 wide and the film is 1080 or 1920. Every number here
 * is a fraction so that a patch placed on the glass is the same patch in the
 * file — the exact error `videoadjust.ts` had to fix when the dial's ceiling
 * went up, where `blur(3px)` was three and a half times as strong on screen as
 * in the render.
 *
 * `patchBox` is pure and exported for the same reason `markBox` is: the check
 * asks the renderer's own question rather than a second copy of it.
 *
 * ── The blur is strong on purpose ───────────────────────────────────────
 *
 * A face softened a little is a face. The point of this is that the thing
 * underneath cannot be read, so the weakest rung here is already past
 * recognisable and the strongest is a smear. Weaker would be a feature that
 * looks like it worked and does not, which on this particular feature is
 * somebody's privacy.
 */

/** Where a patch sits and how big it is, all as shares of the frame. */
export interface Patch {
  readonly id: string;
  /** The middle of it, 0–1 across and down. */
  readonly at: { readonly x: number; readonly y: number };
  /** How wide and how tall, as shares of the frame. */
  readonly wide: number;
  readonly tall: number;
  /** Which rung of `STRENGTHS`. */
  readonly strength: StrengthId;
  /** Round rather than square. A face is round. */
  readonly round?: boolean;
}

/**
 * How hard the blur is, as a share of the frame's shorter side.
 *
 * The same shape as `BEHIND` in `cutout.ts` and for the same reason: eight
 * pixels is a smear on a thumbnail and nothing at all on a 1080 frame.
 */
export const STRENGTHS = [
  { id: 'soft', share: 0.010 },
  { id: 'misty', share: 0.022 },
  { id: 'gone', share: 0.045 },
] as const;
export type StrengthId = (typeof STRENGTHS)[number]['id'];

/** Misty: past recognisable, which is the whole point, without being a smear. */
export const STRENGTH_DEFAULT: StrengthId = 'misty';

/** A patch starts here: the middle, a sixth of the frame across. */
export const PATCH_AT = { x: 0.5, y: 0.42 } as const;
export const PATCH_WIDE = 0.18;
export const PATCH_TALL = 0.18;

/** The smallest and largest a patch may be, as shares. */
export const PATCH_SMALLEST = 0.04;
export const PATCH_LARGEST = 1;

/** Nothing above this many patches on one piece. */
export const MOST_PATCHES = 6;

export function blurRadius(
  strength: StrengthId,
  size: { readonly width: number; readonly height: number },
): number {
  const share = STRENGTHS.find((one) => one.id === strength)?.share
    ?? STRENGTHS[1].share;
  return Math.max(1, Math.min(size.width, size.height) * share);
}

/**
 * The patch as a pixel rectangle inside the frame.
 *
 * Clamped so the whole of it stays on the frame: a patch dragged to the edge
 * slides back in rather than hanging half off, because a patch half off the
 * frame covers half of what it was put there to cover.
 */
export function patchBox(
  patch: Patch,
  size: { readonly width: number; readonly height: number },
): { left: number; top: number; width: number; height: number } {
  const held = (value: number): number =>
    Math.max(PATCH_SMALLEST, Math.min(PATCH_LARGEST, Number.isFinite(value) ? value : PATCH_WIDE));
  const width = held(patch.wide) * size.width;
  const height = held(patch.tall) * size.height;
  const middle = (value: number, span: number, whole: number): number => {
    const want = (Number.isFinite(value) ? value : 0.5) * whole;
    return Math.max(0, Math.min(whole - Math.min(span, whole), want - span / 2));
  };
  return {
    left: middle(patch.at?.x, width, size.width),
    top: middle(patch.at?.y, height, size.height),
    width: Math.min(width, size.width),
    height: Math.min(height, size.height),
  };
}

/** The path of the patch, so the clip and the outline cannot disagree. */
export function patchPath(
  context: CanvasRenderingContext2D,
  patch: Patch,
  size: { readonly width: number; readonly height: number },
): void {
  const box = patchBox(patch, size);
  context.beginPath();
  if (patch.round) {
    context.ellipse(
      box.left + box.width / 2, box.top + box.height / 2,
      box.width / 2, box.height / 2, 0, 0, Math.PI * 2,
    );
    return;
  }
  context.rect(box.left, box.top, box.width, box.height);
}

/**
 * One patch, blurred, over the picture already on the canvas.
 *
 * ── Why the source is drawn again rather than the canvas re-read ─────────
 *
 * Reading the canvas back — `getImageData`, blur, `putImageData` — is a
 * round trip per patch per frame, and on a phone at thirty frames a second
 * that is the difference between a render that finishes and one that does
 * not. Drawing the source a second time through `context.filter` keeps the
 * work on the GPU where the rest of this file already lives.
 *
 * ── The pale band, which is the one thing that must be got right ─────────
 *
 * `filter: blur()` samples outside the edges of what it is given, and
 * outside is transparent, so a patch drawn at the edge of the picture comes
 * out with a pale rim — the exact fault `blurBehind` documents in
 * `cutout.ts`. The answer is the same one: the clip is narrowed to the
 * picture, so a patch may only cover pixels that exist. There is nothing to
 * hide in a black bar.
 */
export function drawPatch(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  patch: Patch,
  size: { readonly width: number; readonly height: number },
  /** Where the picture itself is drawn on the frame. */
  picture: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
): void {
  const box = patchBox(patch, size);
  if (box.width <= 0 || box.height <= 0) return;

  context.save();
  /* Both at once: the patch's own shape, and the picture. A patch over the
     bars would blur transparency and draw a pale smear onto black. */
  patchPath(context, patch, size);
  context.clip();
  context.beginPath();
  context.rect(picture.x, picture.y, picture.w, picture.h);
  context.clip();
  context.filter = `blur(${blurRadius(patch.strength, size).toFixed(2)}px)`;
  /* The same geometry the sharp picture was drawn with, so the blurred
     pixels sit exactly over the ones they are hiding. Anything else moves
     the thing being hidden sideways, which is worse than not hiding it —
     the viewer sees both. */
  context.drawImage(source, picture.x, picture.y, picture.w, picture.h);
  context.restore();
}

/** Every patch on one frame, in the order they were added. */
export function drawPatches(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  patches: readonly Patch[] | undefined,
  size: { readonly width: number; readonly height: number },
  picture: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
): void {
  for (const one of (patches ?? []).slice(0, MOST_PATCHES)) {
    drawPatch(context, source, one, size, picture);
  }
}

/** A new patch, in the middle of the frame where it can be seen and grabbed. */
export function newPatch(id: string): Patch {
  return {
    id,
    at: { ...PATCH_AT },
    wide: PATCH_WIDE,
    tall: PATCH_TALL,
    strength: STRENGTH_DEFAULT,
    round: true,
  };
}

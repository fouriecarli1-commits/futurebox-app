'use client';

/**
 * The brand kit's logo, in the corner of a clip.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * `app/lib/brandkit.ts` has kept a `logoAssetId` since it was written, and
 * its own comment says what for, in these words: *"the logo is what goes in
 * the corner of a clip"*. Nothing ever put it in one. The logo was uploaded,
 * stored, described as being for exactly this, and then read by a single
 * screen — the brand-kit card, showing it back to the person who chose it.
 *
 * Carli, 18 September 2026, looking for it on the video desk: *"die video
 * studio het glad nie 'n image oplaai het vir iemand wat hulle logo op 'n
 * video wou sit nie."* She was right about the desk. The upload was on the
 * advert desk, two rooms away, feeding nothing.
 *
 * Not `watermark.ts`, which is a tone laid over a song nobody has bought.
 * Same English word, unrelated job, and one file for both would be a trap
 * for whoever opens it next.
 *
 * ── Where it goes, and why that is not a guess ───────────────────────────
 *
 * A corner and a margin are the kind of numbers somebody picks by eye and
 * then defends forever. This app already knows better: `safezones.ts` holds
 * where TikTok, Reels and Shorts print their own interface over a video, and
 * its `all` zone is the deepest margin on each side — the part that survives
 * on all three at once.
 *
 * So the mark is placed inside THAT box, not near the edge of the frame. The
 * edge of the frame is under somebody's caption or button column; a logo put
 * there is a logo nobody sees, which is the same as not having one. And
 * because it is computed from those fractions, the mark moves on its own the
 * day TikTok takes another twenty pixels off the right.
 *
 * ── Burned in when the video is MADE, not when it is posted ──────────────
 *
 * Carli asked for it on a filmed take and on anything that goes to Live. The
 * cheap reading of that is to draw it in the Live player, and that would put
 * the logo on the screen but not in the file: download the clip, hand it to
 * TikTok, and the branding is gone at exactly the moment it was meant to
 * work.
 *
 * So it goes into the pixels. The stitcher already paints every frame onto a
 * canvas and records that canvas — `drawCaption` is the same shape of thing
 * one line above — so inside the stitcher this costs nothing. Anything not
 * already going through a canvas needs one real-time pass, which is the
 * honest price and is charged where it is spent rather than here.
 */

import { ZONES, type Zone } from './safezones';

export type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

/**
 * How wide the mark is, as a share of the frame's width.
 *
 * Of the WIDTH rather than of the shorter side, so a logo reads the same size
 * against the picture whether the clip is tall, wide or square. Sixteen per
 * cent is about a sixth: enough to read a wordmark on a phone, not enough to
 * become the subject of the shot.
 */
export const MARK_SHARE = 0.16;

/** A little air between the mark and the safe box it sits in. */
export const MARK_INSET = 0.02;

/** Not solid. A logo is a signature, not a sticker. */
export const MARK_OPACITY = 0.92;

const EVERYWHERE = ZONES.find((one) => one.id === 'all') as Zone;

/**
 * Where the mark goes on a frame of this size, in pixels.
 *
 * Pure and exported, so the check can ask the same question the renderer
 * answers instead of looking at a picture and agreeing with it.
 *
 * @param aspect the logo's own width ÷ height, so it is never squashed.
 */
export function markBox(
  frameWidth: number,
  frameHeight: number,
  aspect: number,
  corner: Corner = 'bottomRight',
  share = MARK_SHARE,
): { x: number; y: number; w: number; h: number } {
  /* The visible part of the frame, not the frame. */
  const safe = {
    left: EVERYWHERE.left * frameWidth,
    top: EVERYWHERE.top * frameHeight,
    right: (1 - EVERYWHERE.right) * frameWidth,
    bottom: (1 - EVERYWHERE.bottom) * frameHeight,
  };
  const inset = MARK_INSET * frameWidth;

  const w = Math.max(1, frameWidth * share);
  const h = Math.max(1, aspect > 0 ? w / aspect : w);

  const left = safe.left + inset;
  const right = safe.right - inset - w;
  const top = safe.top + inset;
  const bottom = safe.bottom - inset - h;

  const x = corner === 'topLeft' || corner === 'bottomLeft' ? left : right;
  const y = corner === 'topLeft' || corner === 'topRight' ? top : bottom;

  /* Clamped to the frame. A safe box on a very wide clip can be shorter than
     the mark, and a negative coordinate draws nothing while reporting
     success — which is the failure mode this whole file exists to end. */
  return {
    x: Math.max(0, Math.min(x, Math.max(0, frameWidth - w))),
    y: Math.max(0, Math.min(y, Math.max(0, frameHeight - h))),
    w,
    h,
  };
}

/**
 * The logo as something a canvas can draw, or null.
 *
 * Null rather than a throw: a missing or unreadable logo must not stop a
 * video being made. A clip without a mark is still a clip; an exception here
 * would be a lost render, and a render is minutes of somebody's evening.
 */
export function loadMark(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

/**
 * Paint it onto a frame that is already drawn.
 *
 * Last, after the picture and after the caption. A caption sliding under a
 * logo is worse than a logo over a caption, and the caption is the one that
 * moves.
 */
export function drawMark(
  context: CanvasRenderingContext2D,
  mark: HTMLImageElement,
  frameWidth: number,
  frameHeight: number,
  corner: Corner = 'bottomRight',
): void {
  const aspect = mark.naturalHeight > 0 ? mark.naturalWidth / mark.naturalHeight : 1;
  const box = markBox(frameWidth, frameHeight, aspect, corner);
  const was = context.globalAlpha;
  context.globalAlpha = MARK_OPACITY;
  context.drawImage(mark, box.x, box.y, box.w, box.h);
  context.globalAlpha = was;
}

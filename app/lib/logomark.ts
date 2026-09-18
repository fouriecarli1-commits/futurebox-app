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

/* ════════════════════════════════════════════════════════════════════════
   Branding something that is already a video
   ════════════════════════════════════════════════════════════════════════

   Everything above is for a frame somebody else is already painting. A
   filmed take is not that: `FollowWords` hands the camera's own stream
   straight to a `MediaRecorder`, with no canvas anywhere in it.

   There were two ways to brand it and the choice matters.

   The first is to put a canvas INSIDE the live recording — draw each camera
   frame plus the logo, and record the canvas instead of the camera. It is
   the cheaper one, and it is the wrong one. That path has broken twice
   already (the take that came out wide, the take whose sound would not
   play), it runs on a phone while the person is singing, and a dropped
   frame there is a ruined take that cannot be repeated — the moment has
   gone. A logo is not worth that risk.

   The second is this: leave the recording exactly as it is, and make one
   pass afterwards over a file that already exists. If it fails, the take is
   untouched and still hers. That is the whole argument.

   ── What it costs, said plainly ─────────────────────────────────────────

   Real time. A minute of take is a minute of marking, for the same reason
   `stitch.ts` gives: a canvas is recorded as it is painted, and it can only
   be painted as fast as the video plays. The caller has to show that.

   ── The sound, which is the part that is easy to lose ───────────────────

   The stitcher throws each clip's own audio away on purpose — twelve
   generations of room tone under one song is noise. Here the take's sound
   IS the take: somebody singing. So the audio is routed through a
   `MediaElementAudioSourceNode` into a `MediaStreamDestination` and added to
   the recorded stream, and deliberately NOT connected to the speakers, so
   the marking pass is silent to whoever is waiting for it.
*/

import { recordable } from './stitch';

export type Marked =
  | { readonly ok: true; readonly blob: Blob; readonly ext: 'webm' | 'mp4' }
  | { readonly ok: false; readonly why: 'unsupported' | 'unreadable' | 'failed' };

/** Whether this browser can brand a take at all. */
export function canMark(): boolean {
  return (
    typeof document !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function'
    && recordable() !== null
  );
}

/**
 * Burn the mark into a video that has already been recorded.
 *
 * Never throws and never returns a broken file: anything at all going wrong
 * is `ok: false`, and the caller keeps the take it already had.
 *
 * @param onProgress fraction 0–1, so a screen can say how far in it is.
 */
export async function markTake(
  take: Blob,
  mark: HTMLImageElement,
  corner: Corner = 'bottomRight',
  onProgress?: (fraction: number) => void,
): Promise<Marked> {
  const mimeType = recordable();
  if (!mimeType || !canMark()) return { ok: false, why: 'unsupported' };

  const url = URL.createObjectURL(take);
  const video = document.createElement('video');
  video.src = url;
  video.muted = false;
  video.playsInline = true;

  let context: AudioContext | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('unreadable'));
    });
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return { ok: false, why: 'unreadable' };

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const paint = canvas.getContext('2d');
    if (!paint) return { ok: false, why: 'unsupported' };

    const stream = canvas.captureStream(30);

    /* The take's own sound, onto the same stream, without going through the
       speakers. A `MediaElementAudioSourceNode` takes the element's output
       over, so connecting it only to the destination is what makes this pass
       silent — and is also what stops the person hearing themselves twice. */
    const Ctx =
      window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      try {
        context = new Ctx();
        const source = context.createMediaElementSource(video);
        const destination = context.createMediaStreamDestination();
        source.connect(destination);
        for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
      } catch {
        /* A take with no audio track, or a browser that will not route it.
           A silent branded take is worse than an unbranded one with sound,
           so this gives up on the whole pass rather than on the sound. */
        return { ok: false, why: 'failed' };
      }
    }

    const parts: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size) parts.push(event.data);
    };
    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();

    const length = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    await video.play();
    await new Promise<void>((resolve) => {
      let stopped = false;
      const end = () => {
        if (stopped) return;
        stopped = true;
        resolve();
      };
      video.onended = end;
      const draw = () => {
        if (stopped) return;
        if (video.ended) {
          end();
          return;
        }
        paint.drawImage(video, 0, 0, width, height);
        drawMark(paint, mark, width, height, corner);
        if (length) onProgress?.(Math.min(1, video.currentTime / length));
        requestAnimationFrame(draw);
      };
      draw();
    });

    recorder.stop();
    await finished;
    if (!parts.length) return { ok: false, why: 'failed' };
    return {
      ok: true,
      blob: new Blob(parts, { type: mimeType }),
      ext: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm',
    };
  } catch {
    return { ok: false, why: 'failed' };
  } finally {
    video.pause();
    URL.revokeObjectURL(url);
    void context?.close();
  }
}

'use client';
/**
 * A frame with the mark actually drawn on it, for `audit/logoshot.mjs`.
 *
 * PROBE=1 only.
 *
 * ── Why a page and not more arithmetic ───────────────────────────────────
 *
 * `check:logomark` proves `markBox` puts the rectangle inside the part of
 * the frame TikTok, Reels and Shorts all leave visible. That is worth having
 * and it is not the same claim as "the logo is visible on the video". A box
 * computed correctly and then drawn with the wrong alpha, at the wrong
 * scale, or under something else, passes every assertion in that file.
 *
 * When the logo shipped I said so out loud rather than leaving it implied:
 * the arithmetic was proved, the wiring was proved, and nothing had ever
 * marked a frame and looked at it. This is that.
 *
 * ── What it draws, and why those colours ─────────────────────────────────
 *
 * A flat mid-grey frame standing in for a video, and a flat magenta square
 * standing in for a logo. Magenta because nothing else in this app is
 * magenta: a probe that counts "pixels that are not the background" would
 * also count a caption, a letterbox bar or a blurred backdrop, and then pass
 * for the wrong reason. Counting one improbable colour cannot.
 *
 * Three frame shapes, because the safe box is a fraction of each side and a
 * mark that lands correctly on a tall frame can fall outside a wide one.
 * Each canvas says its own size, so the probe measures rather than assumes.
 */
import React, { useEffect, useRef } from 'react';
import { drawMark, type Corner } from '../lib/logomark';

/** The stand-in logo. Nothing else in the app is this colour. */
const INK = '#ff00d4';
const BACKDROP = '#606060';

const FRAMES: readonly { readonly id: string; readonly w: number; readonly h: number }[] = [
  { id: 'tall', w: 540, h: 960 },
  { id: 'wide', w: 960, h: 540 },
  { id: 'square', w: 720, h: 720 },
];

const CORNERS: readonly Corner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

function logoImage(): Promise<HTMLImageElement> {
  /* A wide wordmark rather than a square, because a square hides the one
     mistake worth catching here: a mark drawn into its box without keeping
     its own proportions still fills the box. */
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100">`
    + `<rect width="320" height="100" fill="${INK}"/></svg>`;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  });
}

function Frame({ id, w, h, corner }: { id: string; w: number; h: number; corner: Corner }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const paint = canvas.current?.getContext('2d');
    if (!paint) return;
    void logoImage().then((image) => {
      paint.fillStyle = BACKDROP;
      paint.fillRect(0, 0, w, h);
      /* The real function, not a copy of it. A probe page that reimplements
         what it is checking agrees with itself and nothing else. */
      drawMark(paint, image, w, h, corner);
      canvas.current?.setAttribute('data-drawn', '1');
    });
  }, [w, h, corner]);
  return (
    <canvas
      ref={canvas}
      width={w}
      height={h}
      data-frame={`${id}-${corner}`}
      data-w={w}
      data-h={h}
      data-corner={corner}
    />
  );
}

export default function P(): React.ReactElement {
  return (
    <div className="p-4">
      <p id="ready">logomark</p>
      {FRAMES.map((frame) =>
        CORNERS.map((corner) => (
          <Frame key={`${frame.id}-${corner}`} {...frame} corner={corner} />
        )),
      )}
    </div>
  );
}

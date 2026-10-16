'use client';

/**
 * The before-and-after line, laid over a picture or a playing film.
 *
 * Carli, 16 October 2026, with a one-tap enhance open on her phone: *"Ek dink
 * met die auto enhance moet daar 'n ruler wees wat oor die prent slide om te
 * wys hoe dit gelyk het, en soos wat jy dit skuif wys dit die enhanced
 * image."*
 *
 * This is only the line, its handle and the two words. What is drawn on each
 * side is the room's own business — the photo editor paints the photograph as
 * it came left of the line on its canvas, the video editor lays the frame
 * without its grade over the left part of the film — because each already
 * knows how its picture is made.
 *
 * A div with role="slider" rather than a button: the app gives a pressed
 * bordered button a transform of its own, which would jump the handle from
 * under the thumb.
 */
import React from 'react';
import { ChevronsLeftRight } from 'lucide-react';

export default function CompareLine({
  at,
  onAt,
  before,
  after,
  how,
  accent,
  ink,
  style,
  mark,
}: {
  /** Where the line is, as a share across: 0 is all after, 1 all before. */
  readonly at: number;
  readonly onAt: (share: number) => void;
  readonly before: string;
  readonly after: string;
  /** What the handle says to a screen reader. */
  readonly how: string;
  readonly accent: string;
  readonly ink: string;
  /** Where it sits; absent fills its positioned parent. */
  readonly style?: React.CSSProperties;
  /** The data attribute the room's probes find it by, as `data-<mark>line` and `data-<mark>handle`. */
  readonly mark: string;
}): React.ReactElement {
  const box = React.useRef<HTMLDivElement | null>(null);
  const shareAt = (x: number): void => {
    const rect = box.current?.getBoundingClientRect();
    if (rect && rect.width > 0) onAt(Math.min(1, Math.max(0, (x - rect.left) / rect.width)));
  };
  return (
    <div
      ref={box}
      {...{ [`data-${mark}line`]: '' }}
      className="pointer-events-none absolute z-20"
      style={style ?? { inset: 0 }}
    >
      {/* The two words ride beside the line, clear of whatever sits in a corner. */}
      <span
        className="absolute top-2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
        style={{ right: `calc(${(1 - at) * 100}% + 26px)`, background: 'rgba(0,0,0,0.55)' }}
      >
        {before}
      </span>
      <span
        className="absolute top-2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ left: `calc(${at * 100}% + 26px)`, background: accent, color: ink }}
      >
        {after}
      </span>
      <div
        role="slider"
        tabIndex={0}
        {...{ [`data-${mark}handle`]: '' }}
        aria-label={how}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(at * 100)}
        className="pointer-events-auto absolute top-0 flex h-full w-11 -translate-x-1/2 cursor-ew-resize justify-center"
        style={{ left: `${at * 100}%`, touchAction: 'none' }}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) shareAt(event.clientX);
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') onAt(Math.max(0, at - 0.05));
          if (event.key === 'ArrowRight') onAt(Math.min(1, at + 0.05));
        }}
      >
        {/* White whatever the theme: it is drawn over a photograph, not over the page. */}
        <span className="h-full w-[3px] rounded-full" style={{ background: '#ffffff', boxShadow: '0 0 8px rgba(0,0,0,0.6)' }} />
        <span
          className="absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full"
          style={{ background: '#ffffff', color: '#18181b', boxShadow: '0 2px 10px rgba(0,0,0,0.45)' }}
        >
          <ChevronsLeftRight className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

/**
 * A playing film's frame as it was shot, laid over the graded one and cut to
 * the left of the line — the "before" side of the video editor's compare.
 *
 * A canvas rather than a second <video>: two players drift apart within a
 * second, and drawing the one that is playing cannot. `drawImage` takes the
 * frame without the CSS filter the player is shown through, which is exactly
 * the picture before its grade.
 */
export function FrameAsShot({
  video,
  at,
  fill,
}: {
  readonly video: React.RefObject<HTMLVideoElement | null>;
  readonly at: number;
  /** Cover (true) or contain (false), the same as the player under it. */
  readonly fill: boolean;
}): React.ReactElement {
  const sheet = React.useRef<HTMLCanvasElement | null>(null);
  React.useEffect(() => {
    let frame = 0;
    const paint = (): void => {
      const el = sheet.current;
      const film = video.current;
      const ctx = el?.getContext('2d');
      if (el && film && ctx) {
        const scale = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.round(el.clientWidth * scale));
        const h = Math.max(1, Math.round(el.clientHeight * scale));
        if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
        ctx.clearRect(0, 0, w, h);
        const vw = film.videoWidth;
        const vh = film.videoHeight;
        if (vw && vh && film.readyState >= 2) {
          const k = fill ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh);
          try {
            ctx.drawImage(film, (w - vw * k) / 2, (h - vh * k) / 2, vw * k, vh * k);
          } catch {
            /* A frame not ready yet: the next one will be. */
          }
        }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [video, fill]);
  return (
    <canvas
      ref={sheet}
      aria-hidden
      data-editorbeforeframe
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      style={{ clipPath: `inset(0 ${((1 - at) * 100).toFixed(2)}% 0 0)` }}
    />
  );
}

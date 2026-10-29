'use client';

/**
 * A level meter that reads a real analyser, frame by frame.
 *
 * ProBooth had no meter on a lane (the audit of 29 October 2026, against what
 * every studio has: a meter on every channel and on the master). This is the
 * one meter all of them use. It reads the analyser it is handed, so what it
 * shows is the sound itself after the lane's level, pan and effects, and it
 * moves the bar directly rather than through React state: sixty updates a
 * second for every lane would re-draw the whole room sixty times a second.
 *
 * The scale is -60 to 0 dBFS. Green to -12, amber to -3, red above; the peak
 * holds for a second as a thin line, as a desk's peak light does.
 */
import React, { useEffect, useRef } from 'react';

export function levelDb(ear: AnalyserNode, scratch: Float32Array<ArrayBuffer>): number {
  ear.getFloatTimeDomainData(scratch);
  let top = 0;
  for (let i = 0; i < scratch.length; i += 1) top = Math.max(top, Math.abs(scratch[i]));
  return 20 * Math.log10(Math.max(top, 1e-6));
}

export const fractionOf = (db: number): number => Math.min(1, Math.max(0, (db + 60) / 60));

export default function LaneMeter({
  ear,
  vertical = true,
  className = '',
  label,
}: {
  /** Read each frame, so the meter follows a new analyser when playback restarts. */
  readonly ear: () => AnalyserNode | null | undefined;
  readonly vertical?: boolean;
  readonly className?: string;
  readonly label?: string;
}): React.ReactElement {
  const bar = useRef<HTMLDivElement | null>(null);
  /* Kept in a ref so a new function each render does not restart the loop. */
  const reader = useRef(ear);
  reader.current = ear;
  const hold = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let peak = 0;
    let peakAt = 0;
    let shown = 0;
    let scratch = new Float32Array(512);
    const tick = (now: number): void => {
      const node = reader.current();
      let level = 0;
      if (node) {
        if (scratch.length !== node.fftSize) scratch = new Float32Array(node.fftSize);
        level = fractionOf(levelDb(node, scratch));
      }
      /* Up at once, down gently: the ballistics of a desk meter. */
      shown = level > shown ? level : Math.max(level, shown - 0.025);
      if (shown >= peak || now - peakAt > 1000) { peak = shown; peakAt = now; }
      /* The bar is the whole meter, revealed from the bottom, so green,
         amber and red stay at their own heights whatever the level. */
      const gone = 100 - Math.round(shown * 100);
      if (bar.current) {
        bar.current.style.clipPath = vertical ? `inset(${gone}% 0 0 0)` : `inset(0 ${gone}% 0 0)`;
        bar.current.dataset.level = String(100 - gone);
      }
      if (hold.current) {
        const at = `${Math.round(peak * 100)}%`;
        if (vertical) hold.current.style.bottom = at; else hold.current.style.left = at;
        hold.current.style.opacity = peak > 0.02 ? '1' : '0';
        hold.current.style.background = peak > 0.95 ? '#ef4444' : peak > 0.8 ? '#fbbf24' : '#6ee7b7';
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [vertical]);

  const fill = vertical
    ? 'linear-gradient(0deg, #059669 0%, #10b981 70%, #fbbf24 85%, #ef4444 100%)'
    : 'linear-gradient(90deg, #059669 0%, #10b981 70%, #fbbf24 85%, #ef4444 100%)';
  return (
    <div
      data-lanemeter
      role="meter"
      aria-label={label}
      aria-valuemin={-60}
      aria-valuemax={0}
      className={`pointer-events-none overflow-hidden bg-zinc-900/90 ${/\babsolute\b/.test(className) ? '' : 'relative'} ${/rounded-none/.test(className) ? '' : 'rounded-full'} ${className}`}
    >
      <div
        ref={bar}
        data-level="0"
        className="absolute inset-0 rounded-full"
        style={{ background: fill, clipPath: vertical ? 'inset(100% 0 0 0)' : 'inset(0 100% 0 0)', filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.6))' }}
      />
      <div
        ref={hold}
        className={vertical ? 'absolute inset-x-0 h-px' : 'absolute inset-y-0 w-px'}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

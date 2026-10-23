'use client';

/**
 * One look or one world, shown as the picture it makes.
 *
 * The owner, 17 October 2026: *"Al die templates in al die kamers moet visual
 * wees."* So a character look is a small figure drawn in that look, and a
 * scene is the balloon floating in that world — `lib/futuretiles.ts` draws
 * both, in code, once per tile.
 *
 * The tile fills its grid cell rather than taking a fixed size, so a row of
 * them is as wide as the panel it is in: four across the desk's side panel,
 * three on a phone, and never wider than the glass.
 */
import React, { useEffect, useRef } from 'react';
import { drawCharacterTile, drawSceneTile } from '../lib/futuretiles';
import { INK, LIT } from '../lib/cutlook';

export default function FutureTile({ kind, id, label, on, onPick, data }: {
  readonly kind: 'character' | 'scene';
  readonly id: string;
  readonly label: string;
  readonly on: boolean;
  readonly onPick: () => void;
  /** Data attributes for the probes, e.g. `{ 'data-charlook': 'anime' }`. */
  readonly data?: Readonly<Record<string, string>>;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    if (kind === 'character') drawCharacterTile(canvas.current, id);
    else drawSceneTile(canvas.current, id);
  }, [kind, id]);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      {...data}
      className="group relative flex min-h-[44px] min-w-0 flex-col items-stretch gap-1 rounded-xl border p-1 text-left transition-colors"
      style={{
        borderColor: on ? LIT : 'rgba(255,255,255,0.10)',
        background: on ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)',
        boxShadow: on ? '0 0 0 1px rgba(52,211,153,0.45), 0 0 18px rgba(52,211,153,0.25)' : undefined,
      }}
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-lg">
        <canvas
          ref={canvas}
          aria-hidden
          data-futuretile={id}
          width={160}
          height={160}
          className="block h-full w-full"
        />
        {/* The four corners of a viewfinder on the chosen one: a lit frame
            reads as "this one" without covering the picture it frames. */}
        {on && (
          <span aria-hidden className="pointer-events-none absolute inset-1">
            {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'left-0 bottom-0 border-l-2 border-b-2', 'right-0 bottom-0 border-r-2 border-b-2'].map((where) => (
              <span key={where} className={`absolute h-3 w-3 ${where}`} style={{ borderColor: LIT }} />
            ))}
          </span>
        )}
      </span>
      <span
        className="line-clamp-2 min-h-[28px] px-0.5 text-center text-[11px] font-bold leading-tight"
        style={{ color: on ? LIT : INK }}
      >
        {label}
      </span>
    </button>
  );
}

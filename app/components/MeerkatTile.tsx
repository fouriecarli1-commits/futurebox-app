'use client';

/**
 * A choice shown as a picture: the meerkat photograph with the choice on it,
 * and its name underneath. `lib/meerkatphoto.ts` draws the photograph; a
 * colour look is laid over it as the same CSS filter the render uses.
 */
import React, { useEffect, useState } from 'react';
import { meerkatPhotoUrl, type MeerkatMood } from '../lib/meerkatphoto';
import { previewFor, roundFor, type BoxShape } from '../lib/videopaint';

export default function MeerkatTile({ label, on, onPick, filter, mood = 'day', size = 68, data }: {
  readonly label: string;
  readonly on: boolean;
  readonly onPick: () => void;
  /** A CSS filter laid over the photograph — a look. */
  readonly filter?: string;
  /** The light the photograph is taken in — a mood. */
  readonly mood?: MeerkatMood;
  readonly size?: number;
  /** Data attributes for the probes, e.g. `{ 'data-editorlook': 'warm' }`. */
  readonly data?: Readonly<Record<string, string>>;
}) {
  const [src, setSrc] = useState('');
  useEffect(() => { setSrc(meerkatPhotoUrl(mood)); }, [mood]);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      {...data}
      className="flex shrink-0 flex-col items-center gap-1 rounded-xl p-1 text-[11px] font-semibold leading-tight"
      style={{ width: size + 8, color: on ? '#6ee7b7' : '#d4d4d8' }}
    >
      <span
        className={`block overflow-hidden rounded-lg border-2 ${on ? 'border-emerald-400' : 'border-transparent'}`}
        style={{ width: size, height: size, boxShadow: on ? '0 0 0 2px rgba(16,185,129,0.35)' : undefined }}
      >
        {src ? (
          <img src={src} alt="" data-meerkattile className="h-full w-full object-cover" style={{ filter: filter || undefined }} />
        ) : null}
      </span>
      <span className="line-clamp-2 w-full text-center">{label}</span>
    </button>
  );
}

/**
 * A choice about words, shown as a word on the meerkat photograph: the box
 * behind it (`videopaint.ts`'s own `previewFor`) and the edge on its letters.
 */
export function MeerkatWordTile({ label, on, onPick, box = 'none', edge = 'outline', word = 'Hallo', ink = '#ffffff', back = '#111827', size = 68, data }: {
  readonly label: string;
  readonly on: boolean;
  readonly onPick: () => void;
  readonly box?: BoxShape;
  readonly edge?: string;
  readonly word?: string;
  readonly ink?: string;
  readonly back?: string;
  readonly size?: number;
  readonly data?: Readonly<Record<string, string>>;
}) {
  const [src, setSrc] = useState('');
  useEffect(() => { setSrc(meerkatPhotoUrl('day')); }, []);
  const look = previewFor(box, roundFor(box), 12);
  const filled = box !== 'none' && box !== 'line' && box !== 'outline';
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      {...data}
      className="flex shrink-0 flex-col items-center gap-1 rounded-xl p-1 text-[11px] font-semibold leading-tight"
      style={{ width: size + 8, color: on ? '#6ee7b7' : '#d4d4d8' }}
    >
      <span
        className={`relative block overflow-hidden rounded-lg border-2 ${on ? 'border-emerald-400' : 'border-transparent'}`}
        style={{ width: size, height: size, boxShadow: on ? '0 0 0 2px rgba(16,185,129,0.35)' : undefined }}
      >
        {src ? <img src={src} alt="" data-meerkattile className="h-full w-full object-cover" /> : null}
        <span
          className="absolute left-1/2 whitespace-nowrap px-1.5 py-0.5 text-[12px] font-extrabold leading-tight"
          style={{
            top: '72%',
            transform: 'translate(-50%, -50%)',
            color: ink,
            background: filled ? `${back}d9` : 'transparent',
            borderRadius: look.borderRadius,
            clipPath: look.clipPath,
            borderBottom: box === 'line' ? `2px solid ${back}` : undefined,
            outline: box === 'outline' ? `1.5px solid ${back}` : undefined,
            textShadow: edge === 'shadow' || edge === 'both'
              ? `${edge === 'both' ? '0 0 2px #000, 0 0 2px #000, 2px 2px 0' : '0 2px 4px'} rgba(0,0,0,0.9)`
              : edge === 'outline' ? '0 0 2px #000, 0 0 2px #000, 0 0 1px #000' : undefined,
          }}
        >
          {word}
        </span>
      </span>
      <span className="line-clamp-2 w-full text-center">{label}</span>
    </button>
  );
}

/** Just the photograph, at any size, in a mood and under a look — the top of a card. */
export function MeerkatThumb({ mood = 'day', filter, className = '', style }: {
  readonly mood?: MeerkatMood;
  readonly filter?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState('');
  useEffect(() => { setSrc(meerkatPhotoUrl(mood, 256, 160)); }, [mood]);
  return (
    <span aria-hidden data-meerkatthumb className={`block overflow-hidden rounded-xl bg-zinc-900 ${className}`} style={style}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" style={{ filter: filter || undefined }} /> : null}
    </span>
  );
}

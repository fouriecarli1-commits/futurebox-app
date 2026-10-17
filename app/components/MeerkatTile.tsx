'use client';

/**
 * A choice shown as a picture: the meerkat photograph with the choice on it,
 * and its name underneath. `lib/meerkatphoto.ts` draws the photograph; a
 * colour look is laid over it as the same CSS filter the render uses.
 */
import { useEffect, useState } from 'react';
import { meerkatPhotoUrl, type MeerkatMood } from '../lib/meerkatphoto';

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

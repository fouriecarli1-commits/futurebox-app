'use client';

/**
 * A stock amp as a little amp: its covering by kind, a grille, and knobs
 * turned to its own drive and colour — so the amps are chosen by looking.
 * The owner, 17 October 2026: every template in every room visual.
 */
import type { StockAmp } from '../lib/amps';

const COVER: Readonly<Record<StockAmp['category'], { readonly skin: string; readonly panel: string; readonly grille: string }>> = {
  Clean: { skin: '#cfb27a', panel: '#2a1d10', grille: '#8a6e44' },
  Crunch: { skin: '#141414', panel: '#c9a24a', grille: '#3a3328' },
  'High Gain': { skin: '#1a0b0b', panel: '#b91c1c', grille: '#2d1414' },
  Bass: { skin: '#2b2f36', panel: '#9ca3af', grille: '#1f2329' },
  Acoustic: { skin: '#8a5a2b', panel: '#e9d5b5', grille: '#5c3a1a' },
};

export default function AmpFace({ amp, size = 64 }: { readonly amp: StockAmp; readonly size?: number }) {
  const look = COVER[amp.category];
  const knob = (value: number, key: string) => (
    <span
      key={key}
      className="relative block rounded-full"
      style={{ width: size * 0.13, height: size * 0.13, background: '#e5e7eb', boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.4)' }}
    >
      <span
        className="absolute left-1/2 top-0 block h-1/2 w-[2px] -translate-x-1/2 origin-bottom bg-zinc-900"
        style={{ transform: `translateX(-50%) rotate(${-135 + value * 270}deg)` }}
      />
    </span>
  );
  return (
    <span
      aria-hidden
      data-ampface={amp.id}
      className="flex shrink-0 flex-col overflow-hidden rounded-md"
      style={{ width: size, height: size * 0.72, background: look.skin, padding: size * 0.05, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
    >
      <span className="flex items-center justify-around rounded-sm" style={{ background: look.panel, height: '32%' }}>
        {knob(amp.tone.drive, 'drive')}
        {knob(amp.tone.colour, 'colour')}
        {knob(amp.tone.mix, 'mix')}
      </span>
      <span
        className="mt-[6%] block flex-1 rounded-sm"
        style={{ background: `repeating-linear-gradient(45deg, ${look.grille} 0 2px, rgba(0,0,0,0.35) 2px 4px)` }}
      />
    </span>
  );
}

'use client';

/**
 * Four big pads, from Google's "Studio Games & Beats DAW" page of
 * 13 October 2026: a kick, a snare, a laser and a hat, each one press and
 * one hit on the browser's own oscillator (`kidsbeat.ts` has the sounds;
 * these are the first four of its soundboard, drawn the page's way).
 *
 * The page also had a BPM box that changed a number nothing read. Left
 * out: the beat machine in the music door has a real tempo slider.
 */
import React, { useState } from 'react';
import { useLang } from '../lib/i18n';
import { SOUNDBOARD, playSound } from '../lib/kidsbeat';
import { PAD_WASH } from '../lib/kidspads';

export default function KidsPads({ onSpark }: { readonly onSpark: (n: number) => void }): React.ReactElement {
  const { t } = useLang();
  const [hit, setHit] = useState<string | null>(null);
  const pads = ['kick', 'snare', 'laser', 'hihat']
    .map((id) => SOUNDBOARD.find((one) => one.id === id))
    .filter((one): one is (typeof SOUNDBOARD)[number] => Boolean(one));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-kidspads>
      {pads.map((pad) => (
        <button
          key={pad.id}
          type="button"
          data-kidspad={pad.id}
          onPointerDown={() => { playSound(pad.sound); setHit(pad.id); onSpark(1); }}
          onPointerUp={() => setHit(null)}
          onPointerLeave={() => setHit(null)}
          style={{ background: PAD_WASH[pad.id] }}
          className={`flex h-28 touch-none select-none flex-col items-center justify-center rounded-3xl border-2 border-white/80 text-base font-black uppercase tracking-wide shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-transform ${
            pad.id === 'laser' || pad.id === 'hihat' ? 'text-onAccent' : 'text-white'
          } ${hit === pad.id ? 'scale-95' : ''}`}
        >
          <span className="mb-1 text-4xl" aria-hidden>{pad.icon}</span>
          {t(pad.says[0], pad.says[1])}
        </button>
      ))}
    </div>
  );
}

'use client';

/**
 * The loop cards and the visualiser, from Google's "Create Music Studio"
 * page of 13 October 2026. What was taken and what was not is at the top
 * of `lib/kidsloops.ts`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { BARS, LOOPS, LoopPlayer } from '../lib/kidsloops';

export default function KidsLoops({ onSpark }: { readonly onSpark: (n: number) => void }): React.ReactElement {
  const { t } = useLang();
  const player = useRef<LoopPlayer | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(() => new Array<number>(BARS).fill(0));

  useEffect(() => {
    player.current = new LoopPlayer();
    return () => { player.current?.stop(); };
  }, []);

  /* The bars follow the sound while something plays, and settle when it stops. */
  useEffect(() => {
    let frame = 0;
    const paint = (): void => {
      if (player.current) setLevels(player.current.levels());
      frame = requestAnimationFrame(paint);
    };
    if (playing) frame = requestAnimationFrame(paint);
    else setLevels(new Array<number>(BARS).fill(0));
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = (id: string): void => {
    const one = LOOPS.find((loop) => loop.id === id);
    if (!one || !player.current) return;
    if (playing === id) { player.current.stop(); setPlaying(null); return; }
    player.current.start(one);
    setPlaying(id);
    onSpark(2);
  };

  return (
    <div className="space-y-3" data-kidsloops>
      <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400 bg-cyan-400/15 px-3.5 py-1.5 text-sm font-black text-cyan-300">
        🌟 {t('kids.loopsTitle', 'Quick Loop Templates (tap to play!)')}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LOOPS.map((loop) => {
          const on = playing === loop.id;
          return (
            <button
              key={loop.id}
              type="button"
              aria-pressed={on}
              data-kidsloop={loop.id}
              onClick={() => toggle(loop.id)}
              className={`flex flex-col items-center rounded-3xl border-2 p-4 text-center transition-transform ${
                on
                  ? 'scale-[1.04] border-primary-400 bg-primary-950/60 shadow-[0_0_25px_rgba(243,45,136,0.6)]'
                  : 'border-cyan-400 bg-surface-100/90 shadow-[0_4px_15px_rgba(52,211,153,0.15)] hover:scale-[1.03]'
              }`}
            >
              <span className={`text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] ${on ? 'fb-kids-float' : ''}`} aria-hidden>{loop.icon}</span>
              <span className="mt-2 text-base font-black text-surface-950">{t(loop.says[0], loop.says[1])}</span>
              <span className="mt-0.5 text-xs font-semibold text-surface-700">{t(loop.note[0], loop.note[1])}</span>
              {on && <span className="mt-1 text-[11px] font-black text-primary-300">{t('kids.loopPlaying', 'Playing — tap to stop')}</span>}
            </button>
          );
        })}
      </div>
      {/* The visualiser: the sound, not a random number. */}
      <div className="flex h-24 items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-cyan-400 bg-surface-50 px-4" data-kidsvisualiser aria-hidden>
        {levels.map((level, index) => (
          <span
            key={index}
            className="w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-amber-300 transition-[height] duration-75"
            style={{ height: `${Math.max(8, Math.round(level * 76))}px` }}
          />
        ))}
      </div>
    </div>
  );
}

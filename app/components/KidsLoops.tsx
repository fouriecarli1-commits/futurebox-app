'use client';

/**
 * The loop cards, the loop each one builds, and the visualiser.
 *
 * A card builds its loop layer by layer under the cards: drums first, then
 * the bass, the tune and the sparkles, each lighting its own row as it comes
 * in. Once it is there a child switches layers off and on, mixes it up,
 * makes it slower or faster, or takes it into the beat machine. Why, and
 * how the sound is made, is at the top of `lib/kidsloops.ts`.
 */
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { beatEngine } from '../lib/kidsbeat';
import { BARS, LAYERS, LOOPS, LOOP_STEPS, LoopBuilder, asBeat, hitsOn } from '../lib/kidsloops';

export default function KidsLoops({
  onSpark,
  onToBeat,
}: {
  readonly onSpark: (n: number) => void;
  /** Opens the beat machine, with this loop already in its squares. */
  readonly onToBeat?: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const builder = useRef<LoopBuilder | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [levels, setLevels] = useState<number[]>(() => new Array<number>(BARS).fill(0));

  useEffect(() => {
    const made = new LoopBuilder();
    builder.current = made;
    const off = made.subscribe(bump);
    return () => { off(); made.stop(); };
  }, []);

  const now = builder.current;
  const loop = now?.loop ?? null;
  const playing = loop?.id ?? null;

  /* The bars follow the sound while something plays, and settle when it stops. */
  useEffect(() => {
    let frame = 0;
    const paint = (): void => {
      if (builder.current) setLevels(builder.current.levels());
      frame = requestAnimationFrame(paint);
    };
    if (playing) frame = requestAnimationFrame(paint);
    else setLevels(new Array<number>(BARS).fill(0));
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const pressCard = (id: string): void => {
    const one = LOOPS.find((each) => each.id === id);
    if (!one || !builder.current) return;
    if (playing === id) { builder.current.stop(); return; }
    beatEngine.stop();
    builder.current.start(one);
    onSpark(2);
  };

  const toBeat = (): void => {
    if (!loop || !builder.current) return;
    beatEngine.load(asBeat(loop));
    beatEngine.setBpm(builder.current.bpm);
    builder.current.stop();
    onSpark(3);
    onToBeat?.();
  };

  const chip = 'min-h-[44px] rounded-2xl border-2 border-cyan-400 px-3 text-sm font-black text-surface-900';

  return (
    <div className="space-y-3" data-kidsloops>
      <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400 bg-cyan-400/15 px-3.5 py-1.5 text-sm font-black text-cyan-300">
        🌟 {t('kids.loopsTitle', 'Quick Loops (tap one to build it!)')}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LOOPS.map((each) => {
          const on = playing === each.id;
          return (
            <button
              key={each.id}
              type="button"
              aria-pressed={on}
              data-kidsloop={each.id}
              onClick={() => pressCard(each.id)}
              className={`flex flex-col items-center rounded-3xl border-2 p-4 text-center transition-transform ${
                on
                  ? 'scale-[1.04] border-primary-400 bg-primary-950/60 shadow-[0_0_25px_rgba(243,45,136,0.6)]'
                  : 'border-cyan-400 bg-surface-100/90 shadow-[0_4px_15px_rgba(52,211,153,0.15)] hover:scale-[1.03]'
              }`}
            >
              <span className={`text-5xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] ${on ? 'fb-kids-float' : ''}`} aria-hidden>{each.icon}</span>
              <span className="mt-2 text-base font-black text-surface-950">{t(each.says[0], each.says[1])}</span>
              <span className="mt-0.5 text-xs font-semibold text-surface-700">{t(each.note[0], each.note[1])}</span>
              {on && <span className="mt-1 text-[11px] font-black text-primary-300">{t('kids.loopPlaying', 'Playing — tap to stop')}</span>}
            </button>
          );
        })}
      </div>

      {/* ── The loop, being built ───────────────────────────────────────── */}
      {now && loop && (
        <div data-kidsloopbuilder={loop.id} className="space-y-2 rounded-3xl border-2 border-primary-400/70 bg-surface-50/90 p-3">
          <p className="text-sm font-black text-surface-950" data-kidsloopsays={now.building ? 'building' : 'built'}>
            {now.building
              ? `🔨 ${t('kids.loopBuilding', 'Building your loop…')} ${now.joined}/${LAYERS.length}`
              : `🎉 ${t('kids.loopBuilt', 'Your loop is built! Tap a layer to switch it off or on.')}`}
          </p>
          {LAYERS.map((layer) => {
            const isIn = now.isIn(layer.id);
            const on = isIn && !now.off.has(layer.id);
            return (
              <div key={layer.id} className="flex items-center gap-2">
                <button
                  type="button"
                  data-kidslayer={layer.id}
                  data-kidslayerin={isIn ? 'yes' : 'no'}
                  aria-pressed={on}
                  onClick={() => { now.toggle(layer.id); onSpark(1); }}
                  className={`flex min-h-[44px] w-28 flex-shrink-0 items-center gap-1.5 rounded-2xl border-2 px-2 text-sm font-black ${
                    on ? 'border-cyan-300 bg-cyan-400/20 text-surface-950' : 'border-surface-300 bg-surface-100 text-surface-600'
                  } ${isIn ? '' : 'opacity-60'}`}
                >
                  <span aria-hidden className={on && now.step >= 0 && hitsOn(loop, layer.id, now.step) ? 'fb-kids-float' : ''}>{layer.icon}</span>
                  <span className="truncate">{t(layer.says[0], layer.says[1])}</span>
                </button>
                <div className="flex min-w-0 flex-1 gap-0.5" aria-hidden data-kidslayersteps={layer.id}>
                  {Array.from({ length: LOOP_STEPS }, (_x, at) => {
                    const hit = hitsOn(loop, layer.id, at);
                    const here = now.step === at;
                    return (
                      <span
                        key={at}
                        className={`h-6 flex-1 rounded-sm ${
                          !isIn || !hit ? 'bg-surface-200' : on ? (here ? 'bg-amber-300' : 'bg-cyan-400') : 'bg-surface-400'
                        } ${here ? 'ring-2 ring-amber-300' : ''}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-1">
            {now.building && (
              <button type="button" data-kidsloopnow onClick={() => now.buildNow()} className={chip}>
                ⚡ {t('kids.loopAllNow', 'All in now')}
              </button>
            )}
            <button type="button" data-kidsloopmix onClick={() => { now.mix(); onSpark(1); }} className={chip}>
              🎲 {t('kids.loopMix', 'Mix it up')}
            </button>
            <button type="button" data-kidsloopslower onClick={() => now.setBpm(now.bpm - 10)} aria-label={t('kids.loopSlower', 'Slower')} className={chip}>
              🐢
            </button>
            <button type="button" data-kidsloopfaster onClick={() => now.setBpm(now.bpm + 10)} aria-label={t('kids.loopFaster', 'Faster')} className={chip}>
              🐇
            </button>
            {onToBeat && (
              <button type="button" data-kidslooptobeat onClick={toBeat} className="min-h-[44px] rounded-2xl bg-cyan-400 px-3 text-sm font-black text-onAccent">
                🥁 {t('kids.loopToBeat', 'Change it in the beat machine')}
              </button>
            )}
          </div>
        </div>
      )}

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

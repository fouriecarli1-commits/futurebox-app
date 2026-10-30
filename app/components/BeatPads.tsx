'use client';

/**
 * Drum pads and a sixteen-step sequencer, over the studio (`lib/beatbox.ts`).
 *
 * Tap a step to put a hit there, again for a soft one, a third time to clear
 * it. Each row's pad plays its sound. Start from a style, change it, hear it
 * loop at the session's tempo with a light on the step that is playing, and
 * put it on a lane, where it sits on the bar the playhead is in. Drawn on the
 * device: nothing is sent and nothing is charged.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, X } from 'lucide-react';
import {
  PRESETS, RATE, SOUNDS, SOUND_NAMES, STEPS, empty, hit, renderBeat, stepAt, stepSeconds,
  type Beat, type SoundId,
} from '../lib/beatbox';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';

type Say = (key: string, fallback: string) => string;

const NEXT = (hard: number): number => (hard <= 0 ? 1 : hard >= 0.95 ? 0.55 : 0);

export default function BeatPads({
  t,
  bpm,
  start,
  onPlace,
  onClose,
}: {
  readonly t: Say;
  readonly bpm: number;
  /** A beat to edit, when reopened from its lane. */
  readonly start?: Beat;
  readonly onPlace: (beat: Beat, name: string) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  useBackLayer(true, onClose);
  const [beat, setBeat] = useState<Beat>(start ?? PRESETS[0].beat);
  const [named, setNamed] = useState<string>(start ? t('beat.lane', 'Beat') : t(PRESETS[0].name[0], PRESETS[0].name[1]));
  const [playing, setPlaying] = useState(false);
  const [lit, setLit] = useState(-1);
  const ctx = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const started = useRef(0);

  const audio = (): AudioContext => {
    if (!ctx.current) ctx.current = new AudioContext();
    void ctx.current.resume();
    return ctx.current;
  };

  const stop = (): void => {
    try { source.current?.stop(); } catch { /* already stopped */ }
    source.current = null;
    setPlaying(false);
    setLit(-1);
  };

  /* One bar, looped, at the session's tempo: changes are heard on the next pass. */
  const loop = (next: Beat): void => {
    const room = audio();
    try { source.current?.stop(); } catch { /* */ }
    const samples = renderBeat({ ...next, bars: 1 }, bpm, RATE);
    const bar = stepSeconds(bpm) * STEPS;
    const buffer = room.createBuffer(1, Math.round(bar * RATE), RATE);
    buffer.copyToChannel(samples.subarray(0, buffer.length) as Float32Array<ArrayBuffer>, 0);
    const node = room.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.connect(room.destination);
    node.start();
    source.current = node;
    started.current = room.currentTime;
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const bar = stepSeconds(bpm) * STEPS;
    const tick = (): void => {
      const room = ctx.current;
      if (room) {
        const into = (room.currentTime - started.current) % bar;
        let step = 0;
        for (let s = 0; s < STEPS; s += 1) if (stepAt(s, bpm, beat.swing) <= into) step = s;
        setLit(step);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, bpm, beat.swing]);

  /* Silent and closed on the way out. Refs only, so nothing goes stale. */
  useEffect(() => () => {
    try { source.current?.stop(); } catch { /* already stopped */ }
    void ctx.current?.close();
  }, []);

  const change = (next: Beat): void => {
    setBeat(next);
    if (playing) loop(next);
  };

  const pad = (sound: SoundId): void => {
    const room = audio();
    const one = hit(sound, RATE);
    const buffer = room.createBuffer(1, one.length, RATE);
    buffer.copyToChannel(one as Float32Array<ArrayBuffer>, 0);
    const node = room.createBufferSource();
    node.buffer = buffer;
    node.connect(room.destination);
    node.start();
  };

  return (
    <div data-beatpads role="dialog" aria-modal="true" aria-label={t('beat.title', 'Drum pads')} className="fixed inset-0 z-[90] flex flex-col bg-zinc-950/97 backdrop-blur" style={{ paddingBottom: barClearance(0) }}>
      <div className="flex items-center justify-between gap-3 border-b border-fuchsia-500/30 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-white">{t('beat.title', 'Drum pads')}</h3>
          <p data-keep className="text-xs text-zinc-400">{t('beat.what', 'Tap a step for a hit, again for a soft one, a third time to clear it. At {bpm} BPM, on the bar the line is in.').replace('{bpm}', String(Math.round(bpm)))}</p>
        </div>
        <button type="button" onClick={() => { stop(); onClose(); }} aria-label={t('share.close', 'Close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-700 text-zinc-300"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('beat.styles', 'Start from a style')}>
          {PRESETS.map((one) => (
            <button
              key={one.id}
              type="button"
              data-beatpreset={one.id}
              onClick={() => { setNamed(t(one.name[0], one.name[1])); change(one.beat); }}
              className="min-h-[40px] rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-3.5 text-xs font-bold text-fuchsia-200"
            >
              {t(one.name[0], one.name[1])}
            </button>
          ))}
          <button type="button" onClick={() => { setNamed(t('beat.lane', 'Beat')); change({ ...beat, pattern: empty() }); }} className="min-h-[40px] rounded-full border border-zinc-700 px-3.5 text-xs font-bold text-zinc-300">
            {t('beat.clear', 'Clear')}
          </button>
        </div>

        {/* Sideways on purpose: sixteen steps are a bar, and a bar broken onto
            two rows on a phone is no longer a bar you can read across. The
            grid scrolls along; everything else in the sheet wraps. */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div data-beatgrid className="grid min-w-[720px] gap-1" style={{ gridTemplateColumns: `6.5rem repeat(${STEPS}, minmax(0, 1fr))` }}>
            {SOUNDS.map((sound) => (
              <React.Fragment key={sound}>
                <button
                  type="button"
                  data-beatpad={sound}
                  onClick={() => pad(sound)}
                  className="min-h-[40px] truncate rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-left text-[11px] font-bold text-zinc-200 active:bg-fuchsia-500/30"
                >
                  {t(SOUND_NAMES[sound][0], SOUND_NAMES[sound][1])}
                </button>
                {Array.from({ length: STEPS }, (_, step) => {
                  const hard = beat.pattern[sound]?.[step] ?? 0;
                  return (
                    <button
                      key={step}
                      type="button"
                      data-beatstep={`${sound}:${step}`}
                      data-on={hard > 0 ? (hard >= 0.95 ? 'hard' : 'soft') : 'off'}
                      aria-label={`${t(SOUND_NAMES[sound][0], SOUND_NAMES[sound][1])} ${step + 1}`}
                      aria-pressed={hard > 0}
                      onClick={() => change({
                        ...beat,
                        pattern: { ...beat.pattern, [sound]: (beat.pattern[sound] ?? new Array(STEPS).fill(0)).map((v, i) => (i === step ? NEXT(v) : v)) },
                      })}
                      className="min-h-[40px] rounded-md border transition-colors"
                      style={{
                        borderColor: lit === step ? '#f0abfc' : step % 4 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
                        background: hard >= 0.95 ? '#d946ef' : hard > 0 ? 'rgba(217,70,239,0.45)' : step % 8 < 4 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                        boxShadow: hard > 0 && lit === step ? '0 0 12px #e879f9' : undefined,
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
            {t('beat.bars', 'Bars')}
            <select
              data-beatbars
              value={beat.bars}
              onChange={(event) => change({ ...beat, bars: Number(event.target.value) })}
              className="min-h-[40px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100"
            >
              {[1, 2, 4, 8, 16].map((one) => <option key={one} value={one}>{one}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
            {t('beat.swing', 'Swing')}
            <input
              type="range"
              min={0}
              max={60}
              value={Math.round(beat.swing * 100)}
              onChange={(event) => change({ ...beat, swing: Number(event.target.value) / 100 })}
              aria-label={t('beat.swing', 'Swing')}
              className="h-10 flex-1 accent-fuchsia-500"
            />
            <span className="w-8 text-right tabular-nums text-zinc-300">{Math.round(beat.swing * 100)}</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 p-3">
        <button
          type="button"
          data-beatplay
          onClick={() => (playing ? stop() : loop(beat))}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-fuchsia-500/50 bg-fuchsia-500/10 text-sm font-bold text-fuchsia-200"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? t('beat.stop', 'Stop') : t('beat.hear', 'Hear it loop')}
        </button>
        <button
          type="button"
          data-beatplace
          onClick={() => { stop(); onPlace(beat, named); }}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-fuchsia-500 text-sm font-black text-white"
        >
          <Check className="h-4 w-4" />
          {t('beat.place', 'Put it on a lane')} · {t('script.noCredits', 'no credits')}
        </button>
      </div>
    </div>
  );
}

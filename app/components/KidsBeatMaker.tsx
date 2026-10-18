'use client';

/**
 * The beat machine, as a child sees it.
 *
 * Google's "Kids Dream Studio" page, brought by the owner on 13 October 2026,
 * opened on this: four beats to start from, a grid of squares to light up, a
 * turtle-to-cheetah speed slider and a soundboard. The engine behind it is
 * `lib/kidsbeat.ts`, and this file only draws what the engine holds and
 * presses what the child presses.
 *
 * Nothing here costs a credit, sends a byte, or needs the allowance: the
 * grown-up's number is for the song model and the video model, and a beat a
 * child taps out on the browser's oscillators is free the way a toy drum is.
 */

import React, { useEffect, useReducer } from 'react';
import { useLang } from '../lib/i18n';
import {
  beatEngine, BPM_LEAST, BPM_MOST, playSound, randomBeat, SOUNDBOARD, STEPS, TEMPLATES, TRACKS,
} from '../lib/kidsbeat';
import { confetti } from '../lib/kidsconfetti';

/** Re-render whenever the engine changes: it is the one clock for the room. */
export function useBeat(): typeof beatEngine {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => beatEngine.subscribe(bump), []);
  return beatEngine;
}

export default function KidsBeatMaker({
  onSpark,
  onToStage,
}: {
  /** Stars earned by playing, handed up to the counter in the header. */
  readonly onSpark: (n: number) => void;
  /** "Use in Video Studio": go to the stage with the beat still running. */
  readonly onToStage: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const beat = useBeat();

  return (
    <div className="space-y-5" data-kidsbeat>
      {/* ── Four beats to start from ──────────────────────────────────── */}
      <div className="rounded-3xl border-2 border-cyan-500/40 bg-surface-100/80 p-4 shadow-[0_0_28px_rgba(16,185,129,0.35)] backdrop-blur-xs sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-3xl" aria-hidden>🪄</span>
          <div className="min-w-0">
            <h2 className="fb-kids-bubble text-lg font-bold text-surface-900 sm:text-xl">
              {t('kids.jamTitle', '1-Click Jam Templates!')}
            </h2>
            <p className="text-xs text-surface-700">
              {t('kids.jamWhy', 'Tap one and the beat grid fills up with a ready-made tune.')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-kidsjams>
          {TEMPLATES.map((one) => (
            <button
              key={one.id}
              type="button"
              data-kidsjam={one.id}
              onClick={() => {
                beat.load(one.beat);
                if (!beat.playing) beat.play();
                onSpark(10);
                confetti(80);
              }}
              style={{ background: one.wash }}
              className="fb-kids-bouncy flex min-h-[64px] items-center gap-3 rounded-2xl border-2 border-white/30 p-3 text-left text-white"
            >
              <span className="text-3xl" aria-hidden>{one.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{t(one.says[0], one.says[1])}</span>
                <span className="block text-[11px] opacity-90">{t(one.blurb[0], one.blurb[1])}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Transport, grid and soundboard ───────────────────────────── */}
      <div className="space-y-5 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-4 backdrop-blur-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-kidsbeatplay
              aria-pressed={beat.playing}
              onClick={() => { if (beat.playing) beat.stop(); else { beat.play(); onSpark(2); } }}
              className={`fb-kids-bouncy fb-kids-bubble flex min-h-[52px] items-center gap-2 rounded-2xl border-2 px-5 text-lg font-bold ${
                beat.playing
                  ? 'border-white bg-amber-300 text-onAccent'
                  : 'border-cyan-200 bg-cyan-400 text-onAccent'
              }`}
            >
              <span aria-hidden>{beat.playing ? '⏸️' : '▶️'}</span>
              {beat.playing ? t('kids.pauseTune', 'PAUSE TUNE') : t('kids.playTune', 'PLAY TUNE')}
            </button>
            <button
              type="button"
              data-kidsbeatclear
              onClick={() => beat.clear()}
              className="fb-kids-bouncy min-h-[44px] rounded-2xl border border-surface-300 bg-surface-200 px-4 text-sm font-bold text-surface-900"
            >
              🧹 {t('kids.clearBeat', 'Clear All')}
            </button>
            <button
              type="button"
              data-kidsbeatsurprise
              onClick={() => { beat.load(randomBeat()); onSpark(5); }}
              className="fb-kids-bouncy min-h-[44px] rounded-2xl border-2 border-amber-200 bg-amber-300 px-4 text-sm font-bold text-onAccent"
            >
              🎲 {t('kids.surpriseBeat', 'Surprise Me!')}
            </button>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-surface-300 bg-surface-100/80 px-4 py-2">
            <span className="text-2xl" aria-hidden title={t('kids.slow', 'Slow')}>🐢</span>
            <span className="flex flex-col">
              <span className="text-center text-[11px] font-semibold text-surface-700">
                {t('kids.tempo', 'Speed')}: <span className="font-bold text-amber-300" data-kidsbpm>{beat.bpm}</span> BPM
              </span>
              <input
                type="range"
                min={BPM_LEAST}
                max={BPM_MOST}
                value={beat.bpm}
                onChange={(e) => beat.setBpm(Number(e.target.value))}
                aria-label={t('kids.tempo', 'Speed')}
                className="w-32 cursor-pointer accent-cyan-400"
              />
            </span>
            <span className="text-2xl" aria-hidden title={t('kids.fast', 'Super fast')}>🐆</span>
          </label>

          <button
            type="button"
            data-kidsbeattostage
            onClick={() => { if (!beat.playing && beat.lit() > 0) beat.play(); onToStage(); }}
            className="fb-kids-bouncy flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary-400 px-4 text-sm font-bold text-onAccent"
          >
            <span aria-hidden>🎬</span> {t('kids.toStage', 'Use in Video Studio!')}
          </button>
        </div>

        {/* The grid: five rows of eight. Icons alone on a phone, names beside
            them where there is room, and the square that just sounded wears
            a yellow ring so a child can see the beat go round. */}
        <div className="space-y-2" data-kidsgrid>
          {TRACKS.map((track) => (
            <div key={track.id} className="flex items-center gap-2 rounded-2xl border border-surface-200 bg-surface-100/60 p-1.5 sm:p-2">
              <div className="flex w-10 shrink-0 items-center gap-1.5 text-xs font-bold text-surface-800 sm:w-40 sm:text-sm">
                <span className="text-xl sm:text-base" aria-hidden>{track.icon}</span>
                <span className="hidden sm:inline">{t(track.says[0], track.says[1])}</span>
              </div>
              <div className="grid flex-1 grid-cols-8 gap-1 sm:gap-2">
                {Array.from({ length: STEPS }, (_, at) => {
                  const on = beat.beat[track.id][at];
                  const now = beat.step === at;
                  return (
                    <button
                      key={at}
                      type="button"
                      data-kidsstep={`${track.id}-${at}`}
                      aria-pressed={on}
                      aria-label={`${t(track.says[0], track.says[1])} ${at + 1}`}
                      onClick={() => { beat.toggle(track.id, at); if (!on) onSpark(1); }}
                      className={`flex h-10 items-center justify-center rounded-xl border-2 text-xs font-bold transition-all sm:h-11 ${
                        on
                          ? 'scale-105 border-white bg-cyan-400 text-onAccent shadow-md'
                          : 'border-surface-200 bg-surface-50/60 text-surface-500'
                      } ${now ? 'ring-4 ring-amber-300' : ''}`}
                    >
                      {on ? '●' : '○'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* The soundboard: tap any time, with the beat or without it. */}
        <div className="border-t border-surface-200 pt-5">
          <h3 className="fb-kids-bubble mb-3 flex flex-wrap items-center gap-2 text-lg font-bold text-surface-800">
            <span aria-hidden>🥁</span> {t('kids.soundboard', 'Live Soundboard')}
            <span className="rounded-full bg-surface-200 px-2 py-0.5 font-sans text-xs text-surface-800">
              {t('kids.soundboardWhy', 'Tap anytime to jam live!')}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6" data-kidspads>
            {SOUNDBOARD.map((pad) => (
              <button
                key={pad.id}
                type="button"
                data-kidspad={pad.id}
                onClick={() => { playSound(pad.sound); onSpark(2); }}
                style={{ background: pad.wash }}
                className="fb-kids-bouncy min-h-[72px] rounded-2xl border-2 border-white/30 p-3 text-center text-white"
              >
                <span className="block text-3xl" aria-hidden>{pad.icon}</span>
                <span className="mt-1 block text-xs font-bold">{t(pad.says[0], pad.says[1])}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

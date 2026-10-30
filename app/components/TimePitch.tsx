'use client';

/**
 * Time and pitch for the open lane: hear what tempo and key the clip is in,
 * fit it to the session's, or move it by hand, and bake it in.
 *
 * The reading is done on the device the moment the lane opens, so the
 * numbers are there before anybody asks (`lib/timepitch.ts`); a lane read by
 * the paid song reader uses that reading instead, which knows more. The two
 * "fit" presses set the controls rather than acting, so what will happen is
 * on the screen before it does, and one press bakes it, undoable like every
 * other change to a lane.
 */
import React, { useEffect, useState } from 'react';
import { Gauge, Loader2, Minus, Music2, Plus, Wand2 } from 'lucide-react';
import type { Lane } from '../lib/session';
import {
  FASTEST_SPEED, MOST_SEMITONES, SLOWEST_SPEED, NOTE_NAMES, clampSpeed, keyOfClip, keyOfName, sayKey,
  semitonesBetween, speedToFit, tempoOf, type ClipKey,
} from '../lib/timepitch';

type Say = (key: string, fallback: string) => string;

interface Read { readonly tempo: number | null; readonly key: ClipKey | null }

/* Read once per recording: reopening the lane, or another lane cut from the
   same take, does not read it again. */
const READS = new WeakMap<AudioBuffer, Read>();

const channelsOf = (audio: AudioBuffer): Float32Array[] =>
  Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c));

export default function TimePitch({
  t,
  lane,
  bpm,
  sessionKey,
  heard,
  busy,
  onApply,
}: {
  readonly t: Say;
  readonly lane: Lane;
  readonly bpm: number;
  /** The session's key as the clock writes it ("C", "F#m"). */
  readonly sessionKey: string | undefined;
  /** What the song reader said about this lane, when it was asked. */
  readonly heard?: { readonly tempo: number | null; readonly key: string | null };
  readonly busy: boolean;
  readonly onApply: (speed: number, semitones: number) => void;
}): React.ReactElement {
  const [speed, setSpeed] = useState(1);
  const [shift, setShift] = useState(0);
  const [read, setRead] = useState<Read | null>(() => READS.get(lane.audio) ?? null);
  const [working, setWorking] = useState(false);

  /* A different lane, or this one changed: start from nothing moved. */
  useEffect(() => {
    setSpeed(1);
    setShift(0);
    const known = READS.get(lane.audio);
    setRead(known ?? null);
    if (known) return;
    /* After the lane has drawn, so opening it never waits on the reading. */
    const timer = window.setTimeout(() => {
      const channels = channelsOf(lane.audio);
      const got = { tempo: tempoOf(channels, lane.audio.sampleRate), key: keyOfClip(channels, lane.audio.sampleRate) };
      READS.set(lane.audio, got);
      setRead(got);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [lane.id, lane.audio]);

  const tempo = heard?.tempo ?? read?.tempo ?? null;
  const key = keyOfName(heard?.key) ?? read?.key ?? null;
  const target = keyOfName(sessionKey);
  const moved = Math.abs(speed - 1) > 1e-3 || shift !== 0;
  const shiftSays = shift === 0
    ? t('tp.asIs', 'as it is')
    : `${shift > 0 ? '+' : '−'}${Math.abs(shift)} ${Math.abs(shift) === 1 ? t('tp.semitone', 'semitone') : t('tp.semitones', 'semitones')}`;

  const apply = (): void => {
    setWorking(true);
    /* A breath first, so the spinner is drawn before the work holds the page. */
    window.setTimeout(() => {
      try { onApply(speed, shift); } finally { setWorking(false); }
    }, 30);
  };

  const step = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-40';
  const fit = 'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-200 disabled:opacity-40';

  return (
    <section data-timepitch className="space-y-3 rounded-2xl border border-cyan-400/25 bg-zinc-950/60 p-3">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 shrink-0 text-cyan-300" />
        <h4 className="text-sm font-black text-white">{t('tp.title', 'Time and pitch')}</h4>
      </div>
      <p data-keep data-timepitchread className="text-xs leading-snug text-zinc-400">
        {!read && !heard
          ? t('tp.reading', 'Listening for its tempo and key…')
          : `${t('tp.heard', 'Heard in this clip')}: ${tempo !== null ? `${Math.round(tempo)} BPM` : t('tp.noBeat', 'no steady beat')} · ${key ? sayKey(key) : t('tp.noKey', 'no clear key')}${heard ? '' : ` (${t('tp.estimate', 'an estimate')})`}`}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-400">
          <span>{t('tp.speed', 'Speed, same pitch')}</span>
          <span data-timepitchspeedsays className="tabular-nums text-zinc-200">
            {Math.round(speed * 100)}%{tempo !== null ? ` · ${Math.round(tempo * speed)} BPM` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={t('tp.slower', 'Slower')} disabled={speed <= SLOWEST_SPEED} onClick={() => setSpeed((was) => clampSpeed(Math.round(was * 100 - 1) / 100))} className={step}><Minus className="h-4 w-4" /></button>
          <input
            type="range"
            data-timepitchspeed
            min={SLOWEST_SPEED * 100}
            max={FASTEST_SPEED * 100}
            value={Math.round(speed * 100)}
            onChange={(event) => setSpeed(clampSpeed(Number(event.target.value) / 100))}
            aria-label={t('tp.speed', 'Speed, same pitch')}
            className="h-11 min-w-0 flex-1 accent-cyan-400"
          />
          <button type="button" aria-label={t('tp.faster', 'Faster')} disabled={speed >= FASTEST_SPEED} onClick={() => setSpeed((was) => clampSpeed(Math.round(was * 100 + 1) / 100))} className={step}><Plus className="h-4 w-4" /></button>
        </div>
        <button type="button" data-timepitchfit disabled={tempo === null} onClick={() => tempo !== null && setSpeed(clampSpeed(speedToFit(tempo, bpm)))} className={fit}>
          <Wand2 className="h-4 w-4" />
          {t('tp.fitTempo', 'Fit it to the session’s {bpm} BPM').replace('{bpm}', String(Math.round(bpm)))}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-400">
          <span>{t('tp.pitch', 'Pitch, same length')}</span>
          <span data-timepitchshiftsays className="tabular-nums text-zinc-200">
            {shiftSays}{key && shift !== 0 ? ` · ${NOTE_NAMES[(key.root + shift + 120) % 12]}${key.minor ? 'm' : ''}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" data-timepitchdown aria-label={t('tp.lower', 'A semitone lower')} disabled={shift <= -MOST_SEMITONES} onClick={() => setShift((was) => Math.max(-MOST_SEMITONES, was - 1))} className={step}><Minus className="h-4 w-4" /></button>
          <div className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-zinc-800 text-sm font-black tabular-nums text-white">
            {shift > 0 ? `+${shift}` : shift < 0 ? `−${-shift}` : '0'}
          </div>
          <button type="button" data-timepitchup aria-label={t('tp.higher', 'A semitone higher')} disabled={shift >= MOST_SEMITONES} onClick={() => setShift((was) => Math.min(MOST_SEMITONES, was + 1))} className={step}><Plus className="h-4 w-4" /></button>
        </div>
        <button type="button" data-timepitchkey disabled={!key || !target} onClick={() => key && target && setShift(semitonesBetween(key, target))} className={fit}>
          <Music2 className="h-4 w-4" />
          {t('tp.fitKey', 'Into the session’s key, {key}').replace('{key}', sessionKey ?? '—')}
        </button>
      </div>

      <button
        type="button"
        data-timepitchapply
        disabled={!moved || busy || working}
        onClick={apply}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 text-sm font-black text-zinc-950 disabled:opacity-40"
      >
        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
        {working ? t('tp.working', 'Moving it…') : t('tp.apply', 'Change this lane')} · {t('script.noCredits', 'no credits')}
      </button>
      <p className="text-xs leading-snug text-zinc-500">
        {t('tp.what', 'Done on your device and written into the clip, so Undo puts it back. Pitch moves the character of a voice with it, as on a tape: a few semitones sounds natural, an octave does not.')}
      </p>
    </section>
  );
}

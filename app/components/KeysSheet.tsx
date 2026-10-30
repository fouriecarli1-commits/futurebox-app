'use client';

/**
 * Play an instrument into ProBooth: on the keys on screen, on the computer's
 * own keyboard, or on a MIDI keyboard where the browser has Web MIDI.
 *
 * The audit of 29 October 2026 found no way to play notes in: every studio
 * has a keyboard, and ProBooth only had humming. This plays the built-in
 * instruments (`lib/huminstrument.ts`) as you press, records what you play
 * against a click after a bar's count-in, shows it in the same piano roll the
 * hum uses to be fixed note by note, and puts it on a lane at the session's
 * tempo, the notes kept with it so MIDI comes out exact. Drawn on the device:
 * nothing is sent and nothing is charged.
 *
 * Web MIDI is not in Safari or on an iPhone (WebKit has never shipped it), so
 * there the on-screen keys and the computer keys are the way in, and the sheet
 * says so rather than offering a keyboard that will never answer.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Circle, Square, X } from 'lucide-react';
import HumRoll from './HumRoll';
import { VOICES, voiceById, type VoiceId } from '../lib/huminstrument';
import type { HumNote } from '../lib/humnotes';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';

type Say = (key: string, fallback: string) => string;

/** The computer's keys, as a piano: the home row white, the row above black. */
export const KEYMAP: Readonly<Record<string, number>> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16,
};

const BLACK = new Set([1, 3, 6, 8, 10]);
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const nameOf = (midi: number): string => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

/** Notes snapped to a grid of `step` seconds, never shorter than one step. */
export function quantised(notes: readonly HumNote[], step: number): HumNote[] {
  if (!(step > 0)) return [...notes];
  return notes.map((one) => {
    const from = Math.round(one.from / step) * step;
    const to = Math.max(from + step, Math.round(one.to / step) * step);
    return { ...one, from, to };
  });
}

export default function KeysSheet({
  t,
  bpm,
  beats,
  onPlace,
  onClose,
}: {
  readonly t: Say;
  readonly bpm: number;
  /** Beats in a bar. */
  readonly beats: number;
  readonly onPlace: (notes: readonly HumNote[], voice: VoiceId) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  useBackLayer(true, onClose);
  const pitched = VOICES.filter((one) => one.pitched);
  const [voice, setVoice] = useState<VoiceId>('keys');
  const [base, setBase] = useState(48);
  const [down, setDown] = useState<ReadonlySet<number>>(new Set());
  const [notes, setNotes] = useState<HumNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [snap, setSnap] = useState(true);
  const [midiSays, setMidiSays] = useState<'none' | 'ready' | 'waiting'>('waiting');
  const ctx = useRef<AudioContext | null>(null);
  const sounding = useRef(new Map<number, { readonly stop: () => void }>());
  const started = useRef<number | null>(null);
  const open = useRef(new Map<number, { readonly from: number; readonly loud: number }>());
  const clicks = useRef<OscillatorNode[]>([]);
  const beat = 60 / Math.max(30, Math.min(300, bpm));

  const audio = (): AudioContext => {
    if (!ctx.current) ctx.current = new AudioContext();
    void ctx.current.resume();
    return ctx.current;
  };

  /* The chosen instrument's own harmonics and envelope, as a live voice. */
  const press = useCallback((midi: number, loud = 0.8): void => {
    const room = audio();
    const spec = voiceById(voice);
    if (!spec || sounding.current.has(midi)) return;
    const partials = spec.partials.length ? spec.partials : [1];
    const wave = room.createPeriodicWave(new Float32Array([0, ...partials.map(() => 0)]), new Float32Array([0, ...partials]));
    const osc = room.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = 440 * 2 ** ((midi + spec.shift - 69) / 12);
    const amp = room.createGain();
    const now = room.currentTime;
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(0.22 * loud, now + Math.max(0.005, spec.attack));
    if (spec.decay > 0) amp.gain.setTargetAtTime(0.22 * loud * (spec.decayFloor ?? 0), now + spec.attack, spec.decay);
    osc.connect(amp).connect(room.destination);
    osc.start(now);
    sounding.current.set(midi, {
      stop: () => {
        const end = room.currentTime;
        amp.gain.cancelScheduledValues(end);
        amp.gain.setValueAtTime(amp.gain.value, end);
        amp.gain.linearRampToValueAtTime(0, end + Math.max(0.03, spec.release));
        osc.stop(end + Math.max(0.03, spec.release) + 0.02);
      },
    });
    setDown((was) => new Set(was).add(midi));
    if (started.current !== null) open.current.set(midi, { from: room.currentTime - started.current, loud });
  }, [voice]);

  const release = useCallback((midi: number): void => {
    sounding.current.get(midi)?.stop();
    sounding.current.delete(midi);
    setDown((was) => { const next = new Set(was); next.delete(midi); return next; });
    const held = open.current.get(midi);
    if (held && started.current !== null && ctx.current) {
      const to = ctx.current.currentTime - started.current;
      open.current.delete(midi);
      if (to > held.from) setNotes((was) => [...was, { midi, from: Math.max(0, held.from), to, loud: held.loud }]);
    }
  }, []);

  /* The computer's keys. */
  useEffect(() => {
    const isTyping = (event: KeyboardEvent): boolean => {
      const target = event.target as HTMLElement | null;
      return Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA'));
    };
    const onDown = (event: KeyboardEvent): void => {
      if (event.repeat || isTyping(event) || event.metaKey || event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { setBase((was) => Math.max(24, was - 12)); return; }
      if (key === 'x') { setBase((was) => Math.min(84, was + 12)); return; }
      const off = KEYMAP[key];
      if (off === undefined) return;
      event.preventDefault();
      press(base + off);
    };
    const onUp = (event: KeyboardEvent): void => {
      const off = KEYMAP[event.key.toLowerCase()];
      if (off !== undefined) release(base + off);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [base, press, release]);

  /* A MIDI keyboard, where the browser has Web MIDI. */
  useEffect(() => {
    if (typeof navigator.requestMIDIAccess !== 'function') { setMidiSays('none'); return; }
    let live = true;
    const inputs: MIDIInput[] = [];
    navigator.requestMIDIAccess().then((access) => {
      if (!live) return;
      access.inputs.forEach((input) => {
        inputs.push(input);
        input.onmidimessage = (event: MIDIMessageEvent) => {
          const data = event.data;
          if (!data || data.length < 3) return;
          const kind = data[0] & 0xf0;
          if (kind === 0x90 && data[2] > 0) press(data[1], data[2] / 127);
          else if (kind === 0x80 || (kind === 0x90 && data[2] === 0)) release(data[1]);
        };
      });
      setMidiSays(inputs.length ? 'ready' : 'none');
    }).catch(() => setMidiSays('none'));
    return () => { live = false; inputs.forEach((one) => { one.onmidimessage = null; }); };
  }, [press, release]);

  useEffect(() => () => {
    sounding.current.forEach((one) => one.stop());
    clicks.current.forEach((one) => { try { one.stop(); } catch { /* */ } });
    void ctx.current?.close();
  }, []);

  /* Record: a bar counted in on the click, then the click carries on under you. */
  const record = (): void => {
    const room = audio();
    const lead = beat * beats;
    const begin = room.currentTime + 0.1;
    started.current = begin + lead;
    setNotes([]);
    clicks.current = [];
    for (let i = 0; i < beats * 64; i += 1) {
      const at = begin + i * beat;
      const osc = room.createOscillator();
      const amp = room.createGain();
      osc.frequency.value = i % beats === 0 ? 1500 : 1000;
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(i < beats ? 0.3 : 0.15, at + 0.002);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
      osc.connect(amp).connect(room.destination);
      osc.start(at);
      osc.stop(at + 0.06);
      clicks.current.push(osc);
    }
    setRecording(true);
  };

  const stop = (): void => {
    clicks.current.forEach((one) => { try { one.stop(); } catch { /* */ } });
    clicks.current = [];
    [...open.current.keys()].forEach((midi) => release(midi));
    started.current = null;
    setRecording(false);
  };

  const keys = Array.from({ length: 25 }, (_, i) => base + i);
  const length = Math.max(beat * beats * 2, ...notes.map((one) => one.to + beat));
  const sixteenth = beat / 4;

  return (
    <div data-keyssheet role="dialog" aria-modal="true" aria-label={t('keys.title', 'Play an instrument')} className="fixed inset-0 z-[90] flex flex-col bg-zinc-950/97 backdrop-blur" style={{ paddingBottom: barClearance(0) }}>
      <div className="flex items-center justify-between gap-3 border-b border-sky-500/30 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-white">{t('keys.title', 'Play an instrument')}</h3>
          <p data-keep className="text-xs text-zinc-400">
            {midiSays === 'ready'
              ? t('keys.whatMidi', 'Play the keys below, your computer keys (A to K, Z and X for the octave), or the MIDI keyboard that is plugged in.')
              : t('keys.what', 'Play the keys below, or your computer keys: A to K, with Z and X for the octave. A MIDI keyboard works in Chrome and on Android.')}
          </p>
        </div>
        <button type="button" onClick={() => { stop(); onClose(); }} aria-label={t('share.close', 'Close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-zinc-700 text-zinc-300"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <label className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
          {t('keys.voice', 'Instrument')}
          <select
            data-keysvoice
            value={voice}
            onChange={(event) => setVoice(event.target.value as VoiceId)}
            className="min-h-[44px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-sm text-zinc-100"
          >
            {pitched.map((one) => <option key={one.id} value={one.id}>{t(one.says[0], one.says[1])}</option>)}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setBase((was) => Math.max(24, was - 12))} className="min-h-[44px] rounded-lg border border-zinc-700 px-3 text-xs font-bold text-zinc-300">{t('keys.down', 'Octave down')}</button>
          <span className="flex-1 text-center text-xs font-bold tabular-nums text-sky-300">{nameOf(base)} – {nameOf(base + 24)}</span>
          <button type="button" onClick={() => setBase((was) => Math.min(84, was + 12))} className="min-h-[44px] rounded-lg border border-zinc-700 px-3 text-xs font-bold text-zinc-300">{t('keys.up', 'Octave up')}</button>
        </div>

        {/* Sideways on purpose: two octaves of keys are a keyboard, and a
            keyboard folded onto two rows is not one a hand can play. */}
        <div className="-mx-1 overflow-x-auto px-1">
          <div data-keyboard className="relative flex h-36 min-w-[560px] select-none" style={{ touchAction: 'none' }}>
            {keys.filter((midi) => !BLACK.has(midi % 12)).map((midi) => (
              <button
                key={midi}
                type="button"
                data-key={midi}
                data-down={down.has(midi) ? '' : undefined}
                aria-label={nameOf(midi)}
                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); press(midi); }}
                onPointerUp={() => release(midi)}
                onPointerCancel={() => release(midi)}
                className="relative flex-1 rounded-b-lg border border-zinc-700"
                style={{ background: down.has(midi) ? 'linear-gradient(#7dd3fc, #38bdf8)' : 'linear-gradient(#f8fafc, #cbd5e1)', boxShadow: down.has(midi) ? '0 0 16px #38bdf8' : undefined }}
              >
                {midi % 12 === 0 && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-500">{nameOf(midi)}</span>}
              </button>
            ))}
            {keys.filter((midi) => BLACK.has(midi % 12)).map((midi) => {
              const whitesBefore = keys.filter((one) => one < midi && !BLACK.has(one % 12)).length;
              const whiteCount = keys.filter((one) => !BLACK.has(one % 12)).length;
              return (
                <button
                  key={midi}
                  type="button"
                  data-key={midi}
                  data-down={down.has(midi) ? '' : undefined}
                  aria-label={nameOf(midi)}
                  onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); press(midi); }}
                  onPointerUp={() => release(midi)}
                  onPointerCancel={() => release(midi)}
                  className="absolute top-0 z-10 h-[60%] rounded-b-md border border-black"
                  style={{
                    left: `calc(${(whitesBefore / whiteCount) * 100}% - ${100 / whiteCount / 3}%)`,
                    width: `${(100 / whiteCount) * 0.66}%`,
                    background: down.has(midi) ? 'linear-gradient(#0ea5e9, #0369a1)' : 'linear-gradient(#27272a, #09090b)',
                    boxShadow: down.has(midi) ? '0 0 14px #0ea5e9' : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>

        {notes.length > 0 && !recording && (
          <div className="space-y-2">
            <HumRoll
              notes={notes}
              onChange={setNotes}
              seconds={length}
              beat={beat}
              barBeats={beats}
              offset={0}
              step={snap ? sixteenth : 0}
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <input type="checkbox" checked={snap} onChange={(event) => setSnap(event.target.checked)} className="h-5 w-5 accent-sky-500" />
              {t('keys.snap', 'Put it on the beat (sixteenths)')}
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 p-3">
        <button
          type="button"
          data-keysrecord
          onClick={() => (recording ? stop() : record())}
          className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border text-sm font-bold ${recording ? 'border-red-400 bg-red-500/20 text-red-200' : 'border-red-500/50 bg-red-500/10 text-red-200'}`}
        >
          {recording ? <Square className="h-4 w-4 fill-current" /> : <Circle className="h-4 w-4 fill-current" />}
          {recording ? t('keys.stop', 'Stop') : t('keys.record', 'Record what I play')}
        </button>
        <button
          type="button"
          data-keysplace
          disabled={recording || !notes.length}
          onClick={() => onPlace(snap ? quantised(notes, sixteenth) : notes, voice)}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-black text-white disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {t('beat.place', 'Put it on a lane')} · {t('script.noCredits', 'no credits')}
        </button>
      </div>
    </div>
  );
}

'use client';

/**
 * The effect rack, with a rich, forward-thinking visualizer engine showing
 * exactly how each effect bends and shapes the audio waveform in real time.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 14 September 2026: *"As hierdie funksies kleurvolle visualizers kon
 * hê om te wys hoe buig die klankbaan sou dit baie help."*
 *
 * And user request: *"dit moet baie visueel wees en die klank vorm visueel maak
 * sodat mens sien hoe verander die klankvorm, gebruik asb goeie funksies wat
 * ek en claude gebruik het, en voeg funksies by en benut die beste van alles,
 * asook maak dit esteties spectacular en forward thinking... want ons set
 * die bar vir toekomstige apps en creative studios."*
 *
 * ── What is drawn ────────────────────────────────────────────────────────
 *
 * 1. The Transfer Curve: `curveOf` in `lib/fx.ts` returns the exact array handed
 *    to the `WaveShaperNode`, and for the EQ `responseOf` asks the biquads themselves
 *    what they do.
 * 2. The Sound Waveform Transformation: An authentic audio signal x(t) is passed
 *    through the mathematical transfer function in real-time, displaying the
 *    incoming dry wave against the resulting shaped sound wave. You can literally
 *    see how tape saturation rounds the wave crests, wave folding curls them inwards,
 *    bit crushing quantizes them into digital staircases, and compression clamps peaks.
 *
 * ── Why the colours are literals ────────────────────────────────────────
 *
 * The booth does not follow the theme, on purpose:  *"die booth se swart met
 * die blou musieklyn sal 'n unieke take wees vir die booth."* `check:boothline`
 * holds that rule for the timeline and the same applies here.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Wand2, Activity, Zap, Radio, RefreshCw, Eye, Waves, Sliders, Volume2,
} from 'lucide-react';
import {
  curveOf, responseOf, gateOpen, FX_DEFAULTS, VOCODER_CHORDS,
  type Fx, type EqSettings, type VocoderChord,
} from '../lib/fx';
import { TUNE_DEFAULT, type TuneHow, type TuneScale } from '../lib/tuner';
import {
  PEDAL_DEFAULTS, RIGS, driveCurve, valveCurve,
  type AmpVoice, type Cabinet, type DriveKind,
} from '../lib/pedals';
import { useLang } from '../lib/i18n';

const PANEL = '#0b0d14';
const EDGE = 'rgba(255,255,255,0.08)';
const INK = '#eef2ff';
const INK_DIM = 'rgba(238,242,255,0.5)';

/** Each effect gets its own hue, so a rack reads at a glance. */
const HUES: Record<string, number> = {
  utility: 210,
  eq: 190,
  saturator: 28,
  folder: 300,
  crusher: 340,
  compressor: 150,
  limiter: 95,
  tremolo: 260,
  chorus: 230,
  delay: 175,
  reverb: 205,
  gate: 120,
  vocoder: 280,
  tuner: 45,
  overdrive: 48,
  distortion: 15,
  fuzz: 320,
  amp: 35,
  flanger: 250,
  phaser: 290,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
/** A MIDI number as a note a musician reads: 48 is C3. */
function noteName(midi: number): string {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

function lit(hue: number, alpha = 1): string {
  return `hsl(${hue} 85% 62% / ${alpha})`;
}

/** Map an input value [-1, 1] through the transfer function points array. */
function mapTransfer(v: number, points: Float32Array | readonly number[]): number {
  if (points.length === 0) return v;
  const norm = Math.max(0, Math.min(1, (v + 1) / 2));
  const idx = Math.floor(norm * (points.length - 1));
  return points[idx] ?? v;
}

/**
 * The bend and waveform transformation, drawn in real time.
 *
 * `points` is in −1..1 on both axes for a transfer curve, and the diagonal
 * behind it is the line "no effect" would draw — which is the thing that
 * makes the picture readable.
 *
 * In dual / split mode, the left side shows the transfer curve and the right side
 * shows the live input sine wave being transformed into the bent output wave.
 */
function Bend({
  points,
  hue,
  diagonal = true,
  unitId,
}: {
  readonly points: Float32Array | readonly number[];
  readonly hue: number;
  readonly diagonal?: boolean;
  readonly unitId?: string;
}): React.ReactElement {
  const { t } = useLang();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<'split' | 'wave' | 'curve'>('split');

  useEffect(() => {
    const box = canvas.current;
    if (!box) return;
    let animId: number;
    let phase = 0;

    const render = () => {
      phase = (phase + 0.05) % (Math.PI * 2);
      const ratio = window.devicePixelRatio || 1;
      const width = box.clientWidth;
      const height = box.clientHeight;
      if (!(width > 0 && height > 0)) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (box.width !== Math.floor(width * ratio) || box.height !== Math.floor(height * ratio)) {
        box.width = Math.floor(width * ratio);
        box.height = Math.floor(height * ratio);
      }

      const paint = box.getContext('2d');
      if (!paint) {
        animId = requestAnimationFrame(render);
        return;
      }

      paint.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint.clearRect(0, 0, width, height);

      // Subtle background grid
      paint.strokeStyle = 'rgba(255,255,255,0.04)';
      paint.lineWidth = 1;
      paint.beginPath();
      paint.moveTo(0, height / 2);
      paint.lineTo(width, height / 2);
      paint.moveTo(0, height / 4);
      paint.lineTo(width, height / 4);
      paint.moveTo(0, (height * 3) / 4);
      paint.lineTo(width, (height * 3) / 4);
      paint.stroke();

      const showCurve = view === 'curve' || view === 'split';
      const showWave = view === 'wave' || view === 'split';
      const curveW = view === 'split' ? Math.floor(width * 0.44) : width;
      const waveX = view === 'split' ? Math.floor(width * 0.48) : 0;
      const waveW = view === 'split' ? width - waveX : width;

      // ── 1. Transfer Curve Section ─────────────────────────────────────
      if (showCurve) {
        if (diagonal) {
          paint.strokeStyle = 'rgba(255,255,255,0.12)';
          paint.setLineDash([3, 4]);
          paint.beginPath();
          paint.moveTo(0, height);
          paint.lineTo(curveW, 0);
          paint.stroke();
          paint.setLineDash([]);
        }

        // Transfer curve glow & line
        paint.shadowColor = lit(hue, 0.7);
        paint.shadowBlur = 6;
        paint.strokeStyle = lit(hue, 0.95);
        paint.lineWidth = 2.2;
        paint.beginPath();
        for (let x = 0; x < curveW; x += 1) {
          const which = Math.floor((x / curveW) * (points.length - 1));
          const y = height / 2 - (points[which] ?? 0) * (height / 2 - 4);
          if (x === 0) paint.moveTo(x, y);
          else paint.lineTo(x, y);
        }
        paint.stroke();
        paint.shadowBlur = 0;

        // Wash under the curve
        paint.lineTo(curveW, height / 2);
        paint.lineTo(0, height / 2);
        paint.closePath();
        paint.fillStyle = lit(hue, 0.12);
        paint.fill();

        // Traveling phase dot along curve
        const dotInput = Math.sin(phase);
        const dotNorm = (dotInput + 1) / 2;
        const dotX = dotNorm * curveW;
        const dotIdx = Math.floor(dotNorm * (points.length - 1));
        const dotY = height / 2 - (points[dotIdx] ?? dotInput) * (height / 2 - 4);
        paint.fillStyle = '#ffffff';
        paint.shadowColor = lit(hue, 0.9);
        paint.shadowBlur = 8;
        paint.beginPath();
        paint.arc(dotX, dotY, 3, 0, Math.PI * 2);
        paint.fill();
        paint.shadowBlur = 0;
      }

      // Vertical separator in split mode
      if (view === 'split') {
        paint.strokeStyle = 'rgba(255,255,255,0.08)';
        paint.lineWidth = 1;
        paint.setLineDash([2, 3]);
        paint.beginPath();
        paint.moveTo(curveW + 8, 4);
        paint.lineTo(curveW + 8, height - 4);
        paint.stroke();
        paint.setLineDash([]);
      }

      // ── 2. Sound Waveform Transformation Section ──────────────────────
      if (showWave) {
        // Dry Input Sine Wave (subtle dashed cyan)
        paint.strokeStyle = 'rgba(56,189,248,0.38)';
        paint.lineWidth = 1.2;
        paint.setLineDash([2, 3]);
        paint.beginPath();
        const cycles = view === 'split' ? 1.75 : 3.0;
        for (let x = 0; x < waveW; x += 1) {
          const tVal = (x / waveW) * Math.PI * 2 * cycles + phase;
          const dryVal = Math.sin(tVal) * 0.85;
          const y = height / 2 - dryVal * (height / 2 - 4);
          if (x === 0) paint.moveTo(waveX + x, y);
          else paint.lineTo(waveX + x, y);
        }
        paint.stroke();
        paint.setLineDash([]);

        // Transformed Wet Sound Wave (glowing solid curve in unit hue)
        paint.shadowColor = lit(hue, 0.75);
        paint.shadowBlur = 7;
        paint.strokeStyle = lit(hue, 1);
        paint.lineWidth = 2.4;
        paint.beginPath();
        for (let x = 0; x < waveW; x += 1) {
          const tVal = (x / waveW) * Math.PI * 2 * cycles + phase;
          const dryVal = Math.sin(tVal) * 0.85;
          const wetVal = mapTransfer(dryVal, points);
          const y = height / 2 - wetVal * (height / 2 - 4);
          if (x === 0) paint.moveTo(waveX + x, y);
          else paint.lineTo(waveX + x, y);
        }
        paint.stroke();
        paint.shadowBlur = 0;

        // Translucent gradient fill under peaks
        paint.lineTo(waveX + waveW, height / 2);
        paint.lineTo(waveX, height / 2);
        paint.closePath();
        paint.fillStyle = lit(hue, 0.1);
        paint.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [points, hue, diagonal, view]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-1">
      {/* HUD Header Bar */}
      <div className="mb-1 flex items-center justify-between px-2 pt-1 text-[10px] font-semibold text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: lit(hue) }}>
            <Activity className="h-2.5 w-2.5" />
            {unitId ?? t('fx.harmonics', 'Harmonics')}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="flex items-center gap-1 text-[9px] text-sky-400/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400/60" />
            {t('fx.inDry', 'Dry Signal')}
          </span>
          <span className="flex items-center gap-1 text-[9px]" style={{ color: lit(hue) }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: lit(hue) }} />
            {t('fx.outWet', 'Shaped Waveform')}
          </span>
        </div>
        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-0.5 rounded-lg bg-zinc-900/80 p-0.5">
          <button
            type="button"
            onClick={() => setView('split')}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-all ${
              view === 'split' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('fx.viewSplit', 'Dual HUD')}
          </button>
          <button
            type="button"
            onClick={() => setView('wave')}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-all ${
              view === 'wave' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('fx.viewWave', 'Waveform')}
          </button>
          <button
            type="button"
            onClick={() => setView('curve')}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-all ${
              view === 'curve' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('fx.viewCurve', 'Transfer')}
          </button>
        </div>
      </div>
      <canvas ref={canvas} className="h-20 w-full rounded-lg" style={{ background: 'rgba(5,7,12,0.85)' }} />
    </div>
  );
}

/**
 * Visualizer for the Limiter ceiling clamp.
 */
function LimiterVisualizer({ ceiling, hue }: { readonly ceiling: number; readonly hue: number }): React.ReactElement {
  const { t } = useLang();
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const box = canvas.current;
    if (!box) return;
    let animId: number;
    let phase = 0;

    const render = () => {
      phase = (phase + 0.05) % (Math.PI * 2);
      const ratio = window.devicePixelRatio || 1;
      const width = box.clientWidth;
      const height = box.clientHeight;
      if (!(width > 0 && height > 0)) {
        animId = requestAnimationFrame(render);
        return;
      }
      box.width = Math.floor(width * ratio);
      box.height = Math.floor(height * ratio);
      const paint = box.getContext('2d');
      if (!paint) return;
      paint.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint.clearRect(0, 0, width, height);

      // Ceiling level line (scaled from ceiling dB: 0 dB is top, -24 dB is lower)
      const maxClamp = Math.pow(10, ceiling / 20);
      const clampY = (height / 2 - 4) * Math.max(0.2, Math.min(1, maxClamp));

      // Upper and lower ceiling lines
      paint.strokeStyle = lit(hue, 0.4);
      paint.setLineDash([4, 4]);
      paint.beginPath();
      paint.moveTo(0, height / 2 - clampY);
      paint.lineTo(width, height / 2 - clampY);
      paint.moveTo(0, height / 2 + clampY);
      paint.lineTo(width, height / 2 + clampY);
      paint.stroke();
      paint.setLineDash([]);

      // Incoming audio waveform with peaks clamped strictly at ceiling
      paint.strokeStyle = lit(hue, 0.95);
      paint.shadowColor = lit(hue, 0.8);
      paint.shadowBlur = 6;
      paint.lineWidth = 2.2;
      paint.beginPath();
      for (let x = 0; x < width; x += 1) {
        const rawWave = Math.sin((x / width) * Math.PI * 4 + phase) * 1.4;
        const clamped = Math.max(-maxClamp, Math.min(maxClamp, rawWave));
        const y = height / 2 - clamped * (height / 2 - 4);
        if (x === 0) paint.moveTo(x, y);
        else paint.lineTo(x, y);
      }
      paint.stroke();
      paint.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [ceiling, hue]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-1">
      <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] font-semibold text-zinc-400">
        <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: lit(hue) }}>
          {t('fx.ceiling', 'Ceiling')} ({ceiling.toFixed(1)} dB)
        </span>
        <span className="text-[9px] text-zinc-400">Peak Limiting Wall</span>
      </div>
      <canvas ref={canvas} className="h-16 w-full rounded-lg" style={{ background: 'rgba(5,7,12,0.85)' }} />
    </div>
  );
}

/**
 * Visualizer for Delay repeats and decay.
 */
function DelayVisualizer({
  time, feedback, mix, hue,
}: {
  readonly time: number;
  readonly feedback: number;
  readonly mix: number;
  readonly hue: number;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const box = canvas.current;
    if (!box) return;
    let animId: number;
    let tick = 0;

    const render = () => {
      tick = (tick + 0.03) % 1;
      const ratio = window.devicePixelRatio || 1;
      const width = box.clientWidth;
      const height = box.clientHeight;
      if (!(width > 0 && height > 0)) {
        animId = requestAnimationFrame(render);
        return;
      }
      box.width = Math.floor(width * ratio);
      box.height = Math.floor(height * ratio);
      const paint = box.getContext('2d');
      if (!paint) return;
      paint.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint.clearRect(0, 0, width, height);

      // Draw primary dry hit and repeating decaying echo taps
      const tapCount = Math.min(6, Math.floor(1 / Math.max(0.05, 1 - feedback)) + 1);
      const spacing = Math.max(24, Math.min(width / 5, time * 65));

      for (let i = 0; i < tapCount; i += 1) {
        const x = 20 + i * spacing;
        if (x > width - 10) break;
        const amplitude = (i === 0 ? 1 : Math.pow(feedback, i) * mix) * (height - 16);
        paint.fillStyle = i === 0 ? '#38bdf8' : lit(hue, Math.max(0.3, Math.pow(feedback, i)));
        paint.shadowColor = lit(hue, 0.7);
        paint.shadowBlur = i === 0 ? 4 : 8;
        paint.beginPath();
        paint.roundRect(x - 2, height / 2 - amplitude / 2, 4, amplitude, 2);
        paint.fill();
      }
      paint.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [time, feedback, mix, hue]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-1">
      <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] font-semibold text-zinc-400">
        <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: lit(hue) }}>
          Echo Repeats ({time.toFixed(2)}s · {(feedback * 100).toFixed(0)}%)
        </span>
      </div>
      <canvas ref={canvas} className="h-14 w-full rounded-lg" style={{ background: 'rgba(5,7,12,0.85)' }} />
    </div>
  );
}

/**
 * Visualizer for Reverb decay envelope.
 */
function ReverbVisualizer({ size, mix, hue }: { readonly size: number; readonly mix: number; readonly hue: number }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const box = canvas.current;
    if (!box) return;
    const ratio = window.devicePixelRatio || 1;
    const width = box.clientWidth;
    const height = box.clientHeight;
    if (!(width > 0 && height > 0)) return;
    box.width = Math.floor(width * ratio);
    box.height = Math.floor(height * ratio);
    const paint = box.getContext('2d');
    if (!paint) return;
    paint.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint.clearRect(0, 0, width, height);

    // Exponential decay envelope
    paint.strokeStyle = lit(hue, 0.9);
    paint.shadowColor = lit(hue, 0.8);
    paint.shadowBlur = 6;
    paint.lineWidth = 2;
    paint.beginPath();
    for (let x = 0; x < width; x += 1) {
      const tNorm = x / width;
      const decay = Math.exp(-tNorm * (6 / Math.max(0.5, size))) * mix;
      const y = height - 4 - decay * (height - 8);
      if (x === 0) paint.moveTo(x, y);
      else paint.lineTo(x, y);
    }
    paint.stroke();
    paint.shadowBlur = 0;

    // Fill wash under decay curve
    paint.lineTo(width, height - 4);
    paint.lineTo(0, height - 4);
    paint.closePath();
    paint.fillStyle = lit(hue, 0.15);
    paint.fill();
  }, [size, mix, hue]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-1">
      <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] font-semibold text-zinc-400">
        <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: lit(hue) }}>
          Plate Diffusion Envelope ({size.toFixed(1)}s Decay)
        </span>
      </div>
      <canvas ref={canvas} className="h-14 w-full rounded-lg" style={{ background: 'rgba(5,7,12,0.85)' }} />
    </div>
  );
}

/**
 * Studio dial with illuminated slider track and high-precision readouts.
 */
function Dial({
  label,
  value,
  min,
  max,
  step,
  unit,
  hue,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit?: string;
  readonly hue: number;
  readonly onChange: (next: number) => void;
}): React.ReactElement {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <label className="flex min-w-[124px] flex-1 flex-col gap-1 rounded-lg border border-white/5 bg-zinc-950/60 p-2 transition-all hover:border-white/10">
      <div className="flex items-baseline justify-between text-[11px]">
        <span style={{ color: INK_DIM }}>{label}</span>
        <span className="font-mono font-bold tabular-nums" style={{ color: lit(hue) }}>
          {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
          {unit ?? ''}
        </span>
      </div>
      <div className="relative flex items-center">
        <div
          className="pointer-events-none absolute h-1.5 rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${lit(hue, 0.4)}, ${lit(hue)})`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
          /* 44 tall, the app's floor for a thumb. It was 28, and nobody had
             measured it because every dial sat inside an effect that starts
             switched off; the voice tuner's is always on the screen. */
          className="h-11 w-full cursor-pointer opacity-90 transition-opacity hover:opacity-100"
          style={{ accentColor: lit(hue) }}
        />
      </div>
    </label>
  );
}

/** One effect: its name, its switch, its picture and its dials. */
function Unit({
  id,
  name,
  what,
  on,
  onToggle,
  children,
}: {
  readonly id: string;
  readonly name: string;
  readonly what: string;
  readonly on: boolean;
  readonly onToggle: () => void;
  readonly children?: React.ReactNode;
}): React.ReactElement {
  const hue = HUES[id] ?? 200;
  const { t } = useLang();
  return (
    <div
      data-fxunit={id}
      className="rounded-2xl p-3.5 transition-all"
      style={{
        background: on ? `hsl(${hue} 55% 45% / 0.07)` : 'rgba(255,255,255,0.025)',
        border: `1px solid ${on ? lit(hue, 0.35) : EDGE}`,
        boxShadow: on ? `0 0 16px -4px hsl(${hue} 85% 62% / 0.12)` : 'none',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full transition-all"
              style={{
                background: on ? lit(hue) : 'rgba(255,255,255,0.2)',
                boxShadow: on ? `0 0 8px ${lit(hue)}` : 'none',
              }}
            />
            <p className="text-sm font-black tracking-wide" style={{ color: on ? lit(hue) : INK }}>
              {name}
            </p>
          </div>
          <p className="pt-0.5 text-[11px] leading-snug" style={{ color: INK_DIM }}>
            {what}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={on}
          className="min-h-[44px] min-w-[54px] shrink-0 rounded-xl px-3 text-xs font-black tracking-wider transition-all"
          style={{
            background: on ? lit(hue, 0.9) : 'rgba(255,255,255,0.08)',
            color: on ? '#05060a' : INK_DIM,
            boxShadow: on ? `0 0 12px ${lit(hue, 0.4)}` : 'none',
          }}
        >
          {on ? t('fx.unitOn', 'ON') : t('fx.unitOff', 'OFF')}
        </button>
      </div>
      {on && <div className="space-y-3 pt-3">{children}</div>}
    </div>
  );
}

/**
 * The one context the EQ drawing asks, made the first time it is needed.
 *
 * This was a live `AudioContext` made on every mount of the rack, and the
 * rack mounts every time a lane is picked or the desk is opened. Browsers
 * limit how many live contexts a page may hold, and each one holds the
 * audio hardware awake, so flicking through lanes could leave the room's
 * own context unable to start. Found on 15 October 2026 (The owner: *"Kyk mooi of elke funksie in …
 * probooth … werk."*). An `OfflineAudioContext` answers
 * `getFrequencyResponse` just the same, never touches the hardware, and one
 * of them serves every rack on the page.
 */
let asker: BaseAudioContext | null = null;
function askingContext(): BaseAudioContext | null {
  if (asker) return asker;
  if (typeof OfflineAudioContext === 'undefined') return null;
  try {
    asker = new OfflineAudioContext(1, 1, 44_100);
  } catch {
    return null;
  }
  return asker;
}

/**
 * AI Studio Presets for One-Click Sound Sculpting.
 */
interface AiPreset {
  id: string;
  nameKey: string;
  nameFallback: string;
  descKey: string;
  descFallback: string;
  icon: string;
  fx: Fx;
}

/** What a playing lane's rack is doing, read every frame: its sound after the chain, and its compressor and limiter. */
export interface LiveRack {
  readonly ear?: AnalyserNode;
  readonly squash?: DynamicsCompressorNode;
  readonly stop?: DynamicsCompressorNode;
}

/**
 * How hard a compressor or the limiter is working, as it plays: the gain it
 * is taking off, read from the node itself every frame, with the deepest of
 * the last second held. Still and saying so when nothing is playing.
 */
function SquashMeter({ read, hue, label }: { readonly read?: () => DynamicsCompressorNode | undefined; readonly hue: number; readonly label: string }): React.ReactElement {
  const bar = useRef<HTMLDivElement | null>(null);
  const hold = useRef<HTMLDivElement | null>(null);
  const said = useRef<HTMLSpanElement | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let frame = 0;
    let peak = 0;
    let peakAt = 0;
    const tick = (now: number): void => {
      const node = read?.();
      const db = node ? Math.max(0, -node.reduction) : 0;
      if (db >= peak || now - peakAt > 1000) { peak = db; peakAt = now; }
      const width = (v: number): string => `${Math.min(100, (v / 24) * 100)}%`;
      if (bar.current) bar.current.style.width = width(db);
      if (hold.current) hold.current.style.left = width(peak);
      if (said.current) said.current.textContent = node ? `−${db.toFixed(1)} dB` : '';
      if (box.current) {
        box.current.dataset.db = db.toFixed(1);
        box.current.dataset.live = node ? 'yes' : 'no';
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [read]);
  return (
    <div ref={box} data-squashmeter className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: INK_DIM }}>
        <span>{label}</span>
        <span ref={said} className="tabular-nums" style={{ color: `hsl(${hue} 90% 70%)` }} />
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div ref={bar} className="absolute inset-y-0 left-0 rounded-full" style={{ width: 0, background: `linear-gradient(90deg, hsl(${hue} 90% 55%), hsl(${(hue + 330) % 360} 90% 60%))`, boxShadow: `0 0 10px hsl(${hue} 90% 55%)` }} />
        <div ref={hold} className="absolute inset-y-0 w-0.5" style={{ left: 0, background: INK }} />
      </div>
    </div>
  );
}

/**
 * The lane's own sound under the EQ line, as it plays: the spectrum after
 * the whole chain, on the same log scale as the line, 20 Hz to 20 kHz.
 */
function LiveSpectrum({ read, hue }: { readonly read?: () => AnalyserNode | undefined; readonly hue: number }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let frame = 0;
    let bins: Uint8Array<ArrayBuffer> | null = null;
    const tick = (): void => {
      const box = canvas.current;
      const ear = read?.();
      if (box) {
        const w = box.clientWidth * devicePixelRatio;
        const h = box.clientHeight * devicePixelRatio;
        if (box.width !== w || box.height !== h) { box.width = w; box.height = h; }
        const g = box.getContext('2d');
        if (g) {
          g.clearRect(0, 0, w, h);
          box.dataset.live = ear ? 'yes' : 'no';
          if (ear) {
            if (!bins || bins.length !== ear.frequencyBinCount) bins = new Uint8Array(ear.frequencyBinCount);
            ear.getByteFrequencyData(bins);
            const nyquist = ear.context.sampleRate / 2;
            const fill = g.createLinearGradient(0, h, 0, 0);
            fill.addColorStop(0, `hsla(${hue}, 90%, 50%, 0.05)`);
            fill.addColorStop(1, `hsla(${hue}, 90%, 65%, 0.55)`);
            g.beginPath();
            g.moveTo(0, h);
            let loud = 0;
            for (let x = 0; x <= w; x += 2) {
              const hz = 20 * 1000 ** (x / w);
              const v = bins[Math.min(bins.length - 1, Math.round((hz / nyquist) * bins.length))] / 255;
              loud = Math.max(loud, v);
              g.lineTo(x, h - v * h);
            }
            g.lineTo(w, h);
            g.closePath();
            g.fillStyle = fill;
            g.fill();
            box.dataset.loud = loud.toFixed(2);
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [read, hue]);
  return <canvas ref={canvas} data-livespectrum aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/** A preset's EQ as a small curve: low, the mid at its frequency, high. */
function EqCurve({ eq }: { readonly eq?: { readonly low: number; readonly mid: number; readonly midHz: number; readonly high: number } }) {
  const y = (db: number): number => 14 - Math.max(-12, Math.min(12, db)) * 1.0;
  const lo = y(eq?.low ?? 0);
  const mid = y(eq?.mid ?? 0);
  const hi = y(eq?.high ?? 0);
  /* Where the mid sits, on a log scale from 100 Hz to 10 kHz. */
  const mx = 10 + 80 * Math.max(0, Math.min(1, Math.log10((eq?.midHz ?? 1000) / 100) / 2));
  return (
    <svg aria-hidden data-eqcurve viewBox="0 0 100 28" className="mb-0.5 h-7 w-full" preserveAspectRatio="none">
      <line x1="0" y1="14" x2="100" y2="14" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <path d={`M0 ${lo} C 10 ${lo}, ${mx - 20} ${mid}, ${mx} ${mid} S 90 ${hi}, 100 ${hi}`} fill="none" stroke="#34d399" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d={`M0 ${lo} C 10 ${lo}, ${mx - 20} ${mid}, ${mx} ${mid} S 90 ${hi}, 100 ${hi} L100 28 L0 28 Z`} fill="rgba(52,211,153,0.15)" />
    </svg>
  );
}

const AI_PRESETS: readonly AiPreset[] = [
  {
    id: 'vocal',
    nameKey: 'fx.preset.vocal',
    nameFallback: 'Crystal Vocal',
    descKey: 'fx.preset.vocalDesc',
    descFallback: 'Silky presence, gentle compression, tape warmth and plate space.',
    icon: '🎙️',
    fx: {
      eq: { low: -2.5, mid: 1.5, midHz: 3200, high: 4.0 },
      compressor: { threshold: -18, ratio: 3.5, attack: 0.012, release: 0.18 },
      saturator: { amount: 0.22 },
      reverb: { size: 1.6, mix: 0.18 },
      limiter: { ceiling: -0.5 },
    },
  },
  {
    id: 'bass',
    nameKey: 'fx.preset.bass',
    nameFallback: 'Punchy Bass',
    descKey: 'fx.preset.bassDesc',
    descFallback: 'Solid low-end boost, punchy attack and subtle drive harmonics.',
    icon: '⚡',
    fx: {
      eq: { low: 5.0, mid: -1.5, midHz: 450, high: -1.0 },
      compressor: { threshold: -22, ratio: 5.0, attack: 0.025, release: 0.12 },
      saturator: { amount: 0.40 },
    },
  },
  {
    id: 'warmth',
    nameKey: 'fx.preset.warmth',
    nameFallback: 'Analog Warmth',
    descKey: 'fx.preset.warmthDesc',
    descFallback: 'Warm tape and tube saturation with classic tone balance.',
    icon: '🎸',
    fx: {
      saturator: { amount: 0.58 },
      compressor: { threshold: -14, ratio: 2.5, attack: 0.03, release: 0.25 },
      eq: { low: 2.0, mid: 1.0, midHz: 800, high: -1.0 },
    },
  },
  {
    id: 'ambient',
    nameKey: 'fx.preset.ambient',
    nameFallback: 'Dreamy Dimension',
    descKey: 'fx.preset.ambientDesc',
    descFallback: 'Stereo chorus shimmer, tape echo repeats and expansive reverb.',
    icon: '🌌',
    fx: {
      chorus: { rate: 0.9, depth: 0.52 },
      delay: { time: 0.36, feedback: 0.48, mix: 0.32 },
      reverb: { size: 3.8, mix: 0.38 },
      eq: { low: -1.5, mid: 0, midHz: 1000, high: 2.5 },
    },
  },
  {
    id: 'cyberLofi',
    nameKey: 'fx.preset.cyberLofi',
    nameFallback: 'Cyber Lo-Fi',
    descKey: 'fx.preset.cyberLofiDesc',
    descFallback: '10-bit crunch, wave folding and tape flutter pulse.',
    icon: '📻',
    fx: {
      crusher: { bits: 10 },
      saturator: { amount: 0.45 },
      folder: { amount: 0.18 },
      tremolo: { rate: 0.5, depth: 0.22 },
      eq: { low: -2.0, mid: 2.5, midHz: 1200, high: -4.5 },
    },
  },
  {
    id: 'master',
    nameKey: 'fx.preset.master',
    nameFallback: 'Pristine Master',
    descKey: 'fx.preset.masterDesc',
    descFallback: 'Glue bus compression, transparent ceiling limiter and balanced EQ.',
    icon: '🛡️',
    fx: {
      eq: { low: 0.5, mid: 0.5, midHz: 2500, high: 1.0 },
      compressor: { threshold: -10, ratio: 2.0, attack: 0.04, release: 0.3 },
      limiter: { ceiling: -0.2 },
      utility: { trim: 0, flip: false, mono: false },
    },
  },
];

export default function BoothFx({
  fx,
  onChange,
  onWhole,
  onTune,
  tuning = null,
  keyRoot = 0,
  live,
}: {
  readonly fx: Fx;
  readonly onChange: (next: Fx) => void;
  /** Tune this lane's voice — a press that rewrites the lane (`lib/tuner.ts`). */
  readonly onTune?: (how: TuneHow) => void;
  /** How far a tuning has got, 0 to 1, or null when none is running. */
  readonly tuning?: number | null;
  /** The song's key, 0 for C, so the tuner starts in it. */
  readonly keyRoot?: number;
  /**
   * Told before a press that replaces the whole rack — a preset, or Reset.
   *
   * A dial is put back by the dial, which is why the room does not put each
   * nudge on its undo stack. A preset or a reset is not: it throws away
   * every setting at once, and there is no control that puts eleven of them
   * back. So the room remembers first, named by what is about to happen.
   */
  readonly onWhole?: (what: 'preset' | 'reset') => void;
  /** What this lane's rack is doing while it plays, for the live meters. */
  readonly live?: () => LiveRack;
}): React.ReactElement {
  const { t } = useLang();
  const readEar = React.useCallback(() => live?.().ear, [live]);
  const readSquash = React.useCallback(() => live?.().squash, [live]);
  const readStop = React.useCallback(() => live?.().stop, [live]);

  /* A context purely to ask the biquads what they do — `responseOf` reads
     the filters' maths, which does not need a running graph. One for the
     whole page, and offline: see `askingContext` above. */
  const asking = askingContext();

  const set = <K extends keyof Fx>(key: K, value: Fx[K]): void => {
    const next = { ...fx };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onChange(next);
  };
  const toggle = <K extends keyof Fx>(key: K, fallback: Fx[K]): void =>
    set(key, fx[key] ? undefined : fallback);

  /* The EQ's real response, in decibels, across the audible band. Asked of
     the nodes rather than drawn from the dials — three filters in series
     interact and only they know by how much. */
  const eqLine = useMemo(() => {
    if (!asking || !fx.eq) return null;
    const hz = new Float32Array(new ArrayBuffer(160 * 4));
    for (let i = 0; i < hz.length; i += 1) hz[i] = 20 * Math.pow(1000, i / (hz.length - 1));
    const gain = responseOf(asking, fx.eq, hz);
    /* Scaled so ±18 dB fills the box, which is the range the dials offer. */
    return Array.from(gain, (one) => Math.max(-1, Math.min(1, (20 * Math.log10(one || 1e-6)) / 18)));
  }, [asking, fx.eq]);

  const eq: EqSettings = fx.eq ?? FX_DEFAULTS.eq;
  const [tuneHow, setTuneHow] = useState<TuneHow>({ ...TUNE_DEFAULT, root: keyRoot, scale: 'major' });

  return (
    <div className="space-y-3 px-4 pb-4" style={{ background: PANEL }}>
      {/* ── Sound Sculptor presets: fixed settings, no AI is called ──── */}
      <div className="rounded-2xl border border-sky-500/30 bg-linear-to-br from-sky-950/40 via-zinc-950 to-cyan-950/30 p-3.5 shadow-lg shadow-sky-950/20">
        <div className="flex items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-sky-300">
                {t('fx.aiSculpt', 'Sound Sculptor presets')}
              </p>
              <p className="text-[11px] leading-tight text-sky-400/70">
                {t('fx.aiSculptWhat', 'One-click studio presets to sculpt tone, warmth, dynamics and space.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onWhole?.('reset'); onChange({}); }}
            className="flex h-[44px] items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-900/80 px-2.5 text-[11px] font-bold text-zinc-300 transition-all hover:bg-zinc-800"
            title={t('fx.preset.reset', 'Reset Rack')}
          >
            <RefreshCw className="h-3 w-3" />
            {t('fx.preset.reset', 'Reset Rack')}
          </button>
        </div>

        {/* AI Presets Pill Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
          {AI_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => { onWhole?.('preset'); onChange({ ...preset.fx }); }}
              data-tidycard=""
              className="flex min-h-[44px] min-w-0 flex-col items-start justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 px-2 py-1 text-left transition-all hover:border-sky-500/50 hover:bg-sky-950/30 active:scale-[0.98]"
            >
              {/* What it does to the sound, drawn: its EQ as a curve. */}
              <EqCurve eq={preset.fx.eq} />
              <span className="flex items-center gap-1.5 text-xs font-black text-zinc-100">
                <span>{preset.icon}</span>
                <span className="truncate">{t(preset.nameKey, preset.nameFallback)}</span>
              </span>
              <span className="line-clamp-1 text-[10px] text-zinc-400">
                {t(preset.descKey, preset.descFallback)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── What this rack is, and what it is not ────────────────────
          Named rather than quietly absent. Somebody who came looking for a
          gate should find out in a second that it is not here, instead of
          opening eleven panels to be sure. */}
      <p className="pt-1 text-[11px] leading-snug" style={{ color: INK_DIM }}>
        {t(
          'fx.whatIsHere',
          'Everything here is in the file as well as in your ears — the mixdown renders the same chain. The voice tuner rewrites the lane itself when you press it, and Undo puts it back. The pedals and the amp below are built in; an amp capture of your own goes on the lane itself, under Track controls.',
        )}
      </p>

      {/* ── The pedalboard: rigs, three drives and an amp ──────────────
          The owner, 22 October 2026: *"ons moet ons eie pedals, en amp
          modellers iewers kry."* Built here from the same nodes as the rest
          of the rack, so they need nobody's capture and nobody's account
          (`lib/pedals.ts`). A rig sets the whole board at once; every dial
          is then the rack's own. */}
      <div data-pedalboard className="rounded-2xl border p-3.5" style={{ borderColor: lit(HUES.amp, 0.35), background: 'rgba(255,255,255,0.02)' }}>
        <p className="text-xs font-black uppercase tracking-wider" style={{ color: lit(HUES.amp) }}>
          {t('rig.title', 'Guitar and bass rigs')}
        </p>
        <p className="pb-2 text-[11px] leading-snug" style={{ color: INK_DIM }}>
          {t('rig.what', 'A whole pedalboard and amp in one press. Built into the booth: no capture to download and no credits.')}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-rigs>
          {RIGS.map((rig) => (
            <button
              key={rig.id}
              type="button"
              data-rig={rig.id}
              /* Two lines, the rig and what it sounds like: a card, like
                 the hum voices above, not a one-line bar. */
              data-tidycard=""
              onClick={() => { onWhole?.('preset'); onChange({ ...rig.fx }); }}
              className="flex min-h-[44px] min-w-0 flex-col items-start justify-center rounded-xl border border-white/10 bg-zinc-900/60 px-2.5 py-1.5 text-left transition-all hover:border-amber-400/50"
            >
              <span className="truncate text-xs font-black text-zinc-100">{t(rig.says[0], rig.says[1])}</span>
              <span className="line-clamp-2 text-[10px] leading-snug text-zinc-400">{t(rig.what[0], rig.what[1])}</span>
            </button>
          ))}
        </div>
      </div>

      {([
        ['overdrive', t('fx.overdrive', 'Overdrive'), t('fx.overdriveWhat', 'Breaks up in the middle and stays tight in the low end. In front of an amp it pushes it; on its own it is a warm crunch.')],
        ['distortion', t('fx.distortion', 'Distortion'), t('fx.distortionWhat', 'Harder and squarer than the overdrive, with more sustain. The rock pedal.')],
        ['fuzz', t('fx.fuzz', 'Fuzz'), t('fx.fuzzWhat', 'The oldest and roughest: huge gain, a lopsided clip and the middle scooped out.')],
      ] as const).map(([kind, name, what]) => {
        const settings = fx[kind] ?? PEDAL_DEFAULTS[kind];
        const setDrive = (next: Partial<typeof settings>): void => set(kind, { ...settings, ...next });
        return (
          <Unit key={kind} id={kind} name={name} what={what} on={Boolean(fx[kind])}
            onToggle={() => toggle(kind, PEDAL_DEFAULTS[kind])}>
            <Bend points={driveCurve(kind as DriveKind, settings.drive)} hue={HUES[kind]} unitId={name} />
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Dial label={t('fx.driveAmount', 'Drive')} value={settings.drive} min={0} max={1} step={0.01} hue={HUES[kind]}
                onChange={(drive) => setDrive({ drive })} />
              <Dial label={t('fx.driveTone', 'Tone')} value={settings.tone} min={0} max={1} step={0.01} hue={HUES[kind]}
                onChange={(tone) => setDrive({ tone })} />
              <Dial label={t('fx.trim', 'Level')} value={settings.level} min={-24} max={12} step={0.5} unit=" dB" hue={HUES[kind]}
                onChange={(level) => setDrive({ level })} />
            </div>
          </Unit>
        );
      })}

      {(() => {
        const amp = fx.amp ?? PEDAL_DEFAULTS.amp;
        const setAmp = (next: Partial<typeof amp>): void => set('amp', { ...amp, ...next });
        const voices: readonly [AmpVoice, string][] = [
          ['clean', t('amp.clean', 'Clean')],
          ['crunch', t('amp.crunch', 'Crunch')],
          ['lead', t('amp.lead', 'Lead')],
        ];
        const cabs: readonly [Cabinet, string][] = [
          ['none', t('amp.noCab', 'No cabinet')],
          ['open', t('amp.openCab', 'Open 1×12')],
          ['closed', t('amp.closedCab', 'Closed 4×12')],
        ];
        const stages = amp.voice === 'clean' ? 1 : amp.voice === 'crunch' ? 2 : 3;
        return (
          <Unit id="amp" name={t('fx.amp', 'Amp')} what={t('fx.ampWhat', 'A valve amp in the booth: one, two or three gain stages, bass, middle and treble, presence, and a speaker cabinet. No capture needed.')}
            on={Boolean(fx.amp)} onToggle={() => toggle('amp', PEDAL_DEFAULTS.amp)}>
            <Bend points={valveCurve(1 + amp.gain * 6 * stages)} hue={HUES.amp} unitId="Amp" />
            {([['voice', voices], ['cabinet', cabs]] as const).map(([field, list]) => (
              <div key={field} className="grid grid-cols-3 gap-1.5" role="group" data-ampchoice={field}>
                {list.map(([id, label]) => {
                  const on = amp[field] === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAmp({ [field]: id } as Partial<typeof amp>)}
                      className="min-h-[44px] rounded-xl border px-2 text-xs font-bold"
                      style={on
                        ? { borderColor: lit(HUES.amp), background: lit(HUES.amp, 0.18), color: INK }
                        : { borderColor: EDGE, color: INK_DIM }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Dial label={t('amp.gain', 'Gain')} value={amp.gain} min={0} max={1} step={0.01} hue={HUES.amp} onChange={(gain) => setAmp({ gain })} />
              <Dial label={t('amp.bass', 'Bass')} value={amp.bass} min={0} max={1} step={0.01} hue={HUES.amp} onChange={(bass) => setAmp({ bass })} />
              <Dial label={t('fx.mid', 'Middle')} value={amp.mid} min={0} max={1} step={0.01} hue={HUES.amp} onChange={(mid) => setAmp({ mid })} />
              <Dial label={t('amp.treble', 'Treble')} value={amp.treble} min={0} max={1} step={0.01} hue={HUES.amp} onChange={(treble) => setAmp({ treble })} />
              <Dial label={t('amp.presence', 'Presence')} value={amp.presence} min={0} max={1} step={0.01} hue={HUES.amp} onChange={(presence) => setAmp({ presence })} />
              <Dial label={t('amp.master', 'Master')} value={amp.master} min={-24} max={12} step={0.5} unit=" dB" hue={HUES.amp} onChange={(master) => setAmp({ master })} />
            </div>
          </Unit>
        );
      })()}

      {/* 0. Gate — first on the desk, as on any desk. */}
      <Unit
        id="gate"
        name={t('fx.gate', 'Gate')}
        what={t('fx.gateWhat', 'Shuts the lane when it goes quiet, so the hiss, the breathing and the room between the lines are gone. The line is how much of each level gets through.')}
        on={Boolean(fx.gate)}
        onToggle={() => toggle('gate', FX_DEFAULTS.gate)}
      >
        <Bend points={gateLine((fx.gate ?? FX_DEFAULTS.gate).threshold)} hue={HUES.gate} unitId="Gate" />
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={t('fx.gateBelow', 'Shut below')} value={(fx.gate ?? FX_DEFAULTS.gate).threshold}
            min={-70} max={-10} step={1} unit=" dB" hue={HUES.gate}
            onChange={(threshold) => set('gate', { ...(fx.gate ?? FX_DEFAULTS.gate), threshold })} />
          <Dial label={t('fx.gateSpeed', 'How fast')} value={(fx.gate ?? FX_DEFAULTS.gate).speed}
            min={0.005} max={0.2} step={0.005} unit=" s" hue={HUES.gate}
            onChange={(speed) => set('gate', { ...(fx.gate ?? FX_DEFAULTS.gate), speed })} />
        </div>
      </Unit>

      {/* 1. EQ */}
      <Unit
        id="eq"
        name={t('fx.eq', 'EQ')}
        what={t('fx.eqWhat', 'Turn the bottom, the middle or the top of this lane up or down. The line is what the three filters really do together.')}
        on={Boolean(fx.eq)}
        onToggle={() => toggle('eq', FX_DEFAULTS.eq)}
      >
        {eqLine && (
          <div className="relative">
            <LiveSpectrum read={readEar} hue={HUES.eq} />
            <Bend points={eqLine} hue={HUES.eq} diagonal={false} unitId="EQ Filter Response" />
          </div>
        )}
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={t('fx.low', 'Low')} value={eq.low} min={-18} max={18} step={0.5} unit=" dB" hue={HUES.eq}
            onChange={(low) => set('eq', { ...eq, low })} />
          <Dial label={t('fx.mid', 'Middle')} value={eq.mid} min={-18} max={18} step={0.5} unit=" dB" hue={HUES.eq}
            onChange={(mid) => set('eq', { ...eq, mid })} />
          <Dial label={t('fx.midHz', 'Middle at')} value={eq.midHz} min={200} max={6000} step={10} unit=" Hz" hue={HUES.eq}
            onChange={(midHz) => set('eq', { ...eq, midHz })} />
          <Dial label={t('fx.high', 'Top')} value={eq.high} min={-18} max={18} step={0.5} unit=" dB" hue={HUES.eq}
            onChange={(high) => set('eq', { ...eq, high })} />
        </div>
      </Unit>

      {/* 2. Saturator & Folder */}
      {([
        ['saturator', t('fx.saturator', 'Saturator'), t('fx.saturatorWhat', 'Warms it up by rounding the loud parts, the way tape and valves do. The curve is the bend.')],
        ['folder', t('fx.folder', 'Wave folder'), t('fx.folderWhat', 'Folds the peaks back on themselves instead of flattening them. Strange and metallic, not like distortion.')],
      ] as const).map(([id, name, what]) => {
        const settings = fx[id];
        return (
          <Unit key={id} id={id} name={name} what={what} on={Boolean(settings)}
            onToggle={() => toggle(id, FX_DEFAULTS[id])}>
            <Bend points={curveOf(id, (settings ?? FX_DEFAULTS[id]).amount)} hue={HUES[id]} unitId={name} />
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Dial label={t('fx.amount', 'Amount')} value={(settings ?? FX_DEFAULTS[id]).amount}
                min={0} max={1} step={0.01} hue={HUES[id]}
                onChange={(amount) => set(id, { amount })} />
            </div>
          </Unit>
        );
      })}

      {/* 3. Bit Crusher */}
      <Unit
        id="crusher"
        name={t('fx.crusher', 'Bit crusher')}
        what={t('fx.crusherWhat', 'Throws away detail in steps, like an old sampler. Bit depth only — the sample rate is left alone.')}
        on={Boolean(fx.crusher)}
        onToggle={() => toggle('crusher', FX_DEFAULTS.crusher)}
      >
        <Bend points={curveOf('crusher', (fx.crusher ?? FX_DEFAULTS.crusher).bits)} hue={HUES.crusher} unitId="Bit Depth Quantizer" />
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={t('fx.bits', 'Bits')} value={(fx.crusher ?? FX_DEFAULTS.crusher).bits}
            min={2} max={16} step={1} hue={HUES.crusher}
            onChange={(bits) => set('crusher', { bits })} />
        </div>
      </Unit>

      {/* 4. Compressor */}
      <Unit
        id="compressor"
        name={t('fx.compressor', 'Compressor')}
        what={t('fx.compressorWhat', 'Holds the loud parts back so the quiet ones can come up. The line shows how much of what goes in comes out.')}
        on={Boolean(fx.compressor)}
        onToggle={() => toggle('compressor', FX_DEFAULTS.compressor)}
      >
        <Bend points={squashLine(fx.compressor ?? FX_DEFAULTS.compressor)} hue={HUES.compressor} unitId="Dynamic Transfer" />
        <SquashMeter read={readSquash} hue={HUES.compressor} label={t('fx.squashNow', 'Holding back now')} />
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={t('fx.threshold', 'Above')} value={(fx.compressor ?? FX_DEFAULTS.compressor).threshold}
            min={-60} max={0} step={1} unit=" dB" hue={HUES.compressor}
            onChange={(threshold) => set('compressor', { ...(fx.compressor ?? FX_DEFAULTS.compressor), threshold })} />
          <Dial label={t('fx.ratio', 'Hold back')} value={(fx.compressor ?? FX_DEFAULTS.compressor).ratio}
            min={1} max={20} step={0.5} unit=":1" hue={HUES.compressor}
            onChange={(ratio) => set('compressor', { ...(fx.compressor ?? FX_DEFAULTS.compressor), ratio })} />
          <Dial label={t('fx.attack', 'How fast')} value={(fx.compressor ?? FX_DEFAULTS.compressor).attack}
            min={0.001} max={0.5} step={0.001} unit=" s" hue={HUES.compressor}
            onChange={(attack) => set('compressor', { ...(fx.compressor ?? FX_DEFAULTS.compressor), attack })} />
          <Dial label={t('fx.release', 'How long')} value={(fx.compressor ?? FX_DEFAULTS.compressor).release}
            min={0.02} max={2} step={0.01} unit=" s" hue={HUES.compressor}
            onChange={(release) => set('compressor', { ...(fx.compressor ?? FX_DEFAULTS.compressor), release })} />
        </div>
      </Unit>

      {/* 5. Limiter */}
      <Unit
        id="limiter"
        name={t('fx.limiter', 'Limiter')}
        what={t('fx.limiterWhat', 'A ceiling nothing goes over. It is a fast compressor held at 20:1 — not a look-ahead brickwall, which is a different thing.')}
        on={Boolean(fx.limiter)}
        onToggle={() => toggle('limiter', FX_DEFAULTS.limiter)}
      >
        <LimiterVisualizer ceiling={(fx.limiter ?? FX_DEFAULTS.limiter).ceiling} hue={HUES.limiter} />
        <SquashMeter read={readStop} hue={HUES.limiter} label={t('fx.stopNow', 'Catching now')} />
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={t('fx.ceiling', 'Ceiling')} value={(fx.limiter ?? FX_DEFAULTS.limiter).ceiling}
            min={-24} max={0} step={0.5} unit=" dB" hue={HUES.limiter}
            onChange={(ceiling) => set('limiter', { ceiling })} />
        </div>
      </Unit>

      {/* 6. Delay */}
      <Unit
        id="delay"
        name={t('fx.delay', 'Delay')}
        what={t('fx.delayWhat', 'An echo that repeats and fades. Mixed in beside the dry sound, so turning it up does not turn the lane down.')}
        on={Boolean(fx.delay)}
        onToggle={() => toggle('delay', FX_DEFAULTS.delay)}
      >
        <DelayVisualizer
          time={(fx.delay ?? FX_DEFAULTS.delay).time}
          feedback={(fx.delay ?? FX_DEFAULTS.delay).feedback}
          mix={(fx.delay ?? FX_DEFAULTS.delay).mix}
          hue={HUES.delay}
        />
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={t('fx.time', 'Every')} value={(fx.delay ?? FX_DEFAULTS.delay).time}
            min={0.02} max={2} step={0.01} unit=" s" hue={HUES.delay}
            onChange={(time) => set('delay', { ...(fx.delay ?? FX_DEFAULTS.delay), time })} />
          <Dial label={t('fx.feedback', 'Repeats')} value={(fx.delay ?? FX_DEFAULTS.delay).feedback}
            min={0} max={0.9} step={0.01} hue={HUES.delay}
            onChange={(feedback) => set('delay', { ...(fx.delay ?? FX_DEFAULTS.delay), feedback })} />
          <Dial label={t('fx.mix', 'How much')} value={(fx.delay ?? FX_DEFAULTS.delay).mix}
            min={0} max={1} step={0.01} hue={HUES.delay}
            onChange={(mix) => set('delay', { ...(fx.delay ?? FX_DEFAULTS.delay), mix })} />
        </div>
      </Unit>

      {/* 7. Reverb */}
      <Unit
        id="reverb"
        name={t('fx.reverb', 'Reverb')}
        what={t('fx.reverbWhat', 'Puts it in a room. A generated one, so it sounds like a plate rather than a cathedral.')}
        on={Boolean(fx.reverb)}
        onToggle={() => toggle('reverb', FX_DEFAULTS.reverb)}
      >
        <ReverbVisualizer
          size={(fx.reverb ?? FX_DEFAULTS.reverb).size}
          mix={(fx.reverb ?? FX_DEFAULTS.reverb).mix}
          hue={HUES.reverb}
        />
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={t('fx.size', 'Room')} value={(fx.reverb ?? FX_DEFAULTS.reverb).size}
            min={0.2} max={6} step={0.1} unit=" s" hue={HUES.reverb}
            onChange={(size) => set('reverb', { ...(fx.reverb ?? FX_DEFAULTS.reverb), size })} />
          <Dial label={t('fx.mix', 'How much')} value={(fx.reverb ?? FX_DEFAULTS.reverb).mix}
            min={0} max={1} step={0.01} hue={HUES.reverb}
            onChange={(mix) => set('reverb', { ...(fx.reverb ?? FX_DEFAULTS.reverb), mix })} />
        </div>
      </Unit>

      {/* 8. Tremolo & Chorus */}
      {([
        ['tremolo', t('fx.tremolo', 'Tremolo'), t('fx.tremoloWhat', 'Pulses the volume up and down. The line is one cycle of the pulse.')],
        ['chorus', t('fx.chorus', 'Chorus'), t('fx.chorusWhat', 'Doubles it against a copy of itself that drifts, so one voice sounds like two.')],
      ] as const).map(([id, name, what]) => {
        const settings = fx[id] ?? FX_DEFAULTS[id];
        return (
          <Unit key={id} id={id} name={name} what={what} on={Boolean(fx[id])}
            onToggle={() => toggle(id, FX_DEFAULTS[id])}>
            <Bend points={wobbleLine(settings.depth)} hue={HUES[id]} diagonal={false} unitId={name} />
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Dial label={t('fx.rate', 'Speed')} value={settings.rate} min={0.1} max={12} step={0.1} unit=" Hz" hue={HUES[id]}
                onChange={(rate) => set(id, { ...settings, rate })} />
              <Dial label={t('fx.depth', 'Depth')} value={settings.depth} min={0} max={1} step={0.01} hue={HUES[id]}
                onChange={(depth) => set(id, { ...settings, depth })} />
            </div>
          </Unit>
        );
      })}

      {/* Flanger and phaser: the two sweeping ones a pedalboard has. */}
      {([
        ['flanger', t('fx.flanger', 'Flanger'), t('fx.flangerWhat', 'A jet-plane sweep: a very short echo that slides, mixed back with the sound.')],
        ['phaser', t('fx.phaser', 'Phaser'), t('fx.phaserWhat', 'A slow, liquid swirl: notches that move up and down through the sound.')],
      ] as const).map(([id, name, what]) => {
        const settings = fx[id] ?? PEDAL_DEFAULTS[id];
        const setSweep = (next: Partial<typeof settings>): void => set(id, { ...settings, ...next });
        return (
          <Unit key={id} id={id} name={name} what={what} on={Boolean(fx[id])}
            onToggle={() => toggle(id, PEDAL_DEFAULTS[id])}>
            <Bend points={wobbleLine(settings.depth)} hue={HUES[id]} diagonal={false} unitId={name} />
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Dial label={t('fx.rate', 'Speed')} value={settings.rate} min={0.05} max={5} step={0.05} unit=" Hz" hue={HUES[id]}
                onChange={(rate) => setSweep({ rate })} />
              <Dial label={t('fx.depth', 'Depth')} value={settings.depth} min={0} max={1} step={0.01} hue={HUES[id]}
                onChange={(depth) => setSweep({ depth })} />
              <Dial label={t('fx.feedback', 'Repeats')} value={settings.feedback} min={0} max={0.85} step={0.01} hue={HUES[id]}
                onChange={(feedback) => setSweep({ feedback })} />
              <Dial label={t('fx.mix', 'How much')} value={settings.mix} min={0} max={1} step={0.01} hue={HUES[id]}
                onChange={(mix) => setSweep({ mix })} />
            </div>
          </Unit>
        );
      })}

      {/* 9. Vocoder */}
      <Unit
        id="vocoder"
        name={t('fx.vocoder', 'Vocoder')}
        what={t('fx.vocoderWhat', 'Your voice speaks through a synth chord — the robot voice. The voice shapes the words and the chord sings the notes.')}
        on={Boolean(fx.vocoder)}
        onToggle={() => toggle('vocoder', FX_DEFAULTS.vocoder)}
      >
        <Bend points={sawLine()} hue={HUES.vocoder} diagonal={false} unitId="Vocoder" />
        <div className="flex flex-wrap gap-2 pt-1" data-vocoderchords>
          {(Object.keys(VOCODER_CHORDS) as VocoderChord[]).map((chord) => {
            const now = fx.vocoder ?? FX_DEFAULTS.vocoder;
            const says = {
              one: t('fx.chordOne', 'One note'),
              fifth: t('fx.chordFifth', 'Power'),
              triad: t('fx.chordMajor', 'Major'),
              minor: t('fx.chordMinor', 'Minor'),
            }[chord];
            return (
              <button
                key={chord}
                type="button"
                aria-pressed={now.chord === chord}
                onClick={() => set('vocoder', { ...now, chord })}
                className="min-h-[44px] flex-1 rounded-xl border px-3 text-xs font-bold"
                style={now.chord === chord
                  ? { borderColor: lit(HUES.vocoder), background: lit(HUES.vocoder, 0.18), color: INK }
                  : { borderColor: EDGE, color: INK_DIM }}
              >
                {says}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2.5 pt-1">
          <Dial label={`${t('fx.vocoderNote', 'On the note')} · ${noteName((fx.vocoder ?? FX_DEFAULTS.vocoder).note)}`}
            value={(fx.vocoder ?? FX_DEFAULTS.vocoder).note}
            min={36} max={72} step={1} hue={HUES.vocoder}
            onChange={(note) => set('vocoder', { ...(fx.vocoder ?? FX_DEFAULTS.vocoder), note })} />
          <Dial label={t('fx.mix', 'How much')} value={(fx.vocoder ?? FX_DEFAULTS.vocoder).mix}
            min={0} max={1} step={0.01} hue={HUES.vocoder}
            onChange={(mix) => set('vocoder', { ...(fx.vocoder ?? FX_DEFAULTS.vocoder), mix })} />
        </div>
      </Unit>

      {/* 10. Voice tuner — a press, not a switch: it rewrites the lane. */}
      {onTune && (
        <div
          data-voicetuner
          className="rounded-2xl p-3.5"
          style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${lit(HUES.tuner, 0.35)}` }}
        >
          <p className="text-sm font-black" style={{ color: INK }}>{t('fx.tuner', 'Voice tuner')}</p>
          <p className="pt-0.5 text-xs leading-snug" style={{ color: INK_DIM }}>
            {t('fx.tunerWhat', 'Pulls every sung note onto the notes of the key. Done on this phone, no credits. It rewrites the lane, so press Undo to hear it as it was.')}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <label className="flex flex-col gap-1 text-[11px]" style={{ color: INK_DIM }}>
              {t('fx.tunerKey', 'Key')}
              <select
                data-tunerkey
                value={tuneHow.root}
                onChange={(event) => setTuneHow((was) => ({ ...was, root: Number(event.target.value) }))}
                disabled={tuneHow.scale === 'chromatic'}
                className="min-h-[44px] rounded-xl border bg-zinc-950 px-2 text-sm font-bold disabled:opacity-40"
                style={{ borderColor: EDGE, color: INK }}
              >
                {NOTE_NAMES.map((name, at) => <option key={name} value={at}>{name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px]" style={{ color: INK_DIM }}>
              {t('fx.tunerScale', 'Notes')}
              <select
                data-tunerscale
                value={tuneHow.scale}
                onChange={(event) => setTuneHow((was) => ({ ...was, scale: event.target.value as TuneScale }))}
                className="min-h-[44px] rounded-xl border bg-zinc-950 px-2 text-sm font-bold"
                style={{ borderColor: EDGE, color: INK }}
              >
                <option value="major">{t('fx.scaleMajor', 'Major')}</option>
                <option value="minor">{t('fx.scaleMinor', 'Minor')}</option>
                <option value="chromatic">{t('fx.scaleAll', 'Every note')}</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Dial label={t('fx.tunerStrength', 'How hard')} value={tuneHow.strength}
              min={0.1} max={1} step={0.05} hue={HUES.tuner}
              onChange={(strength) => setTuneHow((was) => ({ ...was, strength }))} />
          </div>
          <button
            type="button"
            data-tunelane
            disabled={tuning !== null}
            onClick={() => onTune(tuneHow)}
            className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border text-sm font-black disabled:opacity-60"
            style={{ borderColor: lit(HUES.tuner), background: lit(HUES.tuner, 0.16), color: INK }}
          >
            <Wand2 className="h-4 w-4" />
            {tuning !== null
              ? `${t('fx.tuning', 'Tuning')}… ${Math.round(tuning * 100)}%`
              : t('fx.tuneLane', 'Tune this lane')}
          </button>
        </div>
      )}

      {/* 11. Utility */}
      <Unit
        id="utility"
        name={t('fx.utility', 'Utility')}
        what={t('fx.utilityWhat', 'Level, upside-down, and both sides into one. Boring and the most used thing on any desk.')}
        on={Boolean(fx.utility)}
        onToggle={() => toggle('utility', FX_DEFAULTS.utility)}
      >
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Dial label={t('fx.trim', 'Level')} value={(fx.utility ?? FX_DEFAULTS.utility).trim}
            min={-24} max={24} step={0.5} unit=" dB" hue={HUES.utility}
            onChange={(trim) => set('utility', { ...(fx.utility ?? FX_DEFAULTS.utility), trim })} />
          {([
            ['flip', t('fx.flip', 'Upside down')],
            ['mono', t('fx.mono', 'Both sides as one')],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/5 bg-zinc-950/60 px-3 text-[11px] font-semibold" style={{ color: INK_DIM }}>
              <input
                type="checkbox"
                checked={(fx.utility ?? FX_DEFAULTS.utility)[key]}
                onChange={(event) =>
                  set('utility', { ...(fx.utility ?? FX_DEFAULTS.utility), [key]: event.target.checked })
                }
                style={{ accentColor: lit(HUES.utility) }}
              />
              {label}
            </label>
          ))}
        </div>
      </Unit>
    </div>
  );
}

/**
 * The compressor's transfer line: what goes in against what comes out.
 *
 * The one thing about a compressor that does NOT depend on the sound going
 * into it — the attack and the release do, and no still picture can show
 * them. Drawn in decibels and mapped back to −1..1 so it sits in the same
 * box as the waveshapers: a straight diagonal is no compression, and the
 * bend is where the threshold is.
 */
function squashLine(settings: { threshold: number; ratio: number }): number[] {
  const out: number[] = [];
  for (let i = 0; i < 128; i += 1) {
    const inDb = -60 + (i / 127) * 60;
    const over = inDb - settings.threshold;
    const outDb = over > 0 ? settings.threshold + over / settings.ratio : inDb;
    out.push((outDb + 60) / 60 * 2 - 1);
  }
  return out;
}

/**
 * The gate's line: what goes in against what comes out, in decibels, drawn
 * from `gateOpen` — the same numbers the gate's curve is made of.
 */
function gateLine(threshold: number): number[] {
  const out: number[] = [];
  const level = Math.pow(10, threshold / 20);
  for (let i = 0; i < 128; i += 1) {
    const inDb = -80 + (i / 127) * 80;
    const open = gateOpen(Math.pow(10, inDb / 20), level);
    const outDb = open > 0 ? Math.max(-80, inDb + 20 * Math.log10(open)) : -80;
    out.push(((outDb + 80) / 80) * 2 - 1);
  }
  return out;
}

/** Three cycles of the sawtooth the vocoder's chord is made of. */
function sawLine(): number[] {
  const out: number[] = [];
  for (let i = 0; i < 128; i += 1) out.push(((i * 3) / 127 % 1) * 1.6 - 0.8);
  return out;
}

/** One cycle of a tremolo or chorus wobble, at the depth that is set. */
function wobbleLine(depth: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 128; i += 1) {
    out.push(Math.sin((i / 127) * Math.PI * 4) * depth);
  }
  return out;
}

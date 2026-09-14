'use client';

/**
 * The effect rack, with a picture of what each one is doing to the sound.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"As hierdie funksies kleurvolle visualizers kon
 * hê om te wys hoe buig die klankbaan sou dit baie help."*
 *
 * Literally: to show how the sound is bent. For the three waveshapers that
 * is not a metaphor — `curveOf` in `lib/fx.ts` returns the exact array handed
 * to the `WaveShaperNode`, and this draws that array. The picture IS the
 * function. For the EQ, `responseOf` asks the biquads themselves what they
 * do, so three filters that overlap are drawn overlapping rather than as
 * three tidy bumps somebody imagined.
 *
 * Nothing in here is an artist's impression. Where an effect cannot be drawn
 * honestly — a compressor's behaviour depends on the sound going into it, not
 * only on its dials — what is drawn is the transfer line it applies, which is
 * the part that IS fixed, and the panel says what the line means.
 *
 * ── Why the colours are literals ────────────────────────────────────────
 *
 * The booth does not follow the theme, on purpose:  *"die booth se swart met
 * die blou musieklyn sal 'n unieke take wees vir die booth."* `check:boothline`
 * holds that rule for the timeline and the same applies here.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  curveOf, responseOf, FX_DEFAULTS,
  type Fx, type EqSettings,
} from '../lib/fx';
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
};

function lit(hue: number, alpha = 1): string {
  return `hsl(${hue} 85% 62% / ${alpha})`;
}

/**
 * The bend, drawn.
 *
 * `points` is in −1..1 on both axes for a transfer curve, and the diagonal
 * behind it is the line "no effect" would draw — which is the thing that
 * makes the picture readable. A curve with nothing to compare it to is a
 * squiggle.
 */
function Bend({
  points,
  hue,
  diagonal = true,
}: {
  readonly points: Float32Array | readonly number[];
  readonly hue: number;
  readonly diagonal?: boolean;
}): React.ReactElement {
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

    if (diagonal) {
      paint.strokeStyle = 'rgba(255,255,255,0.12)';
      paint.setLineDash([3, 4]);
      paint.beginPath();
      paint.moveTo(0, height);
      paint.lineTo(width, 0);
      paint.stroke();
      paint.setLineDash([]);
    }

    paint.strokeStyle = lit(hue);
    paint.lineWidth = 2;
    paint.beginPath();
    for (let x = 0; x < width; x += 1) {
      const which = Math.floor((x / width) * (points.length - 1));
      const y = height / 2 - (points[which] ?? 0) * (height / 2 - 2);
      if (x === 0) paint.moveTo(x, y);
      else paint.lineTo(x, y);
    }
    paint.stroke();

    /* A wash under the line, which is what makes it read as a shape rather
       than a wire. */
    paint.lineTo(width, height / 2);
    paint.lineTo(0, height / 2);
    paint.closePath();
    paint.fillStyle = lit(hue, 0.16);
    paint.fill();
  });
  return <canvas ref={canvas} className="h-16 w-full rounded-lg" style={{ background: 'rgba(0,0,0,0.35)' }} />;
}

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
  return (
    <label className="flex min-w-[116px] flex-1 flex-col gap-0.5">
      <span className="flex items-baseline justify-between text-[11px]">
        <span style={{ color: INK_DIM }}>{label}</span>
        <span className="font-bold tabular-nums" style={{ color: lit(hue) }}>
          {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
          {unit ?? ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="min-h-[32px] w-full"
        style={{ accentColor: lit(hue) }}
      />
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
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: on ? `hsl(${hue} 60% 50% / 0.08)` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${on ? lit(hue, 0.4) : EDGE}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black" style={{ color: on ? lit(hue) : INK }}>
            {name}
          </p>
          {/* What it is, in words, on the control itself. Carli: *"Maak ook
              seker dat knoppies pop-ups het wat sê wat 'n funksie is."* An
              effect rack is the worst place in an app for a bare name: half
              of these are words a musician knows and half are not. */}
          <p className="pt-0.5 text-[11px] leading-snug" style={{ color: INK_DIM }}>
            {what}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={on}
          className="min-h-[32px] flex-shrink-0 rounded-lg px-3 text-xs font-black"
          style={{
            background: on ? lit(hue, 0.9) : 'rgba(255,255,255,0.08)',
            color: on ? '#05060a' : INK_DIM,
          }}
        >
          {on ? 'ON' : 'OFF'}
        </button>
      </div>
      {on && <div className="pt-2">{children}</div>}
    </div>
  );
}

export default function BoothFx({
  fx,
  onChange,
}: {
  readonly fx: Fx;
  readonly onChange: (next: Fx) => void;
}): React.ReactElement {
  const { t } = useLang();

  /* A context purely to ask the biquads what they do. One is enough and it
     is never started, so nothing plays out of it — `responseOf` reads the
     filters' maths, which does not need a running graph. */
  const asking = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  }, []);
  useEffect(() => () => void asking?.close().catch(() => undefined), [asking]);

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

  return (
    <div className="space-y-2 px-4 pb-4" style={{ background: PANEL }}>
      {/* ── What this rack is, and what it is not ────────────────────

          Named rather than quietly absent. Somebody who came looking for a
          gate should find out in a second that it is not here, instead of
          opening eleven panels to be sure. */}
      <p className="pt-1 text-[11px] leading-snug" style={{ color: INK_DIM }}>
        {t(
          'fx.whatIsHere',
          'Everything here is in the file as well as in your ears — the mixdown renders the same chain. The gate, the voice tuner and the vocoder are not built yet. The amp modeler is on the lane itself, under Track controls.',
        )}
      </p>

      <Unit
        id="eq"
        name={t('fx.eq', 'EQ')}
        what={t('fx.eqWhat', 'Turn the bottom, the middle or the top of this lane up or down. The line is what the three filters really do together.')}
        on={Boolean(fx.eq)}
        onToggle={() => toggle('eq', FX_DEFAULTS.eq)}
      >
        {eqLine && <Bend points={eqLine} hue={HUES.eq} diagonal={false} />}
        <div className="flex flex-wrap gap-3 pt-2">
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

      {([
        ['saturator', t('fx.saturator', 'Saturator'), t('fx.saturatorWhat', 'Warms it up by rounding the loud parts, the way tape and valves do. The curve is the bend.')],
        ['folder', t('fx.folder', 'Wave folder'), t('fx.folderWhat', 'Folds the peaks back on themselves instead of flattening them. Strange and metallic, not like distortion.')],
      ] as const).map(([id, name, what]) => {
        const settings = fx[id];
        return (
          <Unit key={id} id={id} name={name} what={what} on={Boolean(settings)}
            onToggle={() => toggle(id, FX_DEFAULTS[id])}>
            <Bend points={curveOf(id, (settings ?? FX_DEFAULTS[id]).amount)} hue={HUES[id]} />
            <div className="flex flex-wrap gap-3 pt-2">
              <Dial label={t('fx.amount', 'Amount')} value={(settings ?? FX_DEFAULTS[id]).amount}
                min={0} max={1} step={0.01} hue={HUES[id]}
                onChange={(amount) => set(id, { amount })} />
            </div>
          </Unit>
        );
      })}

      <Unit
        id="crusher"
        name={t('fx.crusher', 'Bit crusher')}
        what={t('fx.crusherWhat', 'Throws away detail in steps, like an old sampler. Bit depth only — the sample rate is left alone.')}
        on={Boolean(fx.crusher)}
        onToggle={() => toggle('crusher', FX_DEFAULTS.crusher)}
      >
        <Bend points={curveOf('crusher', (fx.crusher ?? FX_DEFAULTS.crusher).bits)} hue={HUES.crusher} />
        <div className="flex flex-wrap gap-3 pt-2">
          <Dial label={t('fx.bits', 'Bits')} value={(fx.crusher ?? FX_DEFAULTS.crusher).bits}
            min={2} max={16} step={1} hue={HUES.crusher}
            onChange={(bits) => set('crusher', { bits })} />
        </div>
      </Unit>

      <Unit
        id="compressor"
        name={t('fx.compressor', 'Compressor')}
        what={t('fx.compressorWhat', 'Holds the loud parts back so the quiet ones can come up. The line shows how much of what goes in comes out.')}
        on={Boolean(fx.compressor)}
        onToggle={() => toggle('compressor', FX_DEFAULTS.compressor)}
      >
        <Bend points={squashLine(fx.compressor ?? FX_DEFAULTS.compressor)} hue={HUES.compressor} />
        <div className="flex flex-wrap gap-3 pt-2">
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

      <Unit
        id="limiter"
        name={t('fx.limiter', 'Limiter')}
        what={t('fx.limiterWhat', 'A ceiling nothing goes over. It is a fast compressor held at 20:1 — not a look-ahead brickwall, which is a different thing.')}
        on={Boolean(fx.limiter)}
        onToggle={() => toggle('limiter', FX_DEFAULTS.limiter)}
      >
        <div className="flex flex-wrap gap-3">
          <Dial label={t('fx.ceiling', 'Ceiling')} value={(fx.limiter ?? FX_DEFAULTS.limiter).ceiling}
            min={-24} max={0} step={0.5} unit=" dB" hue={HUES.limiter}
            onChange={(ceiling) => set('limiter', { ceiling })} />
        </div>
      </Unit>

      <Unit
        id="delay"
        name={t('fx.delay', 'Delay')}
        what={t('fx.delayWhat', 'An echo that repeats and fades. Mixed in beside the dry sound, so turning it up does not turn the lane down.')}
        on={Boolean(fx.delay)}
        onToggle={() => toggle('delay', FX_DEFAULTS.delay)}
      >
        <div className="flex flex-wrap gap-3">
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

      <Unit
        id="reverb"
        name={t('fx.reverb', 'Reverb')}
        what={t('fx.reverbWhat', 'Puts it in a room. A generated one, so it sounds like a plate rather than a cathedral.')}
        on={Boolean(fx.reverb)}
        onToggle={() => toggle('reverb', FX_DEFAULTS.reverb)}
      >
        <div className="flex flex-wrap gap-3">
          <Dial label={t('fx.size', 'Room')} value={(fx.reverb ?? FX_DEFAULTS.reverb).size}
            min={0.2} max={6} step={0.1} unit=" s" hue={HUES.reverb}
            onChange={(size) => set('reverb', { ...(fx.reverb ?? FX_DEFAULTS.reverb), size })} />
          <Dial label={t('fx.mix', 'How much')} value={(fx.reverb ?? FX_DEFAULTS.reverb).mix}
            min={0} max={1} step={0.01} hue={HUES.reverb}
            onChange={(mix) => set('reverb', { ...(fx.reverb ?? FX_DEFAULTS.reverb), mix })} />
        </div>
      </Unit>

      {([
        ['tremolo', t('fx.tremolo', 'Tremolo'), t('fx.tremoloWhat', 'Pulses the volume up and down. The line is one cycle of the pulse.')],
        ['chorus', t('fx.chorus', 'Chorus'), t('fx.chorusWhat', 'Doubles it against a copy of itself that drifts, so one voice sounds like two.')],
      ] as const).map(([id, name, what]) => {
        const settings = fx[id] ?? FX_DEFAULTS[id];
        return (
          <Unit key={id} id={id} name={name} what={what} on={Boolean(fx[id])}
            onToggle={() => toggle(id, FX_DEFAULTS[id])}>
            <Bend points={wobbleLine(settings.depth)} hue={HUES[id]} diagonal={false} />
            <div className="flex flex-wrap gap-3 pt-2">
              <Dial label={t('fx.rate', 'Speed')} value={settings.rate} min={0.1} max={12} step={0.1} unit=" Hz" hue={HUES[id]}
                onChange={(rate) => set(id, { ...settings, rate })} />
              <Dial label={t('fx.depth', 'Depth')} value={settings.depth} min={0} max={1} step={0.01} hue={HUES[id]}
                onChange={(depth) => set(id, { ...settings, depth })} />
            </div>
          </Unit>
        );
      })}

      <Unit
        id="utility"
        name={t('fx.utility', 'Utility')}
        what={t('fx.utilityWhat', 'Level, upside-down, and both sides into one. Boring and the most used thing on any desk.')}
        on={Boolean(fx.utility)}
        onToggle={() => toggle('utility', FX_DEFAULTS.utility)}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Dial label={t('fx.trim', 'Level')} value={(fx.utility ?? FX_DEFAULTS.utility).trim}
            min={-24} max={24} step={0.5} unit=" dB" hue={HUES.utility}
            onChange={(trim) => set('utility', { ...(fx.utility ?? FX_DEFAULTS.utility), trim })} />
          {([
            ['flip', t('fx.flip', 'Upside down')],
            ['mono', t('fx.mono', 'Both sides as one')],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex min-h-[32px] items-center gap-2 text-[11px]" style={{ color: INK_DIM }}>
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

/** One cycle of a tremolo or chorus wobble, at the depth that is set. */
function wobbleLine(depth: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 128; i += 1) {
    out.push(Math.sin((i / 127) * Math.PI * 4) * depth);
  }
  return out;
}

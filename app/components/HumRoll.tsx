'use client';

/**
 * The notes heard in a hum, laid out to be put right by hand.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026, of the hum: *"as daardie baie fyn, genuanseerd,
 * en baie baie goed verfyn word … dan kan dit ons selling point word."* No
 * reader of a hum is right every time — a note sung between two, a breath
 * that sounded like a hum — and a feature that hands back what it heard with
 * no way to change it makes every one of those a retake. A studio shows the
 * notes on a piano roll and lets a finger move the one that is wrong. So does
 * this.
 *
 * ── What is drawn ────────────────────────────────────────────────────────
 *
 *   · a row per semitone, the notes of the key a shade lighter, and C named;
 *   · the grid of the song (bars brighter than beats);
 *   · the pitch of the voice itself, frame by frame, as a faint line — what
 *     was actually sung, under what it was read as, so a wrong note is seen
 *     to be wrong rather than guessed at;
 *   · each note as a block: dragged sideways it moves in time, up and down it
 *     changes note, by its right end it changes length. A note that was a
 *     close call (sung more than a third of a semitone off) has a dashed
 *     edge, which is where to look first.
 *
 * ── Thumbs ───────────────────────────────────────────────────────────────
 *
 * A semitone row is too thin for a fingertip on a phone, so dragging is the
 * quick way and the row of buttons under the roll is the sure way: once a
 * note is picked, every change to it is a 44-pixel button. The keys work too:
 * up and down a semitone (with Shift an octave), left and right a grid step,
 * Delete to remove.
 *
 * The booth's own literal colours, as `BoothTimeline` explains.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, ChevronsUp, Minus, Play, Plus, Scissors, Trash2, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { HumNote } from '../lib/humnotes';
import { useLang } from '../lib/i18n';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BG = '#070910';
const ROW_KEY = 'rgba(56,189,248,0.07)';
const ROW_OFF = 'rgba(255,255,255,0.015)';
const LINE = 'rgba(255,255,255,0.06)';
const BAR = 'rgba(255,255,255,0.16)';
const NOTE = '#38bdf8';
const PICKED = '#fde047';
const VOICE = 'rgba(244,114,182,0.75)';
const GUTTER = 34;

export const nameOf = (midi: number): string => `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

interface Drag {
  readonly index: number;
  readonly mode: 'move' | 'size';
  readonly x: number;
  readonly y: number;
  readonly was: HumNote;
}

export default function HumRoll({
  notes,
  onChange,
  seconds,
  contour,
  beat,
  barBeats,
  offset,
  step,
  scale,
  onAudition,
}: {
  readonly notes: readonly HumNote[];
  readonly onChange: (next: HumNote[]) => void;
  /** How long the take is. */
  readonly seconds: number;
  /** The voice's own pitch, frame by frame, as fractional MIDI (NaN unvoiced). */
  readonly contour?: { readonly midi: Float32Array; readonly hop: number } | null;
  /** Seconds in a beat, for the grid. */
  readonly beat: number;
  /** Beats in a bar. */
  readonly barBeats: number;
  /** Where the take starts on the song's clock, so the grid is the song's. */
  readonly offset: number;
  /** What a drag snaps to, in seconds. Zero is no snapping. */
  readonly step: number;
  /** Twelve-note classes in the key, for the lighter rows. */
  readonly scale?: readonly number[] | null;
  /** Play one note, so a change can be heard before it is kept. */
  readonly onAudition?: (note: HumNote) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [chosen, setChosen] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [shown, setShown] = useState<readonly HumNote[]>(notes);
  useEffect(() => { if (!drag) setShown(notes); }, [notes, drag]);
  useEffect(() => { if (chosen !== null && chosen >= notes.length) setChosen(null); }, [notes, chosen]);

  /* The rows: every pitched note and the voice's line, with room above and
     below, and never fewer than an octave so a three-note hum still reads
     as a keyboard. */
  const [low, high] = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const one of shown) if (one.midi !== null) { lo = Math.min(lo, one.midi); hi = Math.max(hi, one.midi); }
    if (contour) {
      for (let i = 0; i < contour.midi.length; i += 3) {
        const m = contour.midi[i];
        if (Number.isFinite(m)) { lo = Math.min(lo, Math.round(m)); hi = Math.max(hi, Math.round(m)); }
      }
    }
    if (!Number.isFinite(lo)) { lo = 55; hi = 67; }
    lo -= 2;
    hi += 2;
    while (hi - lo < 13) { lo -= 1; hi += 1; }
    return [lo, hi];
  }, [shown, contour]);
  const rows = high - low + 1;
  /* Taps — notes with no pitch — sit on a row of their own under the keys. */
  const hasTaps = shown.some((one) => one.midi === null);
  const rowH = Math.max(11, Math.min(20, Math.floor(260 / rows)));
  const height = (rows + (hasTaps ? 1 : 0)) * rowH;

  const box = useRef<HTMLDivElement | null>(null);
  const [room, setRoom] = useState(320);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = (): void => setRoom(Math.max(120, el.clientWidth - GUTTER));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const length = Math.max(1, seconds);
  /* The whole take across the box, so no note is ever out of sight past an
     edge nothing says can be dragged. Zoomed in — on purpose, with the
     buttons under the roll — it is wider than the box and scrolls inside
     itself, and the page never does. */
  const [zoom, setZoom] = useState(1);
  const wide = Math.max(room, Math.round(room * zoom));
  const xOf = (s: number): number => (s / length) * wide;
  const yOf = (midi: number | null): number => (midi === null ? rows * rowH : (high - midi) * rowH);

  const snapTime = (s: number): number => {
    if (step <= 0) return Math.round(s * 100) / 100;
    return Math.round((s + offset) / step) * step - offset;
  };
  const edit = (index: number, how: (one: HumNote) => HumNote | null): void => {
    const next: HumNote[] = [];
    shown.forEach((one, i) => {
      if (i !== index) { next.push(one); return; }
      const made = how(one);
      if (made) next.push(made);
    });
    next.sort((a, b) => a.from - b.from);
    onChange(next);
  };
  const shortest = step > 0 ? step : 0.06;

  const begin = (event: React.PointerEvent, index: number, mode: 'move' | 'size'): void => {
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setChosen(index);
    setDrag({ index, mode, x: event.clientX, y: event.clientY, was: shown[index] });
  };
  const moveTo = (event: React.PointerEvent): void => {
    if (!drag) return;
    const dx = ((event.clientX - drag.x) / wide) * length;
    const dy = Math.round((drag.y - event.clientY) / rowH);
    const was = drag.was;
    let made: HumNote;
    if (drag.mode === 'size') {
      const to = Math.max(was.from + shortest, snapTime(was.to + dx));
      made = { ...was, to };
    } else {
      const from = Math.max(0, snapTime(was.from + dx));
      const midi = was.midi === null
        ? (dy > 0 ? Math.max(low, Math.min(high, high - (rows - dy))) : null)
        : Math.max(low, Math.min(high, was.midi + dy));
      made = { ...was, from, to: from + (was.to - was.from), midi };
    }
    setShown(shown.map((one, i) => (i === drag.index ? made : one)));
  };
  const end = (): void => {
    if (!drag) return;
    const made = shown[drag.index];
    setDrag(null);
    if (made && (made.from !== drag.was.from || made.to !== drag.was.to || made.midi !== drag.was.midi)) {
      const next = [...shown].sort((a, b) => a.from - b.from);
      onChange(next);
      setChosen(next.indexOf(made));
      if (made.midi !== drag.was.midi) onAudition?.(made);
    }
  };

  /* A double press on empty roll puts a note there: one grid step long, on
     the row that was pressed. */
  const addAt = (event: React.MouseEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest('[data-rollnote]')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const row = Math.floor(y / rowH);
    const midi = row >= rows ? null : high - row;
    const from = Math.max(0, snapTime((x / wide) * length));
    const made: HumNote = { midi, from, to: from + Math.max(shortest, step || 0.25), loud: 0.8 };
    const next = [...shown, made].sort((a, b) => a.from - b.from);
    onChange(next);
    setChosen(next.indexOf(made));
    onAudition?.(made);
  };

  const picked = chosen !== null ? shown[chosen] : null;
  const shiftPitch = (by: number): void => {
    if (chosen === null) return;
    edit(chosen, (one) => {
      const made = { ...one, midi: one.midi === null ? 60 : Math.max(24, Math.min(108, one.midi + by)) };
      onAudition?.(made);
      return made;
    });
  };
  const shiftTime = (by: number): void => {
    if (chosen === null) return;
    const moved = { ...shown[chosen] };
    const from = Math.max(0, moved.from + by);
    const made = { ...moved, from, to: from + (moved.to - moved.from) };
    const next = shown.map((one, i) => (i === chosen ? made : one)).sort((a, b) => a.from - b.from);
    onChange(next);
    setChosen(next.indexOf(made));
  };
  const resize = (by: number): void => {
    if (chosen === null) return;
    edit(chosen, (one) => ({ ...one, to: Math.max(one.from + shortest, one.to + by) }));
  };
  const remove = (): void => {
    if (chosen === null) return;
    edit(chosen, () => null);
    setChosen(null);
  };
  /* Split the picked note in two at its middle, on the grid where there is
     one: "da-da" read as one long "daa" is the commonest rhythm mistake. */
  const split = (): void => {
    if (chosen === null) return;
    const one = shown[chosen];
    const middle = snapTime((one.from + one.to) / 2);
    const cut = middle > one.from + shortest / 2 && middle < one.to - shortest / 2 ? middle : (one.from + one.to) / 2;
    const next = shown.flatMap((n, i) => (i === chosen ? [{ ...n, to: cut }, { ...n, from: cut }] : [n]));
    onChange(next);
  };
  const by = step > 0 ? step : 0.05;

  const keyDown = (event: React.KeyboardEvent): void => {
    if (chosen === null) return;
    const key = event.key;
    if (key === 'ArrowUp') { event.preventDefault(); shiftPitch(event.shiftKey ? 12 : 1); }
    else if (key === 'ArrowDown') { event.preventDefault(); shiftPitch(event.shiftKey ? -12 : -1); }
    else if (key === 'ArrowLeft') { event.preventDefault(); shiftTime(-by); }
    else if (key === 'ArrowRight') { event.preventDefault(); shiftTime(by); }
    else if (key === 'Delete' || key === 'Backspace') { event.preventDefault(); remove(); }
  };

  /* The grid: beats, with bars brighter, on the song's clock. */
  const lines: { x: number; bar: boolean }[] = [];
  if (beat > 0) {
    const first = Math.ceil(offset / beat) * beat - offset;
    for (let s = first, n = Math.round((first + offset) / beat); s <= length && lines.length < 2000; s += beat, n += 1) {
      lines.push({ x: xOf(s), bar: barBeats > 0 && n % barBeats === 0 });
    }
  }

  /* The voice's line, as one path: broken where there is no pitch. */
  const path = useMemo(() => {
    if (!contour) return '';
    const parts: string[] = [];
    let open = false;
    for (let i = 0; i < contour.midi.length; i += 1) {
      const m = contour.midi[i];
      if (!Number.isFinite(m) || m < low - 0.5 || m > high + 0.5) { open = false; continue; }
      const x = (i * contour.hop / length) * wide;
      const y = (high - m) * rowH + rowH / 2;
      parts.push(`${open ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
      open = true;
    }
    return parts.join(' ');
  }, [contour, low, high, length, wide, rowH]);

  const tool = (label: string, onPress: () => void, icon: React.ReactNode, data: string): React.ReactElement => (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-rolltool={data}
      onClick={onPress}
      disabled={!picked}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border disabled:opacity-35"
      style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#eef2ff' }}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-2" data-humroll>
      <div
        ref={box}
        tabIndex={0}
        onKeyDown={keyDown}
        aria-label={t('roll.label', 'The notes heard in the hum. Pick a note to change it.')}
        /* Sideways on purpose, and only when asked: at 1× the whole take
           fits the box and nothing scrolls. The zoom button under the roll
           makes it wider than the screen, as the timeline's zoom does — a
           piece of the booth, the one room allowed to be bigger than the
           screen, and the button says how far in it is. */
        className="relative overflow-x-auto overflow-y-hidden rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: BG }}
      >
        <div className="relative" style={{ width: GUTTER + wide, height }}>
          {/* The keys. */}
          <div className="sticky left-0 z-20 float-left" style={{ width: GUTTER, height, background: '#0b0d14' }}>
            {Array.from({ length: rows }, (_, r) => {
              const midi = high - r;
              const pc = ((midi % 12) + 12) % 12;
              const black = [1, 3, 6, 8, 10].includes(pc);
              return (
                <div
                  key={midi}
                  className="flex items-center justify-end pr-1 text-[9px] font-bold tabular-nums"
                  style={{ height: rowH, background: black ? '#05060a' : '#161a26', color: pc === 0 ? '#eef2ff' : 'rgba(238,242,255,0.35)', borderBottom: `1px solid ${LINE}` }}
                >
                  {pc === 0 || rowH >= 16 ? nameOf(midi) : ''}
                </div>
              );
            })}
            {hasTaps && (
              <div className="flex items-center justify-end pr-1 text-[9px] font-bold" style={{ height: rowH, color: 'rgba(238,242,255,0.5)' }}>
                {t('roll.taps', 'tap')}
              </div>
            )}
          </div>
          {/* The rows, the grid, the voice and the notes. */}
          <div
            className="absolute top-0 touch-none"
            style={{ left: GUTTER, width: wide, height }}
            onDoubleClick={addAt}
            onPointerDown={() => setChosen(null)}
          >
            {Array.from({ length: rows }, (_, r) => {
              const pc = (((high - r) % 12) + 12) % 12;
              const inKey = scale ? scale.includes(pc) : ![1, 3, 6, 8, 10].includes(pc);
              return (
                <div
                  key={r}
                  className="absolute left-0 right-0"
                  style={{ top: r * rowH, height: rowH, background: inKey ? ROW_KEY : ROW_OFF, borderBottom: `1px solid ${LINE}` }}
                />
              );
            })}
            {lines.map((one, i) => (
              <span key={i} className="absolute top-0 w-px" style={{ left: one.x, height, background: one.bar ? BAR : LINE }} />
            ))}
            {path && (
              <svg className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 6 }} width={wide} height={height} aria-hidden>
                <path d={path} fill="none" stroke={VOICE} strokeWidth={1.5} strokeLinejoin="round" />
              </svg>
            )}
            {shown.map((one, i) => {
              const left = xOf(one.from);
              const w = Math.max(6, xOf(one.to) - left);
              const close = one.exact !== undefined && one.midi !== null && Math.abs(one.exact - one.midi) > 0.33 && Math.abs(one.exact - one.midi) <= 0.5;
              const on = chosen === i;
              return (
                <div
                  key={`${i}-${one.from.toFixed(3)}`}
                  role="button"
                  tabIndex={-1}
                  data-rollnote={one.midi ?? 'tap'}
                  aria-label={`${one.midi === null ? t('roll.tap', 'Tap') : nameOf(one.midi)} · ${one.from.toFixed(2)} s`}
                  onPointerDown={(event) => begin(event, i, 'move')}
                  onPointerMove={moveTo}
                  onPointerUp={end}
                  onPointerCancel={end}
                  className="absolute cursor-grab touch-none rounded-[3px]"
                  style={{
                    left,
                    top: yOf(one.midi) + 1,
                    width: w,
                    height: rowH - 2,
                    background: one.midi === null ? 'rgba(238,242,255,0.55)' : NOTE,
                    opacity: 0.45 + 0.55 * Math.max(0, Math.min(1, one.loud)),
                    outline: on ? `2px solid ${PICKED}` : close ? '1px dashed #fde047' : 'none',
                    outlineOffset: on ? 1 : 0,
                    zIndex: on ? 5 : 1,
                  }}
                >
                  <span
                    className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize"
                    onPointerDown={(event) => begin(event, i, 'size')}
                    onPointerMove={moveTo}
                    onPointerUp={end}
                    onPointerCancel={end}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What is picked, and every change to it as a button a thumb can hit. */}
      <p className="min-h-[1rem] text-[11px] tabular-nums" style={{ color: 'rgba(238,242,255,0.6)' }} data-rollsays>
        {picked
          ? `${picked.midi === null ? t('roll.tap', 'Tap') : nameOf(picked.midi)} · ${picked.from.toFixed(2)}–${picked.to.toFixed(2)} s${
            picked.exact !== undefined && picked.midi !== null
              /* How close a call it was — or, once a note has been moved by
                 hand, which note the voice was actually nearer. */
              ? Math.abs(picked.exact - picked.midi) <= 0.5
                ? ` · ${t('roll.sung', 'sung')} ${picked.exact - picked.midi >= 0 ? '+' : ''}${Math.round((picked.exact - picked.midi) * 100)} ${t('roll.cents', 'cents')}`
                : ` · ${t('roll.sungNear', 'sung nearer')} ${nameOf(Math.round(picked.exact))}`
              : ''}`
          : `${shown.length} ${t('roll.notes', 'notes')} · ${t('roll.how', 'pick one to change it, or press the roll twice to add one')}`}
      </p>
      <div className="flex flex-wrap gap-1.5 pb-1" data-rolltools>
        {tool(t('roll.up', 'A semitone up'), () => shiftPitch(1), <ArrowUp className="h-4 w-4" />, 'up')}
        {tool(t('roll.down', 'A semitone down'), () => shiftPitch(-1), <ArrowDown className="h-4 w-4" />, 'down')}
        {tool(t('roll.octUp', 'An octave up'), () => shiftPitch(12), <ChevronsUp className="h-4 w-4" />, 'octup')}
        {tool(t('roll.octDown', 'An octave down'), () => shiftPitch(-12), <ChevronsDown className="h-4 w-4" />, 'octdown')}
        {tool(t('roll.earlier', 'Earlier by a grid step'), () => shiftTime(-by), <ArrowLeft className="h-4 w-4" />, 'earlier')}
        {tool(t('roll.later', 'Later by a grid step'), () => shiftTime(by), <ArrowRight className="h-4 w-4" />, 'later')}
        {tool(t('roll.shorter', 'Shorter'), () => resize(-by), <Minus className="h-4 w-4" />, 'shorter')}
        {tool(t('roll.longer', 'Longer'), () => resize(by), <Plus className="h-4 w-4" />, 'longer')}
        {tool(t('roll.split', 'Split it in two'), split, <Scissors className="h-4 w-4" />, 'split')}
        {tool(t('roll.play', 'Hear this note'), () => { if (picked) onAudition?.(picked); }, <Play className="h-4 w-4" />, 'play')}
        {tool(t('roll.delete', 'Take this note out'), remove, <Trash2 className="h-4 w-4" />, 'delete')}
        <button
          type="button"
          data-rollzoom
          aria-label={zoom >= 4 ? t('roll.zoomOut', 'The whole take') : t('roll.zoomIn', 'Closer in')}
          title={zoom >= 4 ? t('roll.zoomOut', 'The whole take') : t('roll.zoomIn', 'Closer in')}
          onClick={() => setZoom((was) => (was >= 4 ? 1 : was * 2))}
          className="flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl border px-2 text-xs font-black tabular-nums"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#eef2ff' }}
        >
          {zoom >= 4 ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          <span className="pl-1">{zoom}×</span>
        </button>
      </div>
    </div>
  );
}

'use client';

/**
 * An automation line drawn over a lane: volume or pan, changing over the song.
 *
 * Every studio has it and ProBooth did not (the audit of 29 October 2026).
 * The line lies across the lane's whole row on the session's clock. Tap the
 * row to put a point down; drag a point to move it; tap a point twice to take
 * it away. Between points the value runs in a straight line, which is what
 * `startLane` lays onto the audio for playback and for every export alike.
 *
 * Volume rides UNDER the fader (top of the row is the fader as set, the foot
 * is silence), so the fader still turns the whole lane up or down. Pan runs
 * from left at the top to right at the foot, centre in the middle.
 */
import React, { useRef, useState } from 'react';
import type { AutoPoint, Lane } from '../lib/session';

export type AutoMode = 'gain' | 'pan';

/** A point's value from where it sits up and down the row, 0 at the top. */
export const valueOfY = (mode: AutoMode, y: number): number => {
  const f = Math.max(0, Math.min(1, y));
  /* The edges catch: a point near the foot is silence and near the top is
     the fader as set, and near the middle of a pan line is the centre. A
     finger cannot land on the one pixel that means "nothing". */
  if (mode === 'gain') {
    if (f >= 0.92) return 0;
    if (f <= 0.08) return 1;
    return Math.round((1 - f) * 100) / 100;
  }
  const pan = Math.round((2 * f - 1) * 100) / 100;
  return Math.abs(pan) < 0.06 ? 0 : pan;
};
export const yOfValue = (mode: AutoMode, v: number): number =>
  mode === 'gain' ? 1 - Math.max(0, Math.min(1, v)) : (Math.max(-1, Math.min(1, v)) + 1) / 2;

export default function BoothAuto({
  lane,
  mode,
  percent,
  secondsAt,
  onPoints,
  label,
}: {
  readonly lane: Lane;
  readonly mode: AutoMode;
  /** A session second as a percentage across the axis. */
  readonly percent: (second: number) => number;
  /** A finger's x on the screen as a session second. */
  readonly secondsAt: (clientX: number) => number;
  readonly onPoints: (points: readonly AutoPoint[]) => void;
  readonly label: string;
}): React.ReactElement {
  const box = useRef<HTMLDivElement | null>(null);
  const points = [...(lane.auto?.[mode] ?? [])].sort((a, b) => a.t - b.t);
  const [held, setHeld] = useState<number | null>(null);
  /* A second tap on the same point within this long takes it away. Read by
     hand rather than from a double-click event: the drag holds the pointer,
     so a click never reaches the point (and a phone has no double-click). */
  const lastTap = useRef<{ readonly i: number; readonly at: number } | null>(null);
  const flat = mode === 'gain' ? 1 : lane.pan ?? 0;

  const at = (event: React.PointerEvent): AutoPoint => {
    const rect = box.current?.getBoundingClientRect();
    const y = rect ? (event.clientY - rect.top) / Math.max(1, rect.height) : 0.5;
    return { t: Math.max(0, Math.round(secondsAt(event.clientX) * 100) / 100), v: valueOfY(mode, y) };
  };

  const line = points.length
    ? [{ t: 0, v: points[0].v }, ...points, { t: 1e9, v: points[points.length - 1].v }]
    : [{ t: 0, v: flat }, { t: 1e9, v: flat }];
  const colour = mode === 'gain' ? '#facc15' : '#c084fc';

  return (
    <div
      ref={box}
      data-autoline={mode}
      data-autopoints={points.length}
      role="group"
      aria-label={label}
      className="absolute inset-0 z-20 cursor-crosshair"
      style={{ touchAction: 'none', background: 'rgba(0,0,0,0.25)' }}
      onPointerDown={(event) => {
        if (event.target !== box.current && !(event.target instanceof SVGElement && event.target.dataset.autoline !== undefined)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const put = at(event);
        const next = [...points, put].sort((a, b) => a.t - b.t);
        onPoints(next);
        setHeld(next.indexOf(put));
      }}
      onPointerMove={(event) => {
        if (held === null) return;
        const moved = points.map((one, i) => (i === held ? at(event) : one));
        onPoints(moved);
      }}
      onPointerUp={() => setHeld(null)}
      onPointerCancel={() => setHeld(null)}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 100" aria-hidden>
        {mode === 'pan' && <line x1="0" x2="1000" y1="50" y2="50" stroke="rgba(255,255,255,0.15)" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />}
        <polyline
          data-autoline=""
          points={line.map((one) => `${Math.min(1000, percent(one.t) * 10)},${yOfValue(mode, one.v) * 100}`).join(' ')}
          fill="none"
          stroke={colour}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${colour})` }}
        />
      </svg>
      {points.map((one, i) => (
        <button
          key={`${one.t}-${i}`}
          type="button"
          data-autopoint={i}
          aria-label={`${label}: ${one.t.toFixed(2)} s, ${mode === 'gain' ? `${Math.round(one.v * 100)}%` : one.v.toFixed(2)}`}
          className="absolute -ml-[11px] -mt-[11px] flex h-[22px] w-[22px] items-center justify-center"
          style={{ left: `${percent(one.t)}%`, top: `${yOfValue(mode, one.v) * 100}%` }}
          onPointerDown={(event) => {
            event.stopPropagation();
            const now = event.timeStamp;
            if (lastTap.current && lastTap.current.i === i && now - lastTap.current.at < 400) {
              lastTap.current = null;
              setHeld(null);
              onPoints(points.filter((_, k) => k !== i));
              return;
            }
            lastTap.current = { i, at: now };
            box.current?.setPointerCapture(event.pointerId);
            setHeld(i);
          }}
        >
          <span className="h-3 w-3 rounded-full border-2 border-zinc-950" style={{ background: colour, boxShadow: `0 0 8px ${colour}` }} />
        </button>
      ))}
    </div>
  );
}

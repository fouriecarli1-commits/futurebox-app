'use client';

/**
 * The radar — a sweep with the people on it as blips.
 *
 * Carli, 13 October 2026, with Google's Collab Radar page: *"Kyk hoe mooi
 * lyk collab, kom ons probeer dit so te hou."* The page draws a 360° sweep
 * and six blips. This draws the same sweep over the people who are actually
 * on the radar: everybody who put a name on it, placed by how near their
 * songs are to yours where there is a score, and on the outer ring where
 * there is none. A blip is a real person and pressing it opens the real ask.
 *
 * The sweep is a picture, not a measurement. Nothing is "scanning": the
 * people come from one request to `/api/pairs`, and the sweep only turns so
 * the room reads as live. Under reduced motion it stands still.
 */
import React, { useEffect, useRef } from 'react';

export interface Blip {
  readonly id: string;
  readonly name: string;
  readonly handle: string;
  /** 0–1 where the matcher scored them against a song of yours; null where it could not. */
  readonly score: number | null;
}

/** A stable angle per person, so a blip does not wander between renders. */
function angleOf(id: string): number {
  let hash = 7;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return (hash * Math.PI) / 180;
}

export function placeOf(blip: Blip): { x: number; y: number } {
  const angle = angleOf(blip.id || blip.name);
  const radius = blip.score === null ? 0.8 : 0.16 + (1 - blip.score) * 0.66;
  return { x: 50 + Math.cos(angle) * radius * 46, y: 50 + Math.sin(angle) * radius * 46 };
}

export default function RadarSweep({
  blips,
  picked,
  onPick,
}: {
  readonly blips: readonly Blip[];
  readonly picked: string | null;
  readonly onPick: (id: string) => void;
}): React.ReactElement {
  const art = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = art.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let frame = 0;
    let angle = -Math.PI / 2;
    const draw = (): void => {
      const size = (canvas.width = canvas.height = Math.max(120, canvas.clientWidth));
      const mid = size / 2;
      const outer = size * 0.46;
      ctx.clearRect(0, 0, size, size);
      /* The ground inside the dial. */
      const ground = ctx.createRadialGradient(mid, mid, 0, mid, mid, outer);
      ground.addColorStop(0, 'rgba(52,211,153,0.10)');
      ground.addColorStop(1, 'rgba(52,211,153,0.02)');
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.arc(mid, mid, outer, 0, Math.PI * 2);
      ctx.fill();
      /* Rings and cross-hairs. */
      ctx.strokeStyle = 'rgba(52,211,153,0.28)';
      ctx.lineWidth = 1;
      for (const share of [0.25, 0.5, 0.75, 1]) {
        ctx.beginPath();
        ctx.arc(mid, mid, outer * share, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(mid - outer, mid); ctx.lineTo(mid + outer, mid);
      ctx.moveTo(mid, mid - outer); ctx.lineTo(mid, mid + outer);
      ctx.stroke();
      /* The sweep: a wedge that fades behind its leading edge. */
      const wedge = ctx.createConicGradient(angle - Math.PI / 2, mid, mid);
      wedge.addColorStop(0, 'rgba(52,211,153,0)');
      wedge.addColorStop(0.75, 'rgba(52,211,153,0)');
      wedge.addColorStop(1, 'rgba(52,211,153,0.35)');
      ctx.fillStyle = wedge;
      ctx.beginPath();
      ctx.moveTo(mid, mid);
      ctx.arc(mid, mid, outer, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(94,234,212,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mid, mid);
      ctx.lineTo(mid + Math.cos(angle) * outer, mid + Math.sin(angle) * outer);
      ctx.stroke();
      /* The centre: you. */
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(mid, mid, 4, 0, Math.PI * 2);
      ctx.fill();
      if (!still) {
        angle += 0.012;
        frame = requestAnimationFrame(draw);
      }
    };
    draw();
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (still) draw(); });
    watch?.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      watch?.disconnect();
    };
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[28rem]" data-radarsweep>
      <canvas ref={art} className="absolute inset-0 h-full w-full rounded-full" aria-hidden />
      {blips.map((blip) => {
        const at = placeOf(blip);
        const lit = picked === blip.id;
        return (
          <button
            key={blip.id}
            type="button"
            data-radarblip={blip.id}
            onClick={() => onPick(blip.id)}
            title={blip.handle ? `${blip.name} ${blip.handle}` : blip.name}
            aria-pressed={lit}
            style={{ left: `${at.x}%`, top: `${at.y}%` }}
            className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center min-h-[44px] min-w-[44px] justify-center"
          >
            <span className={`block h-3.5 w-3.5 rounded-full border-2 transition ${
              lit
                ? 'border-white bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)] scale-125'
                : blip.score === null
                  ? 'border-cyan-300/80 bg-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.6)]'
                  : 'border-emerald-300 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
            }`} />
            <span className={`mt-0.5 max-w-[6rem] truncate rounded px-1 text-[10px] font-bold leading-tight ${
              lit ? 'bg-emerald-500 text-onAccent' : 'bg-zinc-950/80 text-zinc-200'
            }`}>
              {blip.name || blip.handle}
            </span>
          </button>
        );
      })}
    </div>
  );
}

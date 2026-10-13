'use client';

/**
 * The music video stage.
 *
 * Google's page had a stage with dancers a child drags about, three scenes,
 * a canvas of glitter and bubbles, and a "Record 10s Clip" button that
 * counted down and recorded nothing. The stage is here, and the button is
 * not — a render button that renders nothing was already left out of this
 * room once, in `lib/kidslook.ts`, for the reason that a child believes it.
 *
 * What the stage holds instead is the room's REAL video: `KidsRoom.tsx`
 * passes the "Make a video of it" button and, once it exists, the film, and
 * both are drawn here over the stage. So the dancers are the child's while
 * the song is being made into a video, and the video lands where they were
 * dancing.
 *
 * The dancers jump on the beat because the beat engine in `lib/kidsbeat.ts`
 * is one object: this component subscribes to it and bounces on every step.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { beatEngine } from '../lib/kidsbeat';
import { confetti } from '../lib/kidsconfetti';

type Scene = 'palace' | 'cosmic' | 'disco';
type Fx = 'sparkles' | 'bubbles' | 'strobe';

const SCENES: readonly { readonly id: Scene; readonly icon: string; readonly says: readonly [string, string]; readonly wash: string; readonly tile: string }[] = [
  { id: 'palace', icon: '🏰', says: ['kids.scenePalace', 'Palace'], wash: 'linear-gradient(180deg, #065f46 0%, #134e4a 50%, #022c22 100%)', tile: '#047857' },
  { id: 'cosmic', icon: '🌌', says: ['kids.sceneCosmic', 'Cosmic'], wash: 'linear-gradient(180deg, #1e1b4b 0%, #3b0764 50%, #000000 100%)', tile: '#3730a3' },
  { id: 'disco', icon: '🪩', says: ['kids.sceneDisco', 'Disco'], wash: 'linear-gradient(180deg, #4a044e 0%, #831843 50%, #022c22 100%)', tile: '#86198f' },
];

const STICKERS = ['🤖', '🦄', '🐵', '💎', '🐙', '🐲'] as const;

interface Dancer {
  readonly id: number;
  readonly emoji: string;
  /** Where on the stage, as a share of its width and height. */
  x: number;
  y: number;
}

const FIRST_DANCERS: readonly Dancer[] = [
  { id: 1, emoji: '🦖', x: 25, y: 78 },
  { id: 2, emoji: '🐰', x: 75, y: 72 },
  { id: 3, emoji: '⭐', x: 50, y: 22 },
];

interface Mote {
  x: number; y: number; vy: number; size: number; alpha: number; colour: string; bubble: boolean;
}

export default function KidsStage({
  caption,
  onSpark,
  children,
}: {
  /** The line under the stage: the song's sentence, or a welcome. */
  readonly caption: string;
  readonly onSpark: (n: number) => void;
  /** The real video button and, once made, the film — drawn by the room. */
  readonly children?: React.ReactNode;
}): React.ReactElement {
  const { t } = useLang();
  const [scene, setScene] = useState<Scene>('palace');
  const [fx, setFx] = useState<Record<Fx, boolean>>({ sparkles: true, bubbles: false, strobe: false });
  const [dancers, setDancers] = useState<Dancer[]>(() => FIRST_DANCERS.map((one) => ({ ...one })));
  const [jump, setJump] = useState(false);
  const nextId = useRef(10);
  const stage = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fxNow = useRef(fx);
  fxNow.current = fx;

  /* Jump on the beat. */
  useEffect(() => {
    let lastStep = -1;
    return beatEngine.subscribe(() => {
      if (beatEngine.step !== lastStep && beatEngine.step >= 0) {
        lastStep = beatEngine.step;
        setJump(true);
        setTimeout(() => setJump(false), 120);
      }
    });
  }, []);

  /* Glitter, bubbles and strobe, drawn on a canvas over the scene. */
  useEffect(() => {
    const art = canvas.current;
    const host = stage.current;
    if (!art || !host) return undefined;
    const ctx = art.getContext('2d');
    if (!ctx) return undefined;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const motes: Mote[] = [];
    let frame = 0;
    const fit = (): void => { art.width = host.clientWidth; art.height = host.clientHeight; };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(host);
    const draw = (): void => {
      ctx.clearRect(0, 0, art.width, art.height);
      const want = fxNow.current;
      if (want.strobe && Math.random() > 0.85) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 0, art.width, art.height);
      }
      if (want.sparkles && motes.length < 50) {
        motes.push({ x: Math.random() * art.width, y: art.height + 10, vy: -(0.5 + Math.random() * 2), size: 2 + Math.random() * 4, alpha: 1, colour: Math.random() > 0.5 ? '#a7f3d0' : '#fde047', bubble: false });
      }
      if (want.bubbles && Math.random() > 0.7) {
        motes.push({ x: Math.random() * art.width, y: art.height + 20, vy: -(1 + Math.random() * 2), size: 8 + Math.random() * 12, alpha: 0.8, colour: '#a7f3d0', bubble: true });
      }
      for (let i = motes.length - 1; i >= 0; i -= 1) {
        const one = motes[i];
        one.y += one.vy;
        one.alpha -= 0.005;
        ctx.beginPath();
        ctx.arc(one.x, one.y, one.size, 0, Math.PI * 2);
        if (one.bubble) {
          ctx.strokeStyle = `rgba(167,243,208,${Math.max(0, one.alpha)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, one.alpha) * 0.4})`;
          ctx.fill();
        } else {
          ctx.globalAlpha = Math.max(0, one.alpha);
          ctx.fillStyle = one.colour;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (one.y < -20 || one.alpha <= 0) motes.splice(i, 1);
      }
      if (!still) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); watch.disconnect(); };
  }, []);

  /* Dragging a dancer: pointer events, so a finger and a mouse are the same. */
  const dragging = useRef<number | null>(null);
  const moveTo = (id: number, clientX: number, clientY: number): void => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.min(95, Math.max(5, ((clientX - box.left) / box.width) * 100));
    const y = Math.min(92, Math.max(8, ((clientY - box.top) / box.height) * 100));
    setDancers((was) => was.map((one) => (one.id === id ? { ...one, x, y } : one)));
  };

  const add = (emoji: string): void => {
    nextId.current += 1;
    setDancers((was) => [...was, { id: nextId.current, emoji, x: 20 + Math.random() * 60, y: 60 + Math.random() * 25 }]);
    onSpark(5);
  };

  const chosen = SCENES.find((one) => one.id === scene) ?? SCENES[0];

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-4 backdrop-blur-sm sm:p-6" data-kidsstage>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
            <span aria-hidden>🎬</span> {t('kids.stageTitle', 'Music Video Stage')}
          </h2>
          <p className="text-xs text-surface-700">
            {t('kids.stageWhy', 'Drag the dancers, pick a scene, turn on the lights — then make a real video of your song.')}
          </p>
        </div>
        <button
          type="button"
          data-kidsconfettibtn
          onClick={() => { confetti(); onSpark(3); }}
          className="fb-kids-bouncy flex min-h-[44px] items-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-300 px-4 text-sm font-bold text-onAccent"
        >
          <span aria-hidden>🎉</span> {t('kids.confettiPop', 'Confetti Pop!')}
        </button>
      </div>

      {/* The stage itself. 16:9, the scene behind, the canvas over it, the
          dancers over that, and whatever the room passes in — the film — on
          top of everything. */}
      <div
        ref={stage}
        data-kidsstagefloor
        className="relative aspect-video w-full touch-none overflow-hidden rounded-3xl border-4 border-cyan-400/70 shadow-2xl"
        style={{ background: chosen.wash, transition: 'background 700ms ease' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(ellipse at top, rgba(167,243,208,0.35) 0%, rgba(0,0,0,0) 70%)' }}
        />
        <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
        {dancers.map((one) => (
          <div
            key={one.id}
            role="button"
            tabIndex={0}
            aria-label={t('kids.dancer', 'Dancer')}
            data-kidsdancer
            onPointerDown={(e) => { dragging.current = one.id; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (dragging.current === one.id) moveTo(one.id, e.clientX, e.clientY); }}
            onPointerUp={() => { dragging.current = null; }}
            onPointerCancel={() => { dragging.current = null; }}
            className="fb-kids-float absolute cursor-grab select-none text-5xl active:cursor-grabbing sm:text-7xl"
            style={{
              left: `${one.x}%`,
              top: `${one.y}%`,
              transform: `translate(-50%, -50%) ${jump ? 'scale(1.15) rotate(-6deg)' : ''}`,
              transition: 'transform 120ms ease',
              filter: 'drop-shadow(0 10px 8px rgba(0,0,0,0.5))',
            }}
          >
            {one.emoji}
          </div>
        ))}
        <div className="absolute inset-x-3 bottom-3 rounded-2xl border-2 border-cyan-300 bg-surface-50/90 p-2.5 text-center backdrop-blur-md sm:inset-x-4 sm:bottom-4">
          <p className="fb-kids-bubble text-sm text-amber-300 sm:text-lg" data-kidsstagecaption>{caption}</p>
        </div>
        {children}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-surface-300 bg-surface-100/70 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-surface-800">🏞️ {t('kids.sceneTitle', 'Stage scene')}</p>
          <div className="flex gap-2">
            {SCENES.map((one) => (
              <button
                key={one.id}
                type="button"
                data-kidsscene={one.id}
                aria-pressed={scene === one.id}
                onClick={() => { setScene(one.id); onSpark(2); }}
                style={{ background: one.tile }}
                className={`min-h-[44px] flex-1 rounded-xl border-2 px-2 text-xs font-bold text-white ${scene === one.id ? 'border-white' : 'border-transparent'}`}
              >
                {one.icon} {t(one.says[0], one.says[1])}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-surface-300 bg-surface-100/70 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-surface-800">💃 {t('kids.addDancer', 'Add a dancer')}</p>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {STICKERS.map((one) => (
              <button
                key={one}
                type="button"
                data-kidssticker
                onClick={() => add(one)}
                aria-label={`${t('kids.addDancer', 'Add a dancer')} ${one}`}
                className="fb-kids-bouncy min-h-[44px] min-w-[44px] rounded-xl bg-surface-200 text-2xl"
              >
                {one}
              </button>
            ))}
            <button
              type="button"
              data-kidsdancersreset
              onClick={() => setDancers([{ id: 1, emoji: '🐲', x: 50, y: 70 }])}
              className="min-h-[44px] flex-shrink-0 rounded-xl border border-surface-300 bg-surface-200 px-3 text-xs font-bold text-surface-900"
            >
              {t('kids.resetDancers', 'Reset')}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-surface-300 bg-surface-100/70 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-surface-800">✨ {t('kids.fxTitle', 'Live visual FX')}</p>
          <div className="flex gap-2">
            {([['sparkles', '✨', 'kids.fxSparkles', 'Glitters'], ['bubbles', '🫧', 'kids.fxBubbles', 'Bubbles'], ['strobe', '⚡', 'kids.fxStrobe', 'Strobe']] as const).map(([id, icon, key, en]) => (
              <button
                key={id}
                type="button"
                data-kidsfx={id}
                aria-pressed={fx[id]}
                onClick={() => setFx((was) => ({ ...was, [id]: !was[id] }))}
                className={`min-h-[44px] flex-1 rounded-xl px-2 text-xs font-bold ${
                  fx[id] ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-900'
                }`}
              >
                {icon} {t(key, en)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

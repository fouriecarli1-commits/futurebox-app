'use client';

/**
 * The arcade: two small games that make a sound when you win a point.
 *
 * From Google's "Kids Dream Studio" page of 13 October 2026, taken as drawn:
 * gems fall down four lanes and a child taps the lane as they reach the
 * bottom; bubbles float up and a child pops them before they leave. Each pop
 * and each catch rings a bell on the browser's own oscillator and earns a
 * star for the counter in the header.
 *
 * Both games are a canvas and a loop, nothing else: no score goes anywhere,
 * no credit is touched, and a game that has been left is stopped — the loop
 * is cancelled when the component goes, so a child who wandered off to the
 * stage is not running an arcade in the background of a phone.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { playSound } from '../lib/kidsbeat';
import { confetti } from '../lib/kidsconfetti';

type Game = 'melody' | 'bubble';

const LANES = ['🟢', '💎', '⭐', '🔔'] as const;
const LANE_WASH = ['#059669', '#0d9488', '#0891b2', '#ca8a04'] as const;

interface Gem { lane: number; x: number; y: number; }
interface Bubble { x: number; y: number; vy: number; r: number; pitch: number; colour: string; }

export default function KidsArcade({
  onSpark,
}: {
  readonly onSpark: (n: number) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [game, setGame] = useState<Game>('melody');
  const [melodyScore, setMelodyScore] = useState(0);
  const [bubbleScore, setBubbleScore] = useState(0);
  const [melodyOn, setMelodyOn] = useState(false);
  const [bubbleOn, setBubbleOn] = useState(false);
  const melodyCanvas = useRef<HTMLCanvasElement | null>(null);
  const bubbleCanvas = useRef<HTMLCanvasElement | null>(null);
  const gems = useRef<Gem[]>([]);
  const bubbles = useRef<Bubble[]>([]);

  /* ── Melody Tap ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!melodyOn || game !== 'melody') return undefined;
    const art = melodyCanvas.current;
    const ctx = art?.getContext('2d');
    if (!art || !ctx) return undefined;
    art.width = art.clientWidth;
    art.height = art.clientHeight;
    gems.current = [];
    let frame = 0;
    let lastSpawn = Date.now();
    const loop = (): void => {
      ctx.clearRect(0, 0, art.width, art.height);
      const laneW = art.width / 4;
      for (let i = 0; i < 4; i += 1) {
        ctx.strokeStyle = 'rgba(16,185,129,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(i * laneW, 0, laneW, art.height);
      }
      /* The catcher line, so a child can see where "the bottom" is. */
      ctx.fillStyle = 'rgba(253,224,71,0.25)';
      ctx.fillRect(0, art.height - 64, art.width, 48);
      if (Date.now() - lastSpawn > 850) {
        const lane = Math.floor(Math.random() * 4);
        gems.current.push({ lane, x: lane * laneW + laneW / 2, y: 0 });
        lastSpawn = Date.now();
      }
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      for (let i = gems.current.length - 1; i >= 0; i -= 1) {
        const gem = gems.current[i];
        gem.y += 2.8;
        ctx.fillText(LANES[gem.lane], gem.x, gem.y);
        if (gem.y > art.height) gems.current.splice(i, 1);
      }
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [melodyOn, game]);

  const tapLane = (lane: number): void => {
    playSound('bell', 440 + lane * 150);
    const art = melodyCanvas.current;
    if (!melodyOn || !art) return;
    const target = art.height - 40;
    const hit = gems.current.findIndex((gem) => gem.lane === lane && Math.abs(gem.y - target) < 65);
    if (hit !== -1) {
      gems.current.splice(hit, 1);
      setMelodyScore((was) => {
        const now = was + 10;
        if (now % 50 === 0) confetti(60);
        return now;
      });
      onSpark(5);
    }
  };

  /* ── Bubble Pop ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!bubbleOn || game !== 'bubble') return undefined;
    const art = bubbleCanvas.current;
    const ctx = art?.getContext('2d');
    if (!art || !ctx) return undefined;
    art.width = art.clientWidth;
    art.height = art.clientHeight;
    bubbles.current = [];
    let frame = 0;
    let lastSpawn = Date.now();
    const loop = (): void => {
      ctx.clearRect(0, 0, art.width, art.height);
      if (Date.now() - lastSpawn > 600 && bubbles.current.length < 15) {
        bubbles.current.push({
          x: 30 + Math.random() * (art.width - 60),
          y: art.height + 25,
          vy: 1.2 + Math.random() * 2,
          r: 20 + Math.random() * 20,
          pitch: 300 + Math.random() * 600,
          colour: Math.random() > 0.5 ? 'rgba(80,200,120,0.6)' : 'rgba(167,243,208,0.6)',
        });
        lastSpawn = Date.now();
      }
      for (let i = bubbles.current.length - 1; i >= 0; i -= 1) {
        const one = bubbles.current[i];
        one.y -= one.vy;
        ctx.beginPath();
        ctx.arc(one.x, one.y, one.r, 0, Math.PI * 2);
        ctx.fillStyle = one.colour;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(one.x - one.r * 0.3, one.y - one.r * 0.3, one.r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
        if (one.y < -one.r) bubbles.current.splice(i, 1);
      }
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [bubbleOn, game]);

  const pop = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!bubbleOn) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    for (let i = bubbles.current.length - 1; i >= 0; i -= 1) {
      const one = bubbles.current[i];
      if (Math.hypot(one.x - x, one.y - y) < one.r) {
        playSound('bell', one.pitch);
        bubbles.current.splice(i, 1);
        setBubbleScore((was) => was + 1);
        onSpark(3);
        break;
      }
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-4 backdrop-blur-xs sm:p-6" data-kidsarcade>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
            <span aria-hidden>🎮</span> {t('kids.arcadeTitle', 'Arcade: Rhythm & Bubbles!')}
          </h2>
          <p className="text-xs text-surface-700">
            {t('kids.arcadeWhy', 'Quick games that ring a bell and earn you star sparks.')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            data-kidsgame="melody"
            aria-pressed={game === 'melody'}
            onClick={() => setGame('melody')}
            className={`fb-kids-bouncy min-h-[44px] rounded-2xl px-4 text-xs font-bold sm:text-sm ${
              game === 'melody' ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-900'
            }`}
          >
            💎 {t('kids.melodyTap', 'Melody Tap')}
          </button>
          <button
            type="button"
            data-kidsgame="bubble"
            aria-pressed={game === 'bubble'}
            onClick={() => { setGame('bubble'); setBubbleScore(0); setBubbleOn(true); }}
            className={`fb-kids-bouncy min-h-[44px] rounded-2xl px-4 text-xs font-bold sm:text-sm ${
              game === 'bubble' ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-900'
            }`}
          >
            🫧 {t('kids.bubblePop', 'Bubble Pop')}
          </button>
        </div>
      </div>

      {game === 'melody' && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-surface-300 bg-surface-100/70 px-4 py-2.5">
            <span className="text-sm font-bold text-surface-800">{t('kids.melodyHow', 'Tap the lane when a gem reaches the yellow bar!')}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-surface-700">
                {t('kids.score', 'Score')}: <strong className="text-lg text-amber-300" data-kidsmelodyscore>{melodyScore}</strong>
              </span>
              <button
                type="button"
                data-kidsmelodystart
                onClick={() => { setMelodyScore(0); setMelodyOn(false); setTimeout(() => setMelodyOn(true), 0); }}
                className="fb-kids-bouncy min-h-[40px] rounded-xl bg-amber-300 px-3 text-xs font-bold text-onAccent"
              >
                {melodyOn ? `🔄 ${t('kids.restart', 'Restart')}` : `▶ ${t('kids.startGame', 'Start Game')}`}
              </button>
            </div>
          </div>
          <div className="relative h-80 w-full overflow-hidden rounded-2xl border-4 border-cyan-500/60 bg-black">
            <canvas ref={melodyCanvas} className="block h-full w-full" aria-hidden />
            <div className="absolute inset-x-2 bottom-2 grid grid-cols-4 gap-2">
              {LANES.map((one, at) => (
                <button
                  key={one}
                  type="button"
                  data-kidslane={at}
                  onPointerDown={() => tapLane(at)}
                  aria-label={`${t('kids.lane', 'Lane')} ${at + 1}`}
                  style={{ background: LANE_WASH[at] }}
                  className="fb-kids-bouncy min-h-[52px] rounded-2xl border-2 border-white/60 text-xl text-white"
                >
                  {one}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {game === 'bubble' && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-surface-300 bg-surface-100/70 px-4 py-2.5">
            <span className="text-sm font-bold text-surface-800">{t('kids.bubbleHow', 'Pop the bubbles before they float away!')}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-surface-700">
                {t('kids.popped', 'Popped')}: <strong className="text-lg text-amber-300" data-kidsbubblescore>{bubbleScore}</strong>
              </span>
              <button
                type="button"
                data-kidsbubblestart
                onClick={() => { setBubbleScore(0); setBubbleOn(false); setTimeout(() => setBubbleOn(true), 0); }}
                className="fb-kids-bouncy min-h-[40px] rounded-xl bg-amber-300 px-3 text-xs font-bold text-onAccent"
              >
                ▶ {t('kids.startPopping', 'Start Popping')}
              </button>
            </div>
          </div>
          <div className="relative h-80 w-full overflow-hidden rounded-2xl border-4 border-cyan-500/60" style={{ background: 'linear-gradient(180deg, #042f2e, #022c22)' }}>
            <canvas ref={bubbleCanvas} onPointerDown={pop} className="block h-full w-full cursor-crosshair touch-none" aria-label={t('kids.bubblePop', 'Bubble Pop')} />
          </div>
        </div>
      )}
    </div>
  );
}

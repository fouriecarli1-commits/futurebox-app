'use client';

/**
 * The video editor's toolbox, phase 3: generators and effects, packed the way
 * the transitions are (`JoinToolbox.tsx`) — grouped under headings that fold,
 * one row per tool with a small moving picture of what it does beside its
 * name.
 *
 * The owner, 16 October 2026, screenshots of a desktop editor's toolbox: *"Kyk
 * ook hoe netjies dit verpak is."*
 *
 * The pictures are drawn by the same code that makes the film:
 * `drawGenerator` for a generator, and `paintFx` over our own drawn Highveld
 * evening (`drawSample`) for an effect. The one under the pointer and the
 * chosen ones play; the rest hold a frame.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import {
  AUDIO_FX, AUDIO_FX_GROUPS, audioFxLabel, chainAudioFx,
  type AudioFxGroup, type AudioFxId, type AudioFxOn,
} from '../lib/audiofx';
import { drawSample } from '../lib/postfilters';
import { FX, FX_GROUPS, fxLabel, paintFx, type FxGroup, type FxId, type FxOn } from '../lib/videofx';
import {
  GENERATORS, GENERATOR_GROUPS, GENERATOR_INKS, drawGenerator, generatorLabel,
  type GeneratorGroup, type GeneratorId, type GeneratorInks,
} from '../lib/videogenerators';

type T = (key: string, fallback: string) => string;

/** A small moving picture, redrawn by `paint` at a time in seconds. */
function Moving({ paint, live, still = 0.8 }: {
  readonly paint: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
  readonly live: boolean;
  readonly still?: number;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return undefined;
    if (!live) {
      paint(ctx, el.width, el.height, still);
      return undefined;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number): void => {
      paint(ctx, el.width, el.height, ((now - started) / 1000) % 3);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paint, live, still]);
  return <canvas ref={canvas} width={96} height={54} aria-hidden className="h-9 w-16 shrink-0 rounded-md border border-zinc-700" />;
}

/** A group heading that folds, the same as the transitions'. */
function Head({ id, name, count, open, onFlip, mark }: {
  readonly id: string; readonly name: string; readonly count: number; readonly open: boolean; readonly onFlip: () => void; readonly mark: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-expanded={open}
      {...{ [`data-${mark}`]: id }}
      onClick={onFlip}
      className="flex h-11 w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-left text-sm font-bold text-zinc-200"
    >
      <span>{name}</span>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
        {count}
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </span>
    </button>
  );
}

/* ── Generators ─────────────────────────────────────────────────────────── */

const LENGTHS = [2, 3, 5, 8] as const;

export function GeneratorToolbox({ lang, t, onMake }: {
  readonly lang: string;
  readonly t: T;
  /** Make the clip and put it on the clock; resolves when it is there. */
  readonly onMake: (id: GeneratorId, inks: GeneratorInks, seconds: number, name: string) => Promise<void>;
}): React.ReactElement {
  const [open, setOpen] = useState<ReadonlySet<GeneratorGroup>>(() => new Set<GeneratorGroup>(['colour']));
  const [hover, setHover] = useState<GeneratorId | null>(null);
  const [picked, setPicked] = useState<GeneratorId>('gradient');
  const [inks, setInks] = useState<GeneratorInks>({ a: GENERATOR_INKS[0], b: GENERATOR_INKS[1] });
  const [seconds, setSeconds] = useState<number>(3);
  const [making, setMaking] = useState(false);
  const spec = GENERATORS.find((one) => one.id === picked);

  return (
    <div className="space-y-2" data-editorgenerators>
      {GENERATOR_GROUPS.map((group) => {
        const members = GENERATORS.filter((one) => one.group === group.id);
        const isOpen = open.has(group.id);
        return (
          <section key={group.id} className="space-y-1.5">
            <Head
              id={group.id}
              mark="editorgenhead"
              name={generatorLabel(group, lang)}
              count={members.length}
              open={isOpen}
              onFlip={() => setOpen((was) => { const next = new Set(was); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })}
            />
            {isOpen && members.map((one) => (
              <button
                key={one.id}
                type="button"
                data-editorgenerator={one.id}
                aria-pressed={picked === one.id}
                onClick={() => setPicked(one.id)}
                onPointerEnter={() => setHover(one.id)}
                onPointerLeave={() => setHover((was) => (was === one.id ? null : was))}
                className={`flex h-11 w-full items-center gap-2.5 rounded-xl border px-1.5 py-0.5 text-left text-sm font-semibold ${picked === one.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-900 text-zinc-200'}`}
              >
                <Moving
                  live={picked === one.id || hover === one.id}
                  paint={(ctx, w, h, time) => drawGenerator(ctx, one.id, w, h, time, inks)}
                />
                <span className="truncate">{generatorLabel(one, lang)}</span>
              </button>
            ))}
          </section>
        );
      })}

      {spec?.inked && (
        <div className="space-y-1.5" data-editorgeninks>
          {(['a', 'b'] as const).map((which) => (
            <div key={which} className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 text-xs text-zinc-400">{which === 'a' ? t('edit.genInkA', 'Colour') : t('edit.genInkB', 'Second')}</span>
              {GENERATOR_INKS.map((ink) => (
                <button
                  key={ink}
                  type="button"
                  data-editorgenink={`${which}-${ink}`}
                  aria-pressed={inks[which] === ink}
                  aria-label={ink}
                  onClick={() => setInks((was) => ({ ...was, [which]: ink }))}
                  className={`h-11 w-11 rounded-full border-2 ${inks[which] === ink ? 'border-emerald-400' : 'border-zinc-700'}`}
                  style={{ background: ink }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-16 text-xs text-zinc-400">{t('edit.genLong', 'How long')}</span>
        {LENGTHS.map((one) => (
          <button
            key={one}
            type="button"
            data-editorgenlong={one}
            aria-pressed={seconds === one}
            onClick={() => setSeconds(one)}
            className={`h-11 rounded-full border px-3 text-xs font-bold ${seconds === one ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 text-zinc-300'}`}
          >
            {one}s
          </button>
        ))}
      </div>

      <button
        type="button"
        data-editorgenmake
        disabled={making || !spec}
        onClick={() => {
          if (!spec) return;
          setMaking(true);
          void onMake(spec.id, inks, seconds, generatorLabel(spec, lang)).finally(() => setMaking(false));
        }}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-500/15 px-3 text-sm font-bold text-emerald-300 disabled:opacity-50"
      >
        {making ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {making ? t('edit.genMaking', 'Making it…') : t('edit.genMake', 'Put it on the clock')}
      </button>
    </div>
  );
}

/* ── Effects ────────────────────────────────────────────────────────────── */

/** Our drawn evening, made once, for every effect's picture to sit on. */
let evening: HTMLCanvasElement | null = null;
function eveningOf(): HTMLCanvasElement | null {
  if (evening || typeof document === 'undefined') return evening;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 54;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  drawSample(ctx, 96, 54);
  evening = c;
  return c;
}

export function EffectToolbox({ value, onChange, lang, t, groups, mark = 'editoreffects' }: {
  readonly value: readonly FxOn[];
  readonly onChange: (next: FxOn[]) => void;
  readonly lang: string;
  readonly t: T;
  /** Which shelf: the effects laid over a shot, or the filters that restyle it. */
  readonly groups: readonly FxGroup[];
  readonly mark?: string;
}): React.ReactElement {
  const [open, setOpen] = useState<ReadonlySet<FxGroup>>(() => new Set<FxGroup>(groups.slice(0, 1)));
  const [hover, setHover] = useState<FxId | null>(null);
  const amountOf = (id: FxId): number | null => value.find((one) => one.id === id)?.amount ?? null;
  const flip = (id: FxId): void => {
    const rest = FX.find((one) => one.id === id)?.rest ?? 0.5;
    onChange(amountOf(id) === null ? [...value, { id, amount: rest }] : value.filter((one) => one.id !== id));
  };

  return (
    <div className="space-y-2" {...{ [`data-${mark}`]: '' }}>
      {FX_GROUPS.filter((group) => groups.includes(group.id)).map((group) => {
        const members = FX.filter((one) => one.group === group.id);
        const isOpen = open.has(group.id);
        return (
          <section key={group.id} className="space-y-1.5">
            <Head
              id={group.id}
              mark="editorfxhead"
              name={fxLabel(group, lang)}
              count={members.length}
              open={isOpen}
              onFlip={() => setOpen((was) => { const next = new Set(was); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })}
            />
            {isOpen && members.map((one) => {
              const amount = amountOf(one.id);
              const on = amount !== null;
              return (
                <div
                  key={one.id}
                  className={`space-y-1 rounded-xl border px-1.5 py-1 ${on ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'}`}
                  onPointerEnter={() => setHover(one.id)}
                  onPointerLeave={() => setHover((was) => (was === one.id ? null : was))}
                >
                  <button
                    type="button"
                    data-editoreffect={one.id}
                    aria-pressed={on}
                    onClick={() => flip(one.id)}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 text-left text-sm font-semibold ${on ? 'text-emerald-300' : 'text-zinc-200'}`}
                  >
                    <Moving
                      live={on || hover === one.id}
                      paint={(ctx, w, h, time) => {
                        const from = eveningOf();
                        ctx.clearRect(0, 0, w, h);
                        if (from) ctx.drawImage(from, 0, 0, w, h);
                        paintFx(ctx, w, h, one.id === 'flash' ? time % 1 : time, [{ id: one.id, amount: amount ?? one.rest }]);
                      }}
                      still={one.id === 'flash' ? 0.1 : 0.8}
                    />
                    <span className="flex-1 truncate">{fxLabel(one, lang)}</span>
                    <span className="text-xs font-bold">{on ? t('edit.fxOn', 'On') : ''}</span>
                  </button>
                  {on && (
                    <label className="flex items-center gap-2 px-1 pb-1 text-xs text-zinc-400">
                      <span className="w-14">{t('edit.fxHow', 'Strength')}</span>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={amount ?? one.rest}
                        data-editoreffectamount={one.id}
                        onChange={(event) => onChange(value.map((mine) => (mine.id === one.id ? { ...mine, amount: Number(event.target.value) } : mine)))}
                        className="flex-1 accent-emerald-500"
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

/**
 * The film's preview with a shot's effects on it: the frame drawn from the
 * playing film with its grade, and `paintFx` over it, every frame — the same
 * two calls the renderer makes, so the preview is the export.
 */
export function FxFrame({ video, fx, grade, fill, from, speed }: {
  readonly video: React.RefObject<HTMLVideoElement | null>;
  readonly fx: readonly FxOn[];
  readonly grade: string;
  readonly fill: boolean;
  /** Where the shot starts in its file, and how fast it plays — for the time into the shot. */
  readonly from: number;
  readonly speed: number;
}): React.ReactElement {
  const sheet = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let frame = 0;
    const paint = (): void => {
      const el = sheet.current;
      const film = video.current;
      const ctx = el?.getContext('2d');
      if (el && film && ctx) {
        const scale = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.round(el.clientWidth * scale));
        const h = Math.max(1, Math.round(el.clientHeight * scale));
        if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        const vw = film.videoWidth;
        const vh = film.videoHeight;
        if (vw && vh && film.readyState >= 2) {
          const k = fill ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh);
          if (grade) ctx.filter = grade;
          try { ctx.drawImage(film, (w - vw * k) / 2, (h - vh * k) / 2, vw * k, vh * k); } catch { /* next frame */ }
          ctx.filter = 'none';
          paintFx(ctx, w, h, (film.currentTime - from) / Math.max(0.1, speed), fx);
        }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [video, fx, grade, fill, from, speed]);
  return <canvas ref={sheet} aria-hidden data-editorfxframe className="pointer-events-none absolute inset-0 z-[5] h-full w-full" />;
}

/* ── Sound effects ──────────────────────────────────────────────────────── */

export function AudioFxToolbox({ value, onChange, lang, t, mark }: {
  readonly value: readonly AudioFxOn[];
  readonly onChange: (next: AudioFxOn[]) => void;
  readonly lang: string;
  readonly t: T;
  /** The data attribute probes find this shelf by — one for a shot, one for the song. */
  readonly mark: string;
}): React.ReactElement {
  const [open, setOpen] = useState<ReadonlySet<AudioFxGroup>>(() => new Set<AudioFxGroup>(['voice']));
  const amountOf = (id: AudioFxId): number | null => value.find((one) => one.id === id)?.amount ?? null;
  const flip = (id: AudioFxId): void => {
    const rest = AUDIO_FX.find((one) => one.id === id)?.rest ?? 0.5;
    onChange(amountOf(id) === null ? [...value, { id, amount: rest }] : value.filter((one) => one.id !== id));
  };
  return (
    <div className="space-y-2" {...{ [`data-${mark}`]: '' }}>
      {AUDIO_FX_GROUPS.map((group) => {
        const members = AUDIO_FX.filter((one) => one.group === group.id);
        const isOpen = open.has(group.id);
        return (
          <section key={group.id} className="space-y-1.5">
            <Head
              id={group.id}
              mark={`${mark}head`}
              name={audioFxLabel(group, lang)}
              count={members.length}
              open={isOpen}
              onFlip={() => setOpen((was) => { const next = new Set(was); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })}
            />
            {isOpen && members.map((one) => {
              const amount = amountOf(one.id);
              const on = amount !== null;
              return (
                <div key={one.id} className={`space-y-1 rounded-xl border px-2 py-1.5 ${on ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
                  <button
                    type="button"
                    {...{ [`data-${mark}item`]: one.id }}
                    aria-pressed={on}
                    onClick={() => flip(one.id)}
                    className={`flex min-h-[44px] w-full items-center gap-2 text-left ${on ? 'text-emerald-300' : 'text-zinc-200'}`}
                  >
                    <AudioLines className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{audioFxLabel(one, lang)}</span>
                      <span className="block text-xs text-zinc-400">{lang === 'af' ? one.what[1] : one.what[0]}</span>
                    </span>
                    <span className="text-xs font-bold">{on ? t('edit.fxOn', 'On') : ''}</span>
                  </button>
                  {on && (
                    <label className="flex items-center gap-2 px-1 pb-1 text-xs text-zinc-400">
                      <span className="w-14">{t('edit.fxHow', 'Strength')}</span>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={amount ?? one.rest}
                        {...{ [`data-${mark}amount`]: one.id }}
                        onChange={(event) => onChange(value.map((mine) => (mine.id === one.id ? { ...mine, amount: Number(event.target.value) } : mine)))}
                        className="flex-1 accent-emerald-500"
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Route a player's sound through a chain of sound effects, live — the same
 * `chainAudioFx` the export builds, so what she hears while cutting is what
 * the film will sound like.
 *
 * Left alone until there is an effect: once a player's sound goes through
 * the Web Audio graph it stays there for the life of the element, so a film
 * with no sound effects never touches it.
 */
export function useAudioFx(player: React.RefObject<HTMLMediaElement | null>, list: readonly AudioFxOn[] | undefined): void {
  const route = useRef<{ ctx: AudioContext; source: MediaElementAudioSourceNode; undo?: () => void } | null>(null);
  const key = JSON.stringify(list ?? []);
  useEffect(() => {
    const el = player.current;
    /* Read back from the key, so the effect depends on the list's contents
       and not on a new array each render. */
    const want = JSON.parse(key) as AudioFxOn[];
    if (!el || (!want.length && !route.current)) return undefined;
    if (!route.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return undefined;
      try {
        const ctx = new Ctx();
        route.current = { ctx, source: ctx.createMediaElementSource(el) };
      } catch {
        return undefined;
      }
    }
    const here = route.current;
    here.undo?.();
    here.undo = chainAudioFx(here.ctx, here.source, here.ctx.destination, want);
    /* A context made outside a press starts asleep; playing wakes it. */
    const wake = (): void => { void here.ctx.resume(); };
    wake();
    el.addEventListener('play', wake);
    return () => el.removeEventListener('play', wake);
  }, [player, key]);
}

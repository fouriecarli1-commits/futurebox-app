'use client';

/**
 * A child's storybook, played: the picture moves, things float over it, the
 * page turns, whoever is talking pops up in a bubble, the words light up as
 * they are said, and every page ends on a question.
 *
 * The owner, 19 October 2026: *"storie generasie moet meer motion en meer
 * visual wees. Dit moet regtig 'n kind se breim tickle."* The reader was a
 * still picture over a paragraph. Everything here is drawn by the browser
 * from what the story engine wrote (`lib/kidstory.ts`), so the motion costs
 * nothing and works on a book read a hundred times from the shelf.
 *
 * Used where a book is made (`KidsStoryboard`) and where a kept one is opened
 * (`StoryShelf`). A book with none of the engine's extras — one kept before
 * today, or made in the grown-up's Story mode — still turns, moves and
 * sparkles; it only has no speakers to show and no questions to ask.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useLang } from '../lib/i18n';
import type { KeptStory } from '../lib/storykeep';
import { SPARKLE_BITS, lineShares, spokenLines, wordAt, type Sparkle } from '../lib/kidstory';
import { bare, kidVoice } from '../lib/kidsvoices';
import { readAloud, stopReading } from '../lib/kidspip';

/** Time to answer a question before the page turns. A child needs it. */
const THINK_MS = 3500;
/** Between pages with no question. */
const TURN_MS = 150;
/** How fast the phone's own voice is guessed to read, for lighting words. */
const PHONE_CHARS_A_SECOND = 13;

/** Where the floaters on a page start, the same each time the page opens. */
function floaters(seed: number, count: number): { left: number; top: number; delay: number; size: number; bit: number }[] {
  const next = (n: number): number => {
    const x = Math.sin(seed * 97.13 + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    left: 4 + next(i) * 92,
    top: 40 + next(i + 50) * 58,
    delay: next(i + 100) * 5,
    size: 14 + next(i + 150) * 18,
    bit: Math.floor(next(i + 200) * 3),
  }));
}

/** The eight directions a tap's sparkles fly. */
const BURST = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { dx: `${Math.round(Math.cos(angle) * 60)}px`, dy: `${Math.round(Math.sin(angle) * 60)}px` };
});

export default function KidsStoryPlayer({
  story,
  actions,
  say = (words) => words,
}: {
  readonly story: KeptStory;
  /** Buttons beside the title — Keep, Done. */
  readonly actions?: React.ReactNode;
  /** Words as they should be shown (the shelf mends old stories' keys). */
  readonly say?: (words: string) => string;
}): React.ReactElement {
  const { t, lang } = useLang();
  const tongue = lang === 'af' ? 'af' : 'en';
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [share, setShare] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [ended, setEnded] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);

  const here = story.pages[page];
  const lines = useMemo(() => here?.lines ?? [], [here]);

  /* One address per picture for as long as this book is open. */
  const pictures = useMemo(() => story.pages.map((one) => URL.createObjectURL(one.picture)), [story]);
  useEffect(() => () => pictures.forEach((one) => URL.revokeObjectURL(one)), [pictures]);

  const run = useRef(0);
  const sound = useRef<HTMLAudioElement | null>(null);
  const soundUrl = useRef('');
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quiet = useCallback(() => {
    run.current += 1;
    sound.current?.pause();
    sound.current = null;
    if (soundUrl.current) URL.revokeObjectURL(soundUrl.current);
    soundUrl.current = '';
    stopReading();
    cancelAnimationFrame(frame.current);
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => quiet, [quiet]);

  const playFrom = useCallback((at: number): void => {
    quiet();
    const token = run.current;
    const one = story.pages[at];
    if (!one) return;
    setPage(at);
    setShare(0);
    setThinking(false);
    setEnded(false);
    setPlaying(true);
    const wonder = one.wonder?.trim() ?? '';

    const after = (): void => {
      if (token !== run.current) return;
      cancelAnimationFrame(frame.current);
      setShare(1);
      if (wonder) setThinking(true);
      timer.current = setTimeout(() => {
        if (token !== run.current) return;
        if (at + 1 < story.pages.length) playFrom(at + 1);
        else { setPlaying(false); setThinking(false); setEnded(true); }
      }, wonder ? THINK_MS : TURN_MS);
    };

    const byPhone = (): void => {
      const words = one.lines?.length ? one.lines.map((line) => bare(line.text)).join(' ') : say(one.text);
      const guess = Math.max(2, (words.length + wonder.length) / PHONE_CHARS_A_SECOND) * 1000;
      const began = performance.now();
      const tick = (): void => {
        if (token !== run.current) return;
        setShare(Math.min(0.98, (performance.now() - began) / guess));
        frame.current = requestAnimationFrame(tick);
      };
      const started = readAloud(words, tongue, () => {
        if (token !== run.current) return;
        if (!wonder) { after(); return; }
        if (!readAloud(wonder, tongue, after)) after();
      });
      if (!started) { setPlaying(false); setNoVoice(true); return; }
      frame.current = requestAnimationFrame(tick);
    };

    /* Books from before the story engine: the template's pages carried six
       seconds of chimes as their "reading" (`kidsstoryboard.ts`), which is
       the "Read to me werk nie" of 15 October. They are read by the phone. */
    const usePhone = Boolean(one.phone || (story.id.startsWith('kidstory-') && !one.lines));
    if (usePhone || !one.audio || one.audio.size < 64) { byPhone(); return; }
    soundUrl.current = URL.createObjectURL(one.audio);
    const audio = new Audio(soundUrl.current);
    sound.current = audio;
    const tick = (): void => {
      if (token !== run.current) return;
      if (audio.duration > 0) setShare(audio.currentTime / audio.duration);
      frame.current = requestAnimationFrame(tick);
    };
    audio.onended = after;
    audio.play().then(() => { frame.current = requestAnimationFrame(tick); }).catch(() => {
      if (token === run.current) byPhone();
    });
  }, [quiet, say, story, tongue]);

  const pause = (): void => { quiet(); setPlaying(false); setThinking(false); };
  const turnTo = (at: number): void => {
    quiet();
    setPlaying(false);
    setThinking(false);
    setEnded(false);
    setShare(0);
    setPage(Math.max(0, Math.min(story.pages.length - 1, at)));
  };

  /* ── Who is talking, and which word ─────────────────────────────────── */
  const spoken = useMemo(() => (lines.length ? spokenLines({ lines, wonder: here?.wonder }) : []), [lines, here]);
  const shares = useMemo(() => lineShares(spoken), [spoken]);
  const lineNow = playing ? shares.findIndex((one) => share < one.end) : -1;
  const asking = thinking || (lineNow >= lines.length && lines.length > 0);
  const speaking = lineNow >= 0 && lineNow < lines.length ? lines[lineNow] : asking && lines.length ? spoken[spoken.length - 1] : null;
  const persona = speaking ? kidVoice(speaking.who) : null;
  const storyEnd = lines.length ? shares[lines.length - 1]?.end ?? 1 : 1;
  const words = useMemo(
    () => (lines.length ? lines.map((line) => bare(line.text)).join(' ') : say(here?.text ?? '')).split(/\s+/).filter(Boolean),
    [lines, here, say],
  );
  const lit = playing && !asking
    ? wordAt(lines.length ? lines : [{ text: words.join(' ') }], Math.min(1, share / storyEnd))
    : -1;

  const sparkle: Sparkle = here?.sparkle ?? 'stars';
  const bits = SPARKLE_BITS[sparkle];
  const floating = useMemo(() => floaters(page + 1, 12), [page]);
  const motion = here?.motion ?? (['zoom-in', 'pan-left', 'zoom-out', 'pan-right'] as const)[page % 4];

  const burst = (event: React.PointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setBursts((was) => [...was.slice(-5), { id, x: event.clientX - box.left, y: event.clientY - box.top }]);
    setTimeout(() => setBursts((was) => was.filter((one) => one.id !== id)), 900);
  };

  if (!here) return <div data-storyplayer />;

  return (
    <div className="space-y-3" data-storyplayer>
      <div className="space-y-2 rounded-2xl border border-surface-200 bg-surface-100/90 p-3">
        <div className="min-w-0">
          <span className="text-[11px] font-black uppercase tracking-wider text-surface-600">
            {t('kids.pageCount', 'Page {current} of {total}')
              .replace('{current}', String(page + 1))
              .replace('{total}', String(story.pages.length))}
          </span>
          <h3 className="text-base font-black leading-snug text-surface-950">{say(story.title)}</h3>
        </div>
        {actions}
      </div>

      {/* ── The page ──────────────────────────────────────────────────── */}
      <div style={{ perspective: '1400px' }}>
        <div
          key={page}
          data-storypage={page}
          onPointerDown={burst}
          className="fb-story-turn relative aspect-[4/3] w-full touch-manipulation select-none overflow-hidden rounded-3xl border-4 border-amber-300/80 bg-surface-100 shadow-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pictures[page]}
            alt=""
            draggable={false}
            data-storymotion={motion}
            className={`fb-story-move fb-story-${motion} h-full w-full object-cover`}
            style={{ animationDuration: `${Math.max(9, Math.round((here.seconds || 8) * 1.3))}s` }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0" data-storysparkle={sparkle}>
            {floating.map((one, i) => (
              <span
                key={i}
                className="fb-story-floater absolute"
                style={{ left: `${one.left}%`, top: `${one.top}%`, animationDelay: `${one.delay}s`, fontSize: `${one.size}px` }}
              >
                {bits[one.bit] ?? bits[0]}
              </span>
            ))}
          </div>
          {bursts.map((one) => (
            <span key={one.id} aria-hidden data-storyburst className="fb-story-burst pointer-events-none absolute" style={{ left: one.x, top: one.y }}>
              {BURST.map((way, i) => (
                <span key={i} style={{ '--dx': way.dx, '--dy': way.dy } as React.CSSProperties}>{bits[i % bits.length]}</span>
              ))}
            </span>
          ))}

          {persona && speaking && (
            <div
              key={`${lineNow}-${speaking.who}`}
              data-storyspeaker={speaking.who}
              className="fb-story-pop absolute bottom-3 left-3 flex max-w-[80%] items-center gap-2 rounded-full bg-surface-50/95 py-1.5 pl-1.5 pr-4 shadow-lg"
              style={{ boxShadow: `0 0 0 3px ${persona.glow}, 0 0 22px ${persona.glow}` }}
            >
              <span className="fb-story-talk flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 text-2xl" aria-hidden>{persona.emoji}</span>
              <span className="truncate text-sm font-black text-surface-950">{speaking.name || t(persona.name[0], persona.name[1])}</span>
            </div>
          )}

          {asking && here.wonder && (
            <div data-storywonder className="fb-story-pop absolute inset-x-3 top-3 rounded-2xl border-2 border-amber-300 bg-surface-50/95 px-4 py-3 text-base font-black leading-snug text-surface-950 shadow-xl">
              <span className="fb-story-talk mr-1.5" aria-hidden>🤔</span>{here.wonder}
            </div>
          )}

          {ended && (
            <div data-storyend className="fb-story-pop absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-950/55">
              <span className="text-5xl" aria-hidden>🎉</span>
              <span className="rounded-2xl bg-surface-50/95 px-5 py-2 text-2xl font-black text-surface-950">{t('kids.theEnd', 'The End!')}</span>
              <button
                type="button"
                data-storyagain
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => playFrom(0)}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-amber-400 px-5 text-sm font-black text-onAccent"
              >
                <RotateCcw className="h-4 w-4" /> {t('kids.readAgain', 'Read it again')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* On the room's own paper: light text on pale cream was the
          unreadable page in the owner's screenshot. */}
      <div className="rounded-2xl border-2 border-amber-300/80 bg-surface-100 p-4 sm:p-5">
        <p data-kidspagetext className="text-lg font-bold leading-relaxed text-surface-950">
          {words.map((word, i) => (
            <React.Fragment key={i}>
              <span data-storyword={i === lit ? 'on' : undefined} className={i === lit ? 'fb-story-lit rounded-md bg-amber-400 px-0.5 text-onAccent' : undefined}>
                {word}
              </span>{' '}
            </React.Fragment>
          ))}
        </p>
      </div>

      {noVoice && (
        <p className="rounded-2xl border-2 border-surface-200 bg-surface-100 px-4 py-3 text-sm font-semibold text-surface-900">
          {t('kids.noVoice', 'This phone has no reading voice switched on. A grown-up can turn on text-to-speech in the phone’s settings.')}
        </p>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <button
          type="button"
          onClick={() => turnTo(page - 1)}
          disabled={page === 0}
          aria-label={t('kids.prevPage', 'Previous Page')}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-surface-300 bg-surface-50 text-surface-800 disabled:opacity-30"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          data-kidsreadtome
          data-storyplay
          aria-pressed={playing}
          onClick={() => (playing ? pause() : playFrom(ended ? 0 : page))}
          className={`inline-flex min-h-[64px] items-center gap-2 rounded-full px-6 text-base font-black shadow-lg ${playing ? 'bg-purple-500 text-white' : 'bg-amber-400 text-onAccent'}`}
        >
          {playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
          <span>{playing ? t('kids.readStop', 'Stop reading') : t('kids.readToMe', 'Read to me')}</span>
        </button>
        <button
          type="button"
          onClick={() => turnTo(page + 1)}
          disabled={page === story.pages.length - 1}
          aria-label={t('kids.nextPage', 'Next Page')}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md disabled:opacity-30"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      {!playing && page === 0 && share === 0 && (
        <p className="text-center text-xs font-bold text-surface-600">{t('kids.tapSparkle', 'Tap the picture to make it sparkle!')}</p>
      )}
    </div>
  );
}

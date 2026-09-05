'use client';

/**
 * One song, the whole screen, and the next one a swipe away.
 *
 * ── What this is ─────────────────────────────────────────────────────────
 *
 * The channel is a grid of small cards, which is right for finding a song and
 * wrong for listening to one. Carli, pointing at a phone: tap a song and it
 * should open full screen like TikTok, swipe up for the next, and on a song
 * with no video the words should be on the screen, moving and highlighting
 * with the music.
 *
 * ── Why the scrolling is not written here ────────────────────────────────
 *
 * `scroll-snap` does it. One panel per screen, `snap-y snap-mandatory`, and
 * the browser handles the flick, the rubber band, the momentum and the
 * settling — all of which are hard to write and impossible to write as well
 * as the platform already has. What is written here is only *noticing* which
 * panel has settled, and that is an IntersectionObserver rather than a scroll
 * handler: a scroll handler fires sixty times a second to answer a question
 * that changes twice a minute.
 *
 * ── One audio element ────────────────────────────────────────────────────
 *
 * Not one per song. Ten `<audio>` elements each holding an object URL for a
 * decoded track is ten copies of the audio in memory, and on a phone that is
 * how a browser tab gets killed. The element follows whichever song is on
 * screen, and the previous song's URL is revoked as it goes.
 *
 * ── Why it is a portal ───────────────────────────────────────────────────
 *
 * `position: fixed` is not always relative to the window. Any ancestor with a
 * transform, a filter, `backdrop-filter`, `contain` or `will-change` becomes
 * the containing block instead, and a full-screen overlay quietly stops being
 * full screen — measured here at twenty pixels down and twenty short, with
 * the room it opened from showing along the top edge.
 *
 * Rendering into `document.body` has no such dependency on where it was
 * mounted from, which matters because this is opened from the channel today
 * and will be opened from the feed tomorrow.
 *
 * ── The words, and what they honestly are ────────────────────────────────
 *
 * A song this app wrote carries the plan it was written from — which words
 * are in which section, and how long each section was asked to be — so the
 * lines can be laid on the clock. A song brought in from a file has no plan,
 * and its words are spread evenly across its length instead, which nobody
 * sings. The screen says which of the two it is doing rather than letting
 * somebody assume the second is the first.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pause, Play, Quote, X } from 'lucide-react';
import Cover from './Cover';
import { readAudio } from '../lib/trackaudio';
import { lineAt, partsOf, timelineOf, type Part, type TimedLine } from '../lib/timeline';
import { useLang } from '../lib/i18n';
import type { Track } from '../lib/library';

/**
 * Literal colours, not the theme's.
 *
 * This app remaps Tailwind's `white` and `black` onto theme variables, so in
 * the light theme `text-white` renders near-black and `bg-black/50` renders a
 * pale scrim. That is right everywhere else and wrong here: this screen is
 * white text over somebody's cover art, and a scrim over a picture is not a
 * theme colour — it is dark because the picture underneath it is unknown.
 *
 * Found by measuring the rendered colour rather than by looking: on a light
 * cover the words came out dark grey on pale green and read as broken styling.
 */
const INK = 'text-[#ffffff]';
const INK_SOFT = 'text-[rgba(255,255,255,0.72)]';
const INK_DIM = 'text-[rgba(255,255,255,0.45)]';
const GLASS = 'bg-[rgba(255,255,255,0.16)]';
const SHADE = 'bg-[rgba(0,0,0,0.5)]';

/**
 * The words of a song, on the clock.
 *
 * `real` is whether the timing came from the plan this app wrote or from
 * spreading the sheet evenly over the length. Both are useful; only one of
 * them is accurate, and the caller has to be able to tell them apart.
 */
export function wordsFor(track: Track): { lines: readonly TimedLine[]; real: boolean } {
  const seconds = track.seconds || 0;
  const planned = (track.parts ?? []) as readonly Part[];
  if (planned.length && seconds) return { lines: timelineOf(planned, seconds), real: true };
  if (track.lyrics.trim() && seconds) {
    return { lines: timelineOf(partsOf(track.lyrics), seconds), real: false };
  }
  return { lines: [], real: false };
}

export default function SongScreen({
  tracks,
  startAt,
  onClose,
}: {
  readonly tracks: readonly Track[];
  /** The song that was tapped, so it opens on that one rather than the first. */
  readonly startAt: string;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const scroller = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  const opening = Math.max(0, tracks.findIndex((one) => one.id === startAt));
  const [at, setAt] = useState(opening);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showWords, setShowWords] = useState(true);
  const [second, setSecond] = useState(0);
  /* Nothing to portal into until the browser has one. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const track = tracks[at];
  const words = useMemo(() => (track ? wordsFor(track) : { lines: [], real: false }), [track]);
  const onLine = lineAt(words.lines, second);

  /* The element, made once and cleaned up on the way out. */
  useEffect(() => {
    const element = new Audio();
    element.addEventListener('timeupdate', () => setSecond(element.currentTime));
    element.addEventListener('ended', () => setPlaying(false));
    audio.current = element;
    return () => {
      element.pause();
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  /* Open on the song that was tapped. `auto` rather than smooth: a screen that
     scrolls into place while you are looking at it reads as a glitch. */
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: opening * box.clientHeight, behavior: 'auto' });
    /* `mounted` is in here because the portal means there is no scroller on
       the first render at all. Without it this ran once against null and never
       again — and so did the observer below, which is how a screen that looked
       right sat on song one however far you scrolled. */
  }, [opening, mounted]);

  /** Load and play whichever song is on screen. */
  const start = useCallback(async (one: Track) => {
    const element = audio.current;
    if (!element) return;
    setLoading(true);
    const blob = await readAudio(one.id);
    setLoading(false);
    if (!blob) return;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(blob);
    element.src = url.current;
    setSecond(0);
    try {
      await element.play();
      setPlaying(true);
    } catch {
      // A browser that will not start audio without a gesture. The button is
      // right there and says Play, which is the honest state to be left in.
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (track) void start(track);
    // Only when the song changes — restarting on every render would make the
    // track jump back to zero whenever anything else on this screen moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  /* Which panel has settled. An observer rather than a scroll handler: the
     answer changes twice a minute and a scroll handler asks sixty times a
     second. */
  useEffect(() => {
    const box = scroller.current;
    if (!box) return undefined;
    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.at);
          if (Number.isInteger(index)) setAt(index);
        }
      },
      { root: box, threshold: 0.6 },
    );
    for (const panel of box.querySelectorAll('[data-at]')) watch.observe(panel);
    return () => watch.disconnect();
  }, [tracks.length, mounted]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = useCallback(() => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) {
      void element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      element.pause();
      setPlaying(false);
    }
  }, []);

  if (!mounted) return <></>;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-[#05070a]">
      <div
        ref={scroller}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory overscroll-contain"
      >
        {tracks.map((one, index) => {
          const here = index === at;
          const its = here ? words : { lines: [], real: false };
          return (
            <section
              key={one.id}
              data-at={index}
              className="relative h-full w-full snap-start snap-always overflow-hidden"
            >
              {/* The picture. A cover drawn from the song's own id, so it is
                  the same picture the channel showed a moment ago. */}
              <Cover seed={one.id} label={one.title} className="absolute inset-0 h-full w-full" />
              {/* Strong in the middle as well as at the ends: the words sit there, and
                  a scrim that fades out behind them is a scrim that does nothing
                  where it is needed. */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.45)_45%,rgba(0,0,0,0.88))]" />

              {/* Tap anywhere to stop and start. The whole panel, because a
                  small button is the wrong target on a screen somebody is
                  holding one-handed. */}
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? t('song.pause', 'Pause') : t('song.play', 'Play')}
                className="absolute inset-0 flex items-center justify-center"
              >
                {here && !playing && (
                  <span className={`flex h-16 w-16 items-center justify-center rounded-full ${SHADE} ${INK}`}>
                    {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Play className="ml-1 h-7 w-7" />}
                  </span>
                )}
              </button>

              {/* ── The words ────────────────────────────────────────────

                  Three lines: the one being sung, large, with the one before
                  and the one after dimmed around it. Not the whole sheet —
                  a wall of text over a picture is neither readable nor
                  watchable, and the line you are on is the only one anybody
                  is reading. */}
              {here && showWords && its.lines.length > 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
                  {[-1, 0, 1].map((step) => {
                    const line = its.lines[onLine + step];
                    if (!line) return <p key={step} className="h-8" />;
                    return (
                      <p
                        key={step}
                        className={
                          step === 0
                            ? `py-2 text-2xl font-black leading-tight ${INK} drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]`
                            : `py-1 text-base leading-snug ${INK_DIM}`
                        }
                      >
                        {line.text}
                      </p>
                    );
                  })}
                </div>
              )}

              {/* Who it is and what it is called, bottom left, out of the
                  thumb's way on the right. */}
              <div className="absolute inset-x-0 bottom-0 p-5 pb-28">
                <p className={`text-lg font-black leading-tight ${INK} drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]`}>{one.title}</p>
                <p className={`pt-0.5 text-sm ${INK_SOFT}`}>
                  {[one.genre, one.bpm ? `${one.bpm} BPM` : '', one.key].filter(Boolean).join(' · ')}
                </p>
                {here && its.lines.length > 0 && !its.real && (
                  <p className={`pt-1.5 text-xs leading-snug ${INK_SOFT}`}>
                    {t(
                      'song.evenly',
                      'This one came in as a file, so its words are spread evenly over its length rather than laid on the music.',
                    )}
                  </p>
                )}
              </div>

              {/* The rail. Two buttons and no more: this is a screen for
                  watching, and everything else is a swipe away in the room
                  it opened from. */}
              <div className="absolute bottom-28 right-4 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={playing ? t('song.pause', 'Pause') : t('song.play', 'Play')}
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${GLASS} ${INK} backdrop-blur`}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </button>
                {its.lines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowWords((was) => !was)}
                    aria-pressed={showWords}
                    aria-label={t('song.words', 'The words')}
                    className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur ${
                      showWords ? 'bg-emerald-500 text-onAccent' : `${GLASS} ${INK}`
                    }`}
                  >
                    <Quote className="h-5 w-5" />
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label={t('song.close', 'Close')}
        className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full ${SHADE} ${INK} backdrop-blur`}
      >
        <X className="h-5 w-5" />
      </button>
    </div>,
    document.body,
  );
}

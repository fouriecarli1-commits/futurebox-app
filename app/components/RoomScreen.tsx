'use client';

/**
 * The live room, played the way a phone plays things.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli put Live on a tab where the search used to be: "Dit is waar mense die
 * tiktik like videos van almal gaan kyk." A tab that is where everybody else's
 * work is has to play like the thing it is compared to — one at a time, full
 * screen, thumb up for the next one. A list of cards with a Listen button on
 * each is a directory of the room, not the room.
 *
 * ── Why it is not `SongScreen` ───────────────────────────────────────────
 *
 * That one plays your own library: it reads the audio out of this device by
 * track id, and it carries the lyrics, the timing and the cover, none of which
 * a post in the room has. This plays a signed URL somebody else's account gave
 * us, and it knows a title, a name and a note. Sharing the component would
 * have meant a `source` parameter and two sets of branches inside every part
 * of it, which is how one screen becomes neither.
 *
 * What is shared is what was learned building that one, and all three cost a
 * bug the first time:
 *
 *   · A portal to `document.body`. `position: fixed` is only relative to the
 *     window while no ancestor carries a transform, a filter or `contain`, and
 *     the studio around this carries all three — measured at twenty pixels
 *     down, with the room behind showing along the top edge.
 *   · Literal colours. This app remaps Tailwind's `white` and `black` onto
 *     theme variables, so `text-white` over a picture renders as near-black in
 *     the light theme.
 *   · The observer's dependencies include `mounted`. Through a portal there is
 *     no scroller on the first render at all, so an effect that runs once runs
 *     against nothing and never again.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pause, Play, X } from 'lucide-react';
import { useLang } from '../lib/i18n';

/** Literal, because the theme remaps `white` and `black` onto its own tokens. */
const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.82)';
const INK_DIM = 'rgba(255,255,255,0.55)';
const GLASS = 'rgba(0,0,0,0.55)';

export interface RoomPost {
  readonly id: string;
  readonly title: string;
  readonly by: string;
  readonly note: string;
  readonly seconds: number;
  /** A signed URL, or null once it has expired or the file is gone. */
  readonly audio: string | null;
}

export default function RoomScreen({
  posts,
  startAt,
  onClose,
}: {
  readonly posts: readonly RoomPost[];
  /** The post that was tapped, so it opens on that one. */
  readonly startAt: string;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const scroller = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  /* Only what can actually be played. A panel you swipe to and that does
     nothing is worse than one that is not there — and a post whose signed URL
     has expired is exactly that. */
  const playable = useMemo(() => posts.filter((one) => Boolean(one.audio)), [posts]);
  const opening = Math.max(0, playable.findIndex((one) => one.id === startAt));

  const [at, setAt] = useState(opening);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const post = playable[at];

  /* One element for the whole screen, made once. A second element per panel is
     how a feed ends up playing two songs at the same time. */
  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => setPlaying(false));
    audio.current = element;
    return () => {
      element.pause();
      element.src = '';
    };
  }, []);

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: opening * box.clientHeight, behavior: 'auto' });
  }, [opening, mounted]);

  /** Which panel is on screen, asked of the browser rather than of a scroll sum. */
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.at ?? '0');
          setAt(index);
        }
      },
      { root: box, threshold: 0.6 },
    );
    box.querySelectorAll('[data-at]').forEach((panel) => watcher.observe(panel));
    return () => watcher.disconnect();
  }, [playable.length, mounted]);

  const start = useCallback(async (one: RoomPost) => {
    const element = audio.current;
    if (!element || !one.audio) return;
    setLoading(true);
    element.src = one.audio;
    try {
      await element.play();
      setPlaying(true);
    } catch {
      /* Autoplay refused until somebody has touched the page. Not an error and
         not worth a message — the play button is right there and pressing it
         is the gesture the browser is waiting for. */
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Whatever is on screen is what plays. */
  useEffect(() => {
    if (!post) return;
    void start(post);
    return () => {
      audio.current?.pause();
      setPlaying(false);
    };
  }, [post, start]);

  const toggle = () => {
    const element = audio.current;
    if (!element || !post) return;
    if (playing) {
      element.pause();
      setPlaying(false);
      return;
    }
    void element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  if (!mounted) return <></>;

  return createPortal(
    <div className="fixed inset-0 z-[80]" style={{ background: '#050505' }}>
      {/* Top left, and deliberately.

          The search is a small round button fixed to the top-right corner of
          every screen, above this one. A close control in the same corner is
          a close control nobody can press — Playwright found it by trying,
          and reported the search icon intercepting the click. Left is where
          this kind of screen puts it anyway. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('room.close', 'Close')}
        className="absolute left-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: GLASS, color: INK }}
      >
        <X className="h-5 w-5" />
      </button>

      <div
        ref={scroller}
        className="h-full w-full overflow-y-auto"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {playable.length === 0 && (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p style={{ color: INK_SOFT }}>
              {t('room.empty', 'Nothing in the room can be played right now.')}
            </p>
          </div>
        )}

        {playable.map((one, index) => (
          <section
            key={one.id}
            data-at={index}
            className="relative flex h-full w-full flex-col justify-end p-5"
            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
          >
            {/* The whole panel is the play control, which is what a thumb
                expects on a screen like this. The button below is for anybody
                who cannot rely on that — a pointer, a screen reader — and both
                do the same thing. */}
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t('room.pause', 'Pause') : t('room.play', 'Play')}
              className="absolute inset-0"
              style={{ background: 'transparent' }}
            />

            <div className="relative flex items-center gap-3 pb-2">
              <span
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: GLASS, color: INK }}
              >
                {index === at && loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : index === at && playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold" style={{ color: INK }}>
                  {one.title}
                </p>
                <p className="truncate text-sm" style={{ color: INK_SOFT }}>
                  {one.by}
                </p>
              </div>
            </div>

            {one.note && (
              <p className="relative text-sm leading-snug" style={{ color: INK_DIM }}>
                {one.note}
              </p>
            )}

            {/* Where you are in the room, so a thumb knows there is more. */}
            <p className="relative pt-3 text-xs" style={{ color: INK_DIM }}>
              {index + 1} / {playable.length}
            </p>
          </section>
        ))}
      </div>
    </div>,
    document.body,
  );
}

'use client';

/**
 * The shelf of stories a child can play.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Gaan aan met die shelf van stories in die kids
 * kamer."*
 *
 * ── Why this is a third component and not part of the kids room ──────────
 *
 * Because the kids room is held by `check:kinderkamer` to have nothing that
 * can be typed into and nothing that navigates, and those rules are easier
 * to keep true when the thing they apply to is small. A shelf is a list of
 * buttons and a player; it belongs beside the room rather than inside it.
 *
 * ── Why playing costs nothing ────────────────────────────────────────────
 *
 * The pictures and the readings were paid for when the grown-up made the
 * book. Playing it again takes no credits and no allowance, which is the
 * right answer for the one room where somebody presses things forty times.
 * A child can hear the same story all afternoon and the allowance is
 * untouched — and `check:kinderverhaal` holds that nothing in here charges.
 *
 * ── Why the pages turn themselves ────────────────────────────────────────
 *
 * Because a six-year-old listening to a story is not operating a slideshow.
 * The page turns when its reading ends, which the browser tells us exactly
 * rather than a timer guessing at it — and a `seconds` kept with the page is
 * only used for the bar that shows how far through it is.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Loader2, Pause, Play, Trash2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  allStories, forgetStory, onAccount, onDevice, type KeptStory,
} from '../lib/storykeep';
import { moveShelf } from '../lib/shelfmove';

export default function StoryShelf({
  grownUp = false,
}: {
  /**
   * Whether the grown-up is looking.
   *
   * The only difference is whether a story can be taken off the shelf. A
   * child pressing a bin and losing the story somebody made them is not a
   * thing to leave reachable, and it is the one control in here that cannot
   * be undone.
   */
  readonly grownUp?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [shelf, setShelf] = useState<KeptStory[] | null>(null);
  const [open, setOpen] = useState<KeptStory | null>(null);
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(false);

  const audio = useRef<HTMLAudioElement | null>(null);
  /* Every object URL handed out, revoked when the story is closed. A shelf
     of twelve books opened one after another is otherwise a few hundred
     megabytes held for as long as the tab is. */
  const urls = useRef<string[]>([]);

  /* Anything still on this device goes up first, then the shelf is read.
     Quietly: a grown-up opening this wants the shelf, not a report about
     plumbing. `lib/shelfmove.ts` carries the reasoning, chiefly that nothing
     is taken off the device until the account has confirmed it. */
  const look = useCallback(() => {
    void moveShelf(onDevice, onAccount)
      .catch(() => ({ moved: 0, left: 0 }))
      .then(() => allStories())
      .then(setShelf);
  }, []);
  useEffect(look, [look]);

  const letGo = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    urls.current.forEach((one) => URL.revokeObjectURL(one));
    urls.current = [];
  }, []);
  useEffect(() => letGo, [letGo]);

  const url = useCallback((blob: Blob): string => {
    const made = URL.createObjectURL(blob);
    urls.current.push(made);
    return made;
  }, []);

  /** Read one page, and turn to the next when it ends. */
  const read = useCallback((story: KeptStory, at: number): void => {
    audio.current?.pause();
    const sound = new Audio(url(story.pages[at].audio));
    audio.current = sound;
    sound.onended = () => {
      if (at + 1 < story.pages.length) {
        setPage(at + 1);
        read(story, at + 1);
      } else {
        setPlaying(false);
      }
    };
    void sound.play();
    setPlaying(true);
  }, [url]);

  const openStory = (story: KeptStory): void => {
    letGo();
    setOpen(story);
    setPage(0);
    read(story, 0);
  };

  const shut = (): void => {
    letGo();
    setOpen(null);
    setPlaying(false);
  };

  if (shelf === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('shelf.looking', 'Looking on the shelf…')}
      </p>
    );
  }

  /* ── A story, open ─────────────────────────────────────────────────── */
  if (open) {
    const here = open.pages[page];
    return (
      <div className="space-y-3" data-shelfopen>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url(here.picture)}
          alt=""
          className="w-full rounded-2xl border border-zinc-800 bg-black object-cover"
        />
        <p className="text-base leading-relaxed text-zinc-200">{here.text}</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (playing ? (audio.current?.pause(), setPlaying(false)) : read(open, page))}
            data-shelfplay
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-onAccent"
            aria-label={playing ? t('shelf.pause', 'Pause') : t('shelf.play', 'Play')}
          >
            {playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />}
          </button>
          <span className="flex-1 text-sm font-bold text-zinc-400">
            {t('shelf.pageOf', 'Page {n} of {all}')
              .replace('{n}', String(page + 1))
              .replace('{all}', String(open.pages.length))}
          </span>
          <button
            type="button"
            onClick={shut}
            data-shelfshut
            className="min-h-[44px] flex-shrink-0 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-300"
          >
            {t('shelf.done', 'Done')}
          </button>
        </div>
      </div>
    );
  }

  /* ── The shelf ─────────────────────────────────────────────────────── */
  if (!shelf.length) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-700 px-4 py-5 text-center text-sm leading-relaxed text-zinc-500" data-shelfempty>
        {grownUp
          ? t('shelf.noneGrown', 'No stories yet. Make one in Story mode and press “Keep it for the kids room”.')
          : t('shelf.none', 'No stories yet. Ask a grown-up to make one.')}
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-shelf>
      {shelf.map((story) => (
        <li key={story.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openStory(story)}
            data-shelfstory={story.id}
            className="flex min-h-[64px] flex-1 items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url(story.pages[0].picture)}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-zinc-100">{story.title}</span>
              <span className="block text-xs text-zinc-500">
                {story.pages.length} {story.pages.length === 1
                  ? t('shelf.page', 'page')
                  : t('shelf.pages', 'pages')}
              </span>
            </span>
            <BookOpen className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          </button>
          {grownUp && (
            <button
              type="button"
              onClick={() => { void forgetStory(story.id).then(look); }}
              data-shelfforget={story.id}
              aria-label={t('shelf.forget', 'Take it off the shelf')}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 text-zinc-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

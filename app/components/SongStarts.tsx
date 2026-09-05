'use client';

/**
 * Fifty songs to start from, when the box is empty and that is the problem.
 *
 * ── Why it is here ───────────────────────────────────────────────────────
 *
 * The blank box is the hardest part of this room, and a bad start is what a
 * bad song is made of: four vague words produce a take that wanders, and the
 * person concludes the engine is no good. A complete starting point — a title,
 * a style the model can actually work with, a tempo and two lines — is the
 * cheapest thing that fixes that.
 *
 * ── What it says out loud ────────────────────────────────────────────────
 *
 * That they are not AI. They are written down in `data/songstarts.ts`, the
 * same fifty every time, so pressing one twice gives the same thing twice.
 * A suggestion that quietly comes from a model is a suggestion that costs a
 * credit and cannot be relied on to be there tomorrow; this is neither.
 *
 * ── Why six at a time ────────────────────────────────────────────────────
 *
 * Fifty on a screen is a catalogue, and a catalogue is a decision nobody
 * wants to make. Six, shuffled, with a button for six more and a row of moods
 * to narrow it — a person looking for something to write does not know what
 * they want until they see one they do.
 */

import React, { useMemo, useState } from 'react';
import { Shuffle, Sparkles } from 'lucide-react';
import { SONG_STARTS, MOODS, type Mood, type SongStart } from '../data/songstarts';
import { useLang } from '../lib/i18n';

/** How many are shown at once. */
const SHOWN = 6;

export default function SongStarts({
  onPick,
  openAt,
}: {
  /** Everything a start carries, for the room to fill in. */
  readonly onPick: (start: { title: string; words: string; style: string; bpm: number }) => void;
  /**
   * A mood to open on, when something else worked one out.
   *
   * A photograph is the case: it can say "warm, bright, empty" and which of
   * the eight that lands in, but it cannot pick the song. So it opens this at
   * the right shelf and a person takes it from there.
   */
  readonly openAt?: Mood | null;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood | 'all'>('all');

  /* Opened by something else, once per answer. Held against the value rather
     than fired in an effect with no guard, or a person who closed it would
     have it opened under them again on every render. */
  const [openedFor, setOpenedFor] = useState<Mood | null>(null);
  if (openAt && openAt !== openedFor) {
    setOpenedFor(openAt);
    setMood(openAt);
    setOpen(true);
  }
  /* A number rather than a shuffled copy: the list is fixed, so a seed is
     enough to move through it and nothing has to be held in state that could
     disagree with the data. */
  const [round, setRound] = useState(0);

  const pool = useMemo(
    () => (mood === 'all' ? SONG_STARTS : SONG_STARTS.filter((one) => one.mood === mood)),
    [mood],
  );
  const showing = useMemo(() => {
    if (pool.length <= SHOWN) return pool;
    const from = (round * SHOWN) % pool.length;
    return Array.from({ length: SHOWN }, (_, i) => pool[(from + i) % pool.length]);
  }, [pool, round]);

  const wordsOf = (one: SongStart): string => {
    const said = lang === 'af' ? one.af : one.en;
    return `[Verse]\n${said.first}`;
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-300"
      >
        <Sparkles className="h-4 w-4" />
        {t('starts.open', 'Give me a song to start from')}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-200">
          {t('starts.title', 'Fifty songs to start from')}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-500 hover:text-white"
        >
          {t('starts.close', 'Close')}
        </button>
      </div>

      {/* Said before anything is pressed, because it is the difference between
          a suggestion you can rely on and one that costs a credit. */}
      <p className="text-sm text-zinc-500 leading-snug">
        {t('starts.notAi', 'Written by us, not by a model. The same fifty every time, and none of them costs anything.')}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => { setMood('all'); setRound(0); }}
          className={`rounded-lg border px-2.5 py-1.5 text-sm ${
            mood === 'all'
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          {t('starts.all', 'Anything')}
        </button>
        {MOODS.map((one) => (
          <button
            key={one.id}
            type="button"
            onClick={() => { setMood(one.id); setRound(0); }}
            className={`rounded-lg border px-2.5 py-1.5 text-sm ${
              mood === one.id
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {lang === 'af' ? one.af : one.en}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
        {showing.map((one) => {
          const said = lang === 'af' ? one.af : one.en;
          return (
            <button
              key={one.id}
              type="button"
              onClick={() =>
                onPick({ title: said.title, words: wordsOf(one), style: one.style, bpm: one.bpm })
              }
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-emerald-500"
            >
              <p className="truncate text-sm font-bold text-white">{said.title}</p>
              <p className="whitespace-pre-line pt-1 text-sm leading-snug text-zinc-400">
                {said.first}
              </p>
              {/* The style is English in both languages and is not shown as a
                  suggestion: it is what goes to the model, which reads English
                  descriptions of music. The tempo is shown because it is a
                  number anybody can judge. */}
              <p className="pt-1.5 text-xs text-zinc-600">{one.bpm} BPM</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setRound((was) => was + 1)}
        className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
      >
        <Shuffle className="h-3.5 w-3.5" />
        {t('starts.more', 'Six more')}
      </button>
    </div>
  );
}

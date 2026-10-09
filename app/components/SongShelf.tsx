'use client';

/**
 * The shelf of songs a child has made.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Gaan aan met die kind se liedjies wat keepbaar
 * is."*
 *
 * ── Why playing one costs nothing ────────────────────────────────────────
 *
 * It was paid for out of the allowance when it was made. Charging again to
 * hear it would mean a child's allowance running out by listening, which is
 * the opposite of what an allowance is for — and this is the room where
 * somebody presses the same button forty times.
 * `check:kinderliedjie` refuses to let anything in here call an API, charge,
 * or take a token, exactly as the story shelf is held.
 *
 * ── Why the bin is behind the grown-up ───────────────────────────────────
 *
 * Same as the stories: it is the one press in that room that cannot be
 * undone, and losing a song they made is worse than losing one somebody made
 * for them.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cake, CloudRain, Dog, Loader2, Music, Pause, Play, Rocket, ShieldCheck,
  Trash2, Waves,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  allSongs, forgetSong, onAccount, onDevice, type KeptSong,
} from '../lib/songkeep';
import { moveShelf } from '../lib/shelfmove';

/** The same pictures the room's own choices use, so a song looks like the
    thing it was made from rather than like a row in a list. */
const FACES: Record<string, React.ReactNode> = {
  dog: <Dog className="h-6 w-6" />,
  space: <Rocket className="h-6 w-6" />,
  birthday: <Cake className="h-6 w-6" />,
  sea: <Waves className="h-6 w-6" />,
  rain: <CloudRain className="h-6 w-6" />,
  brave: <ShieldCheck className="h-6 w-6" />,
};

export default function SongShelf({
  grownUp = false,
  again = 0,
}: {
  readonly grownUp?: boolean;
  /** Bumped by the room when a song is kept, so the shelf looks again. */
  readonly again?: number;
}): React.ReactElement {
  const { t } = useLang();
  const [shelf, setShelf] = useState<KeptSong[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const urls = useRef<string[]>([]);

  /* The device's songs go up before the first look. See `StoryShelf.tsx`,
     which does the same for the same reason. */
  const look = useCallback(() => {
    void moveShelf(onDevice, onAccount)
      .catch(() => ({ moved: 0, left: 0 }))
      .then(() => allSongs())
      .then(setShelf);
  }, []);
  useEffect(look, [look, again]);

  useEffect(() => () => {
    audio.current?.pause();
    urls.current.forEach((one) => URL.revokeObjectURL(one));
    urls.current = [];
  }, []);

  const play = (song: KeptSong): void => {
    audio.current?.pause();
    if (playing === song.id) { setPlaying(null); return; }
    const url = URL.createObjectURL(song.audio);
    urls.current.push(url);
    const sound = new Audio(url);
    audio.current = sound;
    sound.onended = () => setPlaying(null);
    void sound.play();
    setPlaying(song.id);
  };

  if (shelf === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('songshelf.looking', 'Looking…')}
      </p>
    );
  }

  if (!shelf.length) {
    return (
      <p
        className="rounded-2xl border border-dashed border-zinc-700 px-4 py-4 text-center text-sm text-zinc-500"
        data-songshelfempty
      >
        {t('songshelf.none', 'No songs kept yet. Make one, then press Keep it.')}
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-songshelf>
      {shelf.map((song) => (
        <li key={song.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => play(song)}
            data-songshelfplay={song.id}
            className="flex min-h-[60px] flex-1 items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-left"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              {FACES[song.topic] ?? <Music className="h-6 w-6" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-100">
              {song.title}
            </span>
            {playing === song.id
              ? <Pause className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="currentColor" />
              : <Play className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="currentColor" />}
          </button>
          {grownUp && (
            <button
              type="button"
              onClick={() => { void forgetSong(song.id).then(look); }}
              data-songshelfforget={song.id}
              aria-label={t('songshelf.forget', 'Take it off the shelf')}
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

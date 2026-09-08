'use client';

/**
 * Which voice sings it — hers, or one of Kits' hundred.
 *
 * ── Why this is one component and not two lists in two rooms ────────────
 *
 * The same choice is made in two places: on a finished song ("sing this in my
 * voice") and on a lane in the Pro Booth. They had a copy each — a row of
 * chips over a number field — and the copies had already started to differ.
 * The interesting part of this screen is about to grow a search box and an
 * audition button, and growing it twice is how one of them quietly stays
 * worse.
 *
 * ── The catalogue, and why it is not an extra ───────────────────────────
 *
 * Kits' `/voice-models` answers with their own public catalogue unless you ask
 * for `myModels`. That is a hundred-odd trained voices anybody can sing in
 * without training anything — and it is the answer to the emptiest screen in
 * this app. Somebody who has never made a voice model has nothing to sing in,
 * and "go and make one at kits.ai first" is where their first day ends.
 *
 * So hers come first, under their own heading, and Kits' are underneath under
 * theirs. Nobody has to wonder which is which, and nobody is shown an empty
 * room.
 *
 * ── Hearing one before spending a credit ────────────────────────────────
 *
 * Every catalogue voice carries a `demoUrl`. Choosing a voice by its name is
 * choosing blind: "Male Pop" is four hundred different singers. One audio
 * element for the whole picker, because two playing at once is a mess and
 * because a hundred of them is a hundred network connections.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Search } from 'lucide-react';
import { useLang } from '../lib/i18n';
import Note from './Note';

export interface SingVoice {
  readonly id: string;
  readonly name: string;
  readonly demo?: string | null;
  readonly tags?: readonly string[];
}

/** Longer than this and the catalogue gets a search box rather than a wall. */
const NEEDS_SEARCH = 12;
/** How many of the catalogue to draw before "show more". A hundred boxes is a wall. */
const FIRST_FEW = 18;

export default function SingVoices({
  mine,
  stock,
  value,
  onChange,
  idPrefix,
}: {
  readonly mine: readonly SingVoice[];
  readonly stock: readonly SingVoice[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  /** So two of these on one page do not share a label's `for`. */
  readonly idPrefix: string;
}): React.ReactElement {
  const { t } = useLang();
  const [look, setLook] = useState('');
  const [all, setAll] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  /* One element for the whole picker, made once and stopped on the way out —
     a preview still playing after the sheet is closed is a voice coming out of
     somebody's phone in a room where they did not expect one. */
  useEffect(() => {
    const audio = new Audio();
    audio.addEventListener('ended', () => setPlaying(null));
    player.current = audio;
    return () => {
      audio.pause();
      player.current = null;
    };
  }, []);

  const hear = useCallback((one: SingVoice) => {
    const audio = player.current;
    if (!audio || !one.demo) return;
    if (playing === one.id) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.src = one.demo;
    setPlaying(one.id);
    void audio.play().catch(() => setPlaying(null));
  }, [playing]);

  const found = useMemo(() => {
    const words = look.trim().toLowerCase();
    if (!words) return stock;
    return stock.filter(
      (one) =>
        one.name.toLowerCase().includes(words) ||
        (one.tags ?? []).some((tag) => tag.toLowerCase().includes(words)),
    );
  }, [look, stock]);

  const shown = all || look.trim() ? found : found.slice(0, FIRST_FEW);

  const Voice = ({ one }: { readonly one: SingVoice }): React.ReactElement => {
    const chosen = value === one.id;
    return (
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => onChange(one.id)}
          aria-pressed={chosen}
          className={`min-h-[44px] flex-1 min-w-0 rounded-xl border px-3 py-2 text-left text-sm font-bold ${
            chosen
              ? 'border-emerald-500 bg-emerald-500/15 text-white'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300'
          }`}
        >
          <span className="block truncate">{one.name}</span>
          {(one.tags ?? []).length > 0 && (
            <span className="block truncate text-xs font-medium text-zinc-500">
              {(one.tags ?? []).slice(0, 3).join(' · ')}
            </span>
          )}
        </button>
        {one.demo && (
          <button
            type="button"
            onClick={() => hear(one)}
            aria-label={
              playing === one.id
                ? t('sing.stopDemo', 'Stop')
                : `${t('sing.hearDemo', 'Hear')} ${one.name}`
            }
            className="min-h-[44px] w-11 flex-shrink-0 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-emerald-400"
          >
            {playing === one.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {mine.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-white">{t('sing.mine', 'Your trained voices')}</p>
          <div className="space-y-1.5">
            {mine.map((one) => (
              <Voice key={one.id} one={one} />
            ))}
          </div>
        </div>
      )}

      {stock.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-white">
            {mine.length > 0
              ? t('sing.stockToo', 'Or one of Kits’ voices')
              : t('sing.stock', 'Voices you can sing in right now')}
          </p>
          {stock.length > NEEDS_SEARCH && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <input
                value={look}
                onChange={(event) => setLook(event.target.value)}
                placeholder={t('sing.search', 'Search by name or style')}
                className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
          )}
          <div className="space-y-1.5">
            {shown.map((one) => (
              <Voice key={one.id} one={one} />
            ))}
          </div>
          {!all && !look.trim() && found.length > FIRST_FEW && (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-bold text-zinc-300"
            >
              {t('sing.more', 'Show all')} ({found.length})
            </button>
          )}
          {look.trim() && found.length === 0 && (
            <Note className="text-sm text-zinc-500">
              {t('sing.none', 'No voice by that name or style.')}
            </Note>
          )}
        </div>
      )}

      {/* The number, kept underneath rather than replaced.

          It is the way in for a voice that is too new to be in the list yet,
          and the way in on a deployment where the list could not be fetched at
          all. A picker that is the only way to choose is a picker that can
          lock somebody out of their own voice. */}
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-model`} className="block text-sm font-bold text-white">
          {t('sing.byNumber', 'Or a voice model number')}
        </label>
        <input
          id={`${idPrefix}-model`}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="1014961"
          className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
        />
      </div>
    </div>
  );
}

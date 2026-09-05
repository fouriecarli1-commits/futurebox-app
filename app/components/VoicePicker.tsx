'use client';

/**
 * Choosing a voice by hearing it, rather than by reading a first name.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 *
 * A `<select>` of eight names. "Rachel", "Antoni", "Bella" — a list of
 * strangers, telling you nothing about which one suits a forty-second advert
 * in Afrikaans, so the only way to find out was to spend credits on a reading
 * and listen to the result. That is the wrong order: paying to discover what
 * you bought.
 *
 * ── The two things that make it choosable ────────────────────────────────
 *
 * **A free listen.** ElevenLabs publish a sample of every one of their own
 * voices. It costs nothing and needs no generation. It comes through our own
 * `/api/voice/preview` rather than from their storage host, so the
 * Content-Security-Policy does not have to grow a line for it.
 *
 * **What it is.** Their labels, flattened — an accent, an age, what it suits.
 * "American, young, narration" is enough to skip past nine of the forty
 * without playing any of them.
 *
 * ── And a search box, once there are forty ───────────────────────────────
 *
 * Eight fitted in a dropdown; forty do not. The list is filterable over both
 * the name and the description, so "afrikaans" or "deep" or "narration"
 * narrows it, and yours are pinned at the top because they are the ones you
 * came for.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Play, Pause, Check, Search as SearchIcon, Loader2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import Note from './Note';

export interface PickableVoice {
  readonly id: string;
  readonly name: string;
  readonly about?: string;
  readonly hasSample?: boolean;
}

export default function VoicePicker({
  mine,
  stock,
  value,
  onChange,
}: {
  mine: readonly PickableVoice[];
  stock: readonly PickableVoice[];
  value: string;
  onChange: (id: string) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [term, setTerm] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const shown = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const all = [
      ...mine.map((one) => ({ ...one, yours: true })),
      ...stock.map((one) => ({ ...one, yours: false })),
    ];
    if (!needle) return all;
    return all.filter((one) =>
      `${one.name} ${one.about ?? ''}`.toLowerCase().includes(needle),
    );
  }, [mine, stock, term]);

  const listen = (id: string) => {
    // One at a time. Two samples over each other is nobody's idea of a preview.
    if (audio.current) {
      audio.current.pause();
      audio.current = null;
    }
    if (playing === id) {
      setPlaying(null);
      return;
    }
    setLoading(id);
    const player = new Audio(`/api/voice/preview?id=${encodeURIComponent(id)}`);
    audio.current = player;
    player.onplaying = () => {
      setLoading(null);
      setPlaying(id);
    };
    player.onended = () => setPlaying(null);
    player.onerror = () => {
      setLoading(null);
      setPlaying(null);
    };
    void player.play().catch(() => {
      setLoading(null);
      setPlaying(null);
    });
  };

  return (
    <div className="space-y-2">
      {(mine.length + stock.length) > 8 && (
        <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
          <SearchIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('voices.find', 'An accent, an age, a name — “deep”, “narration”')}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
        </label>
      )}

      <ul className="max-h-64 overflow-y-auto rounded-xl border border-zinc-800 divide-y divide-zinc-800/70">
        {shown.length === 0 && (
          <li className="px-3 py-4 text-sm text-zinc-500 text-center">
            {t('voices.none', 'No voice by that description.')}
          </li>
        )}
        {shown.map((one) => {
          const on = value === one.id;
          return (
            <li key={one.id} className={`flex items-center gap-2 px-2.5 py-2 ${on ? 'bg-emerald-500/10' : ''}`}>
              <button
                type="button"
                onClick={() => onChange(one.id)}
                aria-pressed={on}
                className="flex-1 min-w-0 text-left"
              >
                <span className="flex items-center gap-1.5">
                  {on && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  <span className={`text-sm font-semibold truncate ${on ? 'text-emerald-300' : 'text-zinc-200'}`}>
                    {one.name}
                  </span>
                  {one.yours && (
                    <span className="text-xs text-emerald-400 flex-shrink-0">
                      {t('voice.mine', 'yours')}
                    </span>
                  )}
                </span>
                {one.about && (
                  <span className="block text-xs text-zinc-500 truncate">{one.about}</span>
                )}
              </button>

              {one.hasSample && (
                <button
                  type="button"
                  onClick={() => listen(one.id)}
                  aria-label={
                    playing === one.id
                      ? t('voices.stop', 'Stop')
                      : t('voices.hear', 'Hear this voice')
                  }
                  title={t('voices.free', 'A free listen — this costs nothing')}
                  className="flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:text-white hover:border-zinc-600"
                >
                  {loading === one.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : playing === one.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Note className="text-xs text-zinc-500 leading-relaxed">{t(
          'voices.note',
          'The play button is a free sample — it costs nothing and generates nothing. Only a reading you ask for is charged.',
        )}</Note>
    </div>
  );
}

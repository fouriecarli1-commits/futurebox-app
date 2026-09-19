'use client';

/**
 * How you feel, and what it is about — before anything else in the room.
 *
 * ── Why this is first now ────────────────────────────────────────────────
 *
 * Carli, 19 September 2026, passing on a friend's idea:
 *
 *   "Inplaas van om style daar heel bo in make a song voor te stel, om dan
 *    eerder te werk met emosie."
 *
 * She is right, and the reason is not decoration. A style is an answer to a
 * question nobody arrived with. Nobody opens this room thinking "I would
 * like a warm acoustic pop song at 92 beats per minute"; they open it
 * because something happened to them. Asking for the style first asks them
 * to translate the one thing they know into the one thing they do not.
 *
 * The style has not gone anywhere — the engine reads it and it is the field
 * that decides how the song sounds. It is further down, where it belongs:
 * after the song has something to be about.
 *
 * ── The second question, which is the one that matters ───────────────────
 *
 * Her step 4: *"Dan se hy ok jy het sad gekoes by voorbeeld Dan se hy ok ...
 * waaroor is jy sad? Boyfriend daagliksr di ge depressed etc."*
 *
 * "A sad song" gives a model nothing and produces the song everybody else
 * got. "They left in March and I still set two cups out" gives it a song
 * only this person could have written. The gap between those two is one
 * question, and this is it.
 *
 * It comes with places to land. A blank box after "what is it about?" is the
 * same blank box `SongStarts` exists because of — so the answers are written
 * down in `data/songcraft.ts`, with a box underneath for anybody whose
 * answer is not one of them. Pressing a chip fills the box rather than
 * replacing it: the chip is a starting point and the sentence is theirs.
 *
 * ── What it does with the answer ─────────────────────────────────────────
 *
 * Two things, and neither of them is a generation. It narrows the fifty
 * starting points to the shelf that matches, and it tells the copilot what
 * this song is about so its help is about that rather than about songs. The
 * feeling is not sent to the engine as a style — a mood is not a sound, and
 * turning "sad" into "slow and minor" behind somebody's back is the app
 * making a musical decision it was not asked to make.
 */

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { MOODS, type Mood } from '../data/songstarts';
import { aboutFor } from '../data/songcraft';
import { useLang } from '../lib/i18n';
import Note from './Note';

export interface Feeling {
  readonly mood: Mood | null;
  /** Their own words for what it is about. Free text; a chip only seeds it. */
  readonly about: string;
}

export const NO_FEELING: Feeling = { mood: null, about: '' };

export default function SongFeeling({
  value,
  onChange,
  name,
}: {
  readonly value: Feeling;
  readonly onChange: (next: Feeling) => void;
  /** Their name, when the app knows it. The question is friendlier with it. */
  readonly name?: string;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [touched, setTouched] = useState(false);
  const places = value.mood ? aboutFor(value.mood) : [];

  return (
    <div data-feeling className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <p className="flex items-center gap-2 text-base font-bold text-white">
        <Heart className="h-4 w-4 text-emerald-400" />
        {name
          ? t('feel.askNamed', 'How are you feeling today, {name}?').replace('{name}', name)
          : t('feel.ask', 'How are you feeling today?')}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {MOODS.map((one) => {
          const on = value.mood === one.id;
          return (
            <button
              key={one.id}
              type="button"
              data-mood={one.id}
              aria-pressed={on}
              onClick={() => {
                setTouched(true);
                /* Picking the same one again lets it go. Every other chip
                   row in this app does that, and a feeling somebody chose
                   by accident should not need a reload to undo. */
                onChange(on ? NO_FEELING : { mood: one.id, about: '' });
              }}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                on
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                  : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-emerald-500 hover:text-white'
              }`}
            >
              {lang === 'af' ? one.af : one.en}
            </button>
          );
        })}
      </div>

      {value.mood && (
        <div className="space-y-2 pt-1">
          <label className="block text-sm text-zinc-400" htmlFor="feel-about">
            {t('feel.about', 'And what is it about?')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {places.map((one) => (
              <button
                key={one.id}
                type="button"
                data-about={one.id}
                /* Fills the box rather than replacing what is in it. The
                   chip is a starting point; the sentence is theirs. */
                onClick={() =>
                  onChange({
                    ...value,
                    about: value.about.trim()
                      ? `${value.about.trim()} — ${lang === 'af' ? one.af : one.en}`
                      : (lang === 'af' ? one.af : one.en),
                  })
                }
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:border-emerald-500 hover:text-white"
              >
                {lang === 'af' ? one.af : one.en}
              </button>
            ))}
          </div>
          <textarea
            id="feel-about"
            value={value.about}
            onChange={(event) => onChange({ ...value, about: event.target.value.slice(0, 300) })}
            rows={2}
            placeholder={t(
              'feel.aboutPlaceholder',
              'In your own words. One true thing beats three big ones.',
            )}
            className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <Note className="text-xs leading-relaxed text-zinc-500">
            {t(
              'feel.aboutNote',
              'This is not sent to the engine as a sound. It narrows the starting points below to the ones that fit, and it tells the copilot what your song is about so its help is about that rather than about songs in general.',
            )}
          </Note>
        </div>
      )}

      {touched && !value.mood && (
        <p className="text-xs text-zinc-500">
          {t('feel.skip', 'Or skip this and start anywhere below — nothing here is required.')}
        </p>
      )}
    </div>
  );
}

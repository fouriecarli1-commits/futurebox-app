'use client';

/**
 * Words printed into the picture, and which language they are in.
 *
 * ── Why this is a component and not two copies ───────────────────────────
 *
 * It was written for the storyboard — the form that cuts many shots into one
 * film — and lived inside it. So the desk's other half, the one that makes a
 * single clip from a single sentence, had no subtitles at all. Carli, 11
 * September 2026, after an hour in the advert platform: "Wat die video kamer
 * ook kort is 'n hele bar vir subtitles en die language waarin die subtitles
 * is... Al die goed soos subtitles ens is by die funksie, make a longer
 * video."
 *
 * She is describing the shape of the fault exactly. The control existed, it
 * worked, and it was reachable only from the form somebody uses second. The
 * fix is not to write it twice — a second copy is the one that stops getting
 * the fix when the first one is corrected. It is one control, mounted in both.
 *
 * ── What it owns ─────────────────────────────────────────────────────────
 *
 * The tick, the language row, and the list of languages itself. The list
 * comes from the route that does the writing rather than being typed into a
 * screen, so no room can offer a language the server will refuse — and when
 * the model behind it is not switched on, the list comes back empty and the
 * room says so instead of showing a choice that does nothing.
 *
 * It does not own the words. Those are per-shot on a board and per-clip on
 * the desk, and both default to the line the prompt already has in quotation
 * marks.
 */

import React, { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import Note from './Note';

export interface SubtitleChoice {
  /** Whether the words are printed into the picture at all. */
  readonly on: boolean;
  /** The language code to write them in. Empty means "as they are typed". */
  readonly lang: string;
}

export const NO_SUBTITLES: SubtitleChoice = { on: false, lang: '' };

/**
 * The languages the subtitles can actually be written in.
 *
 * Shared so that two rooms asking the question do not ask it twice per visit,
 * and — the real reason — so that neither of them can decide on its own what
 * the list is.
 */
export function useSubtitleLanguages(): readonly { code: string; name: string }[] {
  const [languages, setLanguages] = useState<readonly { code: string; name: string }[]>([]);
  useEffect(() => {
    let live = true;
    void fetch('/api/translate')
      .then((response) => (response.ok ? response.json() : null))
      .then((answer) => {
        const said = answer as { available?: boolean; writes?: { code: string; name: string }[] } | null;
        if (live && said?.available && Array.isArray(said.writes)) setLanguages(said.writes);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return languages;
}

export default function Subtitles({
  id,
  value,
  onChange,
  problem,
  children,
}: {
  /**
   * A stable name for the tick, so nothing has to find it by position.
   *
   * Added the day this control appeared on a second screen and broke two
   * probes that took "the first checkbox in the room". A control found by
   * where it sits is a control that moves the day something is added above
   * it, and the probe then ticks the wrong thing and reports on the wrong
   * feature — which is worse than failing, because it passes.
   */
  readonly id: string;
  readonly value: SubtitleChoice;
  readonly onChange: (next: SubtitleChoice) => void;
  /** Said when the translation failed and the film did not. */
  readonly problem?: string;
  /** The box for the words themselves, which each room shapes differently. */
  readonly children?: React.ReactNode;
}): React.ReactElement {
  const { t } = useLang();
  const languages = useSubtitleLanguages();

  return (
    <div className="space-y-2.5">
      {/* A tick, not two buttons.

          Carli: "Video desk moet ook 'n tick box hê vir add subtitles, en dan
          'n tik boksie wat sê in watter language". Two buttons reading
          "Printed on" and "None" is a switch dressed as a choice, and it made
          somebody read both to work out which state they were in. A tick has
          one state and you can see it from across the room. */}
      <label className="flex min-h-[44px] items-center gap-2.5 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={value.on}
          onChange={(event) => onChange({ ...value, on: event.target.checked })}
          className="h-5 w-5 shrink-0 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
        />
        <span className="text-sm font-semibold text-zinc-200">
          {t('board.captionsAdd', 'Add subtitles')}
        </span>
      </label>

      {value.on && children}

      {/* And which language they are in.

          Only once the tick is on — a language for subtitles nobody asked for
          is a question about nothing. "As they are" first, because the words
          are pre-filled from the line already in the prompt and most of the
          time that is exactly what is wanted. */}
      {value.on && (
        <div className="space-y-1.5">
          <span className="text-sm text-zinc-400">{t('board.captionLang', 'In which language')}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ ...value, lang: '' })}
              aria-pressed={!value.lang}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                !value.lang
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {t('board.captionAsTyped', 'As they are')}
            </button>
            {languages.map((one) => (
              <button
                key={one.code}
                type="button"
                onClick={() => onChange({ ...value, lang: one.code })}
                aria-pressed={value.lang === one.code}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                  value.lang === one.code
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {one.name}
              </button>
            ))}
          </div>
          {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
          {languages.length === 0 && (
            <p className="text-xs text-zinc-500 leading-snug">
              {t('board.captionNoLang', 'Writing subtitles in another language is not switched on for this app, so they are cut in the words as they are typed.')}
            </p>
          )}
        </div>
      )}

      <Note className="text-xs text-zinc-500">
        {t(
          'board.captionsWhy',
          'The words are printed into the picture, so they show wherever the film is posted — most people watch these with the sound off. They cannot be taken off afterwards, so cut it again without them for anywhere that carries its own subtitles.',
        )}
      </Note>
    </div>
  );
}

/**
 * The words, in the language that was asked for.
 *
 * Shared for the same reason the control is: the storyboard learned two things
 * the hard way that a second copy would have to learn again. It asks once for
 * the whole film rather than once per line, because the route answers one line
 * for one line and refuses when it cannot — so a per-line call has no way to
 * notice one that came back missing. And a failure here loses the translation
 * and not the film: the words are cut in as they were typed, and the room says
 * so rather than going quiet.
 */
export async function translated(
  lines: readonly string[],
  to: string,
): Promise<{ lines: string[]; failed: boolean }> {
  const asked = [...lines];
  if (!to || !asked.some((one) => one.trim())) return { lines: asked, failed: false };
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: asked, to }),
    });
    const answer = (await response.json().catch(() => null)) as { lines?: string[] } | null;
    if (response.ok && answer?.lines?.length === asked.length) return { lines: answer.lines, failed: false };
    return { lines: asked, failed: true };
  } catch {
    return { lines: asked, failed: true };
  }
}

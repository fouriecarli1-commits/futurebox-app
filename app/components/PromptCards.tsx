'use client';

/**
 * A row of cards, each one a sentence and a camera.
 *
 * ── The problem this solves, which is not a design problem ───────────────
 *
 *   "Die liedjies kom baie baie sleg uit."
 *
 * Some of that was what this app sent the engine, and that has been fixed
 * where it lives. The rest of it is the empty box. A generator is only as
 * good as the sentence it is given, and the sentence almost everybody gives
 * it under pressure is "write me a song" — which is how you get the song
 * everybody else got.
 *
 * A card that says *Ouma se kombuis* gets a better song out of the same
 * engine, because it got a better sentence in. `docs/PACKAGING.md` §4 calls
 * this the single best idea in the screenshots and it is right.
 *
 * ── How it works ─────────────────────────────────────────────────────────
 *
 * Press a card, pick a photograph, and `/api/photosong` comes back with a
 * title, a style and the words, which go straight into the room with the make
 * button already lit. The route has taken an `idea` and screened it since it
 * was written; this is the first thing that has ever sent one.
 *
 * ── The picture ──────────────────────────────────────────────────────────
 *
 * Sent once and not kept — the same posture as the voice clone and the
 * presenter. A photograph of somebody's kitchen is not something to store
 * because it was convenient, and the line under the row says so before
 * anybody presses anything rather than in a policy nobody opens.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { promptsFor, type PromptCard } from '../data/prompts';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';
import Note from './Note';

/** The route's own ceiling. Said here too, so the refusal arrives before the upload. */
const BIGGEST = 3 * 1024 * 1024;

export default function PromptCards({
  onSong,
}: {
  readonly onSong: (song: { title: string; style: string; lyrics: string; saw?: string }) => void;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const picker = useRef<HTMLInputElement | null>(null);
  /** Which card was pressed, so the file that arrives knows what it is for. */
  const asked = useRef<PromptCard | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [saw, setSaw] = useState('');
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let live = true;
    void fetch('/api/photosong')
      .then((response) => (response.ok ? response.json() : null))
      .then((said) => {
        if (live && said && typeof said.available === 'boolean') setAvailable(said.available);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const take = async (file: File | undefined) => {
    const card = asked.current;
    if (!file || !card) return;
    setProblem('');
    setSaw('');
    if (file.size > BIGGEST) {
      setProblem(t('cards.tooBig', 'That picture is over 3 MB. A smaller one reads the same.'));
      return;
    }
    setBusy(card.id);
    try {
      const form = new FormData();
      form.append('picture', file);
      form.append('lang', lang);
      form.append('idea', card.idea);
      const response = await fetch('/api/photosong', { method: 'POST', body: form });
      const answer = (await response.json().catch(() => null)) as
        | { title?: string; style?: string; lyrics?: string; saw?: string; error?: string; message?: string }
        | null;
      if (!response.ok || !answer?.lyrics) {
        setProblem(refusalText(answer, lang, t('cards.failed', 'That did not come back.')));
        return;
      }
      onSong({
        title: answer.title ?? '',
        style: answer.style ?? '',
        lyrics: answer.lyrics,
        saw: answer.saw,
      });
      if (answer.saw) setSaw(answer.saw);
    } catch {
      setProblem(t('cards.offline', 'Could not reach the app’s server.'));
    } finally {
      setBusy(null);
      if (picker.current) picker.current.value = '';
    }
  };

  /* Not on the screen where there is no model behind it. A row of twenty-six
     buttons that all fail is worse than no row. */
  if (!available) return null;

  const cards = promptsFor(lang === 'af' ? 'af' : 'en');

  return (
    <div className="space-y-2">
      {/* Sideways rather than a grid: a wall of twenty-six is a decision, and
          a row you flick through is a browse. `snap` so a card never comes to
          rest half off the edge of a phone. */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={busy !== null}
            onClick={() => {
              asked.current = card;
              picker.current?.click();
            }}
            className="flex min-h-[76px] w-[9.5rem] flex-shrink-0 snap-start flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-emerald-500/60 disabled:opacity-50"
          >
            {busy === card.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Camera className="h-4 w-4 text-emerald-400" />
            )}
            <span className="pt-2 text-sm font-semibold leading-snug text-zinc-100">
              {lang === 'af' ? card.af : card.en}
            </span>
          </button>
        ))}
      </div>

      <input
        ref={picker}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void take(event.target.files?.[0])}
      />

      <Note>
        {t(
          'cards.what',
          'Press one, pick a photograph, and it comes back as a title, a style and the words — ready to make. The picture is sent once and is not kept.',
        )}
      </Note>
      {problem && <p className="text-sm text-amber-300 leading-snug">{problem}</p>}
      {saw && (
        <p className="text-sm text-emerald-300 leading-snug">
          {t('cards.saw', 'It saw:')} {saw}
        </p>
      )}
    </div>
  );
}

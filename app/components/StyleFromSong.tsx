'use client';

/**
 * "Point at a song you like, and I will describe it."
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, after paying for takes that came back wrong: "Is daar nie 'n manier
 * dat iemand 'n liedjie kan oplaai sodat die app na die styl kan luister en
 * daarna die styl vir die liedjie kies nie … dit is net om 'n idee te kry vir
 * 'n styl."
 *
 * Describing a sound in words is the hardest part of this room, and getting it
 * wrong costs a generation. Everybody has a song they can point at.
 *
 * ── What it does and does not do ─────────────────────────────────────────
 *
 * It measures: tempo, key, brightness, how much weight is under a hundred and
 * twenty hertz, how busy the arrangement is, and how much dynamic range is
 * left. Those become four or five words, added to whatever is already in the
 * style box rather than replacing it — the genre is the person's to name and
 * a spectrum cannot tell them what it is.
 *
 * It is not a fine-tune and it copies nothing. The file is decoded on this
 * device, measured, and dropped: it is never uploaded, never stored, and never
 * sent to a vendor. What leaves is a sentence of numbers, which is the same
 * sentence somebody could have typed themselves.
 *
 * That is the legal position as well as the technical one. Somebody else's
 * recording stays on their own machine, and what is taken from it is tempo,
 * key and tone colour — facts about a sound rather than the sound.
 *
 * ── What it says out loud ────────────────────────────────────────────────
 *
 * The measurements, before the words. "112 BPM · A minor · warm · heavy low
 * end" is checkable by anybody with ears; "sounds like the song you gave me"
 * is not, and would be a claim this cannot support.
 */

import React, { useRef, useState } from 'react';
import { Ear, Loader2 } from 'lucide-react';
import { listenTo, wordsFor, type Heard } from '../lib/listen';
import { useLang } from '../lib/i18n';

/** What a browser will decode, and a ceiling so a film is not handed to it. */
const BIGGEST_BYTES = 40 * 1024 * 1024;

export default function StyleFromSong({
  onWords,
}: {
  /** The words it heard, to be added to the style box rather than to replace it. */
  readonly onWords: (words: string[]) => void;
}): React.ReactElement {
  const { t } = useLang();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<Heard | null>(null);
  const [problem, setProblem] = useState('');

  const take = async (file: File | undefined) => {
    if (!file) return;
    setProblem('');
    setHeard(null);
    if (file.size > BIGGEST_BYTES) {
      setProblem(t('hear.tooBig', 'That file is over 40 MB. A shorter piece of it is plenty.'));
      return;
    }
    setBusy(true);
    try {
      const said = await listenTo(file);
      if (!said) {
        setProblem(t('hear.unreadable', 'This browser could not read that audio. MP3, WAV or M4A.'));
        return;
      }
      setHeard(said);
      onWords(wordsFor(said));
    } finally {
      setBusy(false);
      /* Cleared, so picking the same file twice actually fires again. */
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ear className="h-4 w-4" />}
        {busy
          ? t('hear.listening', 'Listening…')
          : t('hear.go', 'Learn the style from a song')}
      </button>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => void take(event.target.files?.[0])}
      />

      <p className="text-sm text-zinc-500 leading-snug">
        {t(
          'hear.what',
          'It measures the tempo, the key and the tone and writes those into the box. The file stays on this device — nothing is uploaded and nothing is copied.',
        )}
      </p>

      {problem && <p className="text-sm text-amber-300">{problem}</p>}

      {heard && (
        <p className="text-sm text-emerald-300 leading-snug">
          {t('hear.heard', 'Heard:')}{' '}
          {[
            heard.bpm ? `${heard.bpm} BPM` : '',
            heard.key,
            `${t('hear.bright', 'brightness')} ${Math.round(heard.brightness * 100)}%`,
            `${t('hear.low', 'low end')} ${Math.round(heard.weight * 100)}%`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}

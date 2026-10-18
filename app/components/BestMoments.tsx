'use client';

/**
 * Best moments: the picked shot read by its sound and cut into a reel.
 *
 * The owner, 16 October 2026: *"Let AI instantly find and arrange your best
 * moments."* Done on the phone, by the reading in `lib/highlights.ts`, so it
 * spends nothing — and what it lays down is ordinary pieces on the clock,
 * every one still trimmable, and Undo puts the long shot back whole.
 */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { REEL_LENGTHS, bestMoments, evenly, loudness, momentLength, type Moment } from '../lib/highlights';
import { soundOf } from '../lib/videoclip';
import type { Piece } from '../lib/videoedit';
import { INK, INK_DIM, RAISE } from '../lib/cutlook';
import { useLang } from '../lib/i18n';

export default function BestMoments({ piece, onReel }: {
  readonly piece: Piece;
  readonly onReel: (moments: readonly Moment[]) => void;
}) {
  const { t } = useLang();
  const [long, setLong] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const span = piece.to - piece.from;
  const tooShort = span <= long;

  const find = async (): Promise<void> => {
    setBusy(true);
    setSaid('');
    try {
      const sound = await soundOf(piece.clip);
      let moments: Moment[];
      let silent = false;
      if (sound) {
        /* Every channel mixed down, so a voice on one side still counts. */
        const mixed = new Float32Array(sound.length);
        for (let c = 0; c < sound.numberOfChannels; c += 1) {
          const data = sound.getChannelData(c);
          for (let i = 0; i < data.length; i += 1) mixed[i] += data[i] / sound.numberOfChannels;
        }
        moments = bestMoments(loudness(mixed, sound.sampleRate), piece.from, piece.to, long);
        silent = moments.every((m) => m.score === 0);
      } else {
        const each = momentLength(long);
        moments = evenly(piece.from, piece.to, each, Math.round(long / each));
        silent = true;
      }
      if (!moments.length) return;
      onReel(moments);
      const seconds = Math.round(moments.reduce((sum, m) => sum + (m.to - m.from), 0));
      setSaid(
        (silent
          ? t('edit.momentsEven', 'This shot has no sound to read, so {n} moments were spread evenly across it — {s} seconds.')
          : t('edit.momentsFound', '{n} moments, {s} seconds, in the order they happened.'))
          .replace('{n}', String(moments.length)).replace('{s}', String(seconds))
        + ' ' + t('edit.momentsUndo', 'Undo puts the whole shot back.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-editormomentsbench>
      <span className="block text-sm text-zinc-400">{t('edit.moments', 'Best moments')}</span>
      <p className="text-sm" style={{ color: INK_DIM }}>
        {t('edit.momentsWhat', 'Finds where this shot comes alive by its sound and cuts it into a reel. On your phone, no credits.')}
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('edit.momentsLong', 'How long a reel')}>
        {REEL_LENGTHS.map((one) => (
          <button
            key={one}
            type="button"
            role="radio"
            aria-checked={long === one}
            data-editormomentslong={one}
            onClick={() => setLong(one)}
            className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold ${long === one ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
          >
            {t('edit.momentsSeconds', '{n} sec').replace('{n}', String(one))}
          </button>
        ))}
      </div>
      <button
        type="button"
        data-editormoments
        disabled={busy || tooShort}
        onClick={() => void find()}
        className="min-h-[44px] w-full rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
        style={{ borderColor: 'rgba(16,185,129,0.45)', background: 'rgba(52,211,153,0.18)', color: INK, boxShadow: RAISE }}
      >
        <Sparkles className="w-4 h-4" />
        {busy ? t('edit.momentsBusy', 'Listening to the shot…') : t('edit.momentsGo', 'Find the best moments')}
      </button>
      {tooShort && (
        <p className="text-sm" style={{ color: INK_DIM }} data-editormomentsshort>
          {t('edit.momentsShort', 'This shot is already shorter than the reel. Pick a shorter reel, or a longer shot.')}
        </p>
      )}
      {said && <p className="text-sm" style={{ color: INK }} data-editormomentssaid>{said}</p>}
    </div>
  );
}

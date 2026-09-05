'use client';

/**
 * Point at something instead of describing it — a song, or a photograph.
 *
 * ── Why the two are one panel ────────────────────────────────────────────
 *
 * They were two, stacked, each with its own button, its own paragraph of
 * explanation and its own line of results. Simple mode grew by three hundred
 * pixels, and Simple growing is the fault the switch exists to prevent:
 * "eenvoudiger verpak", not more of it.
 *
 * They are the same offer — you know what you want, you cannot write it down,
 * so point at it — and one panel with two buttons says that in a fifth of the
 * room. The explanation is one line because it is true of both: the file is
 * measured here and never leaves the device.
 *
 * ── What each one can and cannot do ──────────────────────────────────────
 *
 * A song gives tempo, key, brightness, weight, density and punch. A picture
 * gives colour, light and busyness, and which of the eight moods it belongs
 * to — it does **not** know what is in the picture, and the result line says
 * what it measured rather than what it thinks it saw.
 *
 * Both are `lib/listen.ts` and `lib/photo.ts`, which take samples and pixels
 * so they can be checked against signals built on purpose. Neither costs a
 * credit and neither needs a key.
 */

import React, { useRef, useState } from 'react';
import { Camera, Ear, Loader2 } from 'lucide-react';
import { listenTo, wordsFor as wordsForSound, type Heard } from '../lib/listen';
import { measurePicture, moodFor, wordsFor as wordsForPicture, type Seen } from '../lib/photo';
import { useLang } from '../lib/i18n';

const BIGGEST_SOUND = 40 * 1024 * 1024;
const BIGGEST_PICTURE = 20 * 1024 * 1024;
/** Big enough to measure, small enough to be instant on a phone. */
const SIDE = 240;

export default function StyleFrom({
  onWords,
  onMood,
}: {
  /** Words to add to the style box — never to replace what is there. */
  readonly onWords: (words: string[]) => void;
  /** Which shelf of the fifty starting points a picture pointed at. */
  readonly onMood: (mood: string) => void;
}): React.ReactElement {
  const { t } = useLang();
  const soundInput = useRef<HTMLInputElement | null>(null);
  const pictureInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'sound' | 'picture' | null>(null);
  const [said, setSaid] = useState('');
  const [problem, setProblem] = useState('');

  const takeSound = async (file: File | undefined) => {
    if (!file) return;
    setProblem('');
    setSaid('');
    if (file.size > BIGGEST_SOUND) {
      setProblem(t('hear.tooBig', 'That file is over 40 MB. A shorter piece of it is plenty.'));
      return;
    }
    setBusy('sound');
    try {
      const heard: Heard | null = await listenTo(file);
      if (!heard) {
        setProblem(t('hear.unreadable', 'This browser could not read that audio. MP3, WAV or M4A.'));
        return;
      }
      onWords(wordsForSound(heard));
      setSaid(
        [
          heard.bpm ? `${heard.bpm} BPM` : '',
          heard.key,
          `${t('hear.bright', 'brightness')} ${Math.round(heard.brightness * 100)}%`,
          `${t('hear.low', 'low end')} ${Math.round(heard.weight * 100)}%`,
        ]
          .filter(Boolean)
          .join(' · '),
      );
    } finally {
      setBusy(null);
      if (soundInput.current) soundInput.current.value = '';
    }
  };

  const takePicture = async (file: File | undefined) => {
    if (!file) return;
    setProblem('');
    setSaid('');
    if (file.size > BIGGEST_PICTURE) {
      setProblem(t('pic.tooBig', 'That picture is over 20 MB. A smaller one measures the same.'));
      return;
    }
    setBusy('picture');
    const url = URL.createObjectURL(file);
    try {
      const picture = await new Promise<HTMLImageElement>((good, bad) => {
        const img = new Image();
        img.onload = () => good(img);
        img.onerror = () => bad(new Error('unreadable'));
        img.src = url;
      });
      /* Drawn small on purpose: the measurements are averages and edges, and
         neither needs twelve megapixels walked on a phone. */
      const canvas = document.createElement('canvas');
      canvas.width = SIDE;
      canvas.height = Math.max(1, Math.round((picture.height / picture.width) * SIDE)) || SIDE;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('no canvas');
      context.drawImage(picture, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const seen: Seen = measurePicture(pixels.data, canvas.width, canvas.height);
      onWords(wordsForPicture(seen));
      onMood(moodFor(seen));
      setSaid(
        [
          `${t('pic.light', 'light')} ${Math.round(seen.brightness * 100)}%`,
          `${t('pic.colour', 'colour')} ${Math.round(seen.saturation * 100)}%`,
          `${t('pic.busy', 'busy')} ${Math.round(seen.busyness * 100)}%`,
        ].join(' · '),
      );
    } catch {
      setProblem(t('pic.unreadable', 'This browser could not read that picture. JPEG, PNG or WebP.'));
    } finally {
      URL.revokeObjectURL(url);
      setBusy(null);
      if (pictureInput.current) pictureInput.current.value = '';
    }
  };

  const button = 'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 hover:border-emerald-500 hover:text-emerald-300 disabled:opacity-60';

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5">
      <div className="flex gap-2 [&>*]:min-w-0">
        <button type="button" onClick={() => soundInput.current?.click()} disabled={busy !== null} className={button}>
          {busy === 'sound' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ear className="h-4 w-4" />}
          <span className="truncate">{t('from.song', 'From a song')}</span>
        </button>
        <button type="button" onClick={() => pictureInput.current?.click()} disabled={busy !== null} className={button}>
          {busy === 'picture' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          <span className="truncate">{t('from.photo', 'From a photo')}</span>
        </button>
      </div>
      <input ref={soundInput} type="file" accept="audio/*" className="hidden"
        onChange={(event) => void takeSound(event.target.files?.[0])} />
      <input ref={pictureInput} type="file" accept="image/*" className="hidden"
        onChange={(event) => void takePicture(event.target.files?.[0])} />

      <p className="text-sm text-zinc-500 leading-snug">
        {t(
          'from.what',
          'A song gives its tempo, key and tone. A photo gives its colour, light and how busy it is — not what is in it. Both are measured here and neither file leaves this device.',
        )}
      </p>

      {problem && <p className="text-sm text-amber-300">{problem}</p>}
      {said && (
        <p className="text-sm text-emerald-300 leading-snug">
          {t('from.measured', 'Measured:')} {said}
        </p>
      )}
    </div>
  );
}

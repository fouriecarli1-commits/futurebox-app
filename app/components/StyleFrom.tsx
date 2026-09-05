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

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Ear, Loader2, PenLine } from 'lucide-react';
import { listenTo, wordsFor as wordsForSound, type Heard } from '../lib/listen';
import { measurePicture, moodFor, wordsFor as wordsForPicture, type Seen } from '../lib/photo';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';

const BIGGEST_SOUND = 40 * 1024 * 1024;
const BIGGEST_PICTURE = 20 * 1024 * 1024;
/** Big enough to measure, small enough to be instant on a phone. */
const SIDE = 240;

export default function StyleFrom({
  onWords,
  onMood,
  onSong,
}: {
  /** Words to add to the style box — never to replace what is there. */
  readonly onWords: (words: string[]) => void;
  /** Which shelf of the fifty starting points a picture pointed at. */
  readonly onMood: (mood: string) => void;
  /**
   * A whole song, when the app has a model behind it and the person asked
   * for one. The measured reading cannot write words; this can.
   */
  readonly onSong: (song: { title: string; style: string; lyrics: string }) => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const soundInput = useRef<HTMLInputElement | null>(null);
  const pictureInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'sound' | 'picture' | 'writing' | null>(null);
  const [said, setSaid] = useState('');
  const [problem, setProblem] = useState('');
  /**
   * Whether this app has a model behind it.
   *
   * Asked rather than assumed: with no key the route answers honestly and the
   * second button should not be on the screen at all. A button that always
   * fails is worse than one that is not offered.
   */
  const [canWrite, setCanWrite] = useState(false);
  /* The last picture, kept in memory only for as long as this panel is open,
     so "write the song too" does not mean picking the file again. Never
     stored, never uploaded except on that press. */
  const held = useRef<File | null>(null);

  useEffect(() => {
    let live = true;
    void fetch('/api/photosong')
      .then((response) => (response.ok ? response.json() : null))
      .then((said_) => {
        if (live && said_ && typeof said_.available === 'boolean') setCanWrite(said_.available);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const writeFromPicture = async () => {
    const file = held.current;
    if (!file) return;
    setProblem('');
    setBusy('writing');
    try {
      const form = new FormData();
      form.append('picture', file);
      form.append('lang', lang);
      const response = await fetch('/api/photosong', { method: 'POST', body: form });
      const answer = (await response.json().catch(() => null)) as
        | { title?: string; style?: string; lyrics?: string; saw?: string; error?: string; message?: string }
        | null;
      if (!response.ok || !answer?.lyrics) {
        setProblem(refusalText(answer, lang, t('pic.failed', 'That did not come back.')));
        return;
      }
      onSong({ title: answer.title ?? '', style: answer.style ?? '', lyrics: answer.lyrics });
      /* What it says it saw, so somebody can tell whether it looked properly
         before they spend a generation on the words it wrote. */
      if (answer.saw) setSaid(answer.saw);
    } finally {
      setBusy(null);
    }
  };

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
      held.current = file;
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

      {/* And the version that reads the picture rather than measuring it.

          Offered only once a picture has been picked and only where this app
          has a model behind it, because a button that always fails is worse
          than one that is not there. The line under it says what the
          difference is: the measurement above knows warm from cold, this one
          knows what is in the photograph. */}
      {canWrite && held.current && (
        <div className="space-y-1.5 border-t border-zinc-800 pt-2">
          <button
            type="button"
            onClick={() => void writeFromPicture()}
            disabled={busy !== null}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3 text-sm font-bold text-onAccent disabled:opacity-60"
          >
            {busy === 'writing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {busy === 'writing'
              ? t('pic.writing', 'Reading the picture…')
              : t('pic.write', 'And write the song from it')}
          </button>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('pic.writeWhat', 'This one looks at what is in the picture and writes a title, a style and the words. It is sent to the model once and not kept.')}
          </p>
        </div>
      )}
    </div>
  );
}

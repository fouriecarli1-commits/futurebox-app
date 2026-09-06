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
 *
 * ── And the third one, which is a different kind of thing ────────────────
 *
 * The link bar. Paste a YouTube, Spotify, SoundCloud, Apple Music or TikTok
 * link and `/api/songlink` reads the song's **name** off that site's own
 * public oEmbed endpoint, then asks the model what that music sounds like.
 *
 * It does not listen to it. Downloading the audio behind one of those links
 * breaks every one of their terms, and building that into something she sells
 * would put the liability here rather than on whoever pasted the link. So the
 * line under the bar says "reads its name, not its sound", in as many words:
 * somebody who thinks the app heard the track will blame the app when the
 * style is wrong about a cover version, and they would be right to.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Ear, Link2, Loader2, PenLine } from 'lucide-react';
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
  const [busy, setBusy] = useState<'sound' | 'picture' | 'writing' | 'link' | null>(null);
  /** What is in the link bar, and whether the bar is offered at all. */
  const [link, setLink] = useState('');
  const [canRead, setCanRead] = useState(false);
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
    void fetch('/api/songlink')
      .then((response) => (response.ok ? response.json() : null))
      .then((said_) => {
        if (live && said_ && typeof said_.available === 'boolean') setCanRead(said_.available);
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

  /**
   * Read the style off a link somebody pasted.
   *
   * The style words go into the box the same way the measured ones do: added,
   * never replacing what is already there. And what it says under the bar is
   * whether the model actually recognised the song, because "I know this one"
   * and "I guessed from the title" are different answers and only one of them
   * is worth spending a generation on.
   */
  const takeLink = async () => {
    const typed = link.trim();
    if (!typed) return;
    setProblem('');
    setSaid('');
    setBusy('link');
    try {
      const response = await fetch('/api/songlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: typed }),
      });
      const answer = (await response.json().catch(() => null)) as
        | { style?: string; known?: boolean; because?: string; title?: string; error?: string; message?: string }
        | null;
      if (!response.ok || !answer?.style) {
        setProblem(refusalText(answer, lang, t('link.failed', 'That link could not be read.')));
        return;
      }
      onWords(answer.style.split(',').map((one) => one.trim()).filter(Boolean));
      setSaid(
        [
          answer.title ?? '',
          answer.known
            ? t('link.knew', 'recognised')
            : t('link.guessed', 'not recognised — read off the title alone'),
        ]
          .filter(Boolean)
          .join(' · '),
      );
    } catch {
      setProblem(t('link.failed', 'That link could not be read.'));
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
      {/* `data-take` is a handle for the click-through probe, and it is here
          because position stopped being one. The probe addressed this input as
          the first `accept="image/*"` on the screen, which it was until the
          prompt cards were added above it with a camera of their own. The
          probe then filled the wrong input, measured nothing, and reported the
          room as broken — a true sentence about the wrong element.

          Nothing in the app reads it. A person never meets this input at all:
          the "From a photo" button opens it through the ref beside it. */}
      <input ref={pictureInput} type="file" accept="image/*" className="hidden" data-take="picture"
        onChange={(event) => void takePicture(event.target.files?.[0])} />

      {/* And the third way in: a song that already exists, pointed at.

          Offered only where this app has a model behind it, for the same
          reason as the button below — a bar that always fails is worse than
          one that is not there. */}
      {canRead && (
        <div className="flex gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3">
            <Link2 className="h-4 w-4 flex-shrink-0 text-zinc-500" />
            <input
              type="url"
              inputMode="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void takeLink();
                }
              }}
              placeholder={t('link.paste', 'Paste a song link')}
              aria-label={t('link.paste', 'Paste a song link')}
              className="min-h-[44px] min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void takeLink()}
            disabled={busy !== null || link.trim().length === 0}
            aria-label={t('link.read', 'Read the style off it')}
            className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-emerald-500 hover:text-emerald-300 disabled:opacity-50"
          >
            {busy === 'link' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      )}

      <p className="text-sm text-zinc-500 leading-snug">
        {t(
          'from.what',
          'A song gives its tempo, key and tone. A photo gives its colour, light and how busy it is — not what is in it. Both are measured here and neither file leaves this device.',
        )}
      </p>
      {canRead && (
        <p className="text-sm text-zinc-500 leading-snug">
          {t(
            'from.link',
            'A link reads the song’s name off YouTube, Spotify, SoundCloud, Apple Music or TikTok and works the style out from that. It does not listen to it — downloading from those sites is against their rules, so this reads what the song is called, not how it sounds.',
          )}
        </p>
      )}

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

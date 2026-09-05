'use client';

/**
 * A song from a photograph.
 *
 * ── What it does ─────────────────────────────────────────────────────────
 *
 * Reads the colour, the light and the busyness of a picture and writes those
 * into the style box, then opens the fifty starting points at the mood that
 * matches. A beach at golden hour and a stairwell at night are different
 * songs, and the difference is legible in the pixels.
 *
 * ── What it says out loud ────────────────────────────────────────────────
 *
 * That it does not know what is *in* the picture. It cannot tell a beach from
 * an orange wall — "warm, bright, open" describes both honestly, and the
 * person looking at their own photograph supplies the beach. Saying that
 * plainly is the difference between a tool and a trick: somebody who believes
 * it recognised their grandmother will be disappointed by the song, and it
 * will be this screen's fault rather than the engine's.
 *
 * ── And that nothing leaves the device ───────────────────────────────────
 *
 * The picture is drawn onto a canvas here, measured, and dropped. It is never
 * uploaded and never sent to a vendor. A photograph is a personal thing and
 * most of them have somebody's face in them — that is worth a sentence on the
 * screen rather than a line in a policy.
 */

import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { measurePicture, moodFor, wordsFor, type Seen } from '../lib/photo';
import { useLang } from '../lib/i18n';

/** Big enough to measure, small enough to be instant on a phone. */
const SIDE = 240;
const BIGGEST_BYTES = 20 * 1024 * 1024;

export default function StyleFromPhoto({
  onSeen,
}: {
  /** The style words, and the mood to open the starting points at. */
  readonly onSeen: (found: { words: string[]; mood: string }) => void;
}): React.ReactElement {
  const { t } = useLang();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<Seen | null>(null);
  const [problem, setProblem] = useState('');

  const take = async (file: File | undefined) => {
    if (!file) return;
    setProblem('');
    setSeen(null);
    if (file.size > BIGGEST_BYTES) {
      setProblem(t('pic.tooBig', 'That picture is over 20 MB. A smaller one measures the same.'));
      return;
    }
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      try {
        const picture = await new Promise<HTMLImageElement>((good, bad) => {
          const img = new Image();
          img.onload = () => good(img);
          img.onerror = () => bad(new Error('unreadable'));
          img.src = url;
        });
        /* Drawn small on purpose. The measurements are averages and edges;
           neither needs twelve megapixels, and a phone should not be asked to
           walk them. */
        const canvas = document.createElement('canvas');
        canvas.width = SIDE;
        canvas.height = Math.max(1, Math.round((picture.height / picture.width) * SIDE)) || SIDE;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('no canvas');
        context.drawImage(picture, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = measurePicture(pixels.data, canvas.width, canvas.height);
        setSeen(found);
        onSeen({ words: wordsFor(found), mood: moodFor(found) });
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setProblem(t('pic.unreadable', 'This browser could not read that picture. JPEG, PNG or WebP.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {busy ? t('pic.looking', 'Looking…') : t('pic.go', 'Make a song from a photo')}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void take(event.target.files?.[0])}
      />

      <p className="text-sm text-zinc-500 leading-snug">
        {t(
          'pic.what',
          'It reads the colour, the light and how busy the picture is — not what is in it. The picture stays on this device.',
        )}
      </p>

      {problem && <p className="text-sm text-amber-300">{problem}</p>}

      {seen && (
        <p className="text-sm text-emerald-300 leading-snug">
          {t('pic.saw', 'Saw:')}{' '}
          {[
            `${t('pic.light', 'light')} ${Math.round(seen.brightness * 100)}%`,
            `${t('pic.colour', 'colour')} ${Math.round(seen.saturation * 100)}%`,
            `${t('pic.busy', 'busy')} ${Math.round(seen.busyness * 100)}%`,
          ].join(' · ')}
        </p>
      )}
    </div>
  );
}

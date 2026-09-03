'use client';

/**
 * A picture for the clip to start from.
 *
 * ── Why this is worth a button ───────────────────────────────────────────
 *
 * Text alone is the expensive way to get a specific look. You describe the
 * thing, the engine draws something adjacent, you describe it again, and every
 * attempt costs what a clip costs. A start frame settles the subject, the
 * palette and the framing before anything is spent, so the sentence only has
 * to say what *moves* — which is the part a video model is actually good at.
 *
 * It is also the only way to get the same face, the same room or the same
 * product into two clips that are meant to cut together. Two prompts, however
 * carefully written, give two strangers.
 *
 * ── Why it is not always shown ───────────────────────────────────────────
 *
 * Because not every engine reads it. An image field an endpoint ignores is the
 * worst kind of failure: the clip is made, the credits are gone, the picture
 * had nothing to do with it, and nothing anywhere says so. So the server
 * declares which grades start from a picture, and this shows on those and says
 * plainly on the others.
 *
 * ── Read here, sent as bytes ─────────────────────────────────────────────
 *
 * The file never touches our storage. It is read in the browser, sent with the
 * request, handed to the engine, and forgotten — there is no bucket, no row,
 * and nothing to delete later.
 */

import React, { useCallback, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useLang } from '../lib/i18n';

/** What the route accepts, said here too so the refusal happens before the trip. */
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 4 * 1024 * 1024;

export default function StartFrame({
  value,
  onChange,
  /** False where no engine on the chosen grade reads a picture. */
  supported,
  /** What to say instead, when it is not supported on this grade. */
  unsupportedNote,
  disabled = false,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  supported: boolean;
  unsupportedNote?: string;
  disabled?: boolean;
}): React.ReactElement | null {
  const { t } = useLang();
  const input = useRef<HTMLInputElement | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const take = useCallback(
    (file: File | undefined) => {
      setProblem(null);
      if (!file) return;
      if (TYPES.indexOf(file.type) === -1) {
        setProblem(t('frame.type', 'That has to be a PNG, a JPEG or a WebP.'));
        return;
      }
      if (file.size > MAX_BYTES) {
        setProblem(
          t('frame.big', 'That picture is over 4 MB. A smaller one works just as well as a start frame.'),
        );
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => setProblem(t('frame.read', 'That file could not be read.'));
      reader.onload = () => {
        const read = reader.result;
        if (typeof read === 'string') onChange(read);
      };
      reader.readAsDataURL(file);
    },
    [onChange, t],
  );

  if (!supported) {
    // Said rather than hidden. Somebody who has used this on the dearer grade
    // and cannot find it here needs to know it moved, not wonder where it went.
    return unsupportedNote ? (
      <p className="text-xs text-zinc-500 leading-relaxed">{unsupportedNote}</p>
    ) : null;
  }

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          take(event.target.files?.[0]);
          // Cleared so choosing the same file twice still fires a change.
          event.target.value = '';
        }}
      />

      {value ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={t('frame.alt', 'The picture this clip starts from')}
            className="w-24 h-24 object-cover rounded-xl border border-zinc-700 flex-shrink-0"
          />
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-semibold text-zinc-200">
              {t('frame.on', 'Starting from this picture')}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {t(
                'frame.hint',
                'The shape of the clip comes from the picture now. Write what moves rather than what it looks like.',
              )}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={disabled}
                className="text-xs font-semibold rounded-lg px-2.5 py-1 border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white disabled:opacity-50"
              >
                {t('frame.swap', 'Use a different one')}
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled}
                className="text-xs font-semibold rounded-lg px-2.5 py-1 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-rose-300 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                {t('frame.off', 'Take it off')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled}
          className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-4 py-3 text-left hover:border-emerald-500/60 hover:bg-zinc-900 transition-colors disabled:opacity-50"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <ImagePlus className="w-4 h-4 text-emerald-400" />
            {t('frame.add', 'Start from a picture')}
          </span>
          <span className="block text-xs text-zinc-500 pt-1 leading-relaxed">
            {t(
              'frame.why',
              'Optional, and it costs nothing extra. A picture settles the look in one go, so the sentence only has to say what moves — and it is the only way two clips can share the same face or the same room.',
            )}
          </span>
        </button>
      )}

      {problem && <p className="text-xs text-rose-300">{problem}</p>}
    </div>
  );
}

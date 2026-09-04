'use client';

/**
 * What the platform will print over your video.
 *
 * ── Why it belongs on the made clip and not on the prompt ────────────────
 *
 * You cannot frame a shot you did not film. The desk describes a scene and an
 * engine decides where the subject lands in it, so a safe-zone overlay while
 * writing the prompt would be a diagram of a decision nobody has made yet.
 *
 * On the clip that came back it is a real question with a real answer: is the
 * face in the part TikTok is about to print a caption over? And it is asked at
 * the one moment it can still be acted on — before posting, while making
 * another take costs one generation rather than a repost.
 *
 * ── Bars, not a box ──────────────────────────────────────────────────────
 *
 * The covered strips are shaded and the safe part is left alone. The opposite
 * — a bright rectangle over the safe area — hides the thing being judged
 * behind the tool doing the judging.
 *
 * ── It says how much is left ─────────────────────────────────────────────
 *
 * Fifty-nine per cent, on Shorts. Nobody believes the bars until they see that
 * number, and it is the number that changes how somebody frames the next
 * prompt: "a close-up, framed high" instead of "a woman in a kitchen".
 */

import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { ZONES, boxOf, keptPercent, type Zone } from '../lib/safezones';
import { useLang } from '../lib/i18n';

export default function SafeZones({
  /** Anything with a frame: a video element, an image, a canvas. */
  children,
  className = '',
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [shown, setShown] = useState<Zone | null>(null);

  const box = shown ? boxOf(shown) : null;
  const pc = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        {children}

        {box && (
          /* Over the frame, and deliberately not in the way of a press: the
             clip underneath still has its own controls. */
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-0 right-0 top-0 bg-black/55" style={{ height: pc(box.top) }} />
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/55"
              style={{ height: pc(1 - box.top - box.height) }}
            />
            <div
              className="absolute left-0 bg-black/55"
              style={{ top: pc(box.top), height: pc(box.height), width: pc(box.left) }}
            />
            <div
              className="absolute right-0 bg-black/55"
              style={{ top: pc(box.top), height: pc(box.height), width: pc(1 - box.left - box.width) }}
            />
            <div
              className="absolute border-2 border-dashed border-emerald-400/80"
              style={{
                top: pc(box.top),
                left: pc(box.left),
                width: pc(box.width),
                height: pc(box.height),
              }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400 mr-1">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          {t('safe.title', 'What the app covers')}
        </span>
        <button
          type="button"
          onClick={() => setShown(null)}
          aria-pressed={shown === null}
          className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
            shown === null
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
              : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600'
          }`}
        >
          {t('safe.off', 'Off')}
        </button>
        {ZONES.map((one) => (
          <button
            key={one.id}
            type="button"
            onClick={() => setShown(shown?.id === one.id ? null : one)}
            aria-pressed={shown?.id === one.id}
            className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
              shown?.id === one.id
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {t(`safe.${one.id}`, one.name)}
          </button>
        ))}
      </div>

      {shown && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {shown.note[lang]}{' '}
            <span className="text-zinc-300 font-semibold">
              {keptPercent(shown)}% {t('safe.kept', 'of the frame is left')}
            </span>
            .
          </p>
          {/* Said every time it is on, because the alternative is somebody
              treating a read-off-a-blog number as a specification. */}
          <p className="text-xs text-zinc-600 leading-relaxed">
            {t(
              'safe.guide',
              'A guide, not a specification. These apps move their own furniture — do not put anything you need inside the shading.',
            )}
          </p>
        </div>
      )}
    </div>
  );
}

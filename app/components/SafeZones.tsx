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
import { ZONES, boxIn, columnOf, cropsFor, keptPercent, type Zone } from '../lib/safezones';
import { useLang } from '../lib/i18n';

/** The four strips between an outer rectangle and an inner one, in fractions. */
function Strips({
  outer,
  inner,
  shade,
}: {
  readonly outer: Rect;
  readonly inner: Rect;
  readonly shade: string;
}): React.ReactElement {
  const pc = (value: number) => `${(value * 100).toFixed(2)}%`;
  const bottom = outer.top + outer.height - (inner.top + inner.height);
  const right = outer.left + outer.width - (inner.left + inner.width);
  return (
    <>
      <div
        className={`absolute ${shade}`}
        style={{ top: pc(outer.top), left: pc(outer.left), width: pc(outer.width), height: pc(inner.top - outer.top) }}
      />
      <div
        className={`absolute ${shade}`}
        style={{ top: pc(inner.top + inner.height), left: pc(outer.left), width: pc(outer.width), height: pc(bottom) }}
      />
      <div
        className={`absolute ${shade}`}
        style={{ top: pc(inner.top), left: pc(outer.left), width: pc(inner.left - outer.left), height: pc(inner.height) }}
      />
      <div
        className={`absolute ${shade}`}
        style={{ top: pc(inner.top), left: pc(inner.left + inner.width), width: pc(right), height: pc(inner.height) }}
      />
    </>
  );
}

interface Rect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

const WHOLE: Rect = { top: 0, left: 0, width: 1, height: 1 };

export default function SafeZones({
  /** Anything with a frame: a video element, an image, a canvas. */
  children,
  /**
   * The clip's own shape, as the desk names it.
   *
   * Defaults to the tall one, which is what this only ever used to be shown
   * on. Anything else draws the crop as well as the furniture — see
   * `columnOf` for why that is the more useful drawing, not a lesser one.
   */
  aspect = '9:16',
  className = '',
}: {
  readonly children: React.ReactNode;
  readonly aspect?: string;
  readonly className?: string;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [shown, setShown] = useState<Zone | null>(null);

  const column = columnOf(aspect);
  const crops = cropsFor(aspect);
  const box = shown ? boxIn(shown, aspect) : null;
  const pc = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        {children}

        {box && (
          /* Over the frame, and deliberately not in the way of a press: the
             clip underneath still has its own controls. */
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {/* Two shades, because two different things happen to a frame.

                What falls outside the tall column is cropped away — it is not
                in the post at all — and is shaded harder. What falls inside
                the column but outside the safe box is still there and is
                covered by the app's own furniture, which is recoverable by
                reframing rather than fatal. On a 9:16 clip the column is the
                whole frame and the first layer draws nothing, so the tall
                case looks exactly as it always has. */}
            {crops && <Strips outer={WHOLE} inner={column} shade="bg-black/75" />}
            <Strips outer={column} inner={box} shade="bg-black/55" />
            {crops && (
              <div
                className="absolute border border-emerald-400/40"
                style={{
                  top: pc(column.top),
                  left: pc(column.left),
                  width: pc(column.width),
                  height: pc(column.height),
                }}
              />
            )}
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
              {keptPercent(shown, aspect)}% {t('safe.kept', 'of the frame is left')}
            </span>
            .
          </p>
          {/* Only where it applies, and it is the bigger number of the two.

              A wide clip posted to a tall feed loses its sides before any
              caption is drawn, and that is a much larger loss than the
              furniture — worth saying in words rather than leaving to be read
              off two shades of grey. */}
          {crops && (
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t(
                'safe.cropped',
                'This clip is not the shape these apps play. Posted there it is shown in the marked column and the sides are cropped off — before anything is printed on top.',
              )}
            </p>
          )}
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

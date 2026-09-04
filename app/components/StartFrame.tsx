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
 * ── Read here, sent as bytes, and kept on this device ────────────────────
 *
 * The file never touches our storage. It is read in the browser, sent with the
 * request, and handed to the engine — there is no bucket and no row.
 *
 * It used to be forgotten at that point too, which meant the second clip
 * intended to cut against the first sent you back to the file manager for the
 * same file. So the picking is `Pictures`, which keeps what you choose in this
 * browser and offers it back. That is what makes two clips able to share a
 * face, a room or a product; one attachment at a time never could.
 */

import React from 'react';
import { ImagePlus } from 'lucide-react';
import { useLang } from '../lib/i18n';
import Cast from './Cast';
import Pictures from './Pictures';

export default function StartFrame({
  value,
  onChange,
  /** False where no engine on the chosen grade reads a picture. */
  supported,
  /** What to say instead, when it is not supported on this grade. */
  unsupportedNote,
  /**
   * Move to the grade that does read a picture.
   *
   * Without it the note was a dead end: it named a grade and left somebody to
   * find the rung selector further down the page and work out which one was
   * meant. A sentence saying where a thing is, next to a button that goes
   * there, is one step instead of three.
   */
  onSwitch,
  switchLabel,
  disabled = false,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  supported: boolean;
  unsupportedNote?: string;
  onSwitch?: () => void;
  switchLabel?: string;
  disabled?: boolean;
}): React.ReactElement | null {
  const { t } = useLang();

  /* Why it is worth attaching one, said in both states.

     It used to appear only once the attachment was on screen, which is the one
     case where somebody can already see what it does. On the grade that cannot
     take a picture there was a single grey line about the grade and nothing
     about why they would want one — so the feature read as a restriction
     rather than as something worth moving a rung for. */
  const why = t(
    'frame.why',
    'Optional, and it costs nothing extra. A picture settles the look in one go — the same face, the same room, the same product in every clip — so the sentence only has to say what moves.',
  );

  if (!supported) {
    // Said rather than hidden. Somebody who has used this on the dearer grade
    // and cannot find it here needs to know it moved, not wonder where it went.
    if (!unsupportedNote) return null;
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
          <ImagePlus className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {t('frame.title', 'Start from a picture')}
        </p>
        <p className="text-xs text-zinc-500 leading-relaxed">{why}</p>
        <p className="text-xs text-amber-400/90 leading-relaxed">{unsupportedNote}</p>
        {onSwitch && (
          <button
            type="button"
            onClick={onSwitch}
            disabled={disabled}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-50"
          >
            {switchLabel ?? t('frame.switch', 'Move to the grade that reads it')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
      <div>
        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
          <ImagePlus className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {t('frame.title', 'Start from a picture')}
        </p>
        <p className="text-xs text-zinc-500 leading-relaxed pt-0.5">
          {value
            ? t(
                'frame.hint',
                'The shape of the clip comes from the picture now. Write what moves rather than what it looks like.',
              )
            : why}
        </p>
      </div>

      {/* The cast first, the scratch pad under it.

          They answer different questions and the order says which is which:
          the named, kept, on-every-device shelf comes before the pile of
          recent uploads. Somebody who has a presenter reaches for them;
          somebody trying a photo out reaches past. */}
      <Cast value={value} onChange={onChange} disabled={disabled} />

      <div className="border-t border-zinc-800 pt-2 space-y-1.5">
        <p className="text-xs text-zinc-500">
          {t('frame.orDevice', 'Or a picture from this device — kept here only, not on your account.')}
        </p>
        <Pictures value={value} onChange={onChange} from="canvas" disabled={disabled} />
      </div>
    </div>
  );
}

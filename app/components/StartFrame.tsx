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
import { useLang } from '../lib/i18n';
import Pictures from './Pictures';

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

  if (!supported) {
    // Said rather than hidden. Somebody who has used this on the dearer grade
    // and cannot find it here needs to know it moved, not wonder where it went.
    return unsupportedNote ? (
      <p className="text-xs text-zinc-500 leading-relaxed">{unsupportedNote}</p>
    ) : null;
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-zinc-300">
          {t('frame.title', 'Start from a picture')}
        </p>
        <p className="text-xs text-zinc-500 leading-relaxed pt-0.5">
          {value
            ? t(
                'frame.hint',
                'The shape of the clip comes from the picture now. Write what moves rather than what it looks like.',
              )
            : t(
                'frame.why',
                'Optional, and it costs nothing extra. A picture settles the look in one go, so the sentence only has to say what moves.',
              )}
        </p>
      </div>

      <Pictures value={value} onChange={onChange} from="canvas" disabled={disabled} />
    </div>
  );
}

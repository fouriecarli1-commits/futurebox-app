/**
 * The Cubed logo. Hers, as the file she sent.
 *
 * ── What she asked, and what this file is not ────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan jy die nie die logo net so vat nie?"* — and
 * then, when the answer to that was a trace of her line work: *"Ek wil nie
 * jou design gebruik nie. Ek wil my designs gebruik. Ek wil nie hê jy moet
 * dit remake nie."*
 *
 * She is right, and the distinction is the whole of this file. A trace is a
 * redrawing: it is my reconstruction of her lines, and it differs from them
 * wherever the tracing was imperfect. So there is no drawing in this
 * repository any more. There is her file, byte for byte as it arrived, and an
 * `<img>` pointing at it.
 *
 * Four marks were drawn here before this and every one of them was sent back.
 * They are in the git history and they are not in the app.
 *
 * ── What that costs, said plainly ────────────────────────────────────────
 *
 * Her file is a JPEG, 1408 by 768, of BOTH marks side by side with CLASS under
 * one and KLAS under the other, on an off-white ground. Used as it is:
 *
 *   · It shows both marks and both words. That is right for a header and
 *     wrong for a 48-pixel door or a tab icon, where it would be a smudge of
 *     two logos.
 *   · Its ground is off-white, so it sits in a pale rectangle on the near-
 *     black Cubed room rather than floating on it.
 *   · It is one size and one colour. It cannot be made pale for a dark page.
 *
 * Every one of those is fixed by a different file from her — one mark, no
 * words, on a transparent ground — and NOT by this code cropping or
 * recolouring hers, which is the thing she asked me not to do. Until that
 * file exists the small places keep the app's own FutureBox mark, which is
 * not her Cubed logo pretending to be small.
 */

import React from 'react';

/** Her file, exactly as she sent it. See `check:cubed`. */
export const LOGO = '/brand/cubed-logo.jpg';

/** What her file actually is, so nothing has to guess its shape. */
export const LOGO_WIDE = 1408;
export const LOGO_TALL = 768;

export default function CubedMark({
  width = 420,
  title,
}: {
  /** How wide to draw it. The height follows her file's own proportions. */
  readonly width?: number;
  /** Given where the logo is the only thing saying what this is. */
  readonly title?: string;
}): React.ReactElement {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO}
      alt={title ?? ''}
      width={width}
      height={Math.round((width * LOGO_TALL) / LOGO_WIDE)}
      /* Her ground is part of her file. Rounding its corners is the least
         that can be done about a pale rectangle on a dark page without
         altering what is inside it. */
      className="h-auto w-full max-w-full rounded-2xl"
      data-cubedmark
    />
  );
}

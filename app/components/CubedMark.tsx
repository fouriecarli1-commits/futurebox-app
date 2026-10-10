/**
 * The Cubed logo. Hers, in two pieces — the lockup, and the mark on its own.
 *
 * ── Whose drawing this is ────────────────────────────────────────────────
 *
 * Hers. Carli sent the artwork and said *"Kan jy die nie die logo net so vat
 * nie?"*, then, when the answer to that had been a trace of her line work:
 * *"Ek wil nie jou design gebruik nie. Ek wil my designs gebruik. Ek wil nie
 * hê jy moet dit remake nie."* Four marks of mine came before it and all four
 * are in the git history and not in the app.
 *
 * ── The two files, and exactly what was done to each ─────────────────────
 *
 * `cubed-logo.jpg` is her file, byte for byte as it arrived, hash-pinned by
 * `check:cubed`. Nothing has been done to it at all.
 *
 * `cubed-mark-*.png` is the mark on its own, because she asked for it:
 * *"Gaan nou vir my die een mark sonder woorde maak."* It was made from her
 * own picture by two operations and no third:
 *
 *   1. CROPPED to a square around the mark, stopping short of the word
 *      underneath it — the word's first inked row is 736, the box ends at
 *      728.
 *   2. The background TAKEN OFF with this app's own remover, the one in
 *      `lib/flatcut.ts` that she asked for an hour earlier. It learned three
 *      greys off the edge of the frame and cleared 83.6% of the box.
 *
 * Not one line was redrawn, recoloured or moved. That distinction is hers and
 * it is the whole reason this comment exists: cropping and clearing a ground
 * are things done TO her drawing; a trace is a different drawing that looks
 * like it.
 *
 * ── What it is not ───────────────────────────────────────────────────────
 *
 * It is not from the original. The single-mark picture reached this session
 * re-encoded, so there is a little compression noise in it that the original
 * would not have. Running the same two steps in the picture room on the file
 * on her own machine gives a cleaner one, and it drops straight in here.
 *
 * And it is navy. On a near-black tile navy is nearly invisible, so the door
 * sets it on a pale chip rather than recolouring it — recolouring would be
 * changing her artwork, and a chip is a place to put it.
 */

import React from 'react';

/** Her lockup, exactly as she sent it: both marks, both words. */
export const LOGO = '/brand/cubed-logo.jpg';
export const LOGO_WIDE = 1408;
export const LOGO_TALL = 768;

/** The mark alone, cropped out of her picture with the ground taken off. */
export const MARK = '/brand/cubed-mark-512.png';
/** The same, for anywhere that will show it large. */
export const MARK_BIG = '/brand/cubed-mark-1024.png';

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

/**
 * The mark on its own, on a pale chip.
 *
 * The chip is not decoration. Her mark is navy, and the two places this goes
 * are both near-black — navy on near-black is a mark nobody can see. The
 * honest fix is to put it on something it reads against, because the other
 * one is to recolour her artwork.
 */
export function CubedChip({
  size = 48,
  title,
}: {
  readonly size?: number;
  readonly title?: string;
}): React.ReactElement {
  return (
    <span
      data-cubedchip
      className="flex flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MARK}
        alt={title ?? ''}
        width={Math.round(size * 0.78)}
        height={Math.round(size * 0.78)}
      />
    </span>
  );
}

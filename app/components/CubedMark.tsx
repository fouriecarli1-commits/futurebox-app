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
 * ── Her own pair, one language each ──────────────────────────────────────
 *
 * Carli, 11 October 2026, having checked both files were see-through and
 * then: *"Ja, sit dit in die app."*
 *
 * `class-en.png` and `class-af.png` are her files, byte for byte as they
 * arrived, both hash-pinned by `check:cubed`. They replace the lockup in the
 * room for a reason that is not taste: `cubed-logo.jpg` carries BOTH marks
 * and BOTH words side by side, so an English reader was shown "KLAS" beside
 * "CLASS" and an Afrikaans reader was shown "CLASS". One file per language
 * ends that.
 *
 * They are also transparent — measured before they went in: a real alpha
 * channel, every corner empty, no white box and no grey halo, ink reaching
 * full strength at `7,27,47` and `9,25,54`, and a leftover tint of 8 and 10
 * out of 255 in the enclosed areas, which is about 4% opacity and invisible.
 *
 * ── And nothing is drawn behind them ─────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Gebruik die transparent weergawe, die logo moenie
 * 'n wit agtergrond hê nie."*
 *
 * A panel under a see-through file is the white background she asked not to
 * have, drawn by us instead of baked into the picture. There was one, for
 * about an hour, with a careful comment explaining why it had to be there.
 *
 * Her navy at 7,27,47 measured 1.15:1 against the near-black this room used
 * to be — a logo nobody can see. The three ways out were a panel, recolouring
 * her lines, or turning the light on in the room, and only the third leaves
 * her drawing alone. *"Maak die kamer lig."* So the room is light, her navy
 * reads at 16.7:1 on it, and nothing is drawn behind her file at all.
 * `globals.css` carries the arithmetic and `check:cubed` holds it.
 *
 * ── The older file, kept ─────────────────────────────────────────────────
 *
 * `cubed-logo.jpg` is her file too, byte for byte as it arrived, and stays
 * pinned. It is the pair as she first sent them and nothing is served from
 * it any more.
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

/** Her lockup as she first sent it: both marks, both words, on its own ground. */
export const LOGO = '/brand/cubed-logo.jpg';
export const LOGO_WIDE = 1408;
export const LOGO_TALL = 768;

/** Hers again, one language each, see-through, square. */
export const LOGO_EN = '/brand/class-en.png';
export const LOGO_AF = '/brand/class-af.png';
export const LOCKUP = 1080;

/** Which of her two files a reader of this language should be shown. */
export const lockupFor = (lang: string): string => (lang === 'af' ? LOGO_AF : LOGO_EN);


/** The mark alone, cropped out of her picture with the ground taken off. */
export const MARK = '/brand/cubed-mark-512.png';
/** The same, for anywhere that will show it large. */
export const MARK_BIG = '/brand/cubed-mark-1024.png';

export default function CubedMark({
  width = 420,
  lang = 'en',
  title,
}: {
  /** How wide to draw it. Her file is square, so the height follows. */
  readonly width?: number;
  /** Which of her two files to show. */
  readonly lang?: string;
  /** Given where the logo is the only thing saying what this is. */
  readonly title?: string;
}): React.ReactElement {
  return (
    <span
      data-cubedmark
      className="block overflow-hidden rounded-2xl"
      style={{ maxWidth: width }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lockupFor(lang)}
        alt={title ?? ''}
        width={width}
        height={width}
        className="h-auto w-full max-w-full"
      />
    </span>
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

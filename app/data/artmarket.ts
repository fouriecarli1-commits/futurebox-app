/**
 * Album art by real artists: what a piece costs, and who gets what.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 20 September 2026: *"Daar moet Album art by real artists. Daar in
 * moet heel bo kunstenaars se regte art in kom wat op gebee kan word.
 * Starting rate wat op elke foto kom, R200. Die kamer moet ook mooi kan
 * uitwys dat elke kunswerk wat te koop is uniek is en net een keer
 * verkoop."*
 *
 * And for a commission, asked and answered the same day: *"70% van wins vir
 * kunstenaar, 30% wins vir ons."*
 *
 * ── Wins, not omset ──────────────────────────────────────────────────────
 *
 * She said **wins** — profit — and that word is the whole of this file. The
 * gateway takes its cut off the top of every card payment whatever anybody
 * has agreed, so a "70%" computed on the sticker price pays the artist 70%
 * of money that never arrived. On a R200 piece that is R6.30 of somebody
 * else's money, every time, and it is the kind of error that is only ever
 * found by an artist doing their own sums.
 *
 * So: the gateway comes off first, and 70/30 is on what is left.
 *
 * `gatewayFee` is imported rather than written again. This app has already
 * had two meanings for one word twice; two formulas for one fee would be
 * the same fault with money attached.
 */

import { gatewayFee } from '../lib/plans';

/** What every piece in the gallery starts at, printed on the photograph. */
export const START_RAND = 200;

/** What a commissioned, one-off piece costs. Her number. */
export const UNIQUE_RAND = 500;

/** The artist's share of the profit. Hers: 70/30. */
export const ARTIST_SHARE = 0.7;

/**
 * How long an artist may take, offered as a choice rather than typed.
 *
 * Her list exactly. A commission with no date on it is the thing people
 * chase each other about, and a date somebody types is a date nobody agreed
 * — these are the four an artist picks from when they name a price.
 */
export const WINDOWS = [
  { days: 2, en: '2 days', af: '2 dae' },
  { days: 4, en: '4 days', af: '4 dae' },
  { days: 6, en: '6 days', af: '6 dae' },
  { days: 14, en: '2 weeks', af: '2 weke' },
] as const;

export type WindowDays = (typeof WINDOWS)[number]['days'];

export interface Split {
  /** What the buyer pays. */
  readonly paid: number;
  /** What the card network takes before anybody sees it. */
  readonly gateway: number;
  /** What is left to divide. This is the "wins". */
  readonly profit: number;
  readonly artist: number;
  readonly house: number;
}

/**
 * Who gets what, to the cent.
 *
 * Rounded to cents and the artist is rounded DOWN, with the remainder going
 * to the house. Not because the house deserves it — because the three
 * numbers have to add up to exactly what was paid, and somebody has to
 * carry the half-cent. Rounding the artist up instead would pay out one
 * cent more than came in, which is a shortfall that grows quietly and is
 * discovered by a bank.
 */
export function split(paid: number): Split {
  const cents = Math.max(0, Math.round(paid * 100));
  /* The gateway cannot take more than came in.
     
     `gatewayFee` is a percentage plus two rand fixed, so under about R2.10
     the fee exceeds the payment. Clamping the PROFIT at zero and leaving
     the fee alone is the obvious reading and it is wrong: the three numbers
     then add up to more than was paid, which is a cent invented out of
     nothing. `check:artmarket` swept two thousand prices and found it at
     R1 before this shipped.
     
     No piece sells for R1 — the floor is R200 — but a function that is only
     correct on the inputs somebody remembered to think about is a function
     waiting for the input they did not. */
  const gateway = Math.min(cents, Math.round(gatewayFee(paid) * 100));
  const profit = cents - gateway;
  const artist = Math.floor(profit * ARTIST_SHARE);
  return {
    paid: cents / 100,
    gateway: gateway / 100,
    profit: profit / 100,
    artist: artist / 100,
    house: (profit - artist) / 100,
  };
}

/* ── How big a picture has to be ──────────────────────────────────────────

   Carli asked it plainly: *"What size must the artist album art be, in
   kb/mb and physical size?"*

   3000 × 3000. That is the square every distributor asks for — Spotify,
   Apple Music and DistroKid all take 3000×3000 and Apple refuses anything
   under 1400 — so a piece bought here can go out on a real release without
   being made again. It is also four times the pixels of a phone screen at
   full brightness, which is what makes a sleeve look painted rather than
   printed when somebody opens it full screen.

   Square, not "roughly square": a sleeve is cropped to a square by every
   shop that shows it, and a crop somebody else chooses is a crop with the
   artist's signature cut off.

   The bytes are a ceiling, not a target. The browser re-encodes to WebP at
   quality 0.85 before anything is uploaded — see `app/lib/imagefile.ts` —
   which puts a 3000×3000 painting at roughly 1 to 3 MB. The ceiling is here
   for the file that does not compress: a photograph of a canvas, full of
   grain, can land at 8 MB and still be one picture. */

/** The side of the square, in pixels. Both dimensions, exactly. */
export const ART_SIDE = 3000;

/** The ceiling on the finished WebP. Roughly 1–3 MB is what to expect. */
export const ART_MAX_BYTES = 8 * 1024 * 1024;

/**
 * What to say to an artist before they choose a file, in their language.
 *
 * One sentence with the numbers in it, because "high resolution please" is
 * what every marketplace says and it is the reason every marketplace has a
 * folder of pictures that are 900 pixels wide.
 */
export const ART_SIZE_SAID = {
  en: `${ART_SIDE} × ${ART_SIDE} pixels, square, up to ${ART_MAX_BYTES / (1024 * 1024)} MB. That is the size every music shop asks for, so the piece can go out on a real release exactly as it is.`,
  af: `${ART_SIDE} × ${ART_SIDE} pixels, vierkantig, tot ${ART_MAX_BYTES / (1024 * 1024)} MB. Dit is die grootte wat elke musiekwinkel vra, so die kunswerk kan net so op 'n regte vrystelling uitgaan.`,
} as const;

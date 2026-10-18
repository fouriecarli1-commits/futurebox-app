/**
 * What the finished film is written at: size, frame rate and bitrate.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 4 October 2026: *"Die export moet ook 'n keuse van kwaliteit hê
 * waarin dit export."*
 *
 * Three numbers decide that, and they are not independent — a 1080p film at 5
 * Mbps looks worse than a 720p one at the same bitrate, because the same bits
 * are spread over twice the pixels. So the bitrate is DERIVED by default and
 * only overridden on purpose: picking "1080p" should mean picking a good
 * 1080p, not picking a resolution and then having to know what to do next.
 *
 * ── Why the sizes are a short side and not a pair ────────────────────────
 *
 * The film is already tall, wide or square — `SHAPES` in `videoedit.ts`. A
 * grade here names the SHORT side, and the long side follows from the shape,
 * so "720p" means the same amount of detail whichever way round the film is.
 * A table of width-and-height pairs per shape would be twelve numbers that
 * have to agree, and this is four.
 */

/** One rung: what it is called, and how many pixels down its short side. */
export type Grade = {
  readonly id: string;
  readonly short: number;
  readonly name: readonly [string, string];
  /** What it is for, in words, because "540p" means nothing to most people. */
  readonly what: readonly [string, string];
};

export const GRADES: readonly Grade[] = [
  {
    id: '480', short: 480,
    name: ['grade.480', '480p'],
    what: ['grade.480.what', 'Smallest file. Fine for a message or a story.'],
  },
  {
    id: '720', short: 720,
    name: ['grade.720', '720p'],
    what: ['grade.720.what', 'Half the size of 1080p and still sharp on a phone.'],
  },
  {
    id: '1080', short: 1080,
    name: ['grade.1080', '1080p'],
    what: ['grade.1080.what', 'What every platform wants. The one to post.'],
  },
];

/**
 * 1080 and not higher, deliberately.
 *
 * The clips going in come off a phone camera or a generation engine, and
 * neither hands back more than 1080 along the short side in practice. Writing
 * a 4K file from 1080 material does not add detail — it adds a file four times
 * the size with the same picture in it, and a long upload on a South African
 * connection. If the material ever carries more, this is where the rung goes.
 */
export const GRADE_DEFAULT = '1080';

/** Frames a second. */
export const RATES: readonly number[] = [24, 25, 30, 50, 60];

/**
 * Thirty, which is what the room plays at and what the clips arrive at.
 *
 * Twenty-four is cinema and looks it; fifty and sixty are for motion that is
 * actually fast. Picking a rate higher than the material was shot at invents
 * nothing — it writes the same frame twice and doubles the file.
 */
export const RATE_DEFAULT = 30;

export function gradeFor(id: string | undefined): Grade {
  return GRADES.find((one) => one.id === id)
    ?? GRADES.find((one) => one.id === GRADE_DEFAULT)
    ?? GRADES[GRADES.length - 1];
}

export function rateFor(fps: number | undefined): number {
  return typeof fps === 'number' && RATES.includes(fps) ? fps : RATE_DEFAULT;
}

/**
 * The frame to write, from the film's shape and the chosen grade.
 *
 * Never larger than the shape itself: a grade is a way down from the film's
 * own size, not a way up. Asking for 1080p on a 1080-tall film is the film's
 * own size, and there is no rung above it.
 *
 * Both sides are forced even. H.264 and VP8 encode in macroblocks and an odd
 * dimension is either rejected or silently rounded by the encoder, which is
 * how a 1081-pixel film becomes a film with a one-pixel green edge.
 */
export function sizeFor(
  shape: { readonly width: number; readonly height: number },
  grade: string | undefined,
): { width: number; height: number } {
  const want = gradeFor(grade).short;
  const short = Math.min(shape.width, shape.height);
  const scale = Math.min(1, want / short);
  const even = (n: number): number => Math.max(2, Math.round(n / 2) * 2);
  return { width: even(shape.width * scale), height: even(shape.height * scale) };
}

/**
 * Bits a second, worked out from the frame and the rate.
 *
 * ── Why a formula and not a table ────────────────────────────────────────
 *
 * Bits per pixel per frame is the quantity that actually governs how a
 * compressed picture looks, and it is roughly constant across sizes for a
 * given quality. So one coefficient covers every rung, and a new rung needs no
 * new number. 0.09 is the usual working figure for VP8/VP9 at "good enough to
 * post" — below about 0.06 blocking shows on motion, and above about 0.15 the
 * file grows without the picture improving.
 *
 * Floored at 1 Mbps, because a very small frame at a low rate otherwise lands
 * somewhere no encoder behaves well, and capped at 24 so a 60fps 1080p film
 * does not produce a file nobody can upload.
 */
export const BITS_PER_PIXEL = 0.09;

export function bitsFor(width: number, height: number, fps: number): number {
  const raw = width * height * fps * BITS_PER_PIXEL;
  return Math.round(Math.min(24_000_000, Math.max(1_000_000, raw)));
}

/** What the sound takes of a film's bits, which a limit has to leave room for. */
export const SOUND_BITS = 128_000;
/** The least a limit may squeeze the picture to: below this it is mush. */
export const LEAST_BITS = 150_000;

/**
 * The bitrate under a limit on the file's size.
 *
 * The owner, 18 October 2026: *"menend 1mb ens."* A film's file is its bits a
 * second times its length, so a limit in bytes is a ceiling on the bitrate:
 * what the limit holds, less the sound, less a tenth because the encoder
 * aims at a bitrate and may land above it. Never more than the grade's own
 * bitrate — a limit makes a file smaller, not better — and never below
 * `LEAST_BITS`, where a long film under a small limit would be colours
 * rather than a picture; the screen says when that is where it landed.
 */
export function bitsUnder(seconds: number, most: number | null | undefined): number | null {
  if (!most || !(most > 0) || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.max(LEAST_BITS, Math.floor((most * 8 * 0.9) / seconds - SOUND_BITS));
}

/** The grade's bitrate, lowered to fit a limit when there is one. */
export function bitsWithin(width: number, height: number, fps: number, seconds: number, most: number | null | undefined): number {
  const own = bitsFor(width, height, fps);
  const under = bitsUnder(seconds, most);
  return under === null ? own : Math.min(own, under);
}

/** Whether a limit is more than even the leanest picture can come in under. */
export function tooSmallFor(seconds: number, most: number | null | undefined): boolean {
  if (!most || !(seconds > 0)) return false;
  return ((LEAST_BITS + SOUND_BITS) * seconds) / 8 > most * 0.9;
}

/**
 * Roughly how big the file will be, in megabytes.
 *
 * Shown before the press, because a number afterwards is a surprise — and on a
 * metered connection a surprise about size is the same kind of problem as a
 * surprise about money. Rounded to whole megabytes: a tenth of a megabyte is
 * precision this cannot honestly claim, since the bitrate is a target the
 * encoder is free to miss.
 */
export function weighs(seconds: number, bits: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(1, Math.round((seconds * bits) / 8 / 1_000_000));
}

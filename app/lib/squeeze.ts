/**
 * A file that has to come in under a size: the compressor every way out
 * shares.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 18 October 2026, while Google Play turned down an app icon for
 * being too big: *"mense moet ook die size van die file kan kies by export,
 * menend 1mb ens. 'n Compressor by elke export ook."* And, of the tool she
 * used to fix it: *"dit wys soos jy verstel die file size"* — the size of the
 * file it will make, and how much smaller that is, on the screen before
 * anything is saved.
 *
 * So two things live here. A LIMIT — "at most 1 MB" — that the file is made
 * to fit, and the arithmetic for saying how big it came out.
 *
 * ── How a picture is made to fit ─────────────────────────────────────────
 *
 * A JPG or WebP has a quality, and quality is the cheap thing to give up:
 * the file is searched for the best quality that still fits, by halving the
 * gap, which takes six tries rather than sixty. Only when even a low quality
 * is too big does the picture get fewer pixels, a step at a time.
 *
 * A PNG has no quality — it keeps every pixel — so the one thing that makes
 * it smaller is fewer pixels, and that is what it gets. The screen says so,
 * because a limit that quietly halved her picture would be a surprise.
 *
 * ── Units ────────────────────────────────────────────────────────────────
 *
 * A thousand, not 1024. A limit is written by somebody else — "1 MB or
 * smaller" on an upload form — and a file of 1,000,000 bytes is under it
 * whichever of the two they meant.
 *
 * Pure: the encoder is handed in, so `check:squeeze` runs the search without
 * a browser.
 */

/** Limits offered, in bytes. Null is "no limit". */
export const LIMITS = [null, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000] as const;
export type Limit = (typeof LIMITS)[number];

/** The lowest quality a search goes to before it starts taking pixels. */
export const LOWEST_QUALITY = 0.4;
/** The smallest share of the picture's width it will shrink to. */
export const SMALLEST_SCALE = 0.2;
const TRIES = 6;
const SHRINK = 0.85;

/**
 * Makes the file at a quality (ignored for PNG) and a share of the full size
 * (1 is full size). Null when it could not be made.
 */
export type Encode = (quality: number | undefined, scale: number) => Promise<Blob | null>;

export interface Fitted {
  readonly blob: Blob;
  /** The quality it was made at, or undefined for a PNG. */
  readonly quality: number | undefined;
  /** The share of the full size it was made at — under 1 means fewer pixels. */
  readonly scale: number;
  /** Whether it is under the limit. False only when nothing would fit. */
  readonly fits: boolean;
}

/**
 * The best file under `most` bytes.
 *
 * `quality` is what the room would have used with no limit — the ceiling of
 * the search, so a limit never makes a file better than she chose, only
 * smaller. Undefined means the format is lossless.
 */
export async function fitUnder(
  encode: Encode,
  quality: number | undefined,
  most: Limit,
  /** False where the pixels are the point — album art at 3000 × 3000 — so
      only the quality may give, and a file that still does not fit says so. */
  pixels = true,
): Promise<Fitted | null> {
  const first = await encode(quality, 1);
  if (!first) return null;
  if (most === null || first.size <= most) return { blob: first, quality, scale: 1, fits: true };

  let scale = 1;
  let best: Fitted = { blob: first, quality, scale: 1, fits: false };
  while (scale >= SMALLEST_SCALE) {
    if (quality !== undefined) {
      /* Halving the gap between a quality that fits and one that does not. */
      let low = LOWEST_QUALITY;
      let high = Math.max(low, quality);
      const floor = await encode(low, scale);
      if (floor && floor.size <= most) {
        let found: Fitted = { blob: floor, quality: low, scale, fits: true };
        for (let tries = 0; tries < TRIES; tries += 1) {
          const middle = (low + high) / 2;
          const made = await encode(middle, scale);
          if (!made) break;
          if (made.size <= most) {
            found = { blob: made, quality: middle, scale, fits: true };
            low = middle;
          } else {
            high = middle;
          }
        }
        return found;
      }
      if (floor && floor.size < best.blob.size) best = { blob: floor, quality: low, scale, fits: false };
    } else if (scale < 1) {
      const made = await encode(undefined, scale);
      if (made && made.size <= most) return { blob: made, quality: undefined, scale, fits: true };
      if (made && made.size < best.blob.size) best = { blob: made, quality: undefined, scale, fits: false };
    }
    if (!pixels) break;
    scale = Math.round(scale * SHRINK * 1000) / 1000;
  }
  return best;
}

/** A size the way a person reads it: "270 kB", "1.4 MB". */
export function sizeSaid(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`;
  const mb = bytes / 1_000_000;
  /* "1 MB", not "1.0 MB": the limit buttons are read at a glance. */
  const tenths = Math.round(mb * 10);
  return `${mb < 10 && tenths % 10 !== 0 ? (tenths / 10).toFixed(1) : Math.round(mb)} MB`;
}

/** How much smaller, as a whole percentage; 0 when it is not smaller. */
export function smallerBy(before: number, after: number): number {
  if (!(before > 0) || !(after >= 0) || after >= before) return 0;
  return Math.round((1 - after / before) * 100);
}

/** A stored number as one of the limits, or no limit when it is not one. */
export function limitOf(raw: unknown): Limit {
  return (LIMITS as readonly unknown[]).includes(raw) ? (raw as Limit) : null;
}

/** The limit's own label: "No limit", "1 MB", "500 kB". */
export function limitSaid(limit: Limit, none: string): string {
  return limit === null ? none : sizeSaid(limit);
}

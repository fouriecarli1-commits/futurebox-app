/**
 * One step back, in a room where every good tool destroys something.
 *
 * ── Why this room needs it more than the others ──────────────────────────
 *
 * Five of the photo editor's tools replace the photograph outright, on
 * purpose: the crop throws away what is outside the box, the background
 * remover throws away the background, the eraser grows the picture over a
 * gap, the free-hand cut keeps what was drawn round and loses the rest. Each
 * of them is right to — a selection held beside the picture would have to be
 * applied by the export, the reader, the hand-over and every other tool, and
 * the one that forgot would work on the wrong photograph.
 *
 * The cost of that decision is that the only way back was `Start a new post`
 * and bringing the file in again. Which means every one of those tools is a
 * thing you think twice about pressing, and a tool you think twice about
 * pressing is a tool that does not get used.
 *
 * ── Why not `lib/undo.ts` ────────────────────────────────────────────────
 *
 * That module is the cutting room's, and it is built around what makes audio
 * history dangerous: it weighs each step by DISTINCT `AudioBuffer` bytes,
 * because two lanes can point at the same decoded minute of sound and
 * counting it twice would evict a history that fits.
 *
 * Pictures have the opposite shape. Every step holds exactly one image and
 * no two steps share one — each is a fresh canvas written by the tool that
 * made it — so the arithmetic is a sum rather than a set, and its `Holder`
 * type wants an `.audio` that a picture has not got. Making one module serve
 * both would mean a generic over two weighings to save a dozen lines.
 *
 * ── The ceiling, which is the whole design ───────────────────────────────
 *
 * A decoded 4032x3024 photograph is 48 megabytes of pixels — not the two or
 * three megabytes the file on disk is, because a browser holds it unpacked.
 * Eight of those is 390 MB, which on a phone is the tab being killed by the
 * operating system with no message of any kind.
 *
 * So the step count is generous and the BYTES are what actually bite, and
 * one step is always kept whatever it weighs: a history that refuses to hold
 * the single step somebody is about to press is not a history.
 */

/** Enough of an image to weigh one. Real images and canvases satisfy this. */
export interface Pixels {
  readonly naturalWidth?: number;
  readonly naturalHeight?: number;
  readonly width: number;
  readonly height: number;
}

/** One thing that happened, and the picture as it was before it. */
export interface Shot<T> {
  /** What the button says it undoes: "the crop", "the background". Hers. */
  readonly what: string;
  /** `null` is a real state — the room before a picture was brought in. */
  readonly picture: T | null;
}

/**
 * How far back it goes when nothing is heavy.
 *
 * Eight. Small enough that the ceiling below is the thing that decides on a
 * real photograph, and big enough to walk out of a wrong turn on a small
 * one — which is the case where the bytes never bite.
 */
export const KEEP_SHOTS = 8;

/**
 * And the ceiling that actually bites, in bytes of pixels.
 *
 * 192 MB. A phone browser has a few hundred megabytes before the tab is
 * killed, and the live picture, the canvas, the preview and whatever the
 * background remover is holding all want their share of it. Three full-size
 * phone photographs deep, which is three destructive tools in a row.
 */
export const KEEP_BYTES = 192 * 1024 * 1024;

/** Four bytes a pixel, which is what a decoded image really occupies. */
export const bytesOf = (of: Pixels | null): number => {
  if (!of) return 0;
  const wide = of.naturalWidth || of.width || 0;
  const tall = of.naturalHeight || of.height || 0;
  return Math.max(0, wide) * Math.max(0, tall) * 4;
};

export interface Back<T> {
  /** Put the current picture on the stack, before the change that replaces it. */
  remember(what: string, picture: T | null): void;
  /** Step back. Hands back what to put on screen, or null if there is nothing. */
  undo(now: T | null): Shot<T> | null;
  /** Step forward again. */
  redo(now: T | null): Shot<T> | null;
  /** What the undo button should say it undoes, or null when it is off. */
  undoable(): string | null;
  /** What the redo button should say, or null. */
  redoable(): string | null;
  /** Pixel bytes this history is holding. For the ceiling and for tests. */
  held(): number;
  /** A new post, a new picture off the phone. */
  clear(): void;
}

const weigh = <T extends Pixels>(shots: readonly Shot<T>[]): number =>
  shots.reduce((sum, one) => sum + bytesOf(one.picture), 0);

export function makeBack<T extends Pixels>(
  keepShots: number = KEEP_SHOTS,
  keepBytes: number = KEEP_BYTES,
): Back<T> {
  let back: Shot<T>[] = [];
  let forward: Shot<T>[] = [];

  /* Oldest first, and never the last one. */
  const trim = (): void => {
    while (back.length > keepShots) back.shift();
    while (back.length > 1 && weigh(back) > keepBytes) back.shift();
  };

  return {
    remember(what, picture) {
      back.push({ what, picture });
      /* A new change abandons the way forward, the way every editor does:
         the future that was there was a future of the state just left. */
      forward = [];
      trim();
    },
    undo(now) {
      const shot = back.pop();
      if (!shot) return null;
      /* Redo needs where we were standing, labelled with the same words: the
         thing you undid is the thing you would do again. */
      forward.push({ what: shot.what, picture: now });
      return shot;
    },
    redo(now) {
      const shot = forward.pop();
      if (!shot) return null;
      back.push({ what: shot.what, picture: now });
      trim();
      return shot;
    },
    undoable: () => (back.length ? back[back.length - 1].what : null),
    redoable: () => (forward.length ? forward[forward.length - 1].what : null),
    held: () => weigh([...back, ...forward]),
    clear() {
      back = [];
      forward = [];
    },
  };
}

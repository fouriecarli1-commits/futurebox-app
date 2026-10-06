/**
 * Words on a picture, laid out before anybody draws them.
 *
 * ── Why the text is not generated ────────────────────────────────────────
 *
 * Carli asked for an image tool that can put text on a post "met mooi teks
 * formate". The tempting answer is to ask the image model for it. That answer
 * is wrong, and it is wrong in a way that only shows up on the finished post:
 * these models draw something letter-SHAPED. "FutureBox" comes back as
 * "FuturBoxx", or as nine glyphs that are not quite any alphabet, and on a
 * cover with an artist's name on it that is unusable.
 *
 * So the picture is a picture and the words are words, drawn over it as real
 * text. Perfectly spelt, any face, movable afterwards, and free — nothing
 * leaves the device to put a caption on a post.
 *
 * ── The part that is actually hard ───────────────────────────────────────
 *
 * Not the drawing. The two things that make a post look amateur:
 *
 *   1. Text that overflows, or is shrunk so far it cannot be read.
 *   2. Text that lands under the platform's own furniture — the caption, the
 *      username, the column of buttons — so the thing you wrote is covered
 *      the moment it is posted. You find that out after posting, which is the
 *      wrong time. `lib/safezones.ts` already knows where that furniture is,
 *      for video; this is the same knowledge used one room over.
 *
 * ── Measuring, which a pure function cannot do ───────────────────────────
 *
 * How wide a string is depends on the font the browser actually loaded, and
 * only a canvas can answer that. So every function here takes a `measure`
 * and none of them guesses: the screen passes `ctx.measureText`, and a check
 * passes a ruler it controls. That is what makes this file testable at all —
 * an approximation built in would be a layout engine whose answers could only
 * be verified by looking at it.
 */

import { ALL, boxOf, type Zone } from './safezones';

/** How wide this string is, in pixels, at this font size. */
export type Measure = (text: string, px: number) => number;

export interface PostSize {
  readonly id: 'square' | 'story' | 'wide' | 'portrait';
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Whether a platform's furniture sits over this shape. */
  readonly furniture: boolean;
  readonly what: { readonly en: string; readonly af: string };
}

/**
 * The shapes, and the one that is not like the others.
 *
 * `story` is the only one with `furniture`. A square post sits in a feed with
 * nothing printed over it; a vertical story is played inside an app that puts
 * its own caption and buttons on top. Offering a TikTok safe zone on a square
 * would be a lie dressed as a feature, and the honest version of this tool
 * says where the guide applies and where it does not.
 */
export const POST_SIZES: readonly PostSize[] = [
  {
    id: 'square', name: 'Square', width: 1080, height: 1080, furniture: false,
    what: {
      en: 'A feed post. Instagram, Facebook, and the one that works everywhere.',
      af: '’n Plasing in die stroom. Instagram, Facebook, en die een wat oral werk.',
    },
  },
  {
    id: 'story', name: 'Story', width: 1080, height: 1920, furniture: true,
    what: {
      en: 'A full screen, held upright. Stories, Reels, TikTok and Shorts — the app prints its own things over this one.',
      af: '’n Vol skerm, regop gehou. Stories, Reels, TikTok en Shorts — die app druk sy eie goed oor hierdie een.',
    },
  },
  {
    id: 'portrait', name: 'Tall post', width: 1080, height: 1350, furniture: false,
    what: {
      en: 'A feed post that takes more of the screen than a square, without being a story.',
      af: '’n Plasing wat meer van die skerm vat as ’n vierkant, sonder om ’n storie te wees.',
    },
  },
  {
    id: 'wide', name: 'Wide', width: 1280, height: 720, furniture: false,
    what: {
      en: 'A thumbnail or a banner. YouTube, and the top of a page.',
      af: '’n Duimnael of ’n banier. YouTube, en die bokant van ’n bladsy.',
    },
  },
];

export function sizeById(id: string): PostSize | undefined {
  return POST_SIZES.find((one) => one.id === id);
}

/** A box on the frame, in fractions, so it survives a different export size. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Break a line into lines that fit a width.
 *
 * Words are kept whole. A word longer than the whole width — a URL, a hashtag
 * somebody ran together — is given its own line rather than being cut, because
 * a word broken in the middle is a word nobody can read and a line that
 * overflows is at least visibly wrong. `fitText` below is what makes it stop
 * overflowing, by making the letters smaller until it does not.
 */
export function wrap(text: string, px: number, width: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) { lines.push(''); continue; }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next, px) > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export interface Fitted {
  /** The size that fits, in pixels of the export frame. */
  readonly px: number;
  readonly lines: readonly string[];
  /** True when even the smallest allowed size overflowed. */
  readonly tight: boolean;
  /**
   * True when it stopped at the ceiling rather than at the box.
   *
   * Two words in a big box would otherwise come back at whatever `most`
   * happens to be, which LOOKS like a measured answer and is not one. The
   * screen reads this to know the size is its own choice: somebody dragging
   * the box bigger and seeing nothing happen is owed that explanation.
   */
  readonly capped: boolean;
}

/**
 * The largest size at which this text fits that box.
 *
 * Searched downward from `most` rather than computed, because the answer
 * depends on where the words happen to break and that is not a formula. The
 * step is one pixel: a coarser step is visibly wrong on a phone, and the loop
 * is a few dozen iterations over a handful of words.
 *
 * `tight` matters. Text that will not fit is not a crash and it is not
 * silence: the screen says "this is as small as it goes" rather than drawing
 * four words over each other and leaving somebody to notice.
 */
export function fitText(
  text: string,
  box: Box,
  frame: { width: number; height: number },
  measure: Measure,
  { most = 0, least = 14, lineHeight = 1.2 } = {},
): Fitted {
  const width = box.w * frame.width;
  const height = box.h * frame.height;
  /* The ceiling is a fraction of the frame, not a number of pixels.
     160 was a number of pixels, and a number of pixels means one thing on a
     1080 story and something else entirely on a 4K export — the same reason
     every box in this file is a fraction. A fifth of the height is about as
     large as a caption ever wants to be; past that it is a title, and a
     title is a bigger box rather than a bigger ceiling. */
  const ceiling = Math.round(most || frame.height * 0.2);
  for (let px = ceiling; px >= least; px -= 1) {
    const lines = wrap(text, px, width, measure);
    const tall = lines.length * px * lineHeight;
    const widest = lines.reduce((most2, one) => Math.max(most2, measure(one, px)), 0);
    if (tall <= height && widest <= width) {
      return { px, lines, tight: false, capped: px === ceiling };
    }
  }
  return { px: least, lines: wrap(text, least, width, measure), tight: true, capped: false };
}

/**
 * Does this box reach into the platform's furniture?
 *
 * The question the whole file is for. `ALL` is the strictest of the three
 * platforms on each side, computed in `safezones.ts` rather than typed, so
 * "safe" here means safe wherever it is posted.
 *
 * Only asked of a shape that HAS furniture. Asking it of a square would
 * answer about an overlay that is not there, and an overlay drawn on a post
 * nobody will see it on teaches somebody to ignore the warning on the post
 * where it is real.
 */
export function clashes(box: Box, size: PostSize, zone: Zone = ALL): boolean {
  if (!size.furniture) return false;
  const safe = boxOf(zone);
  return (
    box.x < safe.left
    || box.y < safe.top
    || box.x + box.w > safe.left + safe.width
    || box.y + box.h > safe.top + safe.height
  );
}

/**
 * The same box, moved the shortest way out of the furniture.
 *
 * Moved rather than resized: somebody who set a text size meant it, and a
 * caption that silently shrinks when it nears the bottom of a story is a
 * control fighting its user. If it cannot fit even when moved — a box taller
 * than the safe band — it is returned where it was and `clashes` still says
 * so, because a box that cannot be made safe should look unsafe.
 */
export function moveInside(box: Box, size: PostSize, zone: Zone = ALL): Box {
  if (!size.furniture) return box;
  const safe = boxOf(zone);
  if (box.w > safe.width || box.h > safe.height) return box;
  return {
    ...box,
    x: Math.min(Math.max(box.x, safe.left), safe.left + safe.width - box.w),
    y: Math.min(Math.max(box.y, safe.top), safe.top + safe.height - box.h),
  };
}

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

/** Where on the picture a line of words sits. */
export const SPOTS = [
  { id: 'top', y: 0.08 },
  { id: 'middle', y: 0.42 },
  /* ── A fourth, added 7 October 2026 ───────────────────────────────────
 
     Three spots and a story left exactly one of them usable. `top` at 0.08
     is above the deepest top margin of 0.094, so a line there is under the
     platform's own header; `bottom` at 0.74 runs to 0.92, well into the
     caption. Only `middle` was safe, which made every story a one-line post.
 
     `lower` at 0.58 ends at 0.76, inside the safe band of 0.797 — so a story
     can carry a heading and a line under it, which is what a story is for.
     Found by `check:posttemplates`, which was about to offer a template that
     put its own words where the platform prints its own. */
  { id: 'lower', y: 0.58 },
  { id: 'bottom', y: 0.74 },
] as const;

export type SpotId = (typeof SPOTS)[number]['id'];

/**
 * The box a line of words is drawn in.
 *
 * ── Why the sides move when the platform has furniture ───────────────────
 *
 * It was `x: 0.08, w: 0.84` for every shape, which puts the right-hand edge
 * at 0.92. The deepest right margin across the three platforms is 0.111, so
 * the safe edge is 0.889 — and **every** line of words on a story was over
 * it, horizontally, whatever spot it was in.
 *
 * Which meant the room's own warning — "some of your words are where the app
 * prints its own caption and buttons" — was on for every story that had any
 * words at all. A warning that is always on is a warning nobody reads, and
 * the next real one scrolls past with it. Found by `check:posttemplates`,
 * which asked whether a template it was about to offer would land under the
 * furniture and got "yes, all of them, always".
 *
 * So on a shape the platforms draw over, the sides come in to the safe
 * margins. The vertical is left alone on purpose: the bottom quarter of a
 * story really is where the caption goes, and a line placed there really is
 * covered. That one is information, and it is the one the warning is for.
 */
export function boxFor(spot: SpotId, size: PostSize, zone: Zone = ALL): Box {
  const y = SPOTS.find((one) => one.id === spot)?.y ?? 0.42;
  if (!size.furniture) return { x: 0.08, y, w: 0.84, h: 0.18 };
  const safe = boxOf(zone);
  const x = Math.max(0.08, safe.left);
  return { x, y, w: Math.min(0.84, safe.left + safe.width - x), h: 0.18 };
}

/**
 * What goes behind a line of words so it can be read.
 *
 * ── Why a shadow is not enough ───────────────────────────────────────────
 *
 * Every line in this room is drawn with a soft shadow under it, which is the
 * right default and the reason is written where it is drawn: light text on a
 * light photograph is unreadable, and the picture behind the words is
 * whatever she chose rather than a background somebody designed.
 *
 * A shadow carries white text over a busy photograph and loses to two things
 * it meets constantly — a bright sky, and a patterned wall. Every editor
 * answers that the same way, with something solid behind the words, and this
 * room had no answer at all.
 *
 *   · `none` is the shadow alone, which is what it has always been.
 *   · `shade` is a soft dark wash behind the line, fading at its ends. It
 *     reads as part of the photograph and carries over almost anything.
 *   · `bar` is a solid block the width of the words. It reads as a label
 *     rather than as part of the picture, which is exactly right for a date
 *     or a price and wrong for a quotation.
 *
 * Measured from the words rather than the box: a bar as wide as the box
 * round a two-word line is a stripe across the picture with a word in the
 * middle of it.
 */
export const BACKDROPS = ['none', 'shade', 'bar'] as const;
export type Backdrop = (typeof BACKDROPS)[number];

/**
 * The rectangle to paint behind one line, in frame pixels, or `null`.
 *
 * `widest` is what the widest line of this block measures, so a two-line
 * block gets one width and does not step in and out. The padding is a share
 * of the type size for the reason every other measurement here is a share:
 * four pixels is a frame round 14px type and invisible round 200px type.
 */
export function behindWords(
  widest: number,
  px: number,
  lines: number,
  at: { readonly x: number; readonly y: number },
  frame: { readonly width: number },
): { x: number; y: number; w: number; h: number } {
  const padX = px * 0.38;
  const padY = px * 0.22;
  const w = Math.min(frame.width, widest + padX * 2);
  return {
    x: at.x - w / 2,
    y: at.y - padY,
    w,
    h: lines * px * 1.2 + padY * 2 - px * 0.2,
  };
}

/**
 * The two spacings, and where a line of words actually sits.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Die woord op die screen kan nog nie geskuif en
 * gecrop word nie. Daar moet 'n ook 'n line spacing scroll bar wees, en
 * spacing tussen die woorde self. Dus moet daar twee spacing bars wees."*
 *
 * Three things, and the first is the one that makes the other two worth
 * having: words could only sit in one of four places down the middle of the
 * picture. Everything else about them was adjustable and WHERE they went was
 * not, which on a photograph of a person means the caption goes across their
 * face and there is nothing to be done about it.
 *
 * ── Why the position is a share and not a spot ───────────────────────────
 *
 * The four spots stay, because they are quick and they are where a caption
 * usually goes. What is added is a position underneath them: a pair of
 * shares, 0..1, of the picture's own width and height. Pressing a spot sets
 * it; dragging moves it; and because it is a share it means the same thing
 * after the shape changes, which a number of pixels would not.
 *
 * ── And why the two spacings are measured, not just drawn ────────────────
 *
 * Letter spacing changes how wide a line is, and how wide a line is decides
 * where it wraps and what size it fits at. A spacing applied at the drawing
 * and not at the measuring gives text that overflows the box it was fitted
 * to — which is the whole job `fitText` exists to do. So the measurement
 * takes the gap too.
 */

/** How far apart the lines are, as a multiple of the type size. */
export const LINE_GAP = { min: 0.9, max: 2.2, step: 0.05, normal: 1.2 };

/** How far apart the letters are, as a share of the type size. */
export const LETTER_GAP = { min: -0.05, max: 0.5, step: 0.01, normal: 0 };

/** Where a line of words sits, as a share of the picture. */
export interface At {
  readonly x: number;
  readonly y: number;
}

/** The spot presets, as positions. `x` is the middle for all four. */
export const atOf = (spot: SpotId): At =>
  ({ x: 0.5, y: (SPOTS.find((one) => one.id === spot)?.y ?? 0.42) + 0.09 });

/**
 * A line of words measured with its letter spacing in it.
 *
 * Wrapped round whatever the canvas measures, because `fitText` and `wrap`
 * take a `Measure` and have no business knowing about a gap. One extra gap
 * per letter and none after the last, which is how every typesetter has
 * counted it and is not what `ctx.letterSpacing` does — that one adds a gap
 * after the last letter too, and a centred line is then off-centre by half
 * of it.
 */
export const measureWithGap = (measure: Measure, gap: number): Measure =>
  (text: string, px: number) =>
    measure(text, px) + Math.max(0, text.length - 1) * gap * px;

/**
 * Where the top-left of a block of words goes, from its middle.
 *
 * The block is centred on `at`, horizontally and vertically, because that is
 * what dragging a thing to a place means — the place is the middle of it,
 * not a corner nobody can see.
 */
export function blockAt(
  at: At,
  lines: number,
  px: number,
  lineGap: number,
  frame: { readonly width: number; readonly height: number },
): { readonly x: number; readonly y: number } {
  const tall = lines * px * lineGap;
  return {
    x: at.x * frame.width,
    y: at.y * frame.height - tall / 2,
  };
}

/** Inside the picture, wherever a thumb lets go of it. */
export const atInside = (at: At): At => ({
  x: Math.min(1, Math.max(0, Number.isFinite(at.x) ? at.x : 0.5)),
  y: Math.min(1, Math.max(0, Number.isFinite(at.y) ? at.y : 0.5)),
});

/**
 * The rectangle a block of words really occupies, for the clash warning.
 *
 * `boxFor` is the box the type is FITTED in — how large it may be and where
 * it may wrap. Once she can drag a line anywhere, that is no longer where it
 * ends up, and the warning about the platform's furniture has to be about
 * where it ends up.
 *
 * The width is the fitting box's, because a line is wrapped to that; the
 * height and the middle come from where she put it.
 */
export function boxAround(at: At, size: PostSize, zone: Zone = ALL): Box {
  const fitted = boxFor('middle', size, zone);
  const w = fitted.w;
  const h = 0.18;
  return {
    x: Math.min(1 - w, Math.max(0, at.x - w / 2)),
    y: Math.min(1 - h, Math.max(0, at.y - h / 2)),
    w,
    h,
  };
}

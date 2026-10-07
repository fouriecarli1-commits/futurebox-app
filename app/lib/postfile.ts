/**
 * What kind of file a post comes out as, and how big.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 7 October 2026, having seen what other editors offer on the way out:
 * *"Ook die formaat van export?"* — and then, when the options were put to
 * her: *"gaan aan, en los PDF en SVG uit."*
 *
 * Until that day every post left the room as one thing: a PNG at the post's
 * own size, with no choice. That is the right default and the wrong only
 * option — a 1080x1920 PNG of a photograph is three or four megabytes, which
 * is a slow upload on a phone and refused outright by one or two of the
 * places she posts.
 *
 * ── Why these two and not six ────────────────────────────────────────────
 *
 * PNG and JPG are the two that answer different questions about the same
 * picture: keep everything, or make it small. The four that were left out
 * were left out for reasons, and they are written here rather than in a
 * message nobody can find later:
 *
 *   · **SVG** is for drawings made of lines. A photograph inside an SVG is
 *     the same photograph with an XML wrapper round it — bigger, and no
 *     sharper at any size. It earns its place in a tool whose documents are
 *     really vector artwork; a post made of a photograph and some words is
 *     not one, whatever it is saved as.
 *   · **PDF** is a real answer for printing and a separate piece of work.
 *     Left out until somebody needs it.
 *   · **MP4 and GIF** are not formats of this picture at all. Turning a still
 *     into something that moves is a different tool with a supplier behind
 *     it and a price of its own.
 *
 * ── The one that catches people ──────────────────────────────────────────
 *
 * JPEG has no transparency. There is no flag for it and no quality setting
 * that brings it back: the format holds three channels and that is the end
 * of it. So a see-through post saved as a JPG comes out on a solid colour,
 * and the only question is whether the room says so first or lets her find
 * out when she opens the file. `holdsClear` is what the screen asks.
 */

/** The two a post can be saved as. */
export type FileKind = 'png' | 'jpg';

export interface Format {
  readonly id: FileKind;
  /** What `toBlob` is asked for. */
  readonly type: string;
  /** On the end of the file name. */
  readonly ext: string;
  /** Can it hold a see-through background? */
  readonly clear: boolean;
  /** `toBlob`'s second argument. Ignored for PNG, which is lossless. */
  readonly quality?: number;
  readonly name: readonly [string, string];
  readonly what: readonly [string, string];
}

export const FORMATS: readonly Format[] = [
  {
    id: 'png',
    type: 'image/png',
    ext: 'png',
    clear: true,
    name: ['post.kindPng', 'PNG'],
    what: [
      'post.kindPngWhat',
      'Keeps everything, including a see-through background. The bigger file of the two.',
    ],
  },
  {
    id: 'jpg',
    type: 'image/jpeg',
    ext: 'jpg',
    /* 0.92, which is where a photograph stops being visibly worse.
 
       Not 1.0: a JPEG at full quality is most of the size of a PNG and is
       still lossy, so it is the worst of both. Not 0.8, which is where flat
       colour behind lettering starts to show the blocks — and this room puts
       lettering over flat colour by default. */
    quality: 0.92,
    clear: false,
    name: ['post.kindJpg', 'JPG'],
    what: [
      'post.kindJpgWhat',
      'A much smaller file, for sending and uploading. It cannot hold a see-through background.',
    ],
  },
];

export const formatOf = (id: FileKind): Format =>
  FORMATS.find((one) => one.id === id) ?? FORMATS[0];

/** Whether this format can carry what is actually on the canvas. */
export const holdsClear = (id: FileKind, seeThrough: boolean): boolean =>
  !seeThrough || formatOf(id).clear;

/**
 * How many times the post's own size to write.
 *
 * Two rungs, not five. The post sizes in `posttext.ts` are already the size
 * the platforms want, so one is the answer nearly every time; two is for
 * printing something or for a screen bigger than a phone. A multiplier of
 * three on a 1080x1920 post is a 3240x5760 canvas, which is 18 megapixels of
 * browser memory for a thing nobody asked for.
 */
export const SCALES = [1, 2] as const;
export type Scale = (typeof SCALES)[number];

export const sane = (n: number): Scale => (n === 2 ? 2 : 1);

/** The file name, which is the only thing she sees of all this afterwards. */
export const nameFor = (sizeId: string, id: FileKind, scale: Scale): string =>
  `futurebox-${sizeId}${scale === 1 ? '' : `-${scale}x`}.${formatOf(id).ext}`;

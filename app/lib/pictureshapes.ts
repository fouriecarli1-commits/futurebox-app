/**
 * The shapes a picture can be asked for.
 *
 * ── Why this is a file and not a list in each room ───────────────────────
 *
 * Because there were three lists and they disagreed. `lib/server/picture.ts`
 * passes five ratios through to Google and `/api/google/picture` accepts
 * five — and the photo room offered three, the advert room its own two, and
 * the storybook one hardcoded square. So two of the five were reachable only
 * by somebody writing the request by hand.
 *
 * The two that were missing are not exotic: 4:3 and 3:4 are the shapes an
 * ordinary camera takes, which is to say the shapes most pictures in the
 * world actually are. They were left out because a list of three got written
 * quickly and nothing ever compared it to what the engine takes.
 *
 * Carli, 9 October 2026: *"daar moet van alles wat opsies is, 'n
 * verskeidenheid wees."* `check:prentvorms` holds this list against the
 * route's and against the rooms', so a sixth ratio appears everywhere or the
 * check says which room missed it.
 *
 * ── Why each one says what it is FOR ─────────────────────────────────────
 *
 * "4:3" means nothing to somebody who has not worked with pictures, and
 * "Wide" does not say how wide. Every room shows the name and the use, so
 * the choice is made on what the picture is for rather than on arithmetic.
 */

export type ShapeId = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export interface Shape {
  readonly id: ShapeId;
  readonly en: string;
  readonly af: string;
  /** What this shape is for, in English and Afrikaans. */
  readonly forEn: string;
  readonly forAf: string;
}

/**
 * Square first, because a post is square and that is the common case. Then
 * the two camera shapes, then the two screen shapes — ordered by how far
 * each is from square rather than alphabetically, so the row reads as a
 * widening and a narrowing rather than as a jumble.
 */
export const SHAPES: readonly Shape[] = [
  {
    id: '1:1', en: 'Square', af: 'Vierkant',
    forEn: 'a post, a cover, a profile picture',
    forAf: 'n plasing, n omslag, n profielfoto',
  },
  {
    id: '4:3', en: 'Photo', af: 'Foto',
    forEn: 'what an ordinary camera takes, lying down',
    forAf: 'wat n gewone kamera neem, plat',
  },
  {
    id: '3:4', en: 'Photo upright', af: 'Foto regop',
    forEn: 'the same, standing up — a portrait, a poster',
    forAf: 'dieselfde, regop — n portret, n plakkaat',
  },
  {
    id: '16:9', en: 'Wide', af: 'Breed',
    forEn: 'a film frame, a banner, a thumbnail',
    forAf: 'n filmraam, n baniere, n duimnael',
  },
  {
    id: '9:16', en: 'Tall', af: 'Hoog',
    forEn: 'a phone screen — a reel, a story, a short',
    forAf: 'n foonskerm — n reel, n storie, n short',
  },
];

export const SHAPE_DEFAULT: ShapeId = '1:1';

export const SHAPE_IDS: readonly ShapeId[] = SHAPES.map((one) => one.id);

/** Whether a string off a request is one of these. */
export function isShape(value: unknown): value is ShapeId {
  return typeof value === 'string' && SHAPE_IDS.includes(value as ShapeId);
}

/** The one with this id, or the default — never undefined. */
export function shapeOf(id: string | undefined): Shape {
  return SHAPES.find((one) => one.id === id)
    ?? SHAPES.find((one) => one.id === SHAPE_DEFAULT)!;
}

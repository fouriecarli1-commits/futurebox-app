/**
 * The shapes each platform shows a post in, for the photo editor's preview.
 *
 * The owner, 15 October 2026, about the purple eye: *"Die pers ogie moet vir jou
 * opsies gee van tipe posts. Elke platform se size lyk anders."* The eye used
 * to show one card at the post's own size, which answered nothing: a picture
 * that is right as an Instagram post is cut in half as a YouTube thumbnail.
 *
 * Each kind is drawn in the shape the platform gives it, the picture filling
 * that shape the way the platform fills it, so what falls off the edges is
 * what you see fall off. They are the shapes the platforms publish for
 * uploads; the apps move their own buttons about, which is why `safezones.ts`
 * holds those as fractions and calls them a guide.
 */

export type FeedLook = 'feed' | 'full' | 'thumb';

export interface FeedKind {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  readonly width: number;
  readonly height: number;
  /** A card in a feed, a whole upright screen, or a video's thumbnail. */
  readonly look: FeedLook;
}

export interface FeedPlatform {
  readonly id: string;
  readonly name: string;
  readonly kinds: readonly FeedKind[];
}

const STORY = { width: 1080, height: 1920, look: 'full' } as const;

export const FEED_PLATFORMS: readonly FeedPlatform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    kinds: [
      { id: 'ig-post', en: 'Post', af: 'Plasing', width: 1080, height: 1350, look: 'feed' },
      { id: 'ig-square', en: 'Square post', af: 'Vierkant', width: 1080, height: 1080, look: 'feed' },
      { id: 'ig-story', en: 'Story & Reel', af: 'Storie & Reel', ...STORY },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    kinds: [{ id: 'tt-post', en: 'Video & photo', af: 'Video & foto', ...STORY }],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    kinds: [
      { id: 'fb-post', en: 'Post', af: 'Plasing', width: 1080, height: 1350, look: 'feed' },
      { id: 'fb-story', en: 'Story', af: 'Storie', ...STORY },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    kinds: [
      { id: 'yt-thumb', en: 'Thumbnail', af: 'Duimnael', width: 1280, height: 720, look: 'thumb' },
      { id: 'yt-short', en: 'Short', af: 'Short', ...STORY },
    ],
  },
  {
    id: 'x',
    name: 'X',
    kinds: [{ id: 'x-post', en: 'Post', af: 'Plasing', width: 1600, height: 900, look: 'feed' }],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    kinds: [
      { id: 'li-post', en: 'Post', af: 'Plasing', width: 1200, height: 627, look: 'feed' },
      { id: 'li-square', en: 'Square post', af: 'Vierkant', width: 1080, height: 1080, look: 'feed' },
    ],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    kinds: [{ id: 'pin', en: 'Pin', af: 'Pin', width: 1000, height: 1500, look: 'feed' }],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    kinds: [{ id: 'wa-status', en: 'Status', af: 'Status', ...STORY }],
  },
];

/** The kind whose shape is nearest the post's, so the eye opens on it. */
export function nearestKind(width: number, height: number): { platform: FeedPlatform; kind: FeedKind } {
  const want = Math.log(width / height);
  let best = { platform: FEED_PLATFORMS[0], kind: FEED_PLATFORMS[0].kinds[0] };
  let gap = Infinity;
  for (const platform of FEED_PLATFORMS) {
    for (const kind of platform.kinds) {
      const off = Math.abs(Math.log(kind.width / kind.height) - want);
      if (off < gap - 1e-9) { gap = off; best = { platform, kind }; }
    }
  }
  return best;
}

/**
 * How much of the post a shape cuts off, and from which sides.
 *
 * The picture fills the shape, as every one of these places fills it, so a
 * post taller than the shape loses its top and bottom and a wider one its
 * sides. Under one per cent is called a fit: nobody sees four pixels.
 */
export function cutOff(
  post: { width: number; height: number },
  shape: { width: number; height: number },
): { share: number; sides: 'none' | 'topBottom' | 'leftRight' } {
  const postRatio = post.width / post.height;
  const shapeRatio = shape.width / shape.height;
  if (Math.abs(postRatio - shapeRatio) / shapeRatio < 0.01) return { share: 0, sides: 'none' };
  return postRatio > shapeRatio
    ? { share: 1 - shapeRatio / postRatio, sides: 'leftRight' }
    : { share: 1 - postRatio / shapeRatio, sides: 'topBottom' };
}

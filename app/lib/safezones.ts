/**
 * Where each platform's own interface covers your video.
 *
 * ── Why this is worth drawing ────────────────────────────────────────────
 *
 * A vertical video is posted into an app that prints its own things on top of
 * it: a username and a caption along the bottom, a column of buttons up the
 * right, a status bar and a back arrow at the top. Whatever is under those is
 * not gone, it is covered — and the thing most often under them is the subject
 * of the shot, because a generator centres what it is asked for and a caption
 * sits at the bottom third where the face usually is.
 *
 * You find this out after posting. That is the wrong time.
 *
 * ── Where these numbers come from, and what they are worth ───────────────
 *
 * Published guides, read against each other, for a 1080 × 1920 frame. They are
 * approximations of somebody else's app and they move: TikTok added a playlist
 * button in January 2026 and took another twenty pixels off the right, and
 * Instagram's audio bar grew by about fifty at the bottom.
 *
 * So they are held as fractions rather than pixels — a fraction survives a
 * different export size, which a pixel does not — and the screen that shows
 * them says they are a guide rather than a specification. A margin drawn as
 * exact would be a lie about somebody else's software, and the useful claim is
 * much weaker and still worth making: *do not put anything you need here*.
 *
 * ── Why "all" is not the sum ─────────────────────────────────────────────
 *
 * Posting one video to three platforms means the safe part is the bit safe on
 * every one of them, which is the deepest margin on each side rather than an
 * average. That is what `ALL` is, computed rather than typed, so it cannot
 * drift away from the three it is made of.
 */

export interface Zone {
  readonly id: 'tiktok' | 'reels' | 'shorts' | 'all';
  readonly name: string;
  /** Fractions of the frame, not pixels: an export is not always 1080 × 1920. */
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  /** What is actually up there, so the bar means something. */
  readonly note: { readonly en: string; readonly af: string };
}

/** The reference frame the published numbers are quoted against. */
export const REFERENCE = { width: 1080, height: 1920 } as const;

const of = (px: number, side: 'w' | 'h'): number =>
  px / (side === 'w' ? REFERENCE.width : REFERENCE.height);

const PLATFORMS: readonly Zone[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    // 108 top, 320 bottom, 60 left, 120 right — a 900 × 1492 safe box.
    top: of(108, 'h'),
    bottom: of(320, 'h'),
    left: of(60, 'w'),
    right: of(120, 'w'),
    note: {
      en: 'Caption, username and the sound bar along the bottom; the like, comment and share column up the right.',
      af: 'Onderskrif, gebruikersnaam en die klankbalk onderlangs; die hou-van-, kommentaar- en deelkolom teen die regterkant op.',
    },
  },
  {
    id: 'reels',
    name: 'Instagram Reels',
    top: of(108, 'h'),
    bottom: of(320, 'h'),
    left: of(60, 'w'),
    right: of(120, 'w'),
    note: {
      en: 'Profile name, the audio credit and the first lines of the caption at the bottom; the action column on the right.',
      af: 'Profielnaam, die klankkrediet en die eerste reëls van die onderskrif onder; die aksiekolom regs.',
    },
  },
  {
    id: 'shorts',
    name: 'YouTube Shorts',
    // The deepest bottom of the three: channel, subscribe, title and sound.
    top: of(180, 'h'),
    bottom: of(390, 'h'),
    left: of(60, 'w'),
    right: of(120, 'w'),
    note: {
      en: 'Channel name, the subscribe button, the title and the sound line — the deepest bottom of the three.',
      af: 'Kanaalnaam, die teken-in-knoppie, die titel en die klankreël — die diepste onderkant van die drie.',
    },
  },
];

/** The part that survives all three: the worst margin on each side. */
const EVERYWHERE: Zone = {
  id: 'all',
  name: 'All three',
  top: Math.max(...PLATFORMS.map((one) => one.top)),
  bottom: Math.max(...PLATFORMS.map((one) => one.bottom)),
  left: Math.max(...PLATFORMS.map((one) => one.left)),
  right: Math.max(...PLATFORMS.map((one) => one.right)),
  note: {
    en: 'What is safe on all three at once. Not an average — the deepest margin on each side, because a caption on one platform does not move for another.',
    af: 'Wat op al drie tegelyk veilig is. Nie ’n gemiddeld nie — die diepste kantlyn aan elke kant, want ’n onderskrif op een platform skuif nie vir ’n ander nie.',
  },
};

export const ZONES: readonly Zone[] = [...PLATFORMS, EVERYWHERE];

export function zoneById(id: string): Zone | undefined {
  return ZONES.find((one) => one.id === id);
}

/** The safe box as fractions, ready to lay over a frame of any size. */
export function boxOf(zone: Zone): { top: number; left: number; width: number; height: number } {
  return {
    top: zone.top,
    left: zone.left,
    width: 1 - zone.left - zone.right,
    height: 1 - zone.top - zone.bottom,
  };
}

/**
 * How much of the frame survives, as a percentage.
 *
 * Worth saying out loud on the screen: on Shorts it is a little over half, and
 * somebody who has not seen that number does not believe the bars.
 */
export function keptPercent(zone: Zone, aspect = '9:16'): number {
  const box = boxIn(zone, aspect);
  return Math.round(box.width * box.height * 100);
}

/**
 * The tall post's own shape, as a ratio.
 *
 * Everything below is quoted against a 1080 × 1920 frame because that is what
 * these apps play full screen. A wide clip posted to one of them is not shown
 * wide — it is shown in a tall window, and the sides go.
 */
export const TALL = REFERENCE.width / REFERENCE.height;

function ratioOf(aspect: string): number | null {
  const [w, h] = aspect.split(':').map((one) => Number(one));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return w / h;
}

/**
 * Where the tall post sits inside a clip that is not tall.
 *
 * ── Why this is the honest overlay for a wide clip ───────────────────────
 *
 * The safe-zone bars were drawn only on 9:16 clips, on the reasoning that
 * these are 9:16 platforms. The effect was that somebody making wide clips
 * never saw the feature at all and did not know it existed — and they are the
 * ones with the larger problem, because posting a wide clip to Reels loses far
 * more of it to the crop than any caption ever covers.
 *
 * So a wide clip gets the same overlay, drawn where it actually applies: the
 * centre column a tall post would keep, with the platform's furniture marked
 * inside that column. Everything outside the column is not covered, it is
 * cropped off, which is a different and worse thing and is shaded differently
 * to say so.
 *
 * A 9:16 clip returns the whole frame, so the tall case is the general case
 * with nothing special about it.
 */
export function columnOf(
  aspect: string,
): { top: number; left: number; width: number; height: number } {
  const ratio = ratioOf(aspect) ?? TALL;
  if (ratio > TALL) {
    const width = TALL / ratio;
    return { top: 0, left: (1 - width) / 2, width, height: 1 };
  }
  const height = ratio / TALL;
  return { top: (1 - height) / 2, left: 0, width: 1, height };
}

/** Is any of this frame lost to the crop before the furniture is even drawn? */
export function cropsFor(aspect: string): boolean {
  const column = columnOf(aspect);
  return column.width * column.height < 0.995;
}

/** The safe box placed inside a frame of any shape, in that frame's fractions. */
export function boxIn(
  zone: Zone,
  aspect: string,
): { top: number; left: number; width: number; height: number } {
  const box = boxOf(zone);
  const column = columnOf(aspect);
  return {
    top: column.top + box.top * column.height,
    left: column.left + box.left * column.width,
    width: box.width * column.width,
    height: box.height * column.height,
  };
}

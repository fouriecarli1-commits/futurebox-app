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
export function keptPercent(zone: Zone): number {
  const box = boxOf(zone);
  return Math.round(box.width * box.height * 100);
}

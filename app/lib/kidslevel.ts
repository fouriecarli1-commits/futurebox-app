/**
 * Levels and badges in the kids room, worked out from what really happened.
 *
 * ── Where it came from ───────────────────────────────────────────────────
 *
 * The owner, 13 October 2026, with the "Kids Dream Studio" page Google drew:
 * the corner of it has a robot face, "Level 5" and a bar under it, and the
 * foot of it an "Achievements" door. Both are good ideas for a child, and
 * both are the kind of thing that arrives as decoration: a number typed
 * into a picture.
 *
 * So the number is derived and never stored. The room already keeps STAR
 * SPARKS — earned by doing anything at all, kept on the device, never spent
 * — and a level is simply how many of them there are, in steps. The badges
 * are counts of real things on the real shelves: songs kept, stories kept,
 * pieces in the gallery. A badge that cannot be counted is not in this
 * list, which is the rule the room is built on: nothing in it pretends.
 */

/** How many star sparks one level is. */
export const STARS_PER_LEVEL = 150;

/** The level a number of stars puts a child on. One is the first. */
export const levelOf = (stars: number): number =>
  1 + Math.floor(Math.max(0, stars) / STARS_PER_LEVEL);

/** How far along the current level, nought to one. */
export const towardNext = (stars: number): number =>
  (Math.max(0, stars) % STARS_PER_LEVEL) / STARS_PER_LEVEL;

/** What the shelves hold, counted. */
export interface Counts {
  readonly stars: number;
  readonly songs: number;
  readonly stories: number;
  readonly pieces: number;
}

export interface Badge {
  readonly id: string;
  readonly icon: string;
  readonly says: readonly [string, string];
  /** What it takes, as a sentence for the one not yet earned. */
  readonly how: readonly [string, string];
  readonly earned: (counts: Counts) => boolean;
}

/**
 * Every badge is a threshold on a count. Thresholds, not streaks or dates:
 * a child who comes back after a month should find exactly what they had.
 */
export const BADGES: readonly Badge[] = [
  { id: 'first-song', icon: '🎵', says: ['kids.badgeFirstSong', 'First Song'],
    how: ['kids.badgeFirstSongHow', 'Keep one song'], earned: (c) => c.songs >= 1 },
  { id: 'three-songs', icon: '💿', says: ['kids.badgeThreeSongs', 'Album Maker'],
    how: ['kids.badgeThreeSongsHow', 'Keep three songs'], earned: (c) => c.songs >= 3 },
  { id: 'first-story', icon: '📖', says: ['kids.badgeFirstStory', 'Storyteller'],
    how: ['kids.badgeFirstStoryHow', 'Keep one story'], earned: (c) => c.stories >= 1 },
  { id: 'first-piece', icon: '🎨', says: ['kids.badgeFirstPiece', 'Artist'],
    how: ['kids.badgeFirstPieceHow', 'Keep one drawing or picture'], earned: (c) => c.pieces >= 1 },
  { id: 'five-pieces', icon: '🖼️', says: ['kids.badgeFivePieces', 'Gallery Owner'],
    how: ['kids.badgeFivePiecesHow', 'Keep five drawings or pictures'], earned: (c) => c.pieces >= 5 },
  { id: 'stars-100', icon: '⭐', says: ['kids.badgeStars100', 'Star Collector'],
    how: ['kids.badgeStars100How', 'Earn 100 star sparks'], earned: (c) => c.stars >= 100 },
  { id: 'stars-500', icon: '🌟', says: ['kids.badgeStars500', 'Superstar'],
    how: ['kids.badgeStars500How', 'Earn 500 star sparks'], earned: (c) => c.stars >= 500 },
  { id: 'level-5', icon: '🚀', says: ['kids.badgeLevel5', 'Level Five'],
    how: ['kids.badgeLevel5How', 'Reach level five'], earned: (c) => levelOf(c.stars) >= 5 },
];

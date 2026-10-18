/**
 * The Magic Drawing Board's closed lists: the crayons, the brushes, and the
 * words a drawing is kept under.
 *
 * The owner, 13 October 2026: *"Maybe a drawing board that captures their shape
 * and makes their drawings realistically alive, but family friendly."*
 *
 * Everything a child can choose on the board is in this file, which is the
 * room's rule (`check:kinderkamer`): every choice is a closed list somebody
 * wrote. The crayons are ten colours a child names; the brushes three
 * widths a finger can tell apart. Nothing here reaches a server — the
 * "bring it to life" words are in `kidsalive.ts`, where their price is.
 */

export interface Crayon {
  readonly id: string;
  readonly hex: string;
  readonly says: readonly [string, string];
}

/* Google's page, 13 October 2026: five neon crayons on a dark paper — green,
   cyan, yellow, pink, white — and three more so a sky, a sun and a dragon
   can each have their own. */
export const CRAYONS: readonly Crayon[] = [
  { id: 'green', hex: '#39ff88', says: ['kids.crayonGreen', 'Green'] },
  { id: 'cyan', hex: '#00ffcc', says: ['kids.crayonCyan', 'Cyan'] },
  { id: 'yellow', hex: '#ffe600', says: ['kids.crayonYellow', 'Yellow'] },
  { id: 'pink', hex: '#ff007f', says: ['kids.crayonPink', 'Pink'] },
  { id: 'white', hex: '#ffffff', says: ['kids.crayonWhite', 'White'] },
  { id: 'orange', hex: '#ff8c1a', says: ['kids.crayonOrange', 'Orange'] },
  { id: 'blue', hex: '#4da6ff', says: ['kids.crayonBlue', 'Blue'] },
  { id: 'purple', hex: '#c084fc', says: ['kids.crayonPurple', 'Purple'] },
];

export interface Brush {
  readonly id: 'thin' | 'medium' | 'fat';
  readonly px: number;
  readonly says: readonly [string, string];
}

export const BRUSHES: readonly Brush[] = [
  { id: 'thin', px: 5, says: ['kids.brushThin', 'Fine'] },
  { id: 'medium', px: 12, says: ['kids.brushMedium', 'Medium'] },
  { id: 'fat', px: 24, says: ['kids.brushFat', 'Glow thick'] },
];

/** The paper: Google's dark neon ground, so the crayons glow on it. */
export const PAPER = '#061517';

/** The stamps on the shelf: pressed, one lands in the middle of the paper. */
export interface Stamp {
  readonly id: string;
  readonly glyph: string;
  readonly says: readonly [string, string];
}
export const STAMPS: readonly Stamp[] = [
  { id: 'dino', glyph: '🦖', says: ['kids.stampDino', 'Dino'] },
  { id: 'rocket', glyph: '🚀', says: ['kids.stampRocket', 'Rocket'] },
  { id: 'star', glyph: '⭐', says: ['kids.stampStar', 'Star'] },
  { id: 'rainbow', glyph: '🌈', says: ['kids.stampRainbow', 'Rainbow'] },
  { id: 'robot', glyph: '🤖', says: ['kids.stampRobot', 'Robot'] },
];
/** The glow behind the picture that comes back, from Google's page. */
export const ALIVE_GLOW = 'radial-gradient(circle at center, #0a302a 0%, #020b0d 80%)';

/** A stamp's size on the paper, as a share of its side. */
export const STAMP_SHARE = 0.22;

/** How many strokes can be undone. A child presses undo a lot. */
export const UNDO_MOST = 25;

/** The board is square and never wider than this, in CSS pixels. */
export const BOARD_MOST = 480;

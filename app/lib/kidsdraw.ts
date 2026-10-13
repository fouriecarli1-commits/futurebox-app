/**
 * The Magic Drawing Board's closed lists: the crayons, the brushes, and the
 * words a drawing is kept under.
 *
 * Carli, 13 October 2026: *"Maybe a drawing board that captures their shape
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

export const CRAYONS: readonly Crayon[] = [
  { id: 'black', hex: '#1f2937', says: ['kids.crayonBlack', 'Black'] },
  { id: 'red', hex: '#ef4444', says: ['kids.crayonRed', 'Red'] },
  { id: 'orange', hex: '#f97316', says: ['kids.crayonOrange', 'Orange'] },
  { id: 'yellow', hex: '#facc15', says: ['kids.crayonYellow', 'Yellow'] },
  { id: 'green', hex: '#22c55e', says: ['kids.crayonGreen', 'Green'] },
  { id: 'blue', hex: '#3b82f6', says: ['kids.crayonBlue', 'Blue'] },
  { id: 'purple', hex: '#a855f7', says: ['kids.crayonPurple', 'Purple'] },
  { id: 'pink', hex: '#ec4899', says: ['kids.crayonPink', 'Pink'] },
  { id: 'brown', hex: '#92400e', says: ['kids.crayonBrown', 'Brown'] },
  { id: 'sky', hex: '#67e8f9', says: ['kids.crayonSky', 'Sky'] },
];

export interface Brush {
  readonly id: 'thin' | 'medium' | 'fat';
  readonly px: number;
  readonly says: readonly [string, string];
}

export const BRUSHES: readonly Brush[] = [
  { id: 'thin', px: 4, says: ['kids.brushThin', 'Thin'] },
  { id: 'medium', px: 10, says: ['kids.brushMedium', 'Medium'] },
  { id: 'fat', px: 22, says: ['kids.brushFat', 'Fat'] },
];

/** The paper. Warm white, so a yellow crayon still shows. */
export const PAPER = '#fffdf5';

/** How many strokes can be undone. A child presses undo a lot. */
export const UNDO_MOST = 25;

/** The board is square and never wider than this, in CSS pixels. */
export const BOARD_MOST = 480;

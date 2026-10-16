/**
 * Subtitle looks and lower thirds, one press each.
 *
 * Carli, 16 October 2026, screenshots of a title library: a column of
 * subtitle styles — black on a white box, white on a rounded purple one, a
 * sheared yellow band, plain words with a shadow — and the lower thirds,
 * left, middle and right. Every one of them is a combination of controls the
 * Words bench already has: an ink, what is behind it and how solid, the shape
 * of the box, the edge, and where it sits. So a style here is just those
 * settings, put on the shot together, and every one of them can be changed
 * afterwards.
 */
import type { MotionId } from './videoextras';
import type { BoxShape } from './videopaint';
import type { EdgeId } from './wordsedge';

export interface CaptionStyle {
  readonly id: string;
  readonly group: 'subtitle' | 'lower';
  readonly name: readonly [string, string];
  /** Paint ids from `videopaint.ts`, so the Words bench shows them as chosen. */
  readonly ink: string;
  readonly back: string;
  readonly backSolid: number;
  readonly box: BoxShape;
  readonly edge: EdgeId;
  /** Where it sits, as a share of the frame. Absent leaves it where it is. */
  readonly at?: { readonly x: number; readonly y: number };
  readonly size?: number;
  readonly motion?: MotionId;
}

const SUB_Y = 0.86;
const sub = (id: string, en: string, ink: string, back: string, box: BoxShape, edge: EdgeId, backSolid = 1): CaptionStyle => ({
  id, group: 'subtitle', name: [`caption.${id}`, en], ink, back, backSolid, box, edge, at: { x: 0.5, y: SUB_Y }, size: 0.042,
});

export const CAPTION_STYLES: readonly CaptionStyle[] = [
  sub('blackOnWhite', 'Black on white', 'black', 'white', 'square', 'none'),
  sub('blackOnWhiteRound', 'Black on white, rounded', 'black', 'white', 'pill', 'none'),
  sub('blackOnYellowShear', 'Black on yellow, sheared', 'black', 'yellow', 'tape', 'none'),
  sub('blueOnPink', 'Blue on pink', 'blue', 'pink', 'square', 'none'),
  sub('greyOnYellow', 'Grey on yellow', 'grey', 'yellow', 'square', 'none'),
  sub('greyShadow', 'Grey with shadow', 'grey', 'black', 'none', 'shadow'),
  sub('simpleGreen', 'Simple green', 'green', 'black', 'none', 'outline'),
  sub('simpleWhite', 'Simple white', 'white', 'black', 'none', 'outline'),
  sub('simpleYellow', 'Simple yellow', 'yellow', 'black', 'none', 'outline'),
  sub('whiteOnBlueShear', 'White on blue, sheared', 'white', 'blue', 'tape', 'none'),
  sub('whiteOnGrey', 'White on grey', 'white', 'grey', 'square', 'none', 0.85),
  sub('whiteOnPurpleRound', 'White on purple, rounded', 'white', 'violet', 'pill', 'none'),
  sub('whiteOnRedRound', 'White on red, rounded', 'white', 'red', 'pill', 'none'),
  sub('whiteOnRedShear', 'White on red, sheared', 'white', 'red', 'tape', 'none'),
  sub('whiteShadow', 'White with shadow', 'white', 'black', 'none', 'shadow'),
  sub('whiteSolidShadow', 'White with solid shadow', 'white', 'black', 'none', 'both'),
  sub('yellowShadow', 'Yellow with shadow', 'yellow', 'black', 'none', 'shadow'),

  /* ── Lower thirds: a name and a role, low in the frame ─────────────── */
  { id: 'lowerLeft', group: 'lower', name: ['caption.lowerLeft', 'Left lower third'], ink: 'white', back: 'black', backSolid: 0.75, box: 'square', edge: 'none', at: { x: 0.3, y: 0.82 }, size: 0.045, motion: 'hslide' },
  { id: 'lowerMiddle', group: 'lower', name: ['caption.lowerMiddle', 'Middle lower third'], ink: 'white', back: 'black', backSolid: 0.75, box: 'square', edge: 'none', at: { x: 0.5, y: 0.82 }, size: 0.045, motion: 'vslide' },
  { id: 'lowerRight', group: 'lower', name: ['caption.lowerRight', 'Right lower third'], ink: 'white', back: 'black', backSolid: 0.75, box: 'square', edge: 'none', at: { x: 0.7, y: 0.82 }, size: 0.045, motion: 'hslide' },
  { id: 'lowerNews', group: 'lower', name: ['caption.lowerNews', 'News band'], ink: 'white', back: 'red', backSolid: 0.95, box: 'bar', edge: 'none', at: { x: 0.5, y: 0.84 }, size: 0.045, motion: 'vslide' },
  { id: 'lowerUnderline', group: 'lower', name: ['caption.lowerUnderline', 'Simple underline'], ink: 'white', back: 'green', backSolid: 1, box: 'line', edge: 'shadow', at: { x: 0.3, y: 0.82 }, size: 0.045, motion: 'fade' },
  { id: 'lowerRibbon', group: 'lower', name: ['caption.lowerRibbon', 'Ribbon'], ink: 'white', back: 'violet', backSolid: 0.95, box: 'banner', edge: 'none', at: { x: 0.35, y: 0.82 }, size: 0.045, motion: 'hslide' },
  { id: 'lowerTape', group: 'lower', name: ['caption.lowerTape', 'Tape'], ink: 'black', back: 'yellow', backSolid: 1, box: 'tape', edge: 'none', at: { x: 0.3, y: 0.82 }, size: 0.045, motion: 'pop' },
  { id: 'lowerFrame', group: 'lower', name: ['caption.lowerFrame', 'Framed'], ink: 'white', back: 'white', backSolid: 1, box: 'outline', edge: 'shadow', at: { x: 0.3, y: 0.82 }, size: 0.04, motion: 'write' },
];

/** What the Words bench's settings become for a style — ready to put on a shot. */
export function captionSettings(style: CaptionStyle): {
  wordsInk: string; wordsBack: string; wordsBackSolid: number; wordsBox: BoxShape; wordsEdge: EdgeId;
  wordsGlow: 'none'; wordsAt?: { x: number; y: number }; wordsSize?: number; wordsMotion?: MotionId;
} {
  return {
    wordsInk: style.ink,
    wordsBack: style.back,
    wordsBackSolid: style.backSolid,
    wordsBox: style.box,
    wordsEdge: style.edge,
    wordsGlow: 'none',
    ...(style.at ? { wordsAt: { ...style.at } } : {}),
    ...(style.size ? { wordsSize: style.size } : {}),
    ...(style.motion ? { wordsMotion: style.motion } : {}),
  };
}

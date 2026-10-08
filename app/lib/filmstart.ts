/**
 * Somewhere to start, for the film somebody is actually making.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Video, etc templates."* The photo editor
 * got its six in `posttemplates.ts`; this is the same idea one room over,
 * and the difference between the two rooms is the whole design of this file.
 *
 * ── What a video template honestly CAN be ────────────────────────────────
 *
 * A photo template makes the post: it chooses the shape, the look and the
 * words, and there is a finished thing on the screen before she has decided
 * anything. A film template cannot do that, because the one thing a film is
 * made of is footage and nothing in this app can film her show for her.
 *
 * Pretending otherwise is the trap. A "template" that puts six stock shots
 * and a stock voice into a timeline produces a film about nothing, in a
 * stranger's handwriting, and the work of taking all of it out again is
 * more than starting from nothing. So this file does not make a film.
 *
 * What it does is DRESS the film she already has: the shape it comes out,
 * one look across every shot so the cut reads as one piece rather than six
 * phones, how the shots arrive after one another, a title over the first
 * one and a sign-off over the last. Those are five decisions that take a
 * beginner an hour and are the difference between footage and a film, and
 * every one of them is ours to make well.
 *
 * Which means a template needs at least one shot in the room, and the bench
 * says so rather than offering a press that does nothing.
 *
 * ── Her words beat ours ──────────────────────────────────────────────────
 *
 * A caption she typed is never replaced. The photo templates do replace the
 * words, and that is right there — the post is made by the template and the
 * words come with it. Here the shots are hers and anything written over
 * them was typed while looking at them, so a template that wiped a caption
 * would be the app overruling the one part of the film it did not make.
 * `dressed` fills an empty caption and leaves a written one alone.
 *
 * ── What a template may not do ───────────────────────────────────────────
 *
 * Put its words where the platform prints its own. `safezones.ts` knows
 * where the header, the caption bar and the column of buttons land, and a
 * title the APP suggested that comes out behind a username is worse than no
 * title at all. `check:filmstart` holds every one of these to that, at the
 * shape it chooses, at three lines — which is `drawCaption`'s own ceiling,
 * so the bound holds in both languages and for any length of sentence.
 */

import type { Join } from './videojoins';
import type { BoxShape } from './videopaint';
import type { Piece } from './videoedit';

/** Words over a shot: what they say, how they are set, and for how long. */
export interface FilmWords {
  /** The i18n key and the English, as `t` takes them. */
  readonly says: readonly [string, string];
  /** A face id from `videofonts.ts`. */
  readonly font: string;
  /** The size as a share of frame height, which is what `drawCaption` takes. */
  readonly size: number;
  /** The block's centre, in shares of the frame. */
  readonly at: { readonly x: number; readonly y: number };
  readonly ink: string;
  readonly back: string;
  readonly box: BoxShape;
  /** How long they stay up, in seconds of the shot they are on. */
  readonly forSeconds: number;
}

export interface FilmStart {
  readonly id: string;
  readonly name: readonly [string, string];
  readonly what: readonly [string, string];
  /** A `SHAPES` key from `videoedit.ts`. */
  readonly shape: 'tall' | 'wide' | 'square';
  /** A look id from `videofilters.ts`, on every shot. */
  readonly look: string;
  /** How each shot after the first arrives, and over how long. */
  readonly join: Join;
  readonly joinFor: number;
  /** Over the first shot, from its start. */
  readonly title?: FilmWords;
  /** Over the last shot, ending with it. */
  readonly signOff?: FilmWords;
}

const WHITE = '#ffffff';
const BLACK = '#000000';
const GOLD = '#fbbf24';

/* ── Why every `at.y` is between 0.18 and 0.74 ─────────────────────────────
 
   The strictest safe band across the three platforms is 0.094 down from the
   top and 0.797 down to the bottom. A caption's block is centred on `at.y`
   and is at most three lines of `size * 1.28`, so the deepest template here
   — 0.052 at three lines — reaches 0.1 of the frame, half of it either side
   of its centre. 0.18 clears the header with room to spare and 0.74 clears
   the caption bar. `check:filmstart` does that arithmetic rather than
   trusting this comment. */

export const STARTS: readonly FilmStart[] = [
  {
    id: 'show',
    name: ['film.tplShow', 'A show is coming'],
    what: ['film.tplShowWhat', 'Through black between the shots, the date up front and the venue at the end.'],
    shape: 'tall',
    look: 'punch',
    join: 'dip',
    joinFor: 0.4,
    title: {
      says: ['film.tplShowTitle', 'FRIDAY 8PM'],
      font: 'heavy',
      size: 0.052,
      at: { x: 0.5, y: 0.22 },
      ink: GOLD,
      back: BLACK,
      box: 'round',
      forSeconds: 2.5,
    },
    signOff: {
      says: ['film.tplShowEnd', 'Aandklas, Stellenbosch'],
      font: 'plain',
      size: 0.04,
      at: { x: 0.5, y: 0.7 },
      ink: WHITE,
      back: BLACK,
      box: 'round',
      forSeconds: 2.5,
    },
  },
  {
    id: 'reel',
    name: ['film.tplReel', 'A reel of the work'],
    what: ['film.tplReelWhat', 'Straight cuts, one look across everything, a name at the start.'],
    shape: 'tall',
    look: 'cinema',
    join: 'cut',
    joinFor: 0,
    title: {
      says: ['film.tplReelTitle', 'Selected work'],
      font: 'serif',
      size: 0.044,
      at: { x: 0.5, y: 0.2 },
      ink: WHITE,
      back: BLACK,
      box: 'none',
      forSeconds: 2,
    },
  },
  {
    id: 'behind',
    name: ['film.tplBehind', 'Behind the scenes'],
    what: ['film.tplBehindWhat', 'Warm, shots flowing into one another, one line low down.'],
    shape: 'tall',
    look: 'warm',
    join: 'dissolve',
    joinFor: 0.5,
    title: {
      says: ['film.tplBehindTitle', 'Day three. Still going.'],
      font: 'plain',
      size: 0.038,
      at: { x: 0.5, y: 0.72 },
      ink: WHITE,
      back: BLACK,
      box: 'round',
      forSeconds: 3,
    },
  },
  {
    id: 'song',
    name: ['film.tplSong', 'A song is out'],
    what: ['film.tplSongWhat', 'Square, bright, with a flash on every cut.'],
    shape: 'square',
    look: 'bright',
    join: 'flash',
    joinFor: 0.2,
    title: {
      says: ['film.tplSongTitle', 'OUT NOW'],
      font: 'heavy',
      size: 0.05,
      at: { x: 0.5, y: 0.24 },
      ink: GOLD,
      back: BLACK,
      box: 'square',
      forSeconds: 2,
    },
    signOff: {
      says: ['film.tplSongEnd', 'Everywhere you listen'],
      font: 'plain',
      size: 0.038,
      at: { x: 0.5, y: 0.7 },
      ink: WHITE,
      back: BLACK,
      box: 'round',
      forSeconds: 2.5,
    },
  },
  {
    id: 'screen',
    name: ['film.tplScreen', 'For a big screen'],
    what: ['film.tplScreenWhat', 'The wide shape, dissolves, and the name at the end.'],
    shape: 'wide',
    look: 'cinema',
    join: 'dissolve',
    joinFor: 0.6,
    signOff: {
      says: ['film.tplScreenEnd', 'FutureBox Studio'],
      font: 'serif',
      size: 0.05,
      at: { x: 0.5, y: 0.5 },
      ink: WHITE,
      back: BLACK,
      box: 'none',
      forSeconds: 3,
    },
  },
  {
    id: 'thanks',
    name: ['film.tplThanks', 'Thank you'],
    what: ['film.tplThanksWhat', 'After the show, after the release, after anything.'],
    shape: 'tall',
    look: 'faded',
    join: 'dissolve',
    joinFor: 0.5,
    signOff: {
      says: ['film.tplThanksEnd', 'DANKIE'],
      font: 'heavy',
      size: 0.052,
      at: { x: 0.5, y: 0.45 },
      ink: WHITE,
      back: BLACK,
      box: 'none',
      forSeconds: 3,
    },
  },
];

export const startOf = (id: string): FilmStart | null =>
  STARTS.find((one) => one.id === id) ?? null;

/**
 * How long a shot plays for, in film seconds.
 *
 * Its own trim divided by its speed, because a four-second take at two times
 * is two seconds of film — the same arithmetic `lengthOfPiece` does, kept
 * here so the caption's own timing lands inside the shot it is on rather
 * than past the end of it.
 */
const playsFor = (one: Piece): number => {
  const trimmed = Math.max(0, one.to - one.from);
  const speed = Number.isFinite(one.speed) && (one.speed ?? 1) > 0 ? (one.speed as number) : 1;
  return trimmed / speed;
};

/**
 * The shots, dressed by this template.
 *
 * Pure, and the reason is that it has to be checkable without a browser: the
 * one thing that can go wrong here is a caption timed past the end of its
 * own shot, or placed where a platform draws its own furniture, and both are
 * arithmetic.
 *
 * `say` is the room's own `t`, so the words come out in the language she is
 * reading. A template that wrote its English into an Afrikaans film would be
 * the app speaking over her in the wrong language.
 */
export function dressed(
  start: FilmStart,
  pieces: readonly Piece[],
  say: (key: string, en: string) => string,
): readonly Piece[] {
  if (!pieces.length) return pieces;
  const last = pieces.length - 1;
  return pieces.map((one, n) => {
    const already = (one.words ?? '').trim();
    /* On the first and the last shot, which on a one-shot film are the same
       shot — so the sign-off has to give way to the title rather than both
       being written into one caption field and the second winning. */
    const put = n === 0 ? start.title : undefined;
    const end = n === last && !(n === 0 && start.title) ? start.signOff : undefined;
    const words = put ?? end;
    const plays = playsFor(one);
    const next: Piece = {
      ...one,
      look: start.look,
      ...(n === 0
        ? { join: undefined, joinFor: undefined }
        : { join: start.join, joinFor: start.joinFor }),
      ...(words && !already
        ? {
          words: say(words.says[0], words.says[1]),
          wordsFont: words.font,
          wordsSize: words.size,
          wordsAt: { x: words.at.x, y: words.at.y },
          wordsInk: words.ink,
          wordsBack: words.back,
          wordsBox: words.box,
          /* Timed into the shot, and clamped to it. A title held for two and
             a half seconds on a one-second shot is a caption that outlives
             its own picture, and `wordsTo` past the trim is a number the
             renderer has to guess at. */
          ...(put
            ? { wordsFrom: 0, wordsTo: Math.min(plays, words.forSeconds) }
            : {
              wordsFrom: Math.max(0, plays - words.forSeconds),
              wordsTo: plays,
            }),
        }
        : {}),
    };
    return next;
  });
}

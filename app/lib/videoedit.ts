'use client';

/**
 * An edit: pieces of video on a clock, with what happens to each of them.
 *
 * ── Why this exists, and what it is not ──────────────────────────────────
 *
 * Carli, 24 September 2026: *"Jy sê ons het een, maar ek vermoed jy meen die
 * long shot funksie. wat ek bedoel is 'n editing program soos 'n video editor
 * lyk amper soos die probooth. Waar jy tydlyne het, asook kan jy filters
 * apply en export."*
 *
 * She is right and I was wrong. The long board arranges shots somebody is
 * about to generate; it is a storyboard with a render button. An editor is
 * the other thing: material you already have, laid on a clock, cut and
 * shaped and exported.
 *
 * ── Built on what is already here, because she chose that ────────────────
 *
 * Asked whether to buy an editor SDK or build on our own bones, she chose to
 * build. That is only sensible because most of the bones exist:
 *
 * - `lib/stitch.ts` already lays clips end to end in real time in the
 *   browser, with a trim, a filter and words per piece, and a song beneath.
 * - `lib/videofilters.ts` has the looks.
 * - The Pro Booth's timeline already knows how to be dragged with a thumb,
 *   with a magnet and lanes.
 * - `lib/undo.ts` already holds a history that counts its own memory.
 *
 * So this module is the part that was missing: the MODEL of an edit, and the
 * arithmetic that turns it into a `Cut` the existing stitcher can render. It
 * has no drawing in it and no React, for the same reason `lib/session.ts`
 * has none — the sums can then be tested without a screen, and the screen
 * can be argued about without touching the sums.
 *
 * ── What it deliberately does not do yet ─────────────────────────────────
 *
 * Taking an object out, and taking a background out, are not in here. They
 * are not edits, they are model calls — somebody else's, billed by the
 * minute — and pretending they are a switch on a clip would be the same
 * fault as a card that offers what the room cannot do. When they arrive they
 * arrive as a new `Piece.through`, and the cost goes on the button.
 */

import { filterCss } from './videofilters';
import type { Cut, Scene } from './stitch';
import type { Join } from './videojoins';

/** A piece of video on the clock. */
export interface Piece {
  readonly id: string;
  /** The material. What came off a phone, out of an engine, or off a take. */
  readonly clip: Blob;
  /** For the strip, and for a progress line that says which one is laying. */
  readonly name: string;
  /** Where in the piece's own material it starts and stops, in seconds. */
  readonly from: number;
  readonly to: number;
  /** A look from `videofilters.ts`. Absent leaves the picture alone. */
  readonly look?: string;
  /** Words over this piece for as long as it is up. */
  readonly words?: string;
  /**
   * How those words are set: the face, the size as a share of frame height,
   * and where on the picture they sit.
   *
   * Carli, 30 September 2026: *"Die teks moet font opsies hê, en dit moet ook
   * gemanipuleer moet kan word op die skerm van die video, deur dit rond te
   * kan skuif, en groter en kleiner te kan maak."*
   *
   * All three optional, and absent means exactly what it meant before they
   * existed — plain type, the ladder of sizes `drawCaption` already tries,
   * and the bottom of the frame. An edit made before today opens looking the
   * way it looked.
   */
  readonly wordsFont?: string;
  readonly wordsSize?: number;
  readonly wordsAt?: { readonly x: number; readonly y: number } | null;
  /** Turned, in degrees. How solid, nought to one. How round its band is. */
  readonly wordsTurn?: number;
  readonly wordsSolid?: number;
  readonly wordsRound?: number;
  /**
   * How fast this piece plays, as a multiple. One is as filmed.
   *
   * A speed, which every clip toolbar carries and ours did not. It changes how
   * LONG the piece is as well as how it
   * looks, which is why `lengthOfPiece` has to divide by it: a four-second
   * take at two times is two seconds of film, and a timeline that drew it as
   * four would be a ruler that lies.
   */
  readonly speed?: number;
  /**
   * How this piece arrives after the one before it, and over how long.
   *
   * On the arriving piece, because that is where somebody looks for it: a join
   * belongs to the shot being chosen. Ignored on the first piece — there is
   * nothing behind it to arrive from — and `videojoins.ts` holds every number,
   * every clamp and the honest note about what the outgoing half of a dissolve
   * actually is in this renderer.
   */
  readonly join?: Join;
  readonly joinFor?: number;
  /** Carry this piece's own sound. Off by default: most material is room tone. */
  readonly sound?: boolean;
  /**
   * How loud this piece's own sound is, 0 to 2.
   *
   * Separate from `sound` on purpose. Off and at nought look the same in a
   * render and are different things to a person: one is a decision about
   * this piece, the other is a slider they moved and can move back.
   */
  readonly loud?: number;
}

/**
 * The shape the film comes out, in pixels.
 *
 * On the edit rather than worked out at export, because it changes what the
 * person is looking at while they work: a piece framed for a tall phone and
 * a piece framed for a wide screen are different edits, not one edit with a
 * setting at the end.
 */
export interface Shape {
  readonly width: number;
  readonly height: number;
}

/** Tall for a phone, wide for everywhere else, and square for the rest. */
export const SHAPES: Readonly<Record<string, Shape>> = {
  tall: { width: 1080, height: 1920 },
  wide: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

/** An edit, whole. */
export interface Edit {
  readonly pieces: readonly Piece[];
  /** Absent is tall: most of what leaves this app is watched on a phone. */
  readonly shape?: keyof typeof SHAPES;
  /** A song under the whole thing, and where in it to start. */
  readonly under?: Blob | null;
  readonly underFrom?: number;
  /** How loud the song is against the pieces, 0 to 2. */
  readonly underLoud?: number;
  /** Seconds of black fading up at the start, and down at the end. */
  readonly fadeIn?: number;
  readonly fadeOut?: number;
}

/**
 * The longest a fade may be, in seconds.
 *
 * Two. A fade is punctuation, not a scene: three seconds of black at the
 * front of a thirty-second advert is a tenth of the thing somebody paid for,
 * spent on nothing. It is also the figure at which a fade stops reading as
 * "this is beginning" and starts reading as "has it loaded?".
 */
export const LONGEST_FADE = 2;

/** Nothing on the clock. */
export const NOTHING: Edit = { pieces: [] };

/** How long a piece is on screen, in seconds. */
export function lengthOfPiece(piece: Piece): number {
  /* Divided by the speed, and this is the line that makes the ruler honest.
     A four-second take at two times is two seconds OF FILM, and a timeline
     drawing it as four would put every block after it in the wrong place and
     the playhead on the wrong frame. Any editor draws a sped-up clip shorter
     on its timeline for the same reason. */
  const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
  return Math.max(0, (piece.to - piece.from) / fast);
}

/** How long the whole edit runs, in seconds. */
export function runs(edit: Edit): number {
  return edit.pieces.reduce((all, one) => all + lengthOfPiece(one), 0);
}

/** Where a piece starts on the edit's own clock, in seconds. */
export function startsAt(edit: Edit, id: string): number {
  let at = 0;
  for (const one of edit.pieces) {
    if (one.id === id) return at;
    at += lengthOfPiece(one);
  }
  /* ── Not `at`, which is the end of the film ─────────────────────────────

     This fell out of the loop returning `at`, so a piece that is not in the
     edit was told it starts where the film ends. A real, plausible second for
     something that does not exist, which is the `indexOf`-answers-minus-one
     fault in another costume: every caller got a number it could do arithmetic
     with and none of them could tell it was meaningless.

     The caller that mattered was the split button, which asks for the start of
     the piece it is about to cut. A stale id — a piece dropped between the
     render and the tap — would have cut at the end of the film instead of
     refusing, and `split` guards on the OFFSET rather than on the id, so it
     would have gone through.

     NaN, because it is the one number that cannot be quietly used. Anything
     built on it is NaN, every comparison against it is false, and a block
     positioned at it does not appear — which is a visible fault rather than a
     cut in the wrong place. Found by `check:cutmaths`. */
  return Number.NaN;
}

/**
 * Which piece is on screen at a given second, and how far into its own
 * material that second falls.
 *
 * ── Why this is here and not in the room ─────────────────────────────────
 *
 * A playhead needs exactly two answers — what am I looking at, and where do I
 * seek it to — and both are arithmetic over the pieces. Working them out in
 * the component would put a second understanding of what "the clock" means
 * next to `startsAt` and `runs`, and the two would drift the first time
 * anything about trimming changed.
 *
 * `into` is an offset into the piece's OWN material, so it already has
 * `from` added. That is the number a `<video>` element wants, and returning
 * the offset-from-the-piece's-start instead would mean every caller adding
 * `from` and one of them forgetting.
 *
 * Past the end returns null rather than the last piece. A playhead dragged
 * off the end is at nothing, and answering "the last frame" would make the
 * end of the film indistinguishable from a second after it.
 */
export function atSecond(
  edit: Edit,
  second: number,
): { readonly piece: Piece; readonly into: number } | null {
  let start = 0;
  for (const piece of edit.pieces) {
    const length = lengthOfPiece(piece);
    if (second < start + length) {
      /* ── Multiplied by the speed ──────────────────────────────────────

         `second - start` is a position on the FILM's clock. `into` has to be a
         position in the FILE, because it is what a `<video>` is seeked to — and
         a piece at twice the speed covers two seconds of material per second of
         film.

         Missing until 3 October 2026, put there by making `lengthOfPiece`
         divide by the speed the night before. The playhead on a sped-up piece
         therefore showed a frame from earlier in the shot than the line said,
         and the faster the piece the further out it was. Invisible to every
         check there was: the probe scrubs across a split at one times, where
         the speed is one and multiplying by it changes nothing.

         The same bug `split` had, in the same place, from the same cause.
         `check:cutmaths` now reads both. */
      const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
      return { piece, into: piece.from + Math.max(0, second - start) * fast };
    }
    start += length;
  }
  return null;
}

/**
 * The other direction: a position in a piece's own material, back on the film's
 * clock.
 *
 * ── Why this is a function and not a line in the component ────────────────
 *
 * It is the exact inverse of `atSecond`'s `into`, and it was a line in
 * `VideoEditor.tsx` reading `startsAt(edit, id) + (currentTime - from)` — with
 * no divide by the speed. So while a piece at twice the speed played, the
 * playhead ran at twice the rate of the film underneath it: the line finished
 * the block while the picture was halfway through it.
 *
 * Three places were doing this conversion by hand and two of them were wrong,
 * each in a different direction. Written once, it can be checked once — and
 * `check:cutmaths` checks it the only way that proves both halves at the same
 * time, by going out through `atSecond` and back through here and landing on the
 * second it started from.
 */
export function filmSecond(edit: Edit, id: string, into: number): number {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece) return Number.NaN;
  const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
  return startsAt(edit, id) + Math.max(0, into - piece.from) / fast;
}

/**
 * A fade, clamped to something the edit can actually hold.
 *
 * Both ends against `LONGEST_FADE`, and both together against the run: a one
 * second fade in and out on a one-and-a-half second edit is a film that is
 * never fully up, which is not what anybody meant by "fade". Halved rather
 * than refused, because a slider that can be dragged there is a slider
 * somebody will drag there, and losing the edit over it is a poor trade for
 * a validation message.
 */
export function fadesFor(edit: Edit): { readonly in: number; readonly out: number } {
  const total = runs(edit);
  let up = Math.max(0, Math.min(LONGEST_FADE, edit.fadeIn ?? 0));
  let down = Math.max(0, Math.min(LONGEST_FADE, edit.fadeOut ?? 0));
  if (total <= 0) return { in: 0, out: 0 };
  if (up + down > total) {
    const share = total / (up + down);
    up *= share;
    down *= share;
  }
  return { in: up, out: down };
}

/**
 * The edit, as the stitcher's `Cut`.
 *
 * One direction only, and that is the whole point: the editor never learns
 * to render. There is one renderer, it is the one the video desk already
 * uses, and a second one would be a second answer to "what does this look
 * like" — which is the fault this repository keeps finding in other things.
 */
export function cutFrom(edit: Edit): Cut {
  const scenes: Scene[] = edit.pieces
    .filter((one) => lengthOfPiece(one) > 0)
    .map((one) => ({
      clip: one.clip,
      name: one.name,
      from: one.from,
      to: one.to,
      /* `filterCss` answers '' for a look that is not in the list, and an
         empty grade leaves the canvas filter untouched — which is not the
         same as setting it to `none`, and is the right behaviour for a
         browser that does not honour the property at all. */
      ...(one.look ? { grade: filterCss(one.look) } : {}),
      ...(one.words ? { caption: one.words } : {}),
      ...(one.words && one.wordsFont ? { captionFont: one.wordsFont } : {}),
      ...(one.words && one.wordsSize ? { captionSize: one.wordsSize } : {}),
      ...(one.words && one.wordsAt ? { captionAt: one.wordsAt } : {}),
      ...(one.words && one.wordsTurn ? { captionTurn: one.wordsTurn } : {}),
      ...(one.words && one.wordsSolid !== undefined ? { captionSolid: one.wordsSolid } : {}),
      ...(one.words && one.wordsRound !== undefined ? { captionRound: one.wordsRound } : {}),
      ...(one.speed && one.speed !== 1 ? { speed: one.speed } : {}),
      ...(one.loud !== undefined ? { loud: one.loud } : {}),
      ...(one.sound ? { sound: true } : {}),
      /* The hard cut is the default everywhere, so it is not carried: a scene
         with no `join` and a scene with `join: 'cut'` render the same, and
         sending the second one would put a field on every scene of every film
         ever made in this room to say "nothing happens here". */
      ...(one.join && one.join !== 'cut' ? { join: one.join } : {}),
      ...(one.join && one.join !== 'cut' && one.joinFor ? { joinFor: one.joinFor } : {}),
    }));

  const shape = SHAPES[edit.shape ?? 'tall'] ?? SHAPES.tall;
  return {
    scenes,
    audio: edit.under ?? null,
    width: shape.width,
    height: shape.height,
    ...(edit.underFrom ? { audioFrom: edit.underFrom } : {}),
  };
}

/* ── The edits themselves, as pure functions ──────────────────────────────

   Every one takes an edit and hands back a new one. Nothing is changed in
   place, so a history is the array that was there — see `lib/undo.ts`, which
   the booth uses for exactly this reason. */

/** A piece added at the end. */
export function add(edit: Edit, piece: Piece): Edit {
  return { ...edit, pieces: [...edit.pieces, piece] };
}

/**
 * A piece copied, and the copy put straight after it.
 *
 * Every grade, caption, speed and placement comes with it. That is the whole
 * value of it: a shot that has been framed, graded and captioned is twenty
 * seconds of work, and wanting the same shot twice — a beat repeated, a product
 * shown again at the end — should not mean doing all of it again.
 *
 * A new id, because two pieces with one id is a selection that picks whichever
 * `find` reaches first and a history that restores the wrong one.
 */
export function duplicate(edit: Edit, id: string): Edit {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece) return edit;
  const copy: Piece = {
    ...piece,
    id: `${id}-copy-${Math.random().toString(36).slice(2, 8)}`,
  };
  return {
    ...edit,
    pieces: edit.pieces.flatMap((one) => (one.id === id ? [one, copy] : [one])),
  };
}

/** A piece taken out. */
export function drop(edit: Edit, id: string): Edit {
  return { ...edit, pieces: edit.pieces.filter((one) => one.id !== id) };
}

/** A piece changed. Unknown ids leave the edit alone rather than throwing. */
export function change(edit: Edit, id: string, how: Partial<Omit<Piece, 'id'>>): Edit {
  return {
    ...edit,
    pieces: edit.pieces.map((one) => (one.id === id ? { ...one, ...how } : one)),
  };
}

/**
 * A piece moved one place earlier or later.
 *
 * By one, rather than to an index. Dragging a clip past its neighbour is the
 * gesture, and an index is what that gesture produces on a mouse and not on
 * a thumb — the booth's lanes learned this and `lib/laneorder.ts` is the
 * same shape for the same reason.
 */
export function move(edit: Edit, id: string, way: 'earlier' | 'later'): Edit {
  const at = edit.pieces.findIndex((one) => one.id === id);
  if (at === -1) return edit;
  const to = way === 'earlier' ? at - 1 : at + 1;
  if (to < 0 || to >= edit.pieces.length) return edit;
  const next = [...edit.pieces];
  [next[at], next[to]] = [next[to], next[at]];
  return { ...edit, pieces: next };
}

/**
 * A piece cut in two at a moment on the edit's clock.
 *
 * The material is not touched: both halves point at the same blob with
 * different windows, which is what makes the cut free and what makes undoing
 * it a matter of putting the window back. The same rule the Pro Booth's
 * lanes follow.
 *
 * A cut at or past either edge is refused by returning the edit unchanged: a
 * split that leaves nothing on one side is a piece somebody cannot see, grab
 * or delete, and two of them are worse than one.
 */
export const SHORTEST_PIECE = 0.1;

export function split(edit: Edit, id: string, at: number): Edit {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece) return edit;
  /* `at` is a second on the FILM's clock. `into` is therefore how far into this
     piece the cut falls, also in film seconds. */
  const into = at - startsAt(edit, id);
  if (!(into > SHORTEST_PIECE && into < lengthOfPiece(piece) - SHORTEST_PIECE)) return edit;
  /* ── And film seconds are not clip seconds ─────────────────────────────

     Multiplied by the speed, and this line was missing until 3 October 2026.

     `lengthOfPiece` started dividing by the speed the night before, so `into`
     above is film time — but `piece.from + into` is a position in the FILE, and
     a piece playing at two times covers two seconds of file per second of film.
     Splitting a 2x piece in the middle of the film cut it a quarter of the way
     into the material instead of halfway.

     Invisible in every check there was: `check:editor` split one piece at one
     times and asserted the film was still as long as it was, which is true
     wherever the cut lands. */
  const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
  const cut = piece.from + into * fast;
  const left: Piece = { ...piece, id: `${piece.id}-a`, to: cut };
  const right: Piece = { ...piece, id: `${piece.id}-b`, from: cut };
  return {
    ...edit,
    pieces: edit.pieces.flatMap((one) => (one.id === id ? [left, right] : [one])),
  };
}

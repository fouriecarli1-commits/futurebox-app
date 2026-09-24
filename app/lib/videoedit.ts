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
  return Math.max(0, piece.to - piece.from);
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
  return at;
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
      ...(one.sound ? { sound: true } : {}),
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
  const into = at - startsAt(edit, id);
  if (!(into > SHORTEST_PIECE && into < lengthOfPiece(piece) - SHORTEST_PIECE)) return edit;
  const cut = piece.from + into;
  const left: Piece = { ...piece, id: `${piece.id}-a`, to: cut };
  const right: Piece = { ...piece, id: `${piece.id}-b`, from: cut };
  return {
    ...edit,
    pieces: edit.pieces.flatMap((one) => (one.id === id ? [left, right] : [one])),
  };
}

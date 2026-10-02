/**
 * What a film costs to put together, and what each part of that is for.
 *
 * ── Why this is a module and not a line in the route ─────────────────────
 *
 * Carli, 3 October 2026: *"elke element wat op die video editing gebruik word
 * [moet] krediete dra ... Dan wanneer die video klaar is, en hulle op die
 * export knoppie druk dan wys daar die hoeveelheid krediete, en hulle moet dan
 * confirm of hulle wil voortgaan."*
 *
 * So the same number has to be worked out in two places that cannot share a
 * runtime: the editor, to show it on the screen before anything is pressed,
 * and the route, to charge it. Two copies of a price is two prices, and the
 * one on the button is the one somebody agreed to.
 *
 * ── The client says what is in the film. The server says what it costs ────
 *
 * This is the rule and it is not a detail. The browser sends counts — how many
 * seconds, how many pieces carry words, how many joins are not straight cuts —
 * and the route runs `billFor` on them itself. A browser never sends a price,
 * and nothing here accepts one.
 *
 * It cannot stop somebody under-reporting what is in their own film; the room
 * runs on their machine and the file exists in their tab before any of this is
 * called. `app/api/madehere/route.ts` says the same thing about length and has
 * since it was written. What this shape DOES prevent is the ordinary mistake —
 * a rounding, a stale constant, a change made in one file — where the number
 * shown and the number charged quietly stop being the same number.
 *
 * ── The ceiling ──────────────────────────────────────────────────────────
 *
 * The elements together never cost more than the film itself.
 *
 * One sentence, and it is the whole of what keeps this affordable. Without it,
 * a three-minute video with a caption on every shot comes to twenty-eight
 * credits — and a room whose entire value is that people use it would be
 * charging most to the people using it most, which is the fault this app keeps
 * finding in its own pricing.
 *
 * With it, the dearest film anybody can make is exactly twice the cheapest one
 * of the same length, and the thing that moves the price is the LENGTH, which
 * is the thing that moves what the film is worth.
 */

import { CREDITS, perMinute } from './credits';
import { lengthOfPiece, runs, type Edit } from './videoedit';

/**
 * What is in a film, as plain numbers.
 *
 * Deliberately not an `Edit`. This crosses the wire, and an `Edit` carries
 * Blobs; it is also what the route validates, and a shape of numbers and
 * booleans can be clamped in six lines where an edit cannot be checked at all.
 */
export interface InTheFilm {
  /** How long the finished film runs, in seconds. */
  readonly seconds: number;
  /** How many pieces carry words. */
  readonly words: number;
  /** How many pieces carry a look. */
  readonly looks: number;
  /** How many joins are not a straight cut. */
  readonly joins: number;
  /** Whether her own mark is on it. */
  readonly mark: boolean;
  /** Whether there is a track under it. */
  readonly under: boolean;
}

/** Nothing in it at all. A film of no length costs nothing, not a minimum. */
export const NOTHING_IN_IT: InTheFilm = {
  seconds: 0, words: 0, looks: 0, joins: 0, mark: false, under: false,
};

/** One row of the bill: what it is, how many, what each costs. */
export interface BillLine {
  /** Matched to a word on the screen by `i18n`, never a sentence from here. */
  readonly id: 'film' | 'words' | 'look' | 'join' | 'mark' | 'under';
  readonly count: number;
  readonly each: number;
  readonly credits: number;
}

/** What a film costs, itemised. */
export interface Bill {
  /** Every row that is not nought, the film itself first. */
  readonly lines: readonly BillLine[];
  /** The film itself, by the minute. */
  readonly base: number;
  /** What the elements come to before the ceiling. */
  readonly asked: number;
  /** What the elements actually cost, after it. */
  readonly elements: number;
  /** Whether the ceiling is doing anything, so a screen can say so. */
  readonly ceiling: boolean;
  /** What is charged. */
  readonly total: number;
}

/** Counts never go negative or fractional, however they arrived. */
function counted(n: unknown): number {
  const one = Number(n);
  return Number.isFinite(one) && one > 0 ? Math.floor(one) : 0;
}

/**
 * What is in this edit, counted.
 *
 * The mark is passed in rather than read off the edit, because it is a loaded
 * image held by the room and not part of the film's description — the same
 * reason `cutFrom` does not carry it.
 */
export function inTheFilm(edit: Edit, mark: boolean): InTheFilm {
  /* `lengthOfPiece(one) > 0` on every count, matching `cutFrom`: a piece of no
     length is left out of the render, and charging for an element on a piece
     that is never drawn would be charging for something nobody can see. */
  const real = edit.pieces.filter((one) => lengthOfPiece(one) > 0);
  return {
    seconds: runs(edit),
    words: real.filter((one) => (one.words ?? '').trim().length > 0).length,
    looks: real.filter((one) => one.look && one.look !== 'none').length,
    /* The first piece's join is ignored, exactly as the renderer ignores it:
       there is nothing behind it to arrive from. Charging for a transition that
       is never drawn is the same fault as the line above. */
    joins: real.filter((one, i) => i > 0 && one.join && one.join !== 'cut').length,
    mark,
    under: Boolean(edit.under),
  };
}

/**
 * What that costs.
 *
 * Pure, so `check:filmcost` can read it with numbers, and so the route and the
 * screen cannot disagree.
 */
export function billFor(what: InTheFilm): Bill {
  const seconds = Number.isFinite(what.seconds) && what.seconds > 0 ? what.seconds : 0;
  /* A film of no length is not a film. `perMinute` floors at one minute, which
     is right for a film and wrong for nothing at all — so the nothing case is
     answered before it, rather than by it. */
  if (seconds <= 0) {
    return {
      lines: [], base: 0, asked: 0, elements: 0, ceiling: false, total: 0,
    };
  }

  const base = perMinute(seconds, CREDITS.filmOut);

  const parts: readonly { readonly id: BillLine['id']; readonly count: number; readonly each: number }[] = [
    { id: 'words', count: counted(what.words), each: CREDITS.filmWords },
    { id: 'look', count: counted(what.looks), each: CREDITS.filmLook },
    { id: 'join', count: counted(what.joins), each: CREDITS.filmJoin },
    { id: 'mark', count: what.mark ? 1 : 0, each: CREDITS.filmMark },
    { id: 'under', count: what.under ? 1 : 0, each: CREDITS.filmUnder },
  ];

  const asked = parts.reduce((all, one) => all + one.count * one.each, 0);
  const elements = Math.min(asked, base);

  /* ── The rows shown, and why they are what was ASKED ────────────────────

     Each row carries what that element comes to on its own, not its share of
     the capped total. A row reading "3 looks · 2 credits" because the ceiling
     took a third off the middle of it is a row nobody can check against the
     price beside it.

     The ceiling is its own fact, said separately, which is the honest shape:
     here is what is in your film, and here is the discount for having made a
     lot of it. */
  const lines: BillLine[] = [
    { id: 'film', count: Math.max(1, Math.ceil(seconds / 60)), each: CREDITS.filmOut, credits: base },
    ...parts
      .filter((one) => one.count > 0)
      .map((one) => ({ ...one, credits: one.count * one.each })),
  ];

  return {
    lines,
    base,
    asked,
    elements,
    ceiling: asked > base,
    total: base + elements,
  };
}

/**
 * The same, straight off an edit.
 *
 * For the screen, which has the edit in its hand. The route uses `billFor` on
 * what the browser sent, because it never has one.
 */
export function billForEdit(edit: Edit, mark: boolean): Bill {
  return billFor(inTheFilm(edit, mark));
}

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
 * ── Counted per FUNCTION, which is what replaced the ceiling ─────────────
 *
 * Carli, 4 October 2026: *"5 krediete vir elke bykomende funksies soos filters,
 * teks, ens."* Each additional FUNCTION, not each use of one. Words on six
 * shots is one charge for words.
 *
 * There was a ceiling here on 3 October — the elements could never cost more
 * than the film itself — and it existed because at a credit per USE a long film
 * with a lot on it ran away. Counting per function solves that at its source,
 * so the ceiling is gone: a cap on top of it would only have made the fourth
 * function free, which is the opposite of what was asked for.
 *
 * The price still rises with the LENGTH, because the length is what moves what
 * a film is worth. `check:filmcost` holds the worked examples.
 */

import { CREDITS, perHalfMinute } from './credits';
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
  /**
   * How many pieces carry words, a look, and a transition.
   *
   * Still counted rather than reduced to a yes, and that is deliberate even
   * though the PRICE only asks whether any of them is above nought: the bill on
   * screen says "words on 3 shots", which is what somebody needs in order to
   * decide what to take off. A count can always answer "is there one"; a
   * boolean can never answer "how many".
   */
  readonly words: number;
  readonly looks: number;
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
  /** The film itself, by the half minute. */
  readonly base: number;
  /** What the functions used come to. */
  readonly elements: number;
  /** How many functions were reached for at all. */
  readonly functions: number;
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
    return { lines: [], base: 0, elements: 0, functions: 0, total: 0 };
  }

  const base = perHalfMinute(seconds, CREDITS.filmOut);

  /* `count` is how many shots carry it, for the row on screen. `each` is what
     the FUNCTION costs, charged once if the count is above nought — see the
     note at the top of this file for why it is per function and not per use. */
  const parts: readonly { readonly id: BillLine['id']; readonly count: number; readonly each: number }[] = [
    { id: 'words', count: counted(what.words), each: CREDITS.filmWords },
    { id: 'look', count: counted(what.looks), each: CREDITS.filmLook },
    { id: 'join', count: counted(what.joins), each: CREDITS.filmJoin },
    { id: 'mark', count: what.mark ? 1 : 0, each: CREDITS.filmMark },
    { id: 'under', count: what.under ? 1 : 0, each: CREDITS.filmUnder },
  ];

  const used = parts.filter((one) => one.count > 0);
  const elements = used.reduce((all, one) => all + one.each, 0);

  const lines: BillLine[] = [
    {
      id: 'film',
      count: Math.max(1, Math.ceil(seconds / 30)),
      each: CREDITS.filmOut,
      credits: base,
    },
    ...used.map((one) => ({ ...one, credits: one.each })),
  ];

  return {
    lines,
    base,
    elements,
    functions: used.length,
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

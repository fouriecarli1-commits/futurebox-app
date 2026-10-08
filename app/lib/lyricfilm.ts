/**
 * The song's own words, hung on the film it is playing under.
 *
 * ── Why this exists next to `lyriccut.ts` and is not the same thing ──────
 *
 * `lyriccut.ts` cuts ONE PIECE on the lines that came inside its own file.
 * The line times are positions in that file, so the arithmetic never leaves
 * the piece.
 *
 * This is the other half, and it is the half that matters more often: a song
 * under a film, on the FILM's clock, over however many shots she has already
 * cut. A line's second is not a position in any one file — it is a position
 * in the whole assembly, and which shot it lands on depends on everything in
 * front of it.
 *
 * That is also the common case. A film that arrives with a `tx3g` track comes
 * from one supplier and is one shot. A song under a storyboard of AI scenes is
 * what this app is for.
 *
 * ── Where the lines come from, and why that is not this file's business ──
 *
 * `lib/lyrictime.ts` already answers "where do the words fall" for every
 * screen in the app, on a five-rung ladder: placed against the audio by
 * forced alignment, heard by a transcriber, measured from the gaps between
 * phrases, laid into wherever the singing starts, or — last and worst — spread
 * evenly. It also says WHICH of those it did.
 *
 * So nothing here transcribes anything, and nothing here guesses. It is handed
 * lines with seconds on them and it does arithmetic. The room decides whether
 * the ladder's answer is good enough to offer — see the note on `spread` at
 * the call site, because a guess cut into fifty-two shots is fifty-two wrong
 * cuts and a worse outcome than no feature.
 *
 * ── What must not change ─────────────────────────────────────────────────
 *
 * **The film is exactly as long afterwards.** Every cut is a split, and a
 * split divides a shot without shortening it.
 *
 * **Nothing she already cut is undone.** This only ADDS cuts. A shot boundary
 * she chose stays a shot boundary, and `splitHere` already refuses a cut
 * within a breath of one that exists — so a line landing on a cut she made
 * hangs its words on that shot instead of slicing four frames off it.
 */

import {
  Edit, SHORTEST_PIECE, atSecond, change, lengthOfPiece, splitHere, startsAt,
} from './videoedit';
import { Timed } from './timedtext';

/** The lines worth cutting on, in the order they are sung. */
const singable = (lines: readonly Timed[]): Timed[] => lines
  .filter((one) => one.text.trim().length > 0 && one.to > one.from && one.from >= 0)
  .slice()
  .sort((a, b) => a.from - b.from);

/**
 * How many lines `lyricFilm` would hang, without hanging them.
 *
 * For the offer, so the button can say a number somebody can judge before
 * pressing it.
 *
 * ── Why this is the same code path and not a second count ────────────────
 *
 * The first version of this ran the real thing and counted the shots that had
 * words afterwards but not before, matched by id. `check:lyricfilm` failed it
 * immediately, on a film with one caption she had typed herself: a split
 * RENAMES the shot it divides, so her caption came back on an id that had not
 * existed before and was counted as a line this had hung. The button would
 * have offered to hang two lines and hung one.
 *
 * Which is the whole argument against a count arrived at a second way. So
 * there is one walk through the lines, it returns both, and the number on the
 * button cannot disagree with what the button does.
 */
export const lyricCount = (edit: Edit, lines: readonly Timed[]): number =>
  hang(edit, lines).hung;

/**
 * The film, cut at every sung line, with each line on the shot it starts in.
 *
 * The edit back unchanged when there is nothing to hang, so a caller can
 * replace unconditionally.
 */
export const lyricFilm = (edit: Edit, lines: readonly Timed[]): Edit =>
  hang(edit, lines).edit;

function hang(edit: Edit, lines: readonly Timed[]): { edit: Edit; hung: number } {
  const sung = singable(lines);
  if (!sung.length) return { edit, hung: 0 };

  /* ── The cuts first, all of them, before any words ───────────────────

     Both passes walk the same list, and they have to be separate passes: a
     split renames the piece it divided, so a piece found in the first pass
     may not exist by the end of it. Cutting first and then looking each line
     up again means every lookup is against the finished film. */
  let next = edit;
  for (const line of sung) next = splitHere(next, line.from);

  /* One caption per shot is all a shot can hold, so a line whose own cut was
     refused — too close to a boundary that already existed — would otherwise
     overwrite the line before it. The earlier line wins: it is the one whose
     second the shot actually begins at. */
  const taken = new Set<string>();

  for (const line of sung) {
    const here = atSecond(next, line.from);
    if (!here) continue;
    const id = here.piece.id;
    if (taken.has(id)) continue;
    taken.add(id);

    /* Film seconds into this shot. `wordsFrom`/`wordsTo` are the piece's own
       clock as it PLAYS, which is what `line.from - startsAt` already is —
       both are film time, so there is no speed in this sum. `atSecond`'s
       `into` is deliberately not used here: that one is a position in the
       FILE, for seeking a `<video>`, and is the other conversion. */
    const mine = startsAt(next, id);
    const long = lengthOfPiece(here.piece);
    const from = Math.max(0, Math.min(line.from - mine, long));
    /* Down when the singing stops, not when the shot does — and clamped into
       this shot, because a line may run past a cut she made and a caption
       cannot follow it there. Floored so a line whose end was not recorded
       still shows rather than appearing for no time at all. */
    const to = Math.min(Math.max(line.to - mine, from + SHORTEST_PIECE), long);

    next = change(next, id, { words: line.text, wordsFrom: from, wordsTo: to });
  }

  /* `taken` is the answer to both questions: the shots that got a line, which
     is the same number as the lines that found a shot. */
  return { edit: next, hung: taken.size };
}

/**
 * `lyrictime`'s lines in the shape this file takes.
 *
 * A `TimedLine` carries a section name and whether it opens one, which is for
 * a screen that prints headings and is nothing to do with cutting. Narrowed
 * here rather than at the call site so there is one place that knows the two
 * shapes are the same three numbers.
 */
export const asTimed = (
  lines: readonly { readonly text: string; readonly start: number; readonly end: number }[],
): readonly Timed[] => lines.map((one) => ({ from: one.start, to: one.end, text: one.text }));

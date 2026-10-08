/**
 * A film that arrived with its lyrics, cut into one shot per line.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * `lib/timedtext.ts` reads the lines and the second each one lands on out of
 * an MP4. That is the half this app cannot work out for itself. This is the
 * other half, and it is arithmetic: turn those seconds into cuts, and hang
 * each line on the shot it belongs to.
 *
 * Afterwards it is an ordinary edit. Every line is a caption on a piece, with
 * the font, the colour, the box, the position and the timing the caption
 * toolbar already has — so a line that came in wrong is dragged, retyped or
 * deleted like any other, and nothing here has to be undone first.
 *
 * ── The two things that must not change ──────────────────────────────────
 *
 * **The film must be exactly as long afterwards.** The cuts are boundaries
 * inside one piece's window, so the segments are contiguous and together they
 * cover the whole window. Nothing is dropped and nothing is stretched. A
 * feature that quietly shortened her film by the instrumental would be worse
 * than no feature.
 *
 * **No frame may be lost.** Hence the leading segment: a song whose first
 * line lands at twelve seconds has twelve seconds of film before it, and
 * those twelve seconds are a piece with no words on it, not a piece thrown
 * away. Same at the tail.
 *
 * ── Seconds in a file, not seconds on a clock ────────────────────────────
 *
 * The line times come off the file's own clock, and `from`/`to` on a piece
 * are positions in that same file. So the cuts need no conversion and are
 * right whatever speed the piece plays at — a lyric landing on the frame it
 * was sung on cannot drift.
 *
 * `wordsFrom`/`wordsTo` are different: those are seconds INTO the piece as it
 * plays, which is why they are divided by the speed. See the note on them in
 * `videoedit.ts`.
 *
 * ── What this costs ─────────────────────────────────────────────────────
 *
 * Her song came out as fifty-two shots, all pointing at the same 7.8MB file.
 * The renderer walks the pieces in order and seeks the material for each, so
 * that is fifty-two seeks over one file rather than fifty-two files — but it
 * is still fifty-two, and a long song cut this way is a longer lay-down than
 * the same song as one piece. Said here so that if a three-minute song ever
 * takes noticeably longer to lay down than it used to, this is why and not a
 * mystery.
 */

import { Piece, SHORTEST_PIECE } from './videoedit';
import { Timed } from './timedtext';

/** A boundary inside the window, and the line that starts there. */
interface Cut {
  readonly at: number;
  readonly line: Timed | null;
}

/**
 * The shots this piece becomes once its lyrics are hung on it.
 *
 * One piece back when there is nothing to cut on — no lines, or every line
 * outside the window — so a caller can replace unconditionally and a film
 * with no lyrics in it simply stays as it was.
 */
export function lyricPieces(piece: Piece, lines: readonly Timed[]): readonly Piece[] {
  const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
  const cuts: Cut[] = [{ at: piece.from, line: null }];

  for (const line of lines) {
    if (!line.text) continue;
    /* A line that starts before the window belongs to whatever is on screen
       at the window's start, so it lands on the leading segment instead of
       making a cut of its own. The last such line wins — it is the one still
       being sung when the trim begins. */
    if (line.from <= piece.from) {
      if (line.to > piece.from) cuts[0] = { at: piece.from, line };
      continue;
    }
    if (line.from >= piece.to) break;
    /* Too close to the boundary before it to be a shot. The line is dropped
       rather than the cut being nudged: nudging moves the words off the frame
       they were sung on, which is the one thing this is for. */
    if (line.from - cuts[cuts.length - 1].at < SHORTEST_PIECE) continue;
    cuts.push({ at: line.from, line });
  }

  /* Nothing to cut on. One piece back, and the caller does not have to ask. */
  if (cuts.length === 1 && !cuts[0].line) return [piece];

  return cuts.map((cut, n) => {
    const ends = n + 1 < cuts.length ? cuts[n + 1].at : piece.to;
    const line = cut.line;
    return {
      ...piece,
      id: `${piece.id}-l${n}`,
      from: cut.at,
      to: ends,
      /* The strip draws names. Fifty-one blocks all carrying the file's name
         is a strip you cannot read, and the line itself is the one label that
         says which shot you are looking at. */
      name: line ? line.text : piece.name,
      ...(line
        ? {
          words: line.text,
          wordsFrom: 0,
          /* The line's own end, not the end of the shot: a line sung over
             three seconds and followed by nine seconds of instrumental
             should go down, and a caption that hangs there until the next
             one arrives is a lyric sheet rather than a lyric video.
             Floored at the shortest piece so a line whose end was not
             recorded still shows. */
          wordsTo: Math.max(SHORTEST_PIECE, Math.min(line.to, ends) - cut.at) / fast,
        }
        /* The leading segment with nothing being sung on it. Anything typed
           on the piece before this ran is cleared along with the rest: the
           lines are the caption now, and a caption surviving on one of
           fifty-one shots is a stray nobody would find. */
        : { words: undefined, wordsFrom: undefined, wordsTo: undefined }),
      /* A join belongs to the arriving piece, so copying the piece's join on
         to all of them would put a dissolve at every single lyric line. It
         stays on the first, where the thing it describes still happens. */
      ...(n === 0 ? {} : { join: undefined, joinFor: undefined }),
    };
  });
}

/**
 * How many shots `lyricPieces` would make, without making them.
 *
 * For the offer itself — a button that says how many lines it found is a
 * button somebody can judge before pressing. Counted by the same code that
 * does the cutting, because a count worked out a second way is a count that
 * will one day disagree with the thing it describes.
 */
export const lyricCount = (piece: Piece, lines: readonly Timed[]): number =>
  lyricPieces(piece, lines).filter((one) => !!one.words).length;

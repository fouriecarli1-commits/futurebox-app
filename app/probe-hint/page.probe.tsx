'use client';
/**
 * A help mark at every position across a phone, for `audit/hintfits.mjs`.
 *
 * PROBE=1 only.
 *
 * ── Why the whole width and not one mark ─────────────────────────────────
 *
 * The rule this replaced was "open leftwards, unless the mark is past the
 * middle of the window". That is correct at both ends and wrong in the
 * band between them, which is where Carli found it on 18 September: a mark
 * four tenths of the way across a 390-pixel phone, in the left half, with a
 * 240-pixel panel hanging off the right-hand edge. *"Hierdie een
 * description is van die bladsy af."*
 *
 * A probe that pressed one mark would have agreed with whichever rule was
 * in force. So every tenth of the width gets a mark, and the band that was
 * wrong is asserted alongside the two ends that were right.
 */
import React from 'react';
import Hint from '../components/Hint';

/* Every tenth, and 42% besides — the one she pressed, which is the middle
   band neither end of the old rule covered. */
const AT = [0, 10, 20, 30, 40, 42, 50, 60, 70, 80, 90, 100];

export default function P(): React.ReactElement {
  return (
    <div className="p-0">
      <p id="ready">hint</p>
      {AT.map((per) => (
        <div key={per} className="relative h-24 w-full">
          <span className="absolute" style={{ left: `${per}%`, top: 8 }} data-at={per}>
            <Hint>
              Eight bars of something this song does not have — a bass line, a pad, a shaker —
              asked for in the key and tempo the clock is set to, and landing as a lane of its own.
            </Hint>
          </span>
        </div>
      ))}
    </div>
  );
}

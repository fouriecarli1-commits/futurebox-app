/**
 * Is somebody sat at a desk, rather than holding this?
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"is dit moontlik om die website anders te maak as
 * die phone app? Die website moet nie lyk soos 'n foon app nie."*
 *
 * Yes, and in two of the rooms it already half was. `lib/sideways.ts` asks
 * whether a phone is turned on its side, and when it is, the cutting room's
 * bar becomes a rail down the edge — because sideways there is width to
 * spare and no height at all.
 *
 * A desktop browser is that shape with the dial turned further: more width,
 * much more height, and a mouse. But `sideways` deliberately excludes it —
 * its own note says *"a desktop browser window is landscape and nobody is
 * holding it"* — and that exclusion was right and then never completed. The
 * desktop fell through to the layout drawn for a thumb: a bar across the
 * foot, and a panel over the film.
 *
 * This is the other half of that question.
 *
 * ── Why these two halves and not a width ─────────────────────────────────
 *
 * `pointer: fine` is the half that means "not held", and it is the exact
 * opposite of the half `sideways` uses, which is what keeps the two from
 * ever both being true. A room picks one layout; two queries that can both
 * match is a room whose shape depends on which branch somebody wrote first.
 * `check:lessenaar` asserts that, because dropping either half still
 * compiles and still looks right on whatever the person who dropped it was
 * sitting in front of.
 *
 * `min-width: 1024px` is the half that means there is room for a panel
 * BESIDE the film rather than on top of it. A mouse in a narrow window is
 * still a narrow window, and a side panel in one leaves nothing to stand
 * beside. 1024 rather than a rounder number because it is the width Tailwind
 * already calls `lg` throughout this app, and a second threshold four pixels
 * from an existing one is two thresholds to keep in step.
 *
 * Deliberately NOT a check for a touchscreen's absence. A laptop with a
 * touch screen and a trackpad reports `fine` for its primary pointer, which
 * is the right answer: the way it is mostly used is sat down.
 *
 * ── The first paint ─────────────────────────────────────────────────────
 *
 * `false` on the server and on the first client render, for the same reason
 * `sideways` does it: the server cannot know, and a guess that disagrees
 * with the client is a hydration mismatch. So a desk gets one frame of the
 * phone layout. `sideways.ts` carries the longer note.
 */

import { useEffect, useState } from 'react';

/** The query, exported so a check can assert it rather than re-type it. */
export const AT_DESK = '(min-width: 1024px) and (pointer: fine)';

export function useAtDesk(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia(AT_DESK);
    const tell = (): void => setOn(query.matches);
    tell();
    /* `change`, and the old `addListener` as well — a browser without the
       modern event would otherwise be stuck at whatever width it opened at,
       which looks like the app froze rather than like it did not resize. */
    if (query.addEventListener) {
      query.addEventListener('change', tell);
      return () => query.removeEventListener('change', tell);
    }
    query.addListener(tell);
    return () => query.removeListener(tell);
  }, []);
  return on;
}

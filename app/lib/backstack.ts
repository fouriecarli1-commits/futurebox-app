'use client';

/**
 * The phone's own Back button, kept inside the app.
 *
 * ── The problem ──────────────────────────────────────────────────────────
 *
 * This app is one route. Rooms, the front door, the search and the account
 * panel are all overlays on the same page, which is right for how it works
 * and wrong for the hardware button under everybody's thumb: pressing Back
 * anywhere in the studio left the site entirely, because as far as the
 * browser was concerned nothing had been navigated to. Carli: "die actual
 * foon se back knoppie maak dat die hele app uit gaan en dan moet jy van voor
 * af in log."
 *
 * ── What this does ───────────────────────────────────────────────────────
 *
 * Gives the browser something to go back *to*. Every layer that opens pushes
 * a history entry; Back pops one and closes the innermost layer instead of
 * leaving. At the outermost layer — the feed, with nothing open — Back does
 * what it has always done and leaves, which is correct: there is nowhere
 * further in to come back from.
 *
 * ── The part that is easy to get wrong ───────────────────────────────────
 *
 * A layer can also be closed by a button. If that just ran the closer, the
 * pushed entry would still be sitting in the history and the next Back would
 * re-open the thing somebody had just dismissed — the app would appear to go
 * *forwards* when they pressed Back. So closing by button rewinds the history
 * by the same number of entries, and the `popstate` those rewinds fire is
 * counted and ignored rather than treated as a press.
 *
 * ── Why the closers are held in a ref ────────────────────────────────────
 *
 * They are rebuilt on every render — they close over state — and a listener
 * registered with them in its dependencies would be torn down and rebuilt on
 * every render too, which is both wasteful and a way to miss a press that
 * lands mid-swap. The listener is registered once and reads the current
 * closers off a ref.
 */

import { useEffect, useRef } from 'react';

/**
 * @param closers Ordered outermost first, innermost last. One per layer that
 *   is currently open; the array's length is the depth. Back runs the last.
 */
export function useBackStack(closers: readonly (() => void)[]): void {
  const depth = closers.length;
  const current = useRef(closers);
  current.current = closers;

  /** How many entries this hook has pushed and not yet accounted for. */
  const pushed = useRef(0);
  /** Rewinds we asked for ourselves, whose `popstate` is not a press. */
  const ours = useRef(0);
  const depthNow = useRef(depth);
  depthNow.current = depth;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (depth > pushed.current) {
      for (let i = pushed.current; i < depth; i += 1) {
        window.history.pushState({ futurebox: i + 1 }, '');
      }
      pushed.current = depth;
      return;
    }
    if (depth < pushed.current) {
      const back = pushed.current - depth;
      pushed.current = depth;
      ours.current += back;
      window.history.go(-back);
    }
  }, [depth]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => {
      if (ours.current > 0) {
        ours.current -= 1;
        return;
      }
      if (depthNow.current === 0) return; // Nothing of ours is open: let it go.
      /* The entry is already gone — the browser popped it — so the count comes
         down without asking for another rewind, and then the layer closes. */
      pushed.current = Math.max(0, pushed.current - 1);
      current.current[current.current.length - 1]?.();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}

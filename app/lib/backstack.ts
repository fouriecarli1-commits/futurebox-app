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

import { useEffect, useReducer, useRef } from 'react';

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

/* ── Layers that open from inside a room ──────────────────────────────────
 *
 * The list above is assembled in `app/page.tsx`, which knows about the room,
 * the front door, the search and the account panel — and nothing about what a
 * room opens on top of itself. So a whole room was one layer, and Back from
 * inside the Pro Booth closed the room and landed at the front door:
 *
 *   "Binne pro booth is daar nie 'n manier om back te gaan nie, die foon se
 *    back knoppie spring na die groot home page, en gaan nie terug na die
 *    vorige bladsy van the booth nie."
 *
 * Rather than teach `page.tsx` about every overlay in the app — it would have
 * to import them all and track state it does not own — an overlay says so
 * itself. `useBackLayer` puts a closer on the same stack for as long as the
 * overlay is open, and takes it off when it closes.
 *
 * Ordering is by registration, which for nested overlays is outermost first,
 * because an inner one cannot mount before the outer one that renders it.
 * That is the order `useBackStack` wants.
 */

type Closer = () => void;

const extra = new Map<number, Closer>();
let nextId = 1;
const watching = new Set<() => void>();

function announce(): void {
  for (const one of watching) one();
}

/**
 * Register this overlay as a layer for as long as it is open.
 *
 * @param open  Whether the overlay is showing.
 * @param close What Back should do — the same thing its own close button does.
 */
export function useBackLayer(open: boolean, close: Closer): void {
  /* The closer is rebuilt every render because it closes over state, so the
     registration holds a ref and reads through it. Registering the function
     itself would re-run this effect on every render and drop the layer for an
     instant each time, which is long enough to lose a press. */
  const latest = useRef(close);
  latest.current = close;

  useEffect(() => {
    if (!open) return undefined;
    const mine = nextId;
    nextId += 1;
    extra.set(mine, () => latest.current());
    announce();
    return () => {
      extra.delete(mine);
      announce();
    };
  }, [open]);
}

/** The registered layers, innermost last. For the one component that owns the stack. */
export function useInnerLayers(): Closer[] {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    watching.add(bump);
    return () => {
      watching.delete(bump);
    };
  }, []);
  return [...extra.entries()].sort((a, b) => a[0] - b[0]).map(([, one]) => one);
}

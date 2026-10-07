/**
 * A room that owns the whole screen, and the app bar getting out of its way.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026, on the booth's new bars: *"daai buttons vervang
 * die harde buttons van die hele app, dan val daai hele bar van die app in
 * die booth weg, let wel, links heel bo moet dan darem 'n back icon wees om
 * uit die booth te kom."*
 *
 * Two rows of buttons underneath a third row of buttons is three rows of
 * buttons, and the bottom one belongs to a different application. On a phone
 * it is also most of the thumb's reach spent on navigation nobody wants while
 * they are mixing.
 *
 * ── Why a store rather than a prop ───────────────────────────────────────
 *
 * The tab bar is rendered by `app/page.tsx`. The booth is four components
 * down inside the studio, behind a room, behind a modal flag — so the honest
 * alternatives were a prop threaded through every one of them, or a context
 * provider wrapping the app for one boolean. This is smaller than either and
 * says what it is: a room claims the screen while it is mounted and gives it
 * back when it unmounts, whichever way it was left.
 *
 * Counted rather than flagged. Two full-screen rooms can be mounted at once —
 * the pro booth opens from inside the ordinary one — and a plain boolean
 * would have the inner one's cleanup hand the screen back while the outer one
 * still has it.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MutableRefObject } from 'react';

let claims = 0;
const watchers = new Set<() => void>();

function tell(): void {
  for (const watcher of watchers) watcher();
}

function subscribe(watcher: () => void): () => void {
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
  };
}

/** Whether any room currently owns the screen. */
export function ownsScreen(): boolean {
  return claims > 0;
}

/**
 * Claim the screen for as long as this component is mounted.
 *
 * `on` so a room can claim it conditionally without breaking the rule that a
 * hook is called every render.
 */
export function useOwnScreen(on = true): void {
  useEffect(() => {
    if (!on) return;
    claims += 1;
    tell();
    return () => {
      claims = Math.max(0, claims - 1);
      tell();
    };
  }, [on]);
}

/**
 * Read it, in the page that draws the bar.
 *
 * The server snapshot is `false`: nothing has claimed the screen before the
 * page has rendered once, and returning anything else would make the first
 * client paint disagree with the server's.
 */
export function useOwnedScreen(): boolean {
  return useSyncExternalStore(subscribe, ownsScreen, () => false);
}

/* ── How tall a room with a bar at its foot is ────────────────────────────
 *
 * A room whose tools live along the bottom is a fixed-height column: a
 * scroller that takes what is left, and a bar under it. To be that, it needs
 * a height — and the height is the screen, less whatever is above it, less
 * the app's own bar if it is drawn.
 *
 * This was written inside `VideoEditor.tsx`, with the whole story of getting
 * it wrong. Shortened here; the long version is worth keeping and is below.
 *
 *   "Whatever is above it" was a constant: `calc(100dvh - 7.5rem)`. It is not
 *   a constant. The header over the cutting room is a back arrow, a search and
 *   an "All rooms / Cutting room" card, and how tall that stack is depends on
 *   the width, the language and whether the card is folded. Measured on a
 *   390x844 phone the room started 155 pixels down, so 7.5rem of allowance
 *   left it ending 93 pixels below the bottom of the screen — and what was
 *   down there was the lower half of the bar: Bring it in, Looks, Words,
 *   Sound, Your mark. Two probes said so and neither could say why, because
 *   neither could see the guess.
 *
 * It is shared rather than copied because the photo editor became the second
 * room of this shape on 7 October, and a second copy of this arithmetic is a
 * second room that ends 93 pixels below the screen the first time one of them
 * is corrected.
 */


/** The value to paint on the frame before the first measurement lands. */
export const ROOM_HEIGHT_GUESS = 'calc(100dvh - 7.5rem)';

/**
 * A ref to put on the room's outer column, and the height to give it.
 *
 * `null` until it has been measured once, so the caller can fall back to
 * `ROOM_HEIGHT_GUESS` for that frame rather than painting a room with no
 * height at all — which, in a flex column, grows a page under itself instead
 * of scrolling.
 */
export function useRoomHeight(): {
  readonly shell: MutableRefObject<HTMLDivElement | null>;
  readonly tall: number | null;
} {
  const shell = useRef<HTMLDivElement | null>(null);
  const [tall, setTall] = useState<number | null>(null);

  const fit = useCallback((): void => {
    const box = shell.current;
    if (!box) return;
    /* ── Measured where the room sits, not where it has been scrolled to ──
 
       `getBoundingClientRect().top` alone is a feedback loop. If anything on
       the page scrolls, the room's top goes negative, the height comes out
       bigger, the page gets longer, and it can be scrolled further still: the
       photo editor measured 784 standing still and 921 after being scrolled
       to the end.
 
       So the top is taken inside whatever scrolls around it — the element's
       own offset in that container's content — which does not move when the
       container is scrolled. With nothing scrolled the two agree, which is why
       the cutting room never showed this. */
    let scroller: HTMLElement | null = box.parentElement;
    while (scroller) {
      const how = getComputedStyle(scroller).overflowY;
      if ((how === 'auto' || how === 'scroll')
        && scroller.scrollHeight > scroller.clientHeight + 1) break;
      scroller = scroller.parentElement;
    }
    const top = scroller
      ? box.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top + scroller.scrollTop
      : box.getBoundingClientRect().top;
    /* `visualViewport` rather than `innerHeight` where it exists: on a phone
       the address bar coming and going changes one and not the other, and the
       one that matches what she can see is the visual viewport. */
    const screen = scroller
      ? scroller.clientHeight
      : (window.visualViewport?.height ?? window.innerHeight);
    /* The bar measured, not assumed, for the same reason the top is. On a
       phone with a home indicator it is the bar's height plus the safe area,
       and the safe area is a number only the device knows.
 
       Nought when there is no bar, not `BAR_HEIGHT`: a room that claims the
       screen is not drawn under one, and reserving 64 pixels for a bar that is
       not there is how a room ends up with a strip of nothing along the
       bottom. */
    const bar = document.querySelector('nav.fixed.bottom-0');
    const under = bar ? bar.getBoundingClientRect().height : 0;
    setTall(Math.max(320, Math.round(screen - top - under)));
  }, []);

  useEffect(() => {
    if (!shell.current) return undefined;
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(document.body);
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      watch.disconnect();
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, [fit]);

  return { shell, tall };
}

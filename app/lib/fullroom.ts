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

import { useEffect, useSyncExternalStore } from 'react';

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

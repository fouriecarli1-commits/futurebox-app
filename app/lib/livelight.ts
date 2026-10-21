/**
 * The light that moves through the live room's sleeves — when, and where.
 *
 * The owner, 21 October 2026: *"Bring ook bietjie motion en beweging van die
 * lig so elke nou en dan deur die album art, selfs wanneer dit geluister
 * word … Hierdie kamer is wat die wêreld sien."* The light itself is CSS
 * (`.fb-live-*` in `globals.css`); this file answers the two questions CSS
 * cannot.
 *
 * ── Not in step ──────────────────────────────────────────────────────────
 *
 * A beam that crosses every sleeve at the same instant reads as the page
 * blinking, not as light. Each song gets its own place in the cycle, drawn
 * from its id, so the same song always catches the light at the same moment
 * and two neighbours almost never do.
 *
 * ── Only what is on the screen ───────────────────────────────────────────
 *
 * The spark round the edge animates a custom property, which the browser
 * works out on the main thread every frame. A room of forty songs doing that
 * off screen is forty sleeves of work for nobody, on the phone of somebody
 * who is scrolling. `useLit` says when a sleeve is in view, and the CSS only
 * moves a sleeve that says it is.
 */
import { useEffect, useRef, useState } from 'react';

/** How long one turn of the light takes, in seconds — the beam's cycle in `globals.css`. */
export const LIGHT_CYCLE = 8;

/** Where in the cycle this song catches the light, as a CSS delay (negative: already under way). */
export function lightDelay(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return `-${((hash % (LIGHT_CYCLE * 10)) / 10).toFixed(1)}s`;
}

/** A ref for a sleeve, and whether any of it is on the screen now. */
export function useLit<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setLit(true);
      return undefined;
    }
    const watcher = new IntersectionObserver(([entry]) => setLit(Boolean(entry?.isIntersecting)), {
      rootMargin: '80px 0px',
    });
    watcher.observe(element);
    return () => watcher.disconnect();
  }, []);
  return [ref, lit];
}

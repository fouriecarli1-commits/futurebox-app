/**
 * Is this a phone or a tablet being held sideways?
 *
 * ── Why the booth asks ──────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Die booth moet asb op die dwars draai funksie
 * van 'n foon en tablet getoets word. Want baie mense gaan die dwarsdraai wil
 * gebruik, en dan gaan die buttons weer beter werk aan die kant van die skerm
 * en nie onder nie."*
 *
 * She is right, and the reason is arithmetic rather than taste. A phone
 * turned sideways is about 390 pixels tall. The booth's two rows of controls
 * are 130 of them, the header and the readout another 110 — which leaves the
 * timeline, the thing the room is for, about 150 pixels for every lane it
 * has. Sideways, the screen has width to spare and no height at all, so the
 * controls belong on the edge where there is room and where, held sideways,
 * the thumbs already are.
 *
 * ── Why the test is what it is ──────────────────────────────────────────
 *
 * `(orientation: landscape)` alone is wrong: a desktop browser window is
 * landscape and nobody is holding it, so the rail would appear on a screen
 * with a mouse and a thousand pixels of height. `(pointer: coarse)` is the
 * part that means "held" — the same signal `globals.css` already uses to
 * decide a control needs 44 pixels. Together they say exactly what she
 * described: a phone or a tablet, turned.
 *
 * Deliberately NOT a width or height threshold. Those were the first attempt
 * and every number chosen was wrong for something: 500 puts a small tablet in
 * portrait mode sideways, 900 puts a laptop into the rail. The question is
 * not how big the screen is, it is which way round it is being held.
 *
 * ── The first paint ─────────────────────────────────────────────────────
 *
 * `false` on the server and on the first client render, because the server
 * cannot know and a guess that disagrees with the client is a hydration
 * mismatch. The effect settles it a frame later, which on a device that IS
 * sideways is one frame of the portrait layout — invisible, and honest.
 */

import { useEffect, useState } from 'react';

/** The query, exported so a check can assert it rather than re-type it. */
export const SIDEWAYS = '(orientation: landscape) and (pointer: coarse)';

export function useSideways(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia(SIDEWAYS);
    const tell = (): void => setOn(query.matches);
    tell();
    /* `change`, and the old `addListener` as well: the modern event exists
       everywhere current, and a browser old enough to lack it would otherwise
       be stuck in whichever orientation it started in — which is worse than
       not rotating at all, because it looks like the app froze. */
    if (query.addEventListener) {
      query.addEventListener('change', tell);
      return () => query.removeEventListener('change', tell);
    }
    query.addListener(tell);
    return () => query.removeListener(tell);
  }, []);
  return on;
}

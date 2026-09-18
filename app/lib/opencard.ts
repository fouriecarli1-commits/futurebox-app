'use client';

/**
 * Something was just put in this card, so open it and go to it.
 *
 * Not `lib/arrival.ts`, which is about what arrives in a piece of MUSIC —
 * the low end coming in, the top opening up — and is read by the hook
 * finder. Same English word, unrelated job. This file was very nearly
 * written over that one, which is the second time this app has had two
 * meanings for one word (`watermark` is an audio tone, `logomark` is a
 * picture in the corner of a clip) and the second time the answer is two
 * names rather than one clever file.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 18 September 2026, on the advert desk — the room she calls the
 * important one: *"As ek druk op open the room dan vat hy my net na die
 * regte kamer toe, maar die AI vul nie die afdelings vir my in nie. Dit is
 * 'n groot flaw en uiteindelik dan 'n produk wat ons nie sal kan lewer nie."*
 *
 * The AI was filling them in. Every operation the desk sends is registered
 * by the room it is sent to, every value arrives, and `check:adhandover` and
 * `audit/adcarry.mjs` both said so.
 *
 * What neither of them said is that a room opens as its own table of
 * contents — every panel folded, which is how Carli asked for it in
 * September: *"when I open the video desk, can all the drop down menus be
 * closed"*. So the value landed in a box inside a shut card, three headings
 * down a page, and the desk she was taken to looked exactly like a desk
 * nobody had touched.
 *
 * `audit/adcarry.mjs` could not see it because the first thing the probe
 * does in the destination room is unfold the card. It was measuring that
 * the value had ARRIVED, which was never the thing in doubt, and calling it
 * proof of the thing she was reporting.
 *
 * ── Why a shared hook and not a line in each room ────────────────────────
 *
 * Because it was a line in one room. `Storyboard` had exactly this — a
 * counter, a ref, a scroll — written for exactly this reason, with the
 * reason in a comment above it: *"on a phone the difference between 'opened'
 * and 'opened below the fold' is the whole of it."* It was the only one of
 * thirteen rooms that had it, and its own `write_scenes` did not call it:
 * only a separate `open_board` operation nobody was sending.
 *
 * So one room solved this and the solution stayed in that room. Out here it
 * is the same three lines, and `check:arrived` can ask every room that
 * receives a hand-off whether it uses them.
 *
 * ── Opening is not enough on its own ─────────────────────────────────────
 *
 * The scroll is half of it and the half that is easy to leave out. A card
 * that opens below the fold, in a room that was just scrolled to the top by
 * arriving in it, is a card that did not open as far as anyone can see.
 *
 * `block: 'start'` rather than `'center'`, so the heading is at the top of
 * the window with the box under it, and `requestAnimationFrame` so the fold
 * has painted — scrolling to a card that is still shut goes to where the
 * shut card was.
 */

import { useCallback, useRef, useState, type MutableRefObject } from 'react';

/**
 * When the last card scrolled itself into view, across every card on the page.
 *
 * A hand-off is usually several operations in a row — the advert desk sends
 * a title, then words, then a sound, into three different cards. Every one
 * of them should OPEN. Only the first should move the page: scrolling three
 * times in one frame lands somebody at the bottom of what arrived, reading
 * the last field of a form whose first field is the one they need.
 *
 * So the rest open where they are, above and below, which is what a filled
 * form looks like.
 */
let lastScroll = 0;
/** Long enough to cover one hand-off, short enough not to swallow the next. */
const TOGETHER = 700;

export interface OpenCard {
  /**
   * Hand to `Card`'s `openOn`. Every bump opens the card.
   *
   * A counter rather than a boolean, deliberately, and `Card` says why: a
   * boolean is a claim about how a room looks when you walk into it, and
   * the rule is that a room opens folded. This is a claim about something
   * that has just happened.
   */
  readonly openOn: number;
  /** Put on the element around the card, so the scroll has somewhere to go. */
  readonly mine: MutableRefObject<HTMLDivElement | null>;
  /** Call from the operation handler, after it has set the value. */
  readonly arrived: () => void;
}

export function useOpenCard(): OpenCard {
  const [openOn, setOpenOn] = useState(0);
  const mine = useRef<HTMLDivElement | null>(null);
  const arrived = useCallback(() => {
    setOpenOn((n) => n + 1);
    const now = Date.now();
    if (now - lastScroll < TOGETHER) return;
    lastScroll = now;
    /* After the fold has painted, or it scrolls to where the shut card was. */
    requestAnimationFrame(() => {
      mine.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);
  return { openOn, mine, arrived };
}

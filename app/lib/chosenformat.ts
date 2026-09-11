'use client';

/**
 * What this business decided to make, remembered across the two panels.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The advert desk now answers two questions in two panels. "What should this
 * even be?" picks the formats; "The market, and the week" builds the posting
 * week. They sat side by side knowing nothing about each other, so the week
 * said "Tuesday 18:00, TikTok" and never said what to put there — and the
 * recommendation above it had just named the one thing worth making.
 *
 * Two panels each giving good advice about the same business, with no line
 * between them, is not depth. It is two half-answers and a reader who has to
 * join them.
 *
 * ── Why storage and not a prop ───────────────────────────────────────────
 *
 * The same reason `MarketPlan` reads the imported ad report this way rather
 * than being handed it: threading a value through a parent that does not
 * otherwise care about it means the parent now cares about it, and the next
 * panel that needs it threads it again. The report already lives in this
 * browser; so does this.
 */

import { AD_FORMATS, formatById, type AdFormat } from './adformats';

const KEY = 'futurebox.adformats.v1';

/**
 * A recommendation, whole.
 *
 * ── Why the reasons are kept and not only the ids ───────────────────
 *
 * This held `{ id, first, style }` — enough for the week below to know
 * what was recommended, and not enough to draw the card again. So the
 * adviser's panel lost its cards the moment somebody left the room: the
 * reasons, the thing to watch out for and the line naming the wrong
 * answer were all written, shown once, and dropped.
 *
 * Carli, 11 September 2026: "Currently I cannot go back to our previous
 * ad generation and find it as it was."
 *
 * The reasons ARE the recommendation. An id and a sentence is a note
 * about one; the card is the product.
 */
export interface Chosen {
  readonly id: string;
  /** The first thing to make, as the adviser wrote it for this business. */
  readonly first: string;
  /** Why this one, for this business. The body of the card. */
  readonly why?: string;
  /** What makes it go wrong. The line nobody else writes. */
  readonly watchOut?: string;
  /** Why that look, in their terms. */
  readonly styleWhy?: string;
  /**
   * The look it recommended, by id from `adstyles.ts`.
   *
   * Kept because the advert cards below the adviser hand a shot to the video
   * desk, and the look is the one part of the recommendation they could not
   * see: it lived in the adviser's own state and nowhere else, so "film this
   * one" sent a shot with no look on it while the card two inches above said
   * exactly how it should look.
   */
  readonly style?: string;
}

/** What the adviser said, beside the picks: the format NOT to spend a month on. */
const INSTEAD_KEY = 'futurebox.adformats.instead.v1';

export function saveChosen(chosen: readonly Chosen[], instead?: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(chosen));
    if (instead !== undefined) window.localStorage.setItem(INSTEAD_KEY, instead);
  } catch {
    // Storage blocked. The panel still shows it for this session.
  }
}

/**
 * What was chosen, dropping anything the catalogue no longer has.
 *
 * Filtered on the way out rather than on the way in, because a format can be
 * removed from the catalogue between the day it was recommended and the day
 * the week is planned — and a plan built around a room that no longer exists
 * is worse than one built around nothing.
 */
export function loadChosen(): { format: AdFormat; first: string; style?: string }[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const said = JSON.parse(raw) as Chosen[];
    if (!Array.isArray(said)) return [];
    return said
      .map((one): { format: AdFormat; first: string; style?: string } | null => {
        const format = formatById(one?.id ?? '');
        if (!format) return null;
        return {
          format,
          first: String(one.first ?? ''),
          ...(one?.style ? { style: String(one.style) } : {}),
        };
      })
      .filter((one): one is { format: AdFormat; first: string; style?: string } => one !== null)
      .slice(0, AD_FORMATS.length);
  } catch {
    return [];
  }
}

/**
 * The recommendations exactly as they were shown, for the panel to draw again.
 *
 * `loadChosen` above answers the week's question — "which formats, and what
 * was the first thing to make" — and deliberately drops anything the
 * catalogue no longer has. This answers the panel's question, which is "put
 * the cards back", and so it keeps the words.
 */
export function loadPicks(): { picks: Chosen[]; instead: string } {
  try {
    const raw = window.localStorage.getItem(KEY);
    const said = raw ? (JSON.parse(raw) as Chosen[]) : [];
    const picks = Array.isArray(said)
      ? said
          .filter((one) => one && typeof one.id === 'string' && formatById(one.id))
          .slice(0, AD_FORMATS.length)
          .map((one) => ({
            id: String(one.id),
            first: String(one.first ?? ''),
            why: one.why ? String(one.why) : undefined,
            watchOut: one.watchOut ? String(one.watchOut) : undefined,
            style: one.style ? String(one.style) : undefined,
            styleWhy: one.styleWhy ? String(one.styleWhy) : undefined,
          }))
      : [];
    return { picks, instead: window.localStorage.getItem(INSTEAD_KEY) ?? '' };
  } catch {
    return { picks: [], instead: '' };
  }
}

/** Put a saved campaign's recommendations back where the panel reads them. */
export function putPicks(picks: readonly Chosen[], instead: string): void {
  saveChosen(picks, instead);
}

/** Nothing recommended. Used when a new campaign is started. */
export function clearPicks(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(INSTEAD_KEY);
  } catch {
    /* Storage off; the screen is cleared either way. */
  }
}

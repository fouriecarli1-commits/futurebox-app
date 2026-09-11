'use client';

/**
 * The adverts you have worked on, each one a button.
 *
 * ── What was asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 September 2026:
 *
 *   "The advert also has to be able to resume a previous session. It should
 *    still be open when moving between rooms. And the ones that I have
 *    worked on should be able to be a button to push on and then everything
 *    opens as it was. Currently I cannot go back to our previous ad
 *    generation and find it as it was."
 *
 * Three separate things were wrong, and only the first had been fixed.
 *
 *   1. The brief did not survive leaving the room. Fixed earlier tonight in
 *      `adbrief.ts` — but that keeps ONE brief, which is the current one.
 *   2. The recommendation cards did not survive either. The reasons, the
 *      thing to watch out for, the format named as the wrong answer: all
 *      written, shown once, and dropped on unmount.
 *   3. There has only ever been ONE of everything. One brief, one set of
 *      recommendations, one plan. A second campaign did not sit beside the
 *      first, it replaced it — silently, with no list and nothing to press.
 *
 * ── What a piece of work is ──────────────────────────────────────────────
 *
 * Everything that made one campaign what it was: the brief, the ticked
 * destinations, the written adverts, the recommendations with their
 * reasons, and the week. Opening one puts all of it back where the three
 * panels read from, and they are remounted so they read it.
 *
 * ── Why the panels are not rewritten to take props ───────────────────────
 *
 * Because the three of them already read three separate stores, and that is
 * the seam this uses: switching a piece of work writes those stores and
 * bumps a key. Lifting three panels' state into their parent to do the same
 * job would be a much larger change to make the same thing happen, and the
 * larger change is the one that breaks the video hand-off that was fixed an
 * hour ago.
 *
 * ── Why they are saved without being asked for ───────────────────────────
 *
 * "The ones that I have worked on" — not the ones somebody remembered to
 * press Save on. A Save button is a thing to forget, and the work it loses
 * is the work somebody did before they knew the button existed. So a piece
 * of work exists from the moment there is something in the first box, and
 * it updates itself as it changes.
 */

import { NOTHING_KEPT, type KeptBrief } from './adbrief';
import type { Chosen } from './chosenformat';
import type { Plan } from './marketplan';

const KEY = 'futurebox.adwork.v1';

/** How many pieces of work are kept. */
export const MOST_WORKS = 12;

export interface Work {
  readonly id: string;
  /** ISO. What the list is ordered by, newest first. */
  readonly savedAt: string;
  readonly brief: KeptBrief;
  readonly picks: readonly Chosen[];
  /** The format named as the wrong answer, which is half the advice. */
  readonly instead: string;
  readonly plan: Plan | null;
}

export interface Shelf {
  /** Which one is open, or null before anything has been started. */
  readonly open: string | null;
  readonly works: readonly Work[];
}

export const EMPTY_SHELF: Shelf = { open: null, works: [] };

/** A new id. `crypto.randomUUID` is not on every browser this app supports. */
export function newWorkId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `w${Date.now().toString(36)}${rand}`;
}

/**
 * What to call a piece of work in the list.
 *
 * Their own first line, cut to fit. Not a generated title: a name somebody
 * did not write is a name they have to read twice to recognise, and the
 * first sentence of the brief is the one thing that is always there.
 */
export function nameOf(work: Work): string {
  const said = work.brief.what.trim().replace(/\s+/g, ' ');
  if (!said) return '';
  return said.length > 44 ? `${said.slice(0, 43).trimEnd()}…` : said;
}

export function loadShelf(): Shelf {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_SHELF;
    const said = JSON.parse(raw) as Partial<Shelf>;
    if (!said || !Array.isArray(said.works)) return EMPTY_SHELF;
    /* Every field read defensively: this is JSON from a browser store that
       an older version of this app, a person or an extension can have
       written, and a missing array here is a room that throws on mount. */
    const works = said.works
      .filter((one): one is Work => Boolean(one && typeof one.id === 'string'))
      .map((one) => ({
        id: String(one.id),
        savedAt: typeof one.savedAt === 'string' ? one.savedAt : '',
        brief: { ...NOTHING_KEPT, ...(one.brief ?? {}) },
        picks: Array.isArray(one.picks) ? one.picks : [],
        instead: typeof one.instead === 'string' ? one.instead : '',
        plan: one.plan && Array.isArray((one.plan as Plan).week) ? one.plan : null,
      }))
      .slice(0, MOST_WORKS);
    const open = typeof said.open === 'string' && works.some((one) => one.id === said.open)
      ? said.open
      : null;
    return { open, works };
  } catch {
    return EMPTY_SHELF;
  }
}

function write(shelf: Shelf): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(shelf));
  } catch {
    /* Storage off or full. The desk still works for this visit. */
  }
}

/**
 * Put one piece of work on the shelf, replacing the one with its id.
 *
 * Newest first, and the oldest fall off the end — the same rule as the
 * makes history. Twelve campaigns is more than anybody has, and a store
 * that grows without limit fails its writes silently later on.
 */
export function keepWork(work: Work): Shelf {
  const shelf = loadShelf();
  const rest = shelf.works.filter((one) => one.id !== work.id);
  const next: Shelf = { open: work.id, works: [work, ...rest].slice(0, MOST_WORKS) };
  write(next);
  return next;
}

/** Say which one is open, without changing any of them. */
export function openWork(id: string | null): Shelf {
  const shelf = loadShelf();
  const next: Shelf = {
    open: id && shelf.works.some((one) => one.id === id) ? id : null,
    works: shelf.works,
  };
  write(next);
  return next;
}

export function dropWork(id: string): Shelf {
  const shelf = loadShelf();
  const works = shelf.works.filter((one) => one.id !== id);
  const next: Shelf = { open: shelf.open === id ? null : shelf.open, works };
  write(next);
  return next;
}

/** One piece of work, by id. */
export function workById(id: string | null): Work | null {
  if (!id) return null;
  return loadShelf().works.find((one) => one.id === id) ?? null;
}

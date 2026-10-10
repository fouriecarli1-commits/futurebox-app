/**
 * What a parent is deciding when they set a child's allowance.
 *
 * ── What she asked, in two messages ──────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."* And then: *"Gee dan net vir die ouer 'n raamwerk van wat krediete
 * kan doen per liedjie, per video, per story mode."*
 *
 * So the kids room does not open on the kids room. It opens on a page for
 * the grown-up, and that page has to answer the only question a grown-up
 * actually has — what does this cost me — before it asks them to pick a
 * number. "Twenty credits" means nothing. "Twenty credits is one song" means
 * everything, and it is the difference between a parent who sets an
 * allowance and a parent who closes the app.
 *
 * ── Why every number here is derived ─────────────────────────────────────
 *
 * Not one of them is typed. `CREDITS.song`, `videoCost` and `readCost` are
 * the same values the routes charge from, so this page cannot quote a price
 * the app does not honour — which is the one mistake on a page about money
 * that cannot be argued away afterwards. `check:toelaag` drives each row
 * against the credit table rather than reading it.
 *
 * The allowance steps are derived too, from the price of one song, so they
 * are "one song, two songs, four, eight" rather than four round numbers that
 * stop being round the next time a song's price moves.
 *
 * ── The row that is honest about not existing yet ────────────────────────
 *
 * She asked for story mode in the framework and story mode is not built. A
 * price list for a room that cannot do the thing is the same mistake as a
 * landing page promising a feature, so the story row carries `ready: false`
 * and the page says so rather than offering it. The price is real — a page
 * read aloud and a picture for it are both built and both charged today —
 * and `check:toelaag` holds that every row marked ready is a thing the room
 * actually offers, so this cannot quietly become a promise.
 */

import { CREDITS, readCost, videoCost } from './credits';

/** The three things she named. */
export type KidThing = 'song' | 'video' | 'story';

/**
 * Ten seconds, because that is what the rest of the app treats as a clip —
 * `buys()` in `credits.ts` prices "a video" the same way, and two different
 * ideas of how long a video is would put two different prices on the same
 * button.
 */
export const VIDEO_SECONDS = 10;

/** A story, in pages and in characters a page. Eight pages of a few lines. */
export const STORY_PAGES = 8;
export const STORY_PAGE_CHARS = 400;

export interface Priced {
  readonly id: KidThing;
  /** What one of them costs, from the same table the route charges from. */
  readonly credits: number;
  /** Can the room do this today? A price for a thing it cannot is a promise. */
  readonly ready: boolean;
  /** What the parent is being told they are buying, for the page to translate. */
  readonly says: readonly [string, string];
}

export const KID_PRICES: readonly Priced[] = [
  {
    id: 'song',
    /* ── A song, and not a song with a picture on it ─────────────────────
 
       This said `CREDITS.song + CREDITS.cover` for an afternoon, on the
       reasoning that a song arriving without a picture is a disappointment
       to a child and a cover is two credits.
 
       It was wrong, and the way it was wrong is the kind this repo keeps
       catching: `/api/cover` requires a `trackId` that passes `storageId`,
       which means the song has to be SAVED to the library before it can have
       a sleeve drawn. The kids room does not save to her library — a child's
       nine attempts at a song about a dog are not her catalogue — so the
       room cannot make the picture, and a price list including one would
       have been a parent paying attention to a promise.
 
       Said plainly rather than quietly reduced, because the earlier number
       was shown to her. */
    credits: CREDITS.song,
    ready: true,
    says: ['kids.priceSong', 'A song, about a minute long'],
  },
  {
    id: 'video',
    credits: videoCost('standard', VIDEO_SECONDS),
    ready: true,
    says: ['kids.priceVideo', 'A ten-second video for a song'],
  },
  {
    id: 'story',
    /* A page read out loud, and a picture for that page, times the pages.
       Both halves are built and charged elsewhere today; the ROOM that puts
       them together is not, which is what `ready` says. */
    credits: (readCost(STORY_PAGE_CHARS) + CREDITS.repaint) * STORY_PAGES,
    /* Reachable from the kids room since 9 October: a grown-up makes a book
       in Story mode and keeps it on the shelf, and the child plays it from
       there. The price is what MAKING one costs — hearing a kept one costs
       nothing, which is the point of the shelf and is said on the page. */
    ready: true,
    says: ['kids.priceStory', 'A story read out loud, eight pages with a picture each'],
  },
];

export function priceOf(thing: KidThing): number {
  const found = KID_PRICES.find((one) => one.id === thing);
  /* Not a fallback to zero. A zero here would be a free button, and a free
     button is a child pressing it forty times. */
  if (!found) throw new Error(`no price for ${thing}`);
  return found.credits;
}

/** How many of a thing an allowance buys. Floored, because half a song is not one. */
export function howMany(allowance: number, thing: KidThing): number {
  return Math.floor(Math.max(0, allowance) / priceOf(thing));
}

/**
 * The allowances the page offers, in songs.
 *
 * Derived from the price of one song so the steps stay whole songs when that
 * price moves. One, two, four and eight — doubling rather than stepping,
 * because a parent choosing between twelve numbers chooses none of them.
 */
export const ALLOWANCE_STEPS: readonly number[] = [1, 2, 4, 8].map(
  (songs) => songs * priceOf('song'),
);

/** The most a parent can hand over in one go. The last step, not a new number. */
export const ALLOWANCE_MAX = ALLOWANCE_STEPS[ALLOWANCE_STEPS.length - 1];

/**
 * Is this a number a parent could have chosen?
 *
 * The server asks this before it writes an allowance down. Anything between
 * nothing and the largest step, so a parent typing their own number is fine
 * and a request asking for ten thousand is not.
 */
export function sane(allowance: number): boolean {
  return Number.isInteger(allowance) && allowance >= 0 && allowance <= ALLOWANCE_MAX;
}

/**
 * How long one sitting may last, in minutes.
 *
 * Carli, 10 October 2026: *"Dan moet die ouers die budget en screen time kan
 * stel. Wanneer screen time op is moet dit die kind uitskop."*
 *
 * Four steps, like the allowance above, and for the same reason: a parent
 * choosing between twelve numbers chooses none of them. Fifteen minutes is a
 * car journey, half an hour is the usual answer, an hour is a rainy Saturday,
 * and two hours is a parent who means "until I say so".
 *
 * `MINUTES_NONE` is a budget with no clock on it, which is a perfectly
 * reasonable thing to want and is also every room opened before today. It is
 * null rather than zero because a zero would have to mean either "no limit"
 * or "no time", and a number that can be read either way is a number
 * somebody will read the wrong one of.
 */
export const MINUTE_STEPS: readonly number[] = [15, 30, 60, 120];
export const MINUTES_NONE = null;

/** The shortest and longest a sitting may be. Held by the table as well. */
export const MINUTES_LEAST = 5;
export const MINUTES_MOST = 240;

/**
 * Is this a length of sitting a parent could have chosen?
 *
 * `null` passes, because no clock is an answer. The range matches the
 * `check` on the column exactly — the page offering the steps, the route
 * accepting them and the table storing them cannot disagree about what is
 * allowed, which is the whole reason this lives here and not in three
 * places.
 */
export function saneMinutes(minutes: unknown): boolean {
  if (minutes === null || minutes === undefined) return true;
  return Number.isInteger(minutes)
    && (minutes as number) >= MINUTES_LEAST
    && (minutes as number) <= MINUTES_MOST;
}

/** A countdown as a person reads it: `19:04`, or `0:08`. */
export function asClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

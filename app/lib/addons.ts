/**
 * What is sold on top of a plan.
 *
 * ── Why this is separate from `plans.ts` ─────────────────────────────────
 *
 * A tier decides how much somebody may make. An add-on decides whether a whole
 * room is theirs at all. They are priced differently, bought differently, and
 * cancel differently, and folding one into the other would mean a member on
 * the cheapest tier could never buy the marketing desk without also buying
 * capacity they did not ask for.
 *
 * ── The price is here and nowhere else ───────────────────────────────────
 *
 * The screen reads it from this file and the checkout reads it from this file,
 * so the number on the button and the number charged cannot drift. Nothing is
 * ever taken from the request: a page that can name its own price is a page
 * that will eventually be asked to.
 */

export interface AddOn {
  readonly id: string;
  /** Rand a month. */
  readonly rand: number;
  /**
   * What one charge buys, in days, where it is charged as a single month
   * rather than as a subscription.
   *
   * Thirty-one rather than thirty: a month bought on the 31st of January
   * should not run out before the 1st of March. Erring towards the buyer by a
   * day is cheaper than a support message about it.
   */
  readonly days: number;
}

/** The marketing desk: the market read, the week, and the queue. */
export const MARKETING = 'marketing';

export const ADDONS: readonly AddOn[] = [
  { id: MARKETING, rand: 199, days: 31 },
];

export function addonById(id: string): AddOn | null {
  return ADDONS.find((one) => one.id === id) ?? null;
}

/** What is behind the lock, as the sales screen lists it. Keys, not sentences —
 *  the words live in the dictionary so both languages say the same thing. */
export const MARKETING_INCLUDES = [
  'addon.has.read',
  'addon.has.buyers',
  'addon.has.angles',
  'addon.has.week',
  'addon.has.beyond',
  'addon.has.queue',
  'addon.has.calendar',
] as const;

/**
 * What a model call costs, and what the cache did or did not save.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * Carli, 19 September 2026, on finding the writing help had stopped:
 * *"Ek het nie geweet Copilot gaan betaald moet wees nie?"* Prompt caching
 * went in the same day, and `docs/MAANDELIKSE-KOSTE.md` recorded no saving
 * from it on purpose:
 *
 *   *"'n Kas wat nooit tref nie lyk presies soos een wat altyd tref, behalwe
 *    op die rekening."*
 *
 * That sentence is the whole design here. A cache that never hits is
 * indistinguishable from one that always does — no error, no warning — so
 * the saving may not be asserted, estimated or reasoned about. It has to be
 * read off calls that really happened.
 *
 * ── What it deliberately does not do ─────────────────────────────────────
 *
 * It does not compute a saving from an assumed hit rate. Every function
 * here takes the four token counts the model itself reported and nothing
 * else. Give it a day where nothing cached and it returns a saving of zero,
 * or a negative one, and that is the correct answer.
 *
 * ── The four rates ───────────────────────────────────────────────────────
 *
 * Anthropic's published rates for the model this app runs on, per million
 * tokens. A cache read is a tenth of a fresh read; a cache WRITE is a
 * quarter dearer than not caching at all, which is what makes this a bet
 * rather than a free win.
 *
 * Written down as the multipliers as well as the money, because the
 * multipliers are the part that has to stay true: if a rate is updated and
 * the ratio between them changes, `check:aikoste` says so rather than
 * quietly re-pricing a year of rows.
 */

import { RAND_PER_USD } from '../lib/plans';

/** The model every one of the eleven routes runs on. */
export const MODEL = 'claude-opus-5';

/** Dollars per million tokens, on `claude-opus-5`. */
export const USD_PER_MTOK = {
  /** A token the model has to read fresh. */
  input: 5,
  output: 25,
  /** A token read out of the cache: a tenth of fresh. */
  cacheRead: 0.5,
  /** A token written INTO the cache: a quarter dearer than fresh. */
  cacheWrite: 6.25,
} as const;

/** The two ratios the bet rests on, held apart from the money. */
export const CACHE_READ_SHARE = 0.1;
export const CACHE_WRITE_SHARE = 1.25;

/** Below this many tokens the model makes no cache entry, and says nothing. */
export const FLOOR_TOKENS = 512;

/** The four numbers every Anthropic response reports about itself. */
export interface Used {
  /** Tokens billed at the fresh input rate. */
  readonly input: number;
  readonly output: number;
  /** Tokens served out of an existing cache entry. */
  readonly cacheRead: number;
  /** Tokens written into a new cache entry, at the dearer rate. */
  readonly cacheWrite: number;
}

const rand = (tokens: number, usdPerMtok: number): number =>
  (tokens / 1_000_000) * usdPerMtok * RAND_PER_USD;

/** What this call actually cost, in rand. */
export function paid(used: Used): number {
  return (
    rand(used.input, USD_PER_MTOK.input)
    + rand(used.output, USD_PER_MTOK.output)
    + rand(used.cacheRead, USD_PER_MTOK.cacheRead)
    + rand(used.cacheWrite, USD_PER_MTOK.cacheWrite)
  );
}

/**
 * What the same call would have cost with no caching at all.
 *
 * Every token that was read from the cache, and every token that was
 * written to it, would have been an ordinary fresh input token instead.
 * That is the counterfactual, and it is the only honest one: the tokens
 * were sent either way, the cache only changes the rate they are billed at.
 */
export function wouldHavePaid(used: Used): number {
  return (
    rand(used.input + used.cacheRead + used.cacheWrite, USD_PER_MTOK.input)
    + rand(used.output, USD_PER_MTOK.output)
  );
}

/**
 * What the cache saved on this call. Negative when it cost money.
 *
 * It really can be negative and that is not a bug to clamp away: a call
 * that only wrote the entry and was never read from again paid 25% extra
 * for nothing. Clamping at zero would turn a day where the bet lost into a
 * day where it broke even, which is the direction that flatters us.
 */
export function saved(used: Used): number {
  return wouldHavePaid(used) - paid(used);
}

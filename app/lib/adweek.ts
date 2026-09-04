/**
 * Which days of the week actually worked, read off their own report.
 *
 * ── Why this exists, and what it is worth against ────────────────────────
 *
 * A marketing plan that says "post on Tuesday at 6pm" is repeating a blog
 * post. Nobody knows the best time to post *your* thing; what is published on
 * the subject is an average over other people's accounts in other people's
 * categories, and the honest description of it is a starting guess.
 *
 * The only numbers that answer the question are theirs. `lib/adreport.ts`
 * already imports the platform's own CSV export, and those exports are very
 * often broken down by day — that is the default shape of a Meta or Google
 * report. So the day is already in the file; it was just never read.
 *
 * This reads it, and where there is enough of it, the plan stops guessing and
 * says what their own spend actually did.
 *
 * ── The date, which is the hard part ─────────────────────────────────────
 *
 * `adreport.ts` deliberately kept `when` as the export wrote it, with the note
 * "the formats are not worth guessing". That was right about a single value
 * and wrong about a column: `01/02/2026` alone is either the first of February
 * or the second of January and nothing can tell you which, but a *column* that
 * contains `13/02/2026` anywhere in it has answered the question for every
 * other row in it.
 *
 * So the order is decided once, across the whole column, and a column that
 * never resolves is refused rather than guessed. Reading a month of results
 * off by a day for every row would move the recommendation to the wrong day of
 * the week, which is worse than having no recommendation — the whole point of
 * this file is to replace a guess with a fact.
 */

import type { Result } from './adreport';

/** Which way round a numeric date is written. */
export type Order = 'ymd' | 'dmy' | 'mdy';

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * The first date in a cell, as its three numbers, or a month name resolved.
 *
 * Exports put ranges in one cell — "2026-06-01 - 2026-06-07" is what Meta
 * writes for a week — and the first date is the one the row belongs to.
 * Anything after it is ignored rather than refused.
 */
function partsOf(value: string): { a: number; b: number; c: number; named: boolean } | null {
  const text = (value ?? '').trim();
  if (!text) return null;

  /* A month name settles the order by itself, in either arrangement, so it
     never needs the column's help. "1 Jun 2026" and "Jun 1, 2026" both land
     here and both come out unambiguous. */
  const named = /(\d{1,2})[\s.,-]+([a-z]{3,})[\s.,-]+(\d{4})|([a-z]{3,})[\s.,-]+(\d{1,2})[\s.,-]+(\d{4})/i.exec(text);
  if (named) {
    const day = Number(named[1] ?? named[5]);
    const word = (named[2] ?? named[4] ?? '').slice(0, 3).toLowerCase();
    const year = Number(named[3] ?? named[6]);
    const month = MONTHS[word];
    if (month === undefined || !Number.isFinite(day) || !Number.isFinite(year)) return null;
    return { a: year, b: month + 1, c: day, named: true };
  }

  const numeric = /(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})/.exec(text);
  if (!numeric) return null;
  const [, one, two, three] = numeric;
  return { a: Number(one), b: Number(two), c: Number(three), named: false };
}

function sane(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

/**
 * Which way round this column is written, decided across all of it at once.
 *
 * `null` means it could not be settled, and the caller must not fall back to a
 * default: a column of `01/02`, `03/04`, `05/06` is genuinely unanswerable and
 * picking one gives half a month of wrong weekdays with no sign that anything
 * went wrong.
 */
export function orderOf(values: readonly string[]): Order | null {
  let sawFourFirst = false;
  let sawTwoDigitFirst = false;
  let firstOverTwelve = false;
  let secondOverTwelve = false;
  let any = false;

  for (const value of values) {
    const parts = partsOf(value);
    if (!parts) continue;
    // A month name has already answered it and says nothing about the rest.
    if (parts.named) continue;
    any = true;
    if (parts.a > 31) {
      sawFourFirst = true;
      continue;
    }
    sawTwoDigitFirst = true;
    if (parts.a > 12) firstOverTwelve = true;
    if (parts.b > 12) secondOverTwelve = true;
  }

  if (!any) return null;
  /* Two shapes in one column is a file somebody has edited by hand, and
     deciding one order for it would be wrong for half the rows. */
  if (sawFourFirst && sawTwoDigitFirst) return null;
  if (sawFourFirst) return 'ymd';
  /* Both over twelve in the same column cannot both be true. Rather than pick
     the more common one, refuse: it means the file is not what it claims. */
  if (firstOverTwelve && secondOverTwelve) return null;
  if (firstOverTwelve) return 'dmy';
  if (secondOverTwelve) return 'mdy';
  return null;
}

/** One cell as a date, given what the column turned out to be. */
export function dateOf(value: string, order: Order): Date | null {
  const parts = partsOf(value);
  if (!parts) return null;

  let year: number;
  let month: number;
  let day: number;
  if (parts.named) {
    // Already resolved on the way in: a, b, c are year, month, day.
    year = parts.a;
    month = parts.b;
    day = parts.c;
  } else if (order === 'ymd') {
    [year, month, day] = [parts.a, parts.b, parts.c];
  } else if (order === 'dmy') {
    [day, month, year] = [parts.a, parts.b, parts.c];
  } else {
    [month, day, year] = [parts.a, parts.b, parts.c];
  }

  if (!sane(year, month, day)) return null;
  /* UTC, so a machine in Johannesburg and one in Cape Town read the same file
     the same way. The exports carry a date and no time, so there is no local
     moment to be faithful to — only a day to be counted consistently. */
  const made = new Date(Date.UTC(year, month - 1, day));
  // Rejects the 31st of February, which the constructor would roll forward.
  return made.getUTCMonth() === month - 1 && made.getUTCDate() === day ? made : null;
}

export interface DayLine {
  /** 0 is Sunday, matching `Date.getUTCDay()`. */
  readonly day: number;
  /** How many rows landed on this weekday. The sample, so it can be judged. */
  readonly rows: number;
  readonly spentCents: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly results: number;
}

export interface Week {
  readonly order: Order | null;
  /** Always seven, in week order, so a screen never has to fill in a gap. */
  readonly days: readonly DayLine[];
  /** Rows whose date could not be read, so the screen can say how many. */
  readonly unread: number;
}

export function byWeekday(rows: readonly Result[]): Week {
  const order = orderOf(rows.map((one) => one.when ?? ''));
  const days: DayLine[] = Array.from({ length: 7 }, (_, day) => ({
    day, rows: 0, spentCents: 0, impressions: 0, clicks: 0, results: 0,
  }));
  let unread = 0;

  if (!order) return { order: null, days, unread: rows.length };

  for (const row of rows) {
    const at = dateOf(row.when ?? '', order);
    if (!at) {
      unread += 1;
      continue;
    }
    const line = days[at.getUTCDay()];
    days[at.getUTCDay()] = {
      day: line.day,
      rows: line.rows + 1,
      spentCents: line.spentCents + row.spentCents,
      impressions: line.impressions + row.impressions,
      clicks: line.clicks + row.clicks,
      results: line.results + row.results,
    };
  }

  return { order, days, unread };
}

/**
 * Every weekday needs this many rows before any of them is judged.
 *
 * Three weeks. Two Tuesdays beating two Wednesdays is a coin landing the same
 * way twice, and a plan built on it would send somebody's whole month at the
 * wrong day. This is the number that decides whether the plan says "your own
 * numbers say" or goes on saying "a starting point".
 */
export const LEAST_PER_DAY = 3;

/** How much better than the average a day has to be before it is called out. */
const MARGIN = 0.2;

export interface Standout {
  /** Cost per result where there are results to divide by, clicks otherwise. */
  readonly measure: 'cpr' | 'ctr';
  /** Weekdays doing meaningfully better than this account's own average. */
  readonly better: readonly number[];
  /** And meaningfully worse. Worth as much: it is where the money goes. */
  readonly worse: readonly number[];
}

/**
 * Which days stand out, if the file is big enough to say — and `null` if not.
 *
 * `null` is the common answer for somebody who has just started, and it is the
 * right one. The screen then keeps the model's starting plan and says plainly
 * that it is a starting plan.
 */
export function standoutDays(week: Week): Standout | null {
  const seen = week.days.filter((one) => one.rows > 0);
  if (seen.length < 7 || seen.some((one) => one.rows < LEAST_PER_DAY)) return null;

  /* Cost per result is the number that decides a budget, so it wins where the
     export carries results at all. Plenty do not — a brand campaign has clicks
     and no conversions — and there the click-through rate is the honest second
     best rather than nothing. */
  const anyResults = week.days.reduce((sum, one) => sum + one.results, 0) > 0;
  const measure: 'cpr' | 'ctr' = anyResults ? 'cpr' : 'ctr';

  const scoreOf = (one: DayLine): number | null => {
    if (measure === 'cpr') return one.results > 0 ? one.spentCents / one.results : null;
    return one.impressions > 0 ? one.clicks / one.impressions : null;
  };

  const scored = week.days
    .map((one) => ({ day: one.day, score: scoreOf(one) }))
    .filter((one): one is { day: number; score: number } => one.score !== null);
  if (scored.length < 7) return null;

  const average = scored.reduce((sum, one) => sum + one.score, 0) / scored.length;
  if (!(average > 0)) return null;

  /* Cheaper is better for a cost, higher is better for a rate. One comparison
     written once, because getting it backwards would recommend exactly the
     wrong days and read entirely plausibly. */
  const better: number[] = [];
  const worse: number[] = [];
  for (const one of scored) {
    const ratio = one.score / average;
    const good = measure === 'cpr' ? ratio <= 1 - MARGIN : ratio >= 1 + MARGIN;
    const bad = measure === 'cpr' ? ratio >= 1 + MARGIN : ratio <= 1 - MARGIN;
    if (good) better.push(one.day);
    if (bad) worse.push(one.day);
  }

  // Every day average is a real and useful answer: post whenever you like.
  return { measure, better, worse };
}

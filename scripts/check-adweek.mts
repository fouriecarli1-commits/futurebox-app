/**
 * Reading the day off somebody's own ad export.
 *
 * The plan's whole claim to being worth money is that it stops guessing once
 * their own numbers can answer. Two ways that goes wrong, and both are silent:
 *
 *   · the date column is read the wrong way round, so a month of results is
 *     filed under the wrong weekday and the plan confidently recommends the
 *     wrong day;
 *   · a handful of rows is treated as evidence, so the plan says "your numbers
 *     say Tuesday" on the strength of two Tuesdays.
 *
 * Neither produces an error. Both produce a plausible screen. So most of what
 * follows is about refusing: the shapes that must come back `null`.
 */

import {
  orderOf,
  dateOf,
  byWeekday,
  standoutDays,
  LEAST_PER_DAY,
  type Order,
} from '../app/lib/adweek.ts';
import type { Result } from '../app/lib/adreport.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  if (!ok) {
    bad += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const day = (at: Date | null): number | null => (at ? at.getUTCDay() : null);

// ── Which way round the column is ────────────────────────────────────────
check('a four-digit year in front is ISO and needs no help',
  orderOf(['2026-06-01', '2026-06-02']) === 'ymd', String(orderOf(['2026-06-01'])));

check('a day over twelve anywhere settles the whole column as day-first',
  orderOf(['01/02/2026', '13/02/2026', '05/03/2026']) === 'dmy',
  String(orderOf(['01/02/2026', '13/02/2026'])));

check('and a middle number over twelve settles it as month-first',
  orderOf(['01/02/2026', '02/13/2026']) === 'mdy',
  String(orderOf(['01/02/2026', '02/13/2026'])));

/* The one that matters. Nothing in this column can tell you which way round it
   is, and picking one gives a month of wrong weekdays with nothing on screen
   to say so. */
check('a column that never resolves is refused, not guessed',
  orderOf(['01/02/2026', '03/04/2026', '05/06/2026']) === null,
  String(orderOf(['01/02/2026', '03/04/2026', '05/06/2026'])));

check('a column claiming both is refused',
  orderOf(['13/02/2026', '02/13/2026']) === null,
  String(orderOf(['13/02/2026', '02/13/2026'])));

check('two different shapes in one column is a hand-edited file, so refused',
  orderOf(['2026-06-01', '13/02/2026']) === null,
  String(orderOf(['2026-06-01', '13/02/2026'])));

check('an empty column resolves to nothing', orderOf(['', '  ', 'total']) === null);

// Month names answer for themselves and say nothing about the numeric rows.
check('a column of month names needs no order and gives none',
  orderOf(['1 Jun 2026', 'Jun 3, 2026']) === null,
  String(orderOf(['1 Jun 2026', 'Jun 3, 2026'])));

// ── One cell, once the order is known ────────────────────────────────────
check('an ISO date lands on the right weekday',
  // 1 June 2026 is a Monday.
  day(dateOf('2026-06-01', 'ymd')) === 1, String(day(dateOf('2026-06-01', 'ymd'))));

check('the same numbers read day-first land on a different day',
  day(dateOf('01/06/2026', 'dmy')) === 1, String(day(dateOf('01/06/2026', 'dmy'))));
check('and month-first on another again',
  // 6 January 2026 is a Tuesday; 1 June is a Monday. Different, as it must be.
  day(dateOf('01/06/2026', 'mdy')) === 2, String(day(dateOf('01/06/2026', 'mdy'))));

check('a range takes the day it starts on',
  day(dateOf('2026-06-01 - 2026-06-07', 'ymd')) === 1,
  String(day(dateOf('2026-06-01 - 2026-06-07', 'ymd'))));

check('a written month is read either way round',
  day(dateOf('1 Jun 2026', 'mdy')) === 1 && day(dateOf('Jun 1, 2026', 'dmy')) === 1,
  `${day(dateOf('1 Jun 2026', 'mdy'))} and ${day(dateOf('Jun 1, 2026', 'dmy'))}`);
check('and a written month ignores the column order entirely',
  day(dateOf('June 1, 2026', 'ymd')) === 1, String(day(dateOf('June 1, 2026', 'ymd'))));

check('the thirty-first of February is not rolled forward into March',
  dateOf('2026-02-31', 'ymd') === null, String(dateOf('2026-02-31', 'ymd')));
check('a thirteenth month is refused', dateOf('2026-13-01', 'ymd') === null);
check('a year from another century is refused', dateOf('1026-06-01', 'ymd') === null);
check('a cell with no date in it is refused', dateOf('Total', 'ymd') === null);
check('and neither is an empty one', dateOf('', 'ymd') === null);

// ── Adding it up ─────────────────────────────────────────────────────────
function row(when: string, over: Partial<Result> = {}): Result {
  return {
    campaign: 'one', spentCents: 1000, impressions: 1000, clicks: 10, results: 1, when, ...over,
  };
}

{
  const week = byWeekday([row('2026-06-01'), row('2026-06-01'), row('2026-06-02')]);
  check('rows are counted onto their weekday',
    week.days[1].rows === 2 && week.days[2].rows === 1,
    `Mon ${week.days[1].rows}, Tue ${week.days[2].rows}`);
  check('and the money with them', week.days[1].spentCents === 2000, String(week.days[1].spentCents));
  check('all seven days are always there', week.days.length === 7, String(week.days.length));
  check('the order it settled on is reported', week.order === 'ymd', String(week.order));
}

{
  // A column that will not resolve: nothing is counted and every row is unread.
  const week = byWeekday([row('01/02/2026'), row('03/04/2026')]);
  check('an unreadable column counts nothing rather than guessing',
    week.days.every((one) => one.rows === 0), 'some rows were counted');
  check('and says how many it could not read', week.unread === 2, String(week.unread));
  check('so no day can stand out', standoutDays(week) === null);
}

{
  // Readable column, one bad cell in it.
  const week = byWeekday([row('2026-06-01'), row('Total'), row('2026-06-02')]);
  check('a total row inside a readable column is counted as unread, not as a day',
    week.unread === 1 && week.days[1].rows === 1,
    `unread ${week.unread}, Mon ${week.days[1].rows}`);
}

// ── What it takes before a day is called out ─────────────────────────────
/**
 * Whole weeks of rows, with per-weekday overrides.
 *
 * Keyed by weekday rather than by position in the array. The first version
 * indexed the array and set "every seventh row" — which starts on a Monday, so
 * index 5 is a Saturday, and the test then asserted the wrong day about
 * perfectly correct code. That is precisely the confusion this whole file
 * exists to catch, and it caught the test first.
 */
function weeks(count: number, per: Record<number, Partial<Result>> = {}): Result[] {
  const out: Result[] = [];
  // 2026-06-01 is a Monday, so a run of 7n days from here is whole weeks.
  for (let n = 0; n < count * 7; n += 1) {
    const at = new Date(Date.UTC(2026, 5, 1 + n));
    out.push(row(at.toISOString().slice(0, 10), per[at.getUTCDay()] ?? {}));
  }
  return out;
}

/** Half the usual cost per result, which is what a good day looks like. */
const CHEAP: Partial<Result> = { spentCents: 500 };

check(`two weeks is not enough to judge a day (the floor is ${LEAST_PER_DAY})`,
  standoutDays(byWeekday(weeks(2, { 3: CHEAP }))) === null,
  JSON.stringify(standoutDays(byWeekday(weeks(2, { 3: CHEAP })))));

{
  const said = standoutDays(byWeekday(weeks(3, { 3: CHEAP })));
  check('three weeks is', said !== null);
  check('and it names the cheap day', said?.better.join(',') === '3', said?.better.join(','));
  check('by cost per result, since the export has results', said?.measure === 'cpr', said?.measure);
  check('and calls nothing else better', said?.better.length === 1, String(said?.better.length));
}

{
  /* The dear days named as well as the cheap ones, because that is where the
     money is going and it is the more actionable half. Two weekdays at three
     times the cost of the other five: the average lands between them and both
     ends clear the margin. */
  const dear: Partial<Result> = { spentCents: 3000 };
  const said = standoutDays(byWeekday(weeks(4, { 0: dear, 6: dear })));
  check('the days that cost too much are named too',
    said?.worse.join(',') === '0,6', JSON.stringify(said?.worse));
  check('and the ordinary ones are called better against them',
    (said?.better.length ?? 0) === 5, JSON.stringify(said?.better));
}

{
  // One cheap day among six ordinary ones moves the average by a ninth, which
  // is under the margin — so the six are not called dear. Being unexcited
  // about an eleven per cent difference is the whole point of the margin.
  const said = standoutDays(byWeekday(weeks(4, { 6: { spentCents: 300 } })));
  check('one good day does not make the other six bad',
    said?.worse.length === 0, JSON.stringify(said?.worse));
  check('but the good one is still named', said?.better.join(',') === '6', JSON.stringify(said?.better));
}

{
  // Every day the same: a real answer, and not a recommendation.
  const said = standoutDays(byWeekday(weeks(4)));
  check('a flat month names no better day and no worse one',
    said !== null && said.better.length === 0 && said.worse.length === 0,
    JSON.stringify(said));
}

{
  // No conversions anywhere: fall back to the click-through rate rather than
  // going quiet, because a brand campaign is a real thing with no results in it.
  const rows = weeks(3, { 5: { clicks: 80 } }).map((one) => ({ ...one, results: 0 }));
  const said = standoutDays(byWeekday(rows));
  check('with no results anywhere it judges on clicks instead',
    said?.measure === 'ctr', said?.measure);
  check('and finds the Friday that got them', said?.better.join(',') === '5',
    JSON.stringify(said?.better));
}

// ── The order is decided once, and used for everything ───────────────────
{
  /* The whole reason `orderOf` looks at the column: this file is day-first,
     and only one row in it says so. Read as month-first, every row lands on
     the wrong weekday and the plan recommends the wrong day with no sign that
     anything is wrong. */
  const rows = [row('01/06/2026'), row('02/06/2026'), row('13/06/2026')];
  const week = byWeekday(rows);
  check('one unambiguous row makes the rest of the column readable',
    week.order === 'dmy' && week.unread === 0, `${week.order}, unread ${week.unread}`);
  check('and they land where day-first puts them',
    week.days[1].rows === 1 && week.days[2].rows === 1 && week.days[6].rows === 1,
    week.days.map((one) => one.rows).join(','));
}

const ORDERS: Order[] = ['ymd', 'dmy', 'mdy'];
check('every order reads its own writing back',
  ORDERS.every((order) => dateOf(
    order === 'ymd' ? '2026-06-09' : order === 'dmy' ? '09/06/2026' : '06/09/2026',
    order,
  )?.getUTCDate() === 9));

if (bad) {
  console.error(`\ncheck:adweek — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:adweek — the day is read off the file, or not claimed at all.');

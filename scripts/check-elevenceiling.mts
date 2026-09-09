/**
 * The brake on what ElevenLabs costs, and the four ways it could be no brake.
 *
 * ── Why this became urgent ───────────────────────────────────────────────
 *
 * There has been a warning email since #116, at 75%, 90% and 98%. A warning
 * says the money is already going.
 *
 * ElevenLabs' support, 9 September 2026, settled what happens after that:
 * top-up credits cost $0.000165 each and **Auto Top Up can be switched on**.
 * That inverts the failure. Without it the service dies when the plan runs
 * out — loud, and free. With it the service never dies: it keeps buying, at
 * about R3,08 a thousand credits, until somebody reads an invoice.
 *
 * Carli, the same day: "Ek gaan eers net krediete top up totdat ek 'n beter
 * begrip het hoeveel mense ons produk gebruik." Which is the right way to run
 * it, and is only safe with a number on this side that stops the app first.
 *
 * ── The four ways a brake is not a brake ─────────────────────────────────
 *
 * 1. **A default that authorises spending.** Unset, the ceiling has to be the
 *    plan's own 600,000 — not one credit of top-up — or an install nobody
 *    configured is an install quietly buying credits.
 * 2. **Reading zero when it cannot read.** A failed count that returns 0 opens
 *    the brake completely at the exact moment the database is unwell.
 * 3. **Asking after the charge.** Somebody stopped by a ceiling they cannot
 *    see must not also have paid for the turn.
 * 4. **Not being wired into the route that spends.** A module that is correct
 *    and imported by nothing is the most convincing kind of no brake.
 *
 *   npm run check:elevenceiling
 */
import { readFileSync } from 'node:fs';
import {
  PLAN_CREDITS, RAND_PER_USD, USD_PER_CREDIT, enough, forgetSpend, leftCredits,
  monthlyCredits, randOver, usedCredits,
} from '../app/lib/server/elevenceiling';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── 1. Safe with nothing set ──────────────────────────────────────────── */
delete process.env.ELEVEN_MONTHLY_CREDITS;
ok('unset, the ceiling is the plan and nothing more', monthlyCredits() === PLAN_CREDITS,
  String(monthlyCredits()));
ok('and that authorises no top-up at all', randOver() === 0, `R${randOver().toFixed(2)}`);
ok('the plan figure is ElevenLabs\' own', PLAN_CREDITS === 600_000, String(PLAN_CREDITS));
ok('and so is the per-credit rate', USD_PER_CREDIT === 0.000165, String(USD_PER_CREDIT));

/* Nonsense is the same as nothing, rather than nothing being the same as
   unlimited — the direction that matters. */
for (const silly of ['0', '-1', 'lots', '', 'NaN']) {
  process.env.ELEVEN_MONTHLY_CREDITS = silly;
  ok(`"${silly}" falls back to the plan`, monthlyCredits() === PLAN_CREDITS, String(monthlyCredits()));
}

/* ── 2. Raising it is authorising money, and it says how much ──────────── */
process.env.ELEVEN_MONTHLY_CREDITS = '1200000';
ok('a raised ceiling is taken', monthlyCredits() === 1_200_000, String(monthlyCredits()));
const expected = 600_000 * USD_PER_CREDIT * RAND_PER_USD;
ok('and it says what the extra costs in rand', Math.abs(randOver() - expected) < 0.01,
  `R${randOver().toFixed(2)} vs R${expected.toFixed(2)}`);
/* Six hundred thousand extra credits is $99, which is about R1 851 — the same
   as a second Pro plan, which is the point: this knob is real money. */
ok('and that is about nineteen hundred rand', randOver() > 1_800 && randOver() < 1_900,
  `R${randOver().toFixed(2)}`);

/* ── 3. With no database there is nobody to protect ────────────────────── */
delete process.env.ELEVEN_MONTHLY_CREDITS;
forgetSpend();
ok('an install with no database counts nothing', (await usedCredits()) === 0);
ok('and therefore has its whole ceiling left', (await leftCredits()) === PLAN_CREDITS,
  String(await leftCredits()));
ok('and lets an ordinary song through', (await enough(1_800)) === null);
/* A song longer than the entire month's ceiling is refused even so — the
   arithmetic is what refuses, not the database. */
const huge = await enough(PLAN_CREDITS + 1);
ok('but refuses one bigger than the whole month', huge !== null);
ok('and the refusal says how much is left', huge !== null && huge.left === PLAN_CREDITS,
  String(huge?.left));
ok('and reads as a sentence, not a code',
  Boolean(huge && /allowance/.test(huge.message) && huge.message.length > 40), huge?.message);

/* A request for nothing is never a reason to refuse. */
ok('a zero-length ask is always allowed', (await enough(0)) === null);
ok('and so is a nonsense one', (await enough(Number.NaN)) === null);

/* ── 4. Wired in, and before the charge ────────────────────────────────── */
const route = readFileSync('app/api/music/route.ts', 'utf8');
ok('the route that spends asks the brake', /enoughAllowance\(/.test(route));
const askedAt = route.indexOf('await enoughAllowance(');
const chargedAt = route.indexOf('await charge(');
ok('and asks before it charges', askedAt > 0 && chargedAt > 0 && askedAt < chargedAt,
  `asked at ${askedAt}, charged at ${chargedAt}`);
/* A refusal must not look like a failed generation: 429 is the same status
   the Kits minutes brake uses, and the client already knows it. */
ok('and refuses with 429 rather than an error', /status: 429/.test(route.slice(askedAt, chargedAt)));

/* ── The count reads their number, not ours ────────────────────────────── */
const sql = readFileSync('supabase/elevenrem.sql', 'utf8');
ok('the month is counted off ElevenLabs\' own charge', /sum\(characters\)/.test(sql));
ok('over the calendar month in UTC', /date_trunc\('month', now\(\) at time zone 'utc'\)/.test(sql));
/* Read by the server key alone. A member who could call this could learn how
   close the whole business is to its ceiling. */
ok('and only the service role may call it', /grant execute on function public\.eleven_credits_this_month\(\) to service_role/.test(sql));
ok('after it is taken away from everybody else',
  /revoke all on function public\.eleven_credits_this_month\(\) from public, anon, authenticated/.test(sql));

/* ── And a failed read does not open the gate ──────────────────────────── */
const module_ = readFileSync('app/lib/server/elevenceiling.ts', 'utf8');
ok('a failed count keeps the last figure rather than reading zero',
  /if \(error\) return cached\.credits;/.test(module_));

console.log(
  failures
    ? `\ncheck:elevenceiling — ${failures} assertion(s) failed.`
    : '\ncheck:elevenceiling — safe unset, priced when raised, asked before the charge.',
);
process.exit(failures ? 1 : 0);

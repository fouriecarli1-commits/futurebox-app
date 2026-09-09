/**
 * The ElevenLabs prices, kept true to the page they were read off.
 *
 * ── Why this is worth a check ────────────────────────────────────────────
 *
 * Until 8 September 2026 `costs-eleven.mts` opened with "ONGEVERIFIEER" and a
 * set of numbers nobody had checked, and every profit figure in
 * `docs/KOSTE-EN-WINS.md` rested on them. They were about 85% too generous. A
 * price list that has been verified once and then drifts is the same failure
 * with a date on it.
 *
 * ── What is asserted ─────────────────────────────────────────────────────
 *
 * Two things, and the second is the interesting one.
 *
 * **The generator and the document agree.** The minutes each plan includes
 * are written in `docs/ELEVENLABS-PRYSE.md` for a person to read and in
 * `scripts/costs-eleven.mts` for the sums to use. Two copies of a number is
 * one copy too many unless something holds them together.
 *
 * **The arithmetic that makes the whole model simple still holds.** A plan's
 * included minutes times the price of a minute comes back to the plan's own
 * monthly price — which is what says a plan is a dollar budget rather than a
 * set of separate allowances, and that claim is the reason a song can be
 * priced at all. If ElevenLabs ever breaks it, this is where it shows.
 */
import { readFileSync } from 'node:fs';

const page = readFileSync('docs/ELEVENLABS-PRYSE.md', 'utf8');
const generator = readFileSync('scripts/costs-eleven.mts', 'utf8');

let failures = 0;
const ok = (label: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${label}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** What the page says a minute of music costs. */
const perMinute = /Musiek kos \*\*\$([\d,]+) per minuut\*\*/.exec(page);
const musicUsd = perMinute ? Number(perMinute[1].replace(',', '.')) : null;
ok('the page says what a minute of music costs', musicUsd !== null, 'the rate is the whole model');

/**
 * The plans, as the generator uses them.
 *
 * Two shapes, and the second one broke this. It read only
 * `credits: 147 * 900` — minutes times the credits-per-minute rate — which is
 * how every plan was written when this was first put together. ElevenLabs'
 * support then gave their own credit counts on 9 September 2026, so Pro,
 * Scale and Business became `credits: 600_000` and the pattern matched one
 * plan out of four. It failed rather than passing wrongly, which is the good
 * direction, but for a whole release it was testing Creator alone.
 *
 * Both shapes now, and minutes are derived either way rather than read off a
 * factor that may not be there.
 */
const CREDITS_A_MINUTE = 900;
const plans = [...generator.matchAll(/\{ name: '(\w+)', usd: (\d+), credits: ([\d_]+)(?: \* ([\d_]+))? \}/g)].map(
  (one) => {
    const figure = Number(one[3].replace(/_/g, ''));
    const times = one[4] ? Number(one[4].replace(/_/g, '')) : 1;
    return {
      name: one[1],
      usd: Number(one[2]),
      credits: figure * times,
      minutes: Math.round((figure * times) / CREDITS_A_MINUTE),
    };
  },
);
ok('the generator prices four plans', plans.length === 4, `${plans.length} found`);

/** And the same minutes, in the table a person reads. */
const table = page.slice(page.indexOf('| Plan | Minute musiek ingesluit |'), page.indexOf('Vermenigvuldig'));
for (const plan of plans) {
  const written = new RegExp(`\\|\\s*${plan.name}\\s*\\|\\s*([\\d\\s]+)\\s*\\|`).exec(table);
  const said = written ? Number(written[1].replace(/\s/g, '')) : null;
  ok(
    `${plan.name}'s minutes are the same in the document and in the sums`,
    said === plan.minutes,
    `the page says ${said}, the generator uses ${plan.minutes}`,
  );
}

/* ── The claim the whole model rests on ─────────────────────────────────── */

/* Proportionally, not within a fixed dollar.

   The page quotes $0.15 a minute. The real rate is $0.1485 — 900 credits at
   ElevenLabs' own $0.000165 — so every one of these sums is about 1% high,
   and 1% of Business is ten dollars where 1% of Creator is twenty cents. A
   fixed one-dollar tolerance therefore passed the small plans and failed the
   large one for no reason but their size. Two percent covers the rounding on
   every plan and still catches a price that is actually wrong.

   The old Scale exception is gone with it. It said 1 993 x $0.15 = $299
   against a $330 plan, and took $330 as the safe reading. ElevenLabs settled
   it on 9 September 2026: Scale is $299. */
const TOLERANCE = 0.02;
for (const plan of plans) {
  if (musicUsd === null) break;
  const budget = plan.minutes * musicUsd;
  ok(
    `${plan.name}'s minutes times the rate come back to its own price`,
    Math.abs(budget - plan.usd) <= plan.usd * TOLERANCE,
    `${plan.minutes} x ${musicUsd} = ${budget.toFixed(2)}, the plan is $${plan.usd}`,
  );
}

/* ── The finding that replaced the exception ────────────────────────────── */

/* Pro and Business are the same price per credit, exactly. That is the whole
   answer to "should we upgrade": there is nothing to buy by upgrading except
   seats, and a cost model resting on a volume discount rests on nothing. */
const perCredit = (plan: { usd: number; credits: number }): number => plan.usd / plan.credits;
const pro = plans.find((one) => one.name === 'Pro');
const business = plans.find((one) => one.name === 'Business');
ok('Pro and Business cost exactly the same per credit',
  !!pro && !!business && Math.abs(perCredit(pro) - perCredit(business)) < 1e-9,
  pro && business ? `${perCredit(pro)} against ${perCredit(business)}` : 'a plan is missing');
ok('and that is the same rate a top-up is bought at',
  !!pro && Math.abs(perCredit(pro) - 0.000165) < 1e-9,
  pro ? String(perCredit(pro)) : 'Pro is missing');
ok('the page says there is no volume discount, rather than leaving it to be worked out',
  /geen volume-afslag/.test(page));
ok('and it names the exact rate the $0,15 is a rounding of',
  page.includes('$0,1485'), 'a rounded rate that is not said to be rounded is a wrong rate');

/* ── And the number a song actually costs ───────────────────────────────── */

const songMinutes = Number(/const SONG_MINUTES = (\d+)/.exec(generator)?.[1] ?? 0);
ok('a song is still two minutes', songMinutes === 2, `${songMinutes}`);
if (musicUsd !== null && songMinutes) {
  const rand = songMinutes * musicUsd * 16;
  ok(
    'and the page quotes what that costs in rand',
    page.includes(rand.toFixed(2).replace('.', ',')),
    `${songMinutes} x $${musicUsd} x R16 = R${rand.toFixed(2)}`,
  );
  ok(
    'the old assumed figure is named, not quietly replaced',
    page.includes('R2,59'),
    'a number that moved 85% deserves to be shown moving',
  );
}

if (failures > 0) {
  console.log(`\ncheck:elevenprices — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:elevenprices — the price list, the sums and the arithmetic that joins them all agree.');
}

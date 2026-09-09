/**
 * ElevenLabs' three rates, and the conclusion that rests on them.
 *
 * ── What their support said, 9 September 2026 ────────────────────────────
 *
 * Carli asked what happens when the credits run out. The reply settled the
 * biggest open number in the whole cost model:
 *
 *   Pro       $99/month    600,000 credits
 *   Scale     $299/month   1,800,000 credits   3 seats
 *   Business  $990/month   6,000,000 credits   10 seats
 *   Top-up    $0.000165 per credit, minimum $5, expires after 12 months
 *
 * $99 / 600,000 is $0.000165. $990 / 6,000,000 is $0.000165. **The top-up
 * rate and the plan rate are the same number**, so there is no volume
 * discount: upgrading to Business buys $891 of credits for $891, plus nine
 * workspace seats.
 *
 * ── Why that is worth a check of its own ─────────────────────────────────
 *
 * Because `scripts/costs-eleven.mts` used to conclude that Business was the
 * only plan that could ever make a profit, on the grounds that every smaller
 * plan hit a ceiling below break-even. That reasoning was sound and its
 * premise was wrong: a plan is a prepayment, not a ceiling, and above it the
 * margin per member does not change at all.
 *
 * The new conclusion — stay on the cheapest plan that covers the seats — is
 * true only while the three rates stay equal. The day ElevenLabs introduces a
 * real volume discount, or raises the top-up rate above the plan rate, that
 * advice reverses. This is the file that notices.
 *
 *   npm run check:elevenplans
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** What their support wrote, kept here as the thing the model is checked against. */
const QUOTED = {
  payg: 0.000165,
  plans: [
    { name: 'Pro', usd: 99, credits: 600_000 },
    { name: 'Scale', usd: 299, credits: 1_800_000 },
    { name: 'Business', usd: 990, credits: 6_000_000 },
  ],
};

const model = readFileSync('scripts/costs-eleven.mts', 'utf8');

/* ── The model carries their numbers, not derived ones ─────────────────── */
for (const plan of QUOTED.plans) {
  const row = new RegExp(`name: '${plan.name}', usd: ${plan.usd}, credits: ${plan.credits.toLocaleString('en-US').replace(/,/g, '_')}`);
  ok(`the model has ${plan.name} at $${plan.usd} for ${plan.credits.toLocaleString('en-US')}`, row.test(model),
    'the model disagrees with what ElevenLabs support wrote');
}
ok('and the top-up rate is written down', model.includes(`PAYG_USD_PER_CREDIT = ${QUOTED.payg}`));

/* ── The rates ─────────────────────────────────────────────────────────── */
const rate = (plan: { usd: number; credits: number }) => plan.usd / plan.credits;
const pro = QUOTED.plans[0];
const scale = QUOTED.plans[1];
const business = QUOTED.plans[2];

ok('Pro costs exactly the top-up rate', Math.abs(rate(pro) - QUOTED.payg) < 1e-12,
  rate(pro).toFixed(9));
ok('and so does Business', Math.abs(rate(business) - QUOTED.payg) < 1e-12, rate(business).toFixed(9));
/* Scale is the one that is not. Named rather than smoothed over: it is 0.7%
   dearer per credit than either neighbour, which is a strange thing for a
   middle tier to be and is exactly what the model says. */
ok('Scale is dearer per credit than both its neighbours',
  rate(scale) > rate(pro) && rate(scale) > rate(business),
  `${rate(scale).toFixed(9)} vs ${rate(pro).toFixed(9)}`);
ok('but only slightly', rate(scale) / rate(pro) < 1.01, (rate(scale) / rate(pro)).toFixed(4));

/* ── What upgrading buys ───────────────────────────────────────────────── */
/* The number that makes the advice: the extra money buys exactly the extra
   credits at the same rate, so an upgrade is seats and nothing else. */
const extraUsd = business.usd - pro.usd;
const extraCredits = business.credits - pro.credits;
ok('upgrading to Business buys its extra credits at par',
  Math.abs(extraCredits * QUOTED.payg - extraUsd) < 0.01,
  `$${(extraCredits * QUOTED.payg).toFixed(2)} of credits for $${extraUsd}`);

/* ── And the document says so ──────────────────────────────────────────── */
/* The conclusion is generated from these numbers rather than typed, so this
   asserts the generated file actually carries it — the same discipline the
   model's own comment describes: a sentence that hard-codes a conclusion
   while its numbers are computed beside it will one day lie, and this one did
   for a week. */
const doc = readFileSync('docs/KOSTE-EN-WINS.md', 'utf8');
ok('the written answer says there is no volume discount', /geen volume-afslag/.test(doc));
ok('and that the ceiling it used to reason from does not exist',
  /Daardie dak bestaan nie/.test(doc));
ok('and it recommends the cheapest plan that covers the seats',
  /bly op Pro/i.test(doc), 'the document still points at Business');
/* The old claim must be gone, not merely contradicted further down. */
ok('the old "Business is the only plan that works" claim is gone',
  !/Business is die enigste plan wat ooit\s+wins kan maak\.\*\*/.test(doc));

console.log(
  failures
    ? `\ncheck:elevenplans — ${failures} assertion(s) failed.`
    : '\ncheck:elevenplans — plan, top-up and upgrade are all the same rate, and the advice follows from that.',
);
process.exit(failures ? 1 : 0);

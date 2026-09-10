/**
 * A top-up must never be the cheap way in.
 *
 * ── What was found ───────────────────────────────────────────────────────
 *
 * Carli, 10 September 2026: "Ek sien om verdere krediete aan te koop baie
 * goedkoper is as die planne wat 'n mens uit neem."
 *
 * She was right, and `credits.ts` claimed the opposite in a comment: that the
 * packs sit above "the dearest plan (Maker, at R1.24 a credit)" and that
 * **`capacity.test` refuses to pass if a pack ever slips under it**.
 *
 * There is no `capacity.test` in this repository. There never was. The rule
 * was written down, a guard was named for it, and neither existed — so the
 * packs drifted under every plan and nothing said so:
 *
 *     Maker   R149 /  90 = R1.656 a credit   ← the cheapest plan
 *     small   R99  /  60 = R1.650            0.3% cheaper
 *     mid     R239 / 150 = R1.593            3.8% cheaper
 *     large   R599 / 400 = R1.498            9.5% cheaper
 *
 * This is that guard, written this time.
 *
 * ── The comparison that binds is not the one that was written ────────────
 *
 * "Dearer than a plan" is the weak version. What a paying member actually
 * weighs is *top up, or move up*, so a pack has to be dearer than the
 * **marginal** credit of the next plan up — which is a different and higher
 * number than any plan's average.
 *
 * Both are checked. Everything is computed from `TIER_SPECS` and `PACKS`, so
 * a change to either is measured rather than assumed.
 */
import { readFileSync } from 'node:fs';
import { PACKS, RAND_PER_TOPUP_CREDIT, mayTopUp } from '../app/lib/credits';
import { TIER_SPECS, TIERS, type Tier } from '../app/lib/plans';

/**
 * A file with its comments taken out.
 *
 * The first version of the wallet assertion below matched its own
 * explanation: the comment there quotes the expression it replaced, verbatim
 * and on purpose, so the next person can see what was wrong. A check that
 * reads prose finds the fault it was told about in the sentence describing
 * the fix. `check:probes` learned this first.
 */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};
const rands = (n: number): string => `R${n.toFixed(3)}`;

/** Credits a month, off the card each plan prints. */
const CREDITS: Record<Tier, number> = { free: 0, maker: 90, studio: 220, label: 440 };

/* The card and the number must agree, or every rate below is about a plan
   nobody is being sold. Read out of the `includes` line rather than trusted:
   it is the sentence somebody buys on. */
for (const tier of TIERS) {
  if (tier === 'free') continue;
  const said = TIER_SPECS[tier].includes.find((one) => /credits a month/.test(one)) ?? '';
  const printed = Number(/(\d+) credits a month/.exec(said)?.[1] ?? 0);
  ok(`${tier}'s card prints the credits this check is measuring`,
    printed === CREDITS[tier], `card says ${printed}, this says ${CREDITS[tier]}`);
}

const paid = TIERS.filter((one) => one !== 'free');
const planRate = (tier: Tier): number => TIER_SPECS[tier].rand / CREDITS[tier];

console.log('\n  plans, per credit');
for (const tier of paid) console.log(`      ${tier.padEnd(7)} ${rands(planRate(tier))}`);

/* The step between one plan and the next. This is what a member on Studio is
   really choosing against when they decide whether to top up. */
const steps: { from: Tier; to: Tier; rate: number }[] = [];
for (let i = 1; i < paid.length; i += 1) {
  const from = paid[i - 1];
  const to = paid[i];
  steps.push({
    from,
    to,
    rate: (TIER_SPECS[to].rand - TIER_SPECS[from].rand) / (CREDITS[to] - CREDITS[from]),
  });
}
console.log('  the step up, per credit');
for (const one of steps) console.log(`      ${one.from} → ${one.to.padEnd(7)} ${rands(one.rate)}`);

console.log('  packs, per credit');
for (const pack of PACKS) console.log(`      ${pack.id.padEnd(7)} R${pack.rand} / ${pack.credits} = ${rands(pack.rand / pack.credits)}`);
console.log();

/* ── Every pack, against every plan and every step ──────────────────────── */
for (const pack of PACKS) {
  const rate = pack.rand / pack.credits;
  for (const tier of paid) {
    ok(`${pack.id} costs more per credit than ${tier}`,
      rate > planRate(tier), `${rands(rate)} against ${rands(planRate(tier))}`);
  }
  for (const step of steps) {
    ok(`${pack.id} costs more per credit than moving ${step.from} → ${step.to}`,
      rate > step.rate,
      `${rands(rate)} against ${rands(step.rate)} — topping up would be cheaper than moving up`);
  }
}

/* ── The credits shrink with the money, exactly ─────────────────────────── */
const rates = PACKS.map((one) => one.rand / one.credits);
ok('every pack is the same rate — no discount for buying more',
  Math.max(...rates) - Math.min(...rates) < 0.001,
  `${rates.map(rands).join(', ')} — a discount for buying more is a reason not to move up, one rung down`);
ok('and that rate is the one constant everything is derived from',
  rates.every((one) => Math.abs(one - RAND_PER_TOPUP_CREDIT) < 0.001),
  `${rates.map(rands).join(', ')} against ${rands(RAND_PER_TOPUP_CREDIT)}`);

/* The gateway takes R2 flat on every charge. Below about R99 that fixed part
   is a tax on the pack rather than a rounding error. */
ok('nothing is sold under R99, because R2 of it would go to the gateway',
  PACKS.every((one) => one.rand >= 99),
  PACKS.map((one) => `R${one.rand}`).join(', '));
ok('and there is a small one, so a short month does not need a big spend',
  Math.min(...PACKS.map((one) => one.rand)) <= 150,
  'the cheapest pack is more than R150 — that is not a top-up, it is a plan');

/* ── Nobody buys credits without a plan ─────────────────────────────────── */
ok('a free member may not top up', !mayTopUp('free'));
ok('nor somebody with no tier at all', !mayTopUp(null) && !mayTopUp(undefined));
for (const tier of paid) ok(`${tier} may top up`, mayTopUp(tier));

const route = code(readFileSync('app/api/credits/route.ts', 'utf8'));
ok('the credits route sends no packs to a free member',
  /packs: mayTopUp\(caller\.tier\) \? PACKS : \[\]/.test(route),
  'the shelf is handed to everybody who asks');
ok('nor to somebody signed out',
  !/signedIn: false, balance: 0, packs: PACKS/.test(route),
  'a visitor who has never signed in is shown the shop');

const checkout = code(readFileSync('app/api/checkout/route.ts', 'utf8'));
ok('and the checkout refuses a pack from somebody without a plan',
  /want\.kind === 'credits' && !mayTopUp\(caller\.tier\)/.test(checkout),
  'a hidden button is not a closed door — the pack id is a string anybody can post');

const wallet = code(readFileSync('app/lib/wallet.ts', 'utf8'));
ok('and the client does not fall back to the full shelf when the answer is empty',
  !/data\.packs\?\.length \? data\.packs : PACKS/.test(wallet),
  'the gate is defeated on the client the moment it is added on the server');
ok('nor before the first answer arrives',
  /packs: \[\],/.test(wallet),
  'the shop is shown for as long as the first request takes');

const panel = code(readFileSync('app/components/OutOfCredits.tsx', 'utf8'));
ok('with nothing to sell, the panel offers the plans rather than an empty shelf',
  /packs\.length === 0 \?/.test(panel) && /credits\.needPlan/.test(panel),
  'a free member meets a shop with nothing in it');

if (failures) {
  console.error(`\ncheck:topups — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:topups — a pack never undercuts a plan or a step up, and nobody buys one without a plan.');

/**
 * Create the three Paystack plans this app subscribes people to.
 *
 * Run it once, from your own machine, with your own key:
 *
 *   PAYSTACK_SECRET_KEY=sk_test_xxx node scripts/paystack-plans.mjs
 *
 * It prints the three plan codes. Put them in .env.local (and in your host's
 * environment settings) as PAYSTACK_PLAN_MAKER, PAYSTACK_PLAN_STUDIO and
 * PAYSTACK_PLAN_LABEL, and the checkout starts selling subscriptions instead
 * of single months.
 *
 * The key is read from the environment and never written anywhere. Use the
 * test key (sk_test_…) first: test-mode plans only work with test-mode
 * payments, so when you switch to the live key you run this again and swap the
 * three codes for the live ones.
 *
 * Running it twice makes a second set of plans rather than failing — Paystack
 * has no notion of "the plan I meant". If you do that by accident, the extra
 * ones are harmless as long as your environment points at the codes you keep;
 * delete them in the dashboard to avoid confusing yourself later.
 *
 * ── Why the prices are read out of plans.ts ──────────────────────────────
 *
 * Because they must not be typed twice. TIER_SPECS is what the pricing cards
 * show and what the checkout charges, so a plan created here at a different
 * amount would bill people something the app never quoted.
 *
 * Node cannot import that file directly (it imports './pricing' without an
 * extension, which only a bundler resolves), so the numbers are read out of
 * the text. That is fragile on purpose in one direction only: if the file is
 * reformatted and a number cannot be found, this stops with an error instead
 * of guessing. It will never quietly create a plan at the wrong price.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLANS_TS = join(HERE, '..', 'app', 'lib', 'plans.ts');

const TIERS = [
  { tier: 'maker', env: 'PAYSTACK_PLAN_MAKER', name: 'FutureBox Maker' },
  { tier: 'studio', env: 'PAYSTACK_PLAN_STUDIO', name: 'FutureBox Studio' },
  { tier: 'label', env: 'PAYSTACK_PLAN_LABEL', name: 'FutureBox Label' },
];

/** The monthly rand price for one tier, as TIER_SPECS states it. */
function randFor(source, tier) {
  // The tier's own block, then the first `rand:` inside it.
  const block = new RegExp(`\\b${tier}:\\s*\\{([\\s\\S]*?)\\n  \\},`).exec(source);
  if (!block) throw new Error(`Could not find the ${tier} tier in app/lib/plans.ts.`);
  const amount = /\brand:\s*([0-9_]+)/.exec(block[1]);
  if (!amount) throw new Error(`Could not find ${tier}'s price in app/lib/plans.ts.`);
  const rand = Number(amount[1].replace(/_/g, ''));
  if (!Number.isFinite(rand) || rand <= 0) throw new Error(`${tier}'s price read as ${amount[1]}.`);
  return rand;
}

const secret = process.env.PAYSTACK_SECRET_KEY;
if (!secret) {
  console.error('Set PAYSTACK_SECRET_KEY first. Get it from dashboard.paystack.com → Settings → API Keys.');
  process.exit(1);
}

const source = await readFile(PLANS_TS, 'utf8');
const wanted = TIERS.map((one) => ({ ...one, rand: randFor(source, one.tier) }));

console.log('About to create these plans, monthly, in rand:\n');
for (const one of wanted) console.log(`  ${one.name.padEnd(20)} R${one.rand}`);
console.log('');

const lines = [];
for (const one of wanted) {
  const response = await fetch('https://api.paystack.co/plan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: one.name,
      // Cents, which is Paystack's unit for rand.
      amount: one.rand * 100,
      interval: 'monthly',
      currency: 'ZAR',
      description: `${one.name} — a month of FutureBox.`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.status || !payload.data?.plan_code) {
    console.error(`\n${one.name} was not created: ${payload.message ?? response.status}`);
    process.exit(1);
  }
  console.log(`  ${one.name} → ${payload.data.plan_code}`);
  lines.push(`${one.env}=${payload.data.plan_code}`);
}

console.log('\nPut these three lines in .env.local, and in your host\'s environment settings:\n');
console.log(lines.join('\n'));
console.log('');

/**
 * Create the four Paystack plans this app subscribes people to.
 *
 * Run it once, from your own machine, with your own key:
 *
 *   PAYSTACK_SECRET_KEY=sk_test_xxx node scripts/paystack-plans.mjs
 *
 * It prints the four plan codes. Put them in .env.local (and in your host's
 * environment settings) as PAYSTACK_PLAN_MAKER, PAYSTACK_PLAN_STUDIO,
 * PAYSTACK_PLAN_LABEL and PAYSTACK_PLAN_MARKETING, and the checkout starts
 * selling subscriptions instead of single months.
 *
 * The key is read from the environment and never written anywhere. Use the
 * test key (sk_test_…) first: test-mode plans only work with test-mode
 * payments, so when you switch to the live key you run this again and swap the
 * four codes for the live ones.
 *
 * Running it twice makes a second set of plans rather than failing — Paystack
 * has no notion of "the plan I meant". If you do that by accident, the extra
 * ones are harmless as long as your environment points at the codes you keep;
 * delete them in the dashboard to avoid confusing yourself later.
 *
 * ── Why the prices are read out of the source ────────────────────────────
 *
 * Because they must not be typed twice. TIER_SPECS is what the pricing cards
 * show and what the checkout charges, so a plan created here at a different
 * amount would bill people something the app never quoted. The add-on's
 * price comes from `app/lib/addons.ts` for the same reason — that file says
 * outright that the price is there and nowhere else.
 *
 * Node cannot import those files directly (they import without extensions,
 * which only a bundler resolves), so the numbers are read out of the text.
 * That is fragile on purpose in one direction only: if a file is reformatted
 * and a number cannot be found, this stops with an error instead of
 * guessing. It will never quietly create a plan at the wrong price.
 *
 * ── The marketing add-on, and why it was missing ─────────────────────────
 *
 * This created three plans. `docs/SWITCH-ON.md` §8 has told her since the
 * add-on shipped that all four codes — including PAYSTACK_PLAN_MARKETING —
 * are created "once with node scripts/paystack-plans.mjs". So she would have
 * run it, pasted three codes, left the fourth empty, and the R199 desk would
 * have been unbuyable with nothing anywhere saying why.
 *
 * A document and a script disagreeing about a number, each internally
 * consistent. Found 11 September 2026 while writing a different note.
 * `check:paystackplans` now fails when a plan code the app reads is not one
 * this script creates.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLANS_TS = join(HERE, '..', 'app', 'lib', 'plans.ts');
const ADDONS_TS = join(HERE, '..', 'app', 'lib', 'addons.ts');

const TIERS = [
  { tier: 'maker', env: 'PAYSTACK_PLAN_MAKER', name: 'FutureBox Maker' },
  { tier: 'studio', env: 'PAYSTACK_PLAN_STUDIO', name: 'FutureBox Studio' },
  { tier: 'label', env: 'PAYSTACK_PLAN_LABEL', name: 'FutureBox Label' },
];

/** The add-ons, which are priced in their own file rather than in plans.ts. */
const ADDONS = [
  { id: 'marketing', env: 'PAYSTACK_PLAN_MARKETING', name: 'FutureBox Marketing desk' },
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

/* `--dry-run` prints what would be created and stops, without a key and
   without touching Paystack.

   It exists for `check:paystackplans`, and the reason is worth stating: the
   first version of that check read these variable NAMES out of this file,
   which meant a code sitting in a list that nothing iterates counted as
   created. That is how the marketing plan went missing in the first place —
   a name present and a plan never made. Printing the real list is the only
   way to measure the thing rather than a mention of it. */
const dryRun = process.argv.includes('--dry-run');

const secret = process.env.PAYSTACK_SECRET_KEY;
if (!secret && !dryRun) {
  console.error('Set PAYSTACK_SECRET_KEY first. Get it from dashboard.paystack.com → Settings → API Keys.');
  process.exit(1);
}

/** The monthly rand price for one add-on, as ADDONS states it. */
function randForAddon(source, id) {
  const row = new RegExp(`\\{\\s*id:\\s*${id.toUpperCase()}\\s*,\\s*rand:\\s*([0-9_]+)`).exec(source)
    ?? new RegExp(`\\{\\s*id:\\s*'${id}'\\s*,\\s*rand:\\s*([0-9_]+)`).exec(source);
  if (!row) throw new Error(`Could not find the ${id} add-on's price in app/lib/addons.ts.`);
  const rand = Number(row[1].replace(/_/g, ''));
  if (!Number.isFinite(rand) || rand <= 0) throw new Error(`${id}'s price read as ${row[1]}.`);
  return rand;
}

const source = await readFile(PLANS_TS, 'utf8');
const addonSource = await readFile(ADDONS_TS, 'utf8');
const wanted = [
  ...TIERS.map((one) => ({ ...one, rand: randFor(source, one.tier) })),
  ...ADDONS.map((one) => ({ ...one, rand: randForAddon(addonSource, one.id) })),
];

if (dryRun) {
  for (const one of wanted) console.log(`${one.env}\t${one.rand}\t${one.name}`);
  process.exit(0);
}

console.log('About to create these plans, monthly, in rand:\n');
for (const one of wanted) console.log(`  ${one.name.padEnd(28)} R${one.rand}`);
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

console.log(`\nPut these ${lines.length} lines in .env.local, and in your host's environment settings:\n`);
console.log(lines.join('\n'));
console.log('');

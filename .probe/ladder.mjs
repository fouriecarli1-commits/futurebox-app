/** The ladder has to climb, and the engines have to hold what it promises. */
import { TIER_CREDITS, capFor, budgetFor, CREDITS, PACKS } from '../app/lib/credits.ts';

const PRICES = { free: 0, maker: 149, studio: 349, label: 749 };
const CREDIT = (2 * 900 * ((990 * 16) / 11_000_000)) / 10;
const fee = (r) => r * 0.035 + 2;
const EL_MINUTES = 11_000_000 / 900;
const KL_VIDEOS = Math.floor(26_000 / 70);

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// ── Every paid rung must be better value than the one below it ─────────
const paid = ['maker', 'studio', 'label'];
for (let i = 1; i < paid.length; i += 1) {
  const below = TIER_CREDITS[paid[i - 1]] / PRICES[paid[i - 1]];
  const here = TIER_CREDITS[paid[i]] / PRICES[paid[i]];
  say(here > below,
    `${paid[i]} gives ${here.toFixed(3)} credits a rand, worse than ${paid[i - 1]}'s ${below.toFixed(3)}`);
}

// ── And no tier may be beaten by buying two of the one below ───────────
for (let i = 1; i < paid.length; i += 1) {
  const twoBelow = { rand: PRICES[paid[i - 1]] * 2, credits: TIER_CREDITS[paid[i - 1]] * 2 };
  const here = { rand: PRICES[paid[i]], credits: TIER_CREDITS[paid[i]] };
  const beaten = twoBelow.rand <= here.rand && twoBelow.credits >= here.credits;
  say(!beaten, `two ${paid[i - 1]}s beat one ${paid[i]}: R${twoBelow.rand}/${twoBelow.credits} vs R${here.rand}/${here.credits}`);
}

// ── Every tier must leave money after the engines and the gateway ──────
for (const tier of paid) {
  const margin = PRICES[tier] - TIER_CREDITS[tier] * CREDIT - fee(PRICES[tier]);
  say(margin > 0, `${tier} loses money`);
  say(margin / PRICES[tier] > 0.5, `${tier} keeps only ${Math.round((margin / PRICES[tier]) * 100)}%`);
}

// ── The free tier is delivered weekly, and never exceeds its month ─────
say(budgetFor('free') === TIER_CREDITS.free, 'the free budget is not the free allowance');
say(capFor('free') === TIER_CREDITS.free, 'a free balance can exceed the month');
say(TIER_CREDITS.free / CREDITS.halfSong === 2, 'free is not two half songs');

// ── The engines must hold more members than break-even needs ───────────
const FIXED = 15840 + 2560 + 1500 + 400 + 320 + 64;
const MIX = [['maker', 0.6], ['studio', 0.3], ['label', 0.1]];
const blended = MIX.reduce((s, [t, share]) =>
  s + share * (PRICES[t] - TIER_CREDITS[t] * CREDIT - fee(PRICES[t])), 0);
const breakEven = Math.ceil(FIXED / blended);

let minutes = 20 * TIER_CREDITS.free / CREDITS.song * 2;   // the free accounts a payer brings
let videos = 0;
for (const [t, share] of MIX) {
  const onVideo = TIER_CREDITS[t] * 0.25;
  minutes += share * (((TIER_CREDITS[t] - onVideo) / CREDITS.song) * 2);
  videos += share * (onVideo / CREDITS.video);
}
const holds = Math.min(Math.floor(EL_MINUTES / minutes), Math.floor(KL_VIDEOS / videos));
say(holds > breakEven,
  `the engines hold ${holds} members but break-even needs ${breakEven} — they never meet`);

// ── A pack must still be worth selling ─────────────────────────────────
for (const pack of PACKS) {
  say(pack.rand - pack.credits * CREDIT - fee(pack.rand) > 0, `pack ${pack.id} loses money`);
  say(pack.rand >= 99, `pack ${pack.id} is under the R99 gateway floor`);
}

// ── And no pack may ever be a better deal than any plan ────────────────
//
// The one that has to hold, because breaking it breaks nothing visible: the
// app keeps working, the packs keep selling, and the subscriptions quietly
// stop making sense. It was broken once — the packs were 47% to 60% cheaper
// per credit than the dearest plan.
for (const pack of PACKS) {
  const packRate = pack.rand / pack.credits;
  for (const tier of paid) {
    const planRate = PRICES[tier] / TIER_CREDITS[tier];
    say(packRate > planRate,
      `pack ${pack.id} is R${packRate.toFixed(3)} a credit against ${tier}'s R${planRate.toFixed(3)} — ` +
      'buying credits beats subscribing');
  }
}

// ── Nothing may be included that its own plan cannot pay for ───────────
//
// "One trained sound" on a plan with 120 credits a month, when training costs
// 300, is a promise redeemable only by buying a pack.
const SOUND_CAPS = { free: 0, maker: 0, studio: 3, label: 10 };
for (const tier of paid) {
  if (SOUND_CAPS[tier] > 0) {
    say(TIER_CREDITS[tier] >= CREDITS.finetune,
      `${tier} offers a trained sound but its ${TIER_CREDITS[tier]} credits cannot pay the ${CREDITS.finetune} it costs`);
  }
}

console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
console.log(`\n  blended margin R${blended.toFixed(0)} · break-even ${breakEven} · engines hold ${holds}`);
for (const t of paid) {
  const m = PRICES[t] - TIER_CREDITS[t] * CREDIT - fee(PRICES[t]);
  console.log(`  ${t.padEnd(7)} R${String(PRICES[t]).padEnd(4)} ${String(TIER_CREDITS[t]).padStart(4)} credits  R${(PRICES[t] / TIER_CREDITS[t]).toFixed(3)}/credit  margin R${m.toFixed(0)} (${Math.round((m / PRICES[t]) * 100)}%)`);
}
const dearest = Math.max(...paid.map((t) => PRICES[t] / TIER_CREDITS[t]));
console.log('');
for (const p of PACKS) {
  const rate = p.rand / p.credits;
  console.log(`  pack    R${String(p.rand).padEnd(4)} ${String(p.credits).padStart(4)} credits  R${rate.toFixed(3)}/credit  +${((rate / dearest - 1) * 100).toFixed(0)}% on the dearest plan`);
}
process.exit(problems.length ? 1 : 0);

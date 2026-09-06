/**
 * Does the number on the button match the number that is charged?
 *
 * Every price a member sees is computed in the browser and every charge is
 * computed on the server, from the same functions — but only if both sides
 * actually call them with the same arguments. That has been wrong twice: a
 * flat price for a clip of any length, and a length clamped on its way to the
 * server after being priced unclamped.
 *
 * So this walks every combination the desk can offer and checks the arithmetic
 * holds. It runs in CI beside the theme and copilot checks.
 *
 * What it cannot check from here is the other half — that the browser sends the
 * length it priced. That needs a running app, and `audit/price.mjs` does it:
 * it reads the number off the button for all twenty-four combinations and then
 * reads the length out of the request the desk actually makes.
 */
import { CREDITS, videoCost } from '../app/lib/credits.ts';
import { LENGTHS } from '../app/lib/videoscenes.ts';

let bad = 0;
const say = (ok: boolean, line: string) => {
  if (!ok) bad += 1;
  console.log(`${ok ? '  ok ' : '  ✗  '} ${line}`);
};

/**
 * The base rate, written here as a literal on purpose.
 *
 * This section used to read `price === CREDITS.video * units * mult`, with
 * `CREDITS.video` on both sides of the comparison. That is a tautology: change
 * the rate from 15 to 16 and both sides move together, every line still prints
 * `ok`, and twenty-four green ticks say the price is right while the price has
 * silently changed. Verified by doing exactly that.
 *
 * A price test's expected values are the specification, not a re-derivation of
 * the thing being tested. So the number lives here too, and changing what a
 * member is charged now means changing it in two places deliberately rather
 * than in one place by accident. That duplication is the entire point of it.
 */
const BASE = 15;
const GRADES = { standard: 1, better: 2, premium: 4 } as const;

say(
  CREDITS.video === BASE,
  `the base rate is ${BASE} credits for five seconds (code says ${CREDITS.video})`,
);

console.log('video — every length the desk offers, at every grade');
for (const grade of ['standard', 'better', 'premium'] as const) {
  for (const { seconds } of LENGTHS) {
    const price = videoCost(grade, seconds);
    const units = Math.ceil(seconds / 5);
    const mult = GRADES[grade];
    say(price === BASE * units * mult, `${grade} ${seconds}s → ${price} (${units} × ${BASE} × ${mult})`);
  }
}

console.log('\nvideo — a longer clip never costs less than a shorter one');
for (const grade of ['standard', 'better', 'premium'] as const) {
  const sorted = [...LENGTHS].sort((a, b) => a.seconds - b.seconds);
  for (let i = 1; i < sorted.length; i += 1) {
    const lower = videoCost(grade, sorted[i - 1].seconds);
    const upper = videoCost(grade, sorted[i].seconds);
    say(upper >= lower, `${grade} ${sorted[i - 1].seconds}s=${lower} ≤ ${sorted[i].seconds}s=${upper}`);
  }
}

console.log('\nvideo — nothing is ever free, and a nonsense length does not go negative');
for (const grade of ['standard', 'better', 'premium'] as const) {
  for (const seconds of [0, -5, 0.4, 1]) {
    const price = videoCost(grade, seconds);
    say(price > 0, `${grade} ${seconds}s → ${price}`);
  }
}
console.log(bad === 0 ? '\nAll agree.' : `\n${bad} disagreements.`);
process.exit(bad === 0 ? 0 : 1);

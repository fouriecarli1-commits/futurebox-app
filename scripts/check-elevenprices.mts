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

/** The plans, as the generator uses them: `{ name: 'Pro', usd: 99, credits: 660 * 900 }`. */
const plans = [...generator.matchAll(/\{ name: '(\w+)', usd: (\d+), credits: ([\d_]+) \* (\d+) \}/g)].map(
  (one) => ({ name: one[1], usd: Number(one[2]), minutes: Number(one[3].replace(/_/g, '')) }),
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

for (const plan of plans) {
  if (musicUsd === null) break;
  const budget = plan.minutes * musicUsd;
  /* Within a dollar: the page rounds its minutes to whole numbers, so 147 x
     0.15 is $22.05 against a $22 plan and that is the rounding, not a
     different price. */
  const holds = Math.abs(budget - plan.usd) <= 1;
  if (plan.name === 'Scale') {
    /* The one plan where it does not, and it is recorded rather than fudged:
       1 993 x $0.15 = $299 against a $330 plan. The generator keeps $330,
       which is the safe reading, and the document says why. */
    ok(
      'Scale is still the one plan whose minutes do not buy back its price',
      !holds && page.includes('Scale is die uitsondering'),
      `${plan.minutes} x ${musicUsd} = ${budget.toFixed(2)} against $${plan.usd}`,
    );
    continue;
  }
  ok(
    `${plan.name}'s minutes times the rate come back to its own price`,
    holds,
    `${plan.minutes} x ${musicUsd} = ${budget.toFixed(2)}, the plan is $${plan.usd}`,
  );
}

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

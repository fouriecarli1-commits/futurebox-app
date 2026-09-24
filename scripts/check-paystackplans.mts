/**
 * Every plan code the app reads must be one the setup script creates.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * `scripts/paystack-plans.mjs` created three plans. `docs/SWITCH-ON.md` §8
 * has said, since the marketing add-on shipped, that all four codes —
 * including `PAYSTACK_PLAN_MARKETING` — are created "once with
 * `node scripts/paystack-plans.mjs`".
 *
 * So the one instruction she would follow produces three codes, she pastes
 * three codes, the fourth stays empty, and the R199 desk cannot be bought by
 * anybody — with nothing on any screen or in any log saying why. A document
 * and a script disagreeing about a number, each internally consistent, which
 * is the same shape as the route and the screen disagreeing about one word
 * and the marketing plan never rendering.
 *
 * ── What this measures ───────────────────────────────────────────────────
 *
 * Not the wording of the document, and not the names written in the script
 * either. The set of `PAYSTACK_PLAN_*` variables the SERVER reads, against
 * the list the script ACTUALLY PRODUCES — obtained by running it with
 * `--dry-run`, which prints what it would create and stops without a key.
 *
 * The first version of this read the names out of the script's source, and
 * did not catch the very fault it was written for: deleting the line that
 * puts the add-on into the list left its name sitting in a const that
 * nothing iterates, and the check called it created. A name is not a plan.
 * That is the "matched the word rather than the thing" fault for the fifth
 * time this week, and the fifth time the answer was to measure the output.
 *
 * The two sets have to be equal: a variable the app reads and the script
 * never creates is a room that cannot be sold, and one the script creates
 * that nothing reads is a plan on her Paystack account collecting nothing.
 *
 * And the prices, which must come from the files that own them rather than
 * being typed into the script — the reason the script reads them out of the
 * source in the first place.
 *
 *   npm run check:paystackplans
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ADDONS } from '../app/lib/addons';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw = '') => {
  if (!ok) problems.push(`  ${what}${saw ? `\n      ${saw}` : ''}`);
};

const strip = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const server = strip(readFileSync('app/lib/server/paystack.ts', 'utf8'));
const script = strip(readFileSync('scripts/paystack-plans.mjs', 'utf8'));

const named = (source: string): Set<string> =>
  new Set([...source.matchAll(/PAYSTACK_PLAN_[A-Z_]+/g)].map((one) => one[0]));

const read = named(server);

/* What the script really makes, from the script itself. */
let printed = '';
try {
  printed = execFileSync('node', ['scripts/paystack-plans.mjs', '--dry-run'], {
    encoding: 'utf8',
    // No key, and it must not need one. It reaches nothing.
    env: { ...process.env, PAYSTACK_SECRET_KEY: '' },
  });
} catch (error) {
  console.error(
    'check:paystackplans — the setup script would not even list its plans:\n' +
      String((error as { stderr?: string }).stderr ?? error).slice(0, 400),
  );
  process.exit(1);
}
const rows = printed
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t'))
  .map(([env, rand, name]) => ({ env, rand: Number(rand), name }));
const made = new Set(rows.map((one) => one.env));

check('the server reads some plan codes at all', read.size > 0, 'the scan is broken');
check('and the script creates some', made.size > 0, printed.slice(0, 120) || 'it printed nothing');
check(
  'every plan it creates has a price and a name',
  rows.every((one) => one.env && Number.isFinite(one.rand) && one.rand > 0 && one.name),
  rows.map((one) => `${one.env}=${one.rand}`).join(' '),
);

/**
 * A code the app reads but nobody creates, with one named exception.
 *
 * `PAYSTACK_PLAN_MARKETING` is read and deliberately not created. The R199
 * marketing add-on stopped being sold on 24 September 2026 — it is in every
 * paid plan now — but a subscription taken out under it goes on charging at
 * Paystack until somebody cancels it there. The webhook reads this code to
 * RECOGNISE such a renewal and answer without granting anything; without the
 * read, that charge falls through to the membership branch and is treated as
 * a plan renewal on somebody's account.
 *
 * So it is withdrawn, not missing, and the two look identical from here. The
 * exception is named rather than the rule loosened: any OTHER code the app
 * reads and the script does not create is still the fault this rule is for.
 * It goes when the subscription is cancelled and the last renewal has passed.
 */
const WITHDRAWN = new Set(['PAYSTACK_PLAN_MARKETING']);

for (const one of read) {
  if (WITHDRAWN.has(one)) {
    check(
      `${one} is read to recognise a withdrawn subscription, and deliberately not created`,
      !made.has(one),
      'it is being created again — nothing sells it, so a new plan code at Paystack sells nothing',
    );
    continue;
  }
  check(
    `${one} is created by scripts/paystack-plans.mjs`,
    made.has(one),
    'the app reads it, the setup script never prints it, and nothing says so — ' +
      'that room simply cannot be bought',
  );
}
for (const one of made) {
  check(
    `${one} is actually read by the app`,
    read.has(one),
    'the script creates a plan on her Paystack account that nothing charges against',
  );
}

/* ── The prices come from the files that own them ───────────────────────
 
   The script exists to stop a price being typed twice. A literal amount in
   it would bill somebody a number no screen ever showed them — which is the
   one failure here that costs real money and cannot be taken back. */
check(
  'the tier prices are read out of plans.ts rather than typed here',
  /readFile\(PLANS_TS/.test(script) && /randFor\(source/.test(script),
  'a price typed into this script bills what no pricing card ever quoted',
);
/* The add-on price rule used to live here: the script had to read the price
   out of `addons.ts` rather than typing it. There is no add-on price any more
   — the shelf is empty — so the rule is inverted rather than dropped. Reading
   that file again would mean something had been put back on sale beside a
   plan, and `check:sold` and this line would both want to know. */
check(
  'the script reads no add-on price, because nothing is sold on the side',
  !/ADDONS_TS/.test(script) && !/randForAddon/.test(script),
  'the script is pricing an add-on again — see `lib/addons.ts` for why there is not one',
);
check(
  'and no rand amount is written into the script as a number',
  !/rand:\s*\d/.test(script) && !/amount:\s*\d{3,}/.test(script),
  (script.match(/rand:\s*\d+|amount:\s*\d{3,}/g) ?? []).join(', '),
);

/* The add-on shelf is empty — see `lib/addons.ts` — so there is nothing here
   that needs its own Paystack plan code. Asserted rather than deleted: a new
   thing sold on the side would need one, and would go unnoticed otherwise. */
check(
  'no add-on needs a Paystack plan code, because nothing is sold on the side',
  ADDONS.length === 0,
  `${ADDONS.length} on the shelf`,
);

/* ── And the document must not promise more than the script does ───────
 
   Matched on the variable names rather than on the sentence, because the
   sentence is prose and the names are the thing. A guide naming a code the
   script does not create is exactly what happened. */
const guide = readFileSync('docs/SWITCH-ON.md', 'utf8');
for (const one of named(guide)) {
  if (WITHDRAWN.has(one)) continue;
  check(
    `docs/SWITCH-ON.md names ${one}, and the script creates it`,
    made.has(one),
    'the guide sends her to a script that does not produce the code it names',
  );
}

if (problems.length > 0) {
  console.error(`check:paystackplans — a plan code nobody creates:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:paystackplans — all ${read.size} plan codes the app reads are created by the setup script, ` +
    `every price is read from the file that owns it, and the guide names no code it cannot produce.`,
);

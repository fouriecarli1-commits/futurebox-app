/**
 * The arithmetic behind "what the cache saved".
 *
 * ── Why this needs a check at all ────────────────────────────────────────
 *
 * Carli has asked twice for the real saving from prompt caching, and
 * `docs/MAANDELIKSE-KOSTE.md` has refused twice to write one down:
 *
 *   *"'n Kas wat nooit tref nie lyk presies soos een wat altyd tref, behalwe
 *    op die rekening."*
 *
 * The measurement now exists — `ai_costs`, one row per call — and the number
 * it produces is going into a cost table she makes decisions on. So the sum
 * that turns four token counts into rand is load-bearing, and it is exactly
 * the kind of sum that is wrong in a plausible direction: a rate typed one
 * decimal out, a counterfactual that quietly flatters us, a saving clamped
 * at zero so a bad week looks like a flat one.
 *
 * Every number below is worked by hand in the comment beside it. A check
 * that computes the expected value the same way as the code is a check that
 * agrees with the bug.
 */
import {
  CACHE_READ_SHARE,
  CACHE_WRITE_SHARE,
  USD_PER_MTOK,
  paid,
  saved,
  wouldHavePaid,
} from '../app/data/aiprices';
import { RAND_PER_USD } from '../app/lib/plans';
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};
/** Rand, to the cent, because these are prices and not measurements. */
const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.005;

/* ── 1. The two ratios the whole bet rests on ─────────────────────────────
   A cache read is a tenth of fresh; a cache write is a quarter dearer than
   fresh. If a rate is ever updated and one of these silently changes, every
   saving already written into the cost table becomes wrong — so the ratios
   are asserted against the money rather than trusted to move together. */
ok('a cache read costs a tenth of a fresh read',
  near(USD_PER_MTOK.cacheRead, USD_PER_MTOK.input * CACHE_READ_SHARE),
  `$${USD_PER_MTOK.cacheRead} against $${USD_PER_MTOK.input} × ${CACHE_READ_SHARE}`);
ok('a cache write costs a quarter more than a fresh read',
  near(USD_PER_MTOK.cacheWrite, USD_PER_MTOK.input * CACHE_WRITE_SHARE),
  `$${USD_PER_MTOK.cacheWrite} against $${USD_PER_MTOK.input} × ${CACHE_WRITE_SHARE}`);

/* ── 2. One call, worked out with a pencil ────────────────────────────────
   A help-desk question that hit the cache: the terms and privacy policy
   served out of the entry, a short question read fresh, a short answer.

     10 000 cache read  × $0.50/M = $0.005
        500 fresh input × $5/M    = $0.0025
        300 output      × $25/M   = $0.0075
                                    ───────
                                    $0.015  × R16 = R0.24 */
const hit = { input: 500, output: 300, cacheRead: 10_000, cacheWrite: 0 };
ok('a call that hit the cache costs R0.24', near(paid(hit), 0.24), `R${paid(hit).toFixed(4)}`);

/*   With no cache at all, those 10 000 tokens are fresh input instead:

     10 500 fresh input × $5/M  = $0.0525
        300 output      × $25/M = $0.0075
                                  ───────
                                  $0.06   × R16 = R0.96

   So the call saved R0.96 − R0.24 = R0.72, which is three quarters of it. */
ok('  and would have cost R0.96 without the cache', near(wouldHavePaid(hit), 0.96),
  `R${wouldHavePaid(hit).toFixed(4)}`);
ok('  so the saving on it is R0.72', near(saved(hit), 0.72), `R${saved(hit).toFixed(4)}`);

/* ── 3. The call where the bet LOSES ──────────────────────────────────────
   The first press of a burst, with nothing after it. The same 10 000 tokens
   are written into an entry nothing ever reads back.

     10 000 cache write × $6.25/M = $0.0625
        500 fresh input × $5/M    = $0.0025
        300 output      × $25/M   = $0.0075
                                    ───────
                                    $0.0725 × R16 = R1.16

   Against R0.96 with no caching at all. The saving is R0.96 − R1.16 =
   **minus twenty cents**, and it has to come out of the function as a
   negative number. This is the assertion that matters most: clamping it at
   zero would turn every week the bet lost into a week it broke even, and
   the cost table would then only ever be able to report good news. */
const miss = { input: 500, output: 300, cacheRead: 0, cacheWrite: 10_000 };
ok('a call that only wrote the entry costs R1.16', near(paid(miss), 1.16), `R${paid(miss).toFixed(4)}`);
ok('  and the "saving" on it is NEGATIVE', saved(miss) < 0, `R${saved(miss).toFixed(4)}`);
ok('  specifically minus 20 cents', near(saved(miss), -0.2), `R${saved(miss).toFixed(4)}`);

/* ── 4. No caching at all is neither a saving nor a loss ─────────────────
   Six of the eleven prompts are under the model's floor and cache nothing.
   Those calls must report exactly zero rather than a small number either
   way, or the floor looks like a leak. */
const none = { input: 900, output: 300, cacheRead: 0, cacheWrite: 0 };
ok('a call that cached nothing saved exactly nothing', saved(none) === 0, `R${saved(none)}`);
ok('  and paid the plain rate for it', near(paid(none), wouldHavePaid(none)), '');

/* ── 5. One exchange rate in the whole app ────────────────────────────────
   It was a literal `16` in two places in `plans.ts` and this file would have
   been the third. An exchange rate that disagrees with itself is every
   supplier's cost wrong in a different direction on the same page. */
const plans = readFileSync('app/lib/plans.ts', 'utf8');
ok('the exchange rate is written down once', RAND_PER_USD === 16, `R${RAND_PER_USD}/USD`);
ok('  and plans.ts uses the constant rather than a second 16',
  !/\*\s*16\b/.test(plans.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')),
  'there is a bare 16 in plans.ts again');

/* ── 6. The measurement is actually collected ─────────────────────────────
   The whole of this file is arithmetic over rows that have to exist. The
   version of `notecache` before this wrote a console line and nothing else,
   which is how the saving stayed unmeasurable for a day: a number in a log
   ages out before anybody adds it up. */
const cache = readFileSync('app/lib/server/aicache.ts', 'utf8');
ok('every model call is written down, not only logged',
  /from\('ai_costs'\)\s*\.insert\(/.test(cache),
  'notecache logs to the console again — nothing is being collected');
ok('  and the write is awaited, so a frozen function does not lose it',
  /export async function notecache/.test(cache),
  'notecache is synchronous again, and a serverless return will drop the row');

/* And the eleven routes await it. An unawaited insert in a serverless
   function is a row lost whenever the response wins the race — which biases
   the month in whichever direction the lost calls happened to lie. */
const unawaited = [
  'adformats', 'campaign', 'copilot', 'help', 'mixdesk', 'photosong',
  'plan', 'recommend', 'songfrom', 'songwriter', 'translate',
].filter((one) => {
  const src = readFileSync(`app/api/${one}/route.ts`, 'utf8');
  return !new RegExp(`await notecache\\('${one}'`).test(src);
});
ok('  and all eleven routes await it', unawaited.length === 0, unawaited.join(', '));

/* ── 7. The read-out is behind the secret ─────────────────────────────────
   It reports on money. Same rule as `/api/eleven/prices`, and the same
   reason: it must refuse without POST_SECRET rather than default to open. */
const route = readFileSync('app/api/aikoste/route.ts', 'utf8');
ok('the read-out refuses without POST_SECRET',
  /POST_SECRET/.test(route) && /timingSafeEqual/.test(route),
  'the cost page is open, or the secret is compared with ===');

/* ── 8. And it never reports a saving it has not measured ─────────────────
   Zero rows must answer "nothing recorded", not "R0,00 saved". The two look
   identical in a table and only one of them means the cache is failing. */
ok('  and says "nothing recorded" rather than R0,00 when there are no rows',
  /measured:\s*false/.test(route),
  'an empty table now reports a zero saving, which reads as a failure that has not happened');

if (failures) {
  console.error(
    `\ncheck:aikoste — ${failures} wrong. The saving from prompt caching goes into a cost table`
    + ' Carli makes decisions on, and a sum that is wrong in a plausible direction is worse'
    + ' than no sum at all.\n',
  );
  process.exit(1);
}
console.log(
  `\ncheck:aikoste — R${RAND_PER_USD}/USD in one place, a hit saves 75% of the call,`
  + ' a lone write costs 21% more, and nothing is claimed that was not recorded.',
);

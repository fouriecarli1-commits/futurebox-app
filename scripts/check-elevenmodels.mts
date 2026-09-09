/**
 * What ElevenLabs say about their models, against what this app assumes.
 *
 * ── The one that can bite ────────────────────────────────────────────────
 *
 * `maximum_text_length_per_request` on `GET /v1/models`. The biggest plan in
 * `lib/plans.ts` lets somebody send a 12,000-character script. If a model
 * takes less than that, the read is charged here and refused there — a ceiling
 * this app promises and the service will not keep.
 *
 * That is the same fault as the 4.5 MB body wall in #90, and it was invisible
 * for the same reason: the number was never asked for. This does not fix it —
 * only ElevenLabs' real answer can say whether there is anything to fix — it
 * makes it visible on the page she already opens.
 *
 * Two more fields come with it and are worth the same call.
 * `model_rates.character_cost_multiplier` is what they actually bill, against
 * `lib/credits.ts`, which is a number worked out from a document. And
 * `languages` says which models know Afrikaans, which `/api/voice/speak`
 * currently asserts in a comment.
 *
 * ── What is checked here ─────────────────────────────────────────────────
 *
 * Not their numbers — this machine cannot reach them. The reader, and the
 * direction it fails in. An unreadable model list must come back null, meaning
 * "could not ask", and never an empty list: an empty list of models reads as
 * "there are no models", and this app would then have nothing to say about its
 * own prices with complete confidence. That mistake has been made and fixed
 * five times in this codebase today.
 */
import { readFileSync } from 'node:fs';
import { elevenModelsFrom, forgetElevenModels } from '../app/lib/server/eleven';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${what}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── The reader, driven over shapes a live service actually gives ──────── */
const notAnAnswer: [string, unknown][] = [
  ['null', null],
  ['an object where a list belongs', { models: [] }],
  ['an empty list', []],
  ['a list of nothing usable', [{}, { name: 'no id' }, null]],
  ['a string', 'models'],
];
for (const [what, body] of notAnAnswer) {
  ok(`${what} reads as could-not-ask, never as no models`,
    elevenModelsFrom(body) === null, JSON.stringify(elevenModelsFrom(body)));
}

const real = elevenModelsFrom([
  {
    model_id: 'eleven_multilingual_v2',
    name: 'Multilingual v2',
    can_do_text_to_speech: true,
    maximum_text_length_per_request: 10_000,
    languages: [{ language_id: 'AF', name: 'Afrikaans' }, { language_id: 'en', name: 'English' }],
    model_rates: { character_cost_multiplier: 1, cost_discount_multiplier: 0.8 },
    concurrency_group: 'standard',
  },
]);
ok('a real answer is read', real?.length === 1, JSON.stringify(real));
ok('with the billing multiplier', real?.[0]?.costMultiplier === 1);
ok('and the discount beside it, which is what an agreement moves',
  real?.[0]?.discount === 0.8);
ok('and the longest script they take', real?.[0]?.maxText === 10_000);
ok('their language ids are lower-cased, so a lookup for "af" works',
  real?.[0]?.languages.includes('af') === true, JSON.stringify(real?.[0]?.languages));
ok('and one model with no id does not sink the rest',
  elevenModelsFrom([{ model_id: 'a' }, {}])?.length === 1);

/* ── The report reaches the page she opens ─────────────────────────────── */
const page = readFileSync('app/api/allowance/route.ts', 'utf8');
ok('the allowance page asks for the models', /await elevenModels\(\)/.test(page));
ok('and reports on the ones this app names', /USED_MODELS/.test(page));
ok('it compares their longest script against the biggest plan ceiling',
  /BIGGEST_SCRIPT/.test(page) && /roof < BIGGEST_SCRIPT/.test(page));
ok('the biggest ceiling is read off the plans rather than typed again',
  /Object\.values\(PODCAST_CAPS\)/.test(page),
  'a typed-in copy of a plan number is one that goes stale silently');
ok('a model this app names and they did not list is called out',
  /found: false/.test(page),
  'a renamed model is a read that fails, and the page should say so before it does');
ok('a list that could not be read is null, not an empty report',
  /models: said\s*\?/.test(page));
ok('and a missing length is said to be missing rather than treated as room',
  /roof === null/.test(page));

forgetElevenModels();

console.log(
  failures
    ? `\ncheck:elevenmodels — ${failures} wrong.`
    : '\ncheck:elevenmodels — their own numbers are read, and an unreadable answer is not mistaken for none.',
);
process.exit(failures ? 1 : 0);

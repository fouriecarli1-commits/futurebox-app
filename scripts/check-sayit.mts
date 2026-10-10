/**
 * The Afrikaans pronunciation dictionary, and the three ways it goes quiet.
 *
 * ── What this guards ─────────────────────────────────────────────────────
 *
 * Carli, 10 September 2026: "elke woord tjie, soos voëltjie word verkeerd
 * uitgespreek as chi. tjie moet uitgespreek word as kie dan is dit
 * byvoorbeeld voëlkie."
 *
 * The fix has four moving parts, and three of them fail SILENTLY — which is
 * the whole reason for this file. A wrong pronunciation that comes back is
 * indistinguishable from a dictionary that was never applied, so nothing
 * about the sound tells you which of these broke:
 *
 *   1. A rule written into sayit.ts and never sent. Caught by the route
 *      reading SAY_RULES rather than a list of its own.
 *   2. A dictionary built and its locator never passed on the read. Caught by
 *      every speak function spreading sayItRight().
 *   3. Half a locator — an id with no version, or the reverse. That is a 422
 *      on every read, and it is the one failure that is loud, which is why
 *      sending nothing when either is missing is the correct behaviour and
 *      is asserted here.
 *   4. An empty locator array sent when there is no dictionary. ElevenLabs
 *      rejects malformed fields rather than ignoring them, so this must send
 *      no field at all, not a field with nothing in it.
 *
 * ── And the one thing it deliberately does not assert ────────────────────
 *
 * Whether "tjie" → "kie" is the right respelling. That is her ear, not this
 * file's business. What is asserted is that her rule is present, unaltered,
 * and attributed — and that the one rule I inferred rather than heard is
 * marked as mine.
 */
import { readFileSync } from 'node:fs';
import { SAY_RULES, asRules, locators, sayItRight } from '../app/lib/server/sayit';

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

// ── Her rule, as she gave it ─────────────────────────────────────────────

const tjie = SAY_RULES.find((rule) => rule.string_to_replace === 'tjie');
ok('the -tjie rule she reported is in the dictionary', Boolean(tjie),
  'the one heard fault, and the only confirmed one');
ok('and it says "kie", which is what she said', tjie?.alias === 'kie',
  `it says "${tjie?.alias}"`);
ok('and it is attributed to her, not left as somebody\'s guess',
  /hers/i.test(tjie?.why ?? ''),
  'a dictionary built by ear stops being one the moment a guess sits unmarked beside an observation');

/* This asserted the opposite for about an hour: that -djie must be marked
   MINE, because it was my inference from her -tjie rule and had not been
   heard. She confirmed it the same afternoon. The assertion flips rather than
   disappears — what it guards is not which of us was right, it is that every
   rule in a dictionary built by ear can say who heard it. */
const djie = SAY_RULES.find((rule) => rule.string_to_replace === 'djie');
ok('the -djie rule is in, and confirmed by her rather than inferred',
  Boolean(djie) && /hers/i.test(djie?.why ?? '') && !/\bMINE\b/.test(djie?.why ?? ''),
  'liedjie is on nearly every screen — this rule earns its keep only if somebody heard it');

ok('and every rule says where it came from',
  SAY_RULES.every((rule) => rule.why.trim().length > 20),
  'a rule with no provenance is a rule nobody can check against an ear');

ok('liedjie is covered by name, because the app says it constantly',
  SAY_RULES.some((rule) => rule.string_to_replace === 'liedjie'),
  'if matching is whole-word only, the suffix rules fire on nothing');
ok('and so is her own example',
  SAY_RULES.some((rule) => rule.string_to_replace === 'voëltjie' && rule.alias === 'voëlkie'),
  'the word she used to report it should be the word that proves it fixed');

ok('no rule reads the same as what it replaces',
  SAY_RULES.every((rule) => rule.string_to_replace !== rule.alias),
  'a rule that changes nothing is a rule nobody notices is doing nothing');

ok('and what is sent carries no field ElevenLabs did not ask for',
  asRules().every((rule) =>
    Object.keys(rule).sort().join() === 'alias,string_to_replace,type' && rule.type === 'alias'),
  'they reject unknown fields rather than ignoring them');

// ── The locator, and its three silent failures ───────────────────────────

const withEnv = (id: string | undefined, version: string | undefined, run: () => void): void => {
  const wasId = process.env.ELEVEN_DICT_ID;
  const wasVersion = process.env.ELEVEN_DICT_VERSION;
  if (id === undefined) delete process.env.ELEVEN_DICT_ID; else process.env.ELEVEN_DICT_ID = id;
  if (version === undefined) delete process.env.ELEVEN_DICT_VERSION;
  else process.env.ELEVEN_DICT_VERSION = version;
  try { run(); } finally {
    if (wasId === undefined) delete process.env.ELEVEN_DICT_ID; else process.env.ELEVEN_DICT_ID = wasId;
    if (wasVersion === undefined) delete process.env.ELEVEN_DICT_VERSION;
    else process.env.ELEVEN_DICT_VERSION = wasVersion;
  }
};

withEnv(undefined, undefined, () => {
  ok('with no dictionary set, the read sends no dictionary field at all',
    Object.keys(sayItRight()).length === 0,
    'an empty array is a shape they have not documented accepting');
});
withEnv('dict_1', undefined, () => {
  ok('an id with no version sends nothing, rather than half an address',
    locators().length === 0 && Object.keys(sayItRight()).length === 0,
    'half a locator is a 422 on every read — worse than the fault it fixes');
});
withEnv(undefined, 'ver_1', () => {
  ok('and a version with no id, the same',
    locators().length === 0,
    '');
});
withEnv('dict_1', 'ver_1', () => {
  const sent = sayItRight() as { pronunciation_dictionary_locators?: unknown[] };
  ok('with both set, the locator goes out under the name they document',
    Array.isArray(sent.pronunciation_dictionary_locators)
    && sent.pronunciation_dictionary_locators.length === 1,
    'the field is pronunciation_dictionary_locators, and it takes a list');
});

// ── Every read carries it ────────────────────────────────────────────────

const eleven = readFileSync('app/lib/server/eleven.ts', 'utf8');
const reads = ['speak', 'speakTimed', 'speakStream'];
/* `sayItRightNow` since 10 October 2026, when the booth at `/uitspraak`
   gained a keep button and the dictionary stopped living only in two
   environment variables. The async one asks the database WHICH dictionary is
   live, so a word she kept is used on the very next read rather than after
   somebody has pasted a version id into Vercel.
 
   The rule has not changed at all — every way of reading text aloud passes
   the dictionary, and two out of three is a bug with no symptom on the third.
   Only the name of the function has. */
const PASSES = /\.\.\.await sayItRightNow\(\)/g;
ok(`all ${reads.length} ways of reading text aloud pass the dictionary`,
  (eleven.match(PASSES) ?? []).length === reads.length,
  'a dictionary applied to two reads out of three is a bug with no symptom on the third');
for (const name of reads) {
  const body = eleven.split(`export async function ${name}(`)[1] ?? '';
  ok(`  ${name} is one of them`,
    /\.\.\.await sayItRightNow\(\)/.test(body.slice(0, 2000)), 'not in its body');
}

/* And the one that asks the database must fall back rather than return none.
   A failed lookup becoming "there is no dictionary" takes the pronunciation
   off every read in the app at once, which is the loudest possible version of
   the fault this whole file is about. `check:hoorwoord` drives the three
   cases; this names the rule where somebody reading about the dictionary will
   meet it. */
const say = readFileSync('app/lib/server/sayit.ts', 'utf8');
ok('  and asking the database which one is live cannot answer "none"',
  /export async function liveLocators/.test(say)
  && (say.slice(say.indexOf('export async function liveLocators'), say.indexOf('export async function liveLocators') + 1400)
    .match(/return locators\(\);/g) ?? []).length >= 3,
  'no database, a failed lookup and an empty row all have to mean "use what'
  + ' was set before"');

// ── The route builds from the source, not from a copy ────────────────────

/* Comments stripped before matching. check:topups' first version matched the
   comment quoting the very expression it had replaced, and this file names
   `add-rules` in a comment explaining why it does not use it. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const route = code(readFileSync('app/api/eleven/dictionary/route.ts', 'utf8'));
/* `allRules()` since 10 October 2026: the rules written in `sayit.ts` AND the
   ones heard in the booth at `/uitspraak` and kept in `said_words`. Both go
   up, because a keep button that fills a table nothing sends is a button that
   does nothing — which is the hardest kind of nothing to notice.
 
   The rule is the same one: the route must build from `sayit.ts` and not from
   a list of its own, because a second copy is a copy that drifts. */
ok('the setup route sends the rules from sayit.ts',
  /from '@\/app\/lib\/server\/sayit'/.test(route) && /allRules\(\)/.test(route),
  'a second copy of the rules is a copy that drifts');
ok('  and sends the heard ones with them',
  /await allRules\(\)/.test(route) && !/const rules = asRules\(\)/.test(route),
  'the booth writes into `said_words` and this is the only thing that ever'
  + ' carries that table to her account');
ok('and it replaces the rules rather than adding to them',
  /set-rules/.test(route) && !/add-rules/.test(route),
  'add-rules leaves a deleted rule on the account for ever');
ok('and it refuses without POST_SECRET, because it writes to her account',
  /POST_SECRET/.test(route) && /timingSafeEqual/.test(route),
  '');
ok('and it never reports success without both ids to paste',
  /if \(!id \|\| !version\)/.test(route),
  'saying "done" while she pastes nothing is how a dictionary sits unused');

/* A setup page that is safe to open once and not twice will be opened
   twice. Without this it made a second dictionary with the same name every
   time she opened it before pasting the ids. */
ok('and opening it a second time updates the dictionary rather than making another',
  /pronunciation-dictionaries\?page_size/.test(route) && /one\.name === NAME/.test(route),
  'two dictionaries with one name, one reachable, and no way to tell which she pasted');

if (failures) {
  console.error(`\ncheck:sayit — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:sayit — her rule is there and attributed, every read carries the dictionary, and half a locator sends nothing.');

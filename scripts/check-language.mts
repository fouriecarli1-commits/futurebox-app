/**
 * The language the app is in, and the one bug she actually hit.
 *
 * ── What she reported ────────────────────────────────────────────────────
 *
 *   "Wanneer ek inlog in engels, spring die blad afrikaans toe."
 *
 * She was right, and the code was doing what it was told. Three things can
 * have an opinion about the language — a choice made in this browser, the
 * account, and the browser's own locale — and they do not carry equal weight.
 * That rule lived inside two React effects where it could not be run, let
 * alone checked, and the fix went in without a test because there was nowhere
 * to put one.
 *
 * `lib/langrule.ts` is that rule as a function, so this file can run it
 * against every combination that can actually occur. Her case is named below
 * and is the reason the file exists.
 *
 * ── Why each rule is what it is ──────────────────────────────────────────
 *
 * A **choice** wins over everything, and the account is brought into step with
 * it — somebody who picked English here is not overruled by a phone they used
 * last week.
 *
 * The **account** answers when this browser has not been told. Somebody who
 * chose Afrikaans on their phone should not have to choose again on a laptop;
 * being asked twice is the app forgetting.
 *
 * The **locale** is a guess. It decides the first paint so an Afrikaans
 * speaker does not have to find a menu, and it is not written down — a guess
 * must not outrank somebody who told us once somewhere else.
 *
 * And the part that was missing: rule 2 was right and was not the bug. The bug
 * was that it happened silently.
 */
import { asLang, onArrival, onSignIn } from '../app/lib/langrule.ts';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* ── Reading a language out of anything ─────────────────────────────────── */

ok('a language is a language', asLang('af') === 'af' && asLang('en') === 'en');
for (const junk of [null, undefined, '', 'AF', 'af-ZA', 'english', 0, {}, ['af']]) {
  ok(`${JSON.stringify(junk)} is not a language`, asLang(junk) === null);
}

/* ── The first paint ────────────────────────────────────────────────────── */

console.log('\narriving');

ok(
  'a stored choice is what shows',
  onArrival('af', 'en-GB').lang === 'af' && onArrival('af', 'en-GB').fromChoice,
);
ok(
  'and an Afrikaans browser gets Afrikaans without asking',
  onArrival(null, 'af-ZA').lang === 'af',
);
ok(
  'but that is a guess, not a choice',
  onArrival(null, 'af-ZA').fromChoice === false,
  'a guess must not outrank an account',
);
ok('anything else starts in English', onArrival(null, 'en-GB').lang === 'en');
ok('a missing locale is not a crash', onArrival(null, null).lang === 'en');
ok(
  'rubbish in storage is not a choice',
  onArrival('français', 'en-GB').fromChoice === false,
);

/* ── Signing in ─────────────────────────────────────────────────────────── */

console.log('\nsigning in');

/* Her case, named. The page was showing English because nothing was stored and
   the browser is not Afrikaans; the account says Afrikaans from her phone. */
const hers = onSignIn(null, 'af', 'en');
ok('her case: the account still wins', hers.lang === 'af');
ok('and it is stored, so the next load does not flip again', hers.store === 'af');
ok('and it says what it changed', hers.switched === 'en', String(hers.switched));

const chose = onSignIn('en', 'af', 'en');
ok('a choice made here is never overruled', chose.lang === 'en');
ok('the account is brought into step with it instead', chose.keepOnAccount === 'en');
ok('and nothing is announced, because nothing changed', chose.switched === null);
ok('nor re-stored, because it is already stored', chose.store === null);

const agreed = onSignIn(null, 'af', 'af');
ok(
  'a page already in the account\'s language announces nothing',
  agreed.lang === 'af' && agreed.switched === null,
  'nothing was swapped, so there is nothing to say',
);

const quiet = onSignIn(null, null, 'en');
ok(
  'an account with no answer changes nothing',
  quiet.lang === 'en' && quiet.store === null && quiet.switched === null,
);

const nonsense = onSignIn(null, 'français', 'en');
ok('and neither does an answer that is not a language', nonsense.switched === null);

/* The other direction, which is the one somebody would forget. */
const other = onSignIn(null, 'en', 'af');
ok('it works the other way round too', other.lang === 'en' && other.switched === 'af');

/* ── And nobody is asked twice, or paid for twice in attention ──────────── */

console.log('\nand the wiring');

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const provider = read('app/lib/i18n.tsx');
ok('the provider uses the rule rather than a second copy of it', /onSignIn\(/.test(provider) && /onArrival\(/.test(provider));
ok(
  'and asks the account only when this browser has nothing to say',
  /asLang\(stored\) \? null : await cloud\.accountLanguage\(\)/.test(provider),
  'otherwise every sign-in is a network call for an answer that cannot be used',
);
ok(
  'what is on screen is read through a ref, not closed over',
  /showingRef\.current/.test(provider),
  'the listener is registered once, so `lang` inside it is the one from mount',
);
ok('choosing a language puts the notice away', /setSwitched\(null\);/.test(provider));

const notice = read('app/components/LanguageSwitched.tsx');
ok('the notice offers the language it would go back to', /switched === 'en' \? 'English' : 'Afrikaans'/.test(notice));
ok('and draws nothing when nothing was switched', /if \(!switched\) return null;/.test(notice));

if (failures) {
  console.error(`\ncheck:language — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:language — a choice wins, the account answers, a guess does neither, and a swap is announced.');

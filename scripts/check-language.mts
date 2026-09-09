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

/* Her case, and the rule that changed because of it.

   Three reports over one day, the last after two separate fixes that were
   both real and neither of which stopped it: "wanneer ek op my mobile app van
   afrikaans af inlog, spring hy nogsteeds engels toe."

   The account used to win here. It no longer does — not because the account
   is wrong, but because it already had its say on arrival, before anything
   was on the screen, and applying it a second time can only take a page away
   from somebody reading it. See `langrule.ts`.

   These four assert the new rule in the shape of the old one's failure, so
   that a change back would be loud rather than quiet. */
const hers = onSignIn(null, 'af', 'en');
ok('her case: what is on the screen stays on the screen', hers.lang === 'en',
  'signing in must never change the language of a page somebody is reading');
ok('and nothing is written to this browser', hers.store === null);
ok('and nothing is announced, because nothing was swapped', hers.switched === null);
ok('and the account is not written over either', hers.keepOnAccount === null,
  'writing the guess up would destroy the very choice the account is holding');

const chose = onSignIn('en', 'af', 'en');
ok('a choice made here is never overruled', chose.lang === 'en');
ok('the account is brought into step with it instead', chose.keepOnAccount === 'en');
ok('and nothing is announced, because nothing changed', chose.switched === null);
ok('nor re-stored, because it is already stored', chose.store === null);

const agreed = onSignIn(null, 'af', 'af');
ok(
  'a page already in the account\'s language is left alone',
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

/* The other direction, which is the one somebody would forget. An English
   account no longer takes an Afrikaans page away either — the rule is about
   not moving the screen, not about which language wins. */
const other = onSignIn(null, 'en', 'af');
ok('it works the other way round too', other.lang === 'af' && other.switched === null);

/* And the reason this is safe: the account is still asked, earlier, where
   there is no reader to disturb. A check that only asserted the removal would
   be asserting that the feature was deleted. */
ok('the account is still asked on arrival, before anything is on screen',
  /const said = await cloud\.accountLanguage\(\);/.test(
    readFileSync('app/lib/i18n.tsx', 'utf8').split('── Signing in')[0],
  ),
  'the laptop case is served there, and that is the whole reason sign-in need not');

/* ── And nobody is asked twice, or paid for twice in attention ──────────── */

console.log('\nand the wiring');

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

const provider = read('app/lib/i18n.tsx');
/* ── Her second report, and the race that silenced the notice ───────────
 *
 * Carli, 9 September 2026: "Wanneer ek vanuit die afrikaanse skerm in log,
 * spring hy na die engels toe wanneer mens in is." The mirror image of the
 * first one, which is why the notice exists at all.
 *
 * The switch itself is the rule working: nothing was chosen on this device —
 * an Afrikaans page from an Afrikaans phone is a guess, and a guess stores
 * nothing — so the account answers, and it says English.
 *
 * What was wrong is that it happened in silence. The decision compared the
 * account against a ref holding "what is on screen", and Supabase's listener
 * fires immediately on registration with the session it already has. On a load
 * where somebody is already signed in that happens inside the first effect
 * pass: `onArrival` has queued Afrikaans, React has not committed it, and the
 * effect that copies it into the ref has not run. The ref still says English.
 * English against English matches, so nothing is announced — and the Afrikaans
 * that was about to paint is replaced without a word.
 *
 * That race was real and the fix for it was real. What it could not do was
 * stop the swap, and she reported the swap a third time. The rule changed:
 * signing in no longer consults the account at all.
 *
 * Which makes the race **unreachable** rather than merely fixed, and that is
 * a stronger thing to be able to assert. These two put both readings of "what
 * this device shows" through the rule and require the same answer from each —
 * if the outcome cannot depend on that value, it cannot depend on whether the
 * value was stale. */
{
  const stale = onSignIn(null, 'en', 'en');
  const fresh = onSignIn(null, 'en', 'af');

  ok('a stale reading of the screen changes nothing',
    stale.switched === null && stale.store === null && stale.keepOnAccount === null,
    JSON.stringify(stale));
  ok('and a fresh one changes nothing either',
    fresh.switched === null && fresh.store === null && fresh.keepOnAccount === null,
    JSON.stringify(fresh));
  ok('so the race that silenced the notice cannot be reached at all',
    stale.store === fresh.store && stale.switched === fresh.switched,
    'if the outcome cannot depend on that reading, it cannot depend on it being stale');
  ok('and each keeps its own screen', stale.lang === 'en' && fresh.lang === 'af',
    'the page somebody is reading is the page they keep');
}

/* And the provider must not be able to ask the stale question again. The ref
   is gone; the decision works the answer out from the same two inputs
   `onArrival` uses, at the moment it decides. */
ok('the sign-in decision does not read what has been painted',
  !/showingRef/.test(provider),
  'a value that depends on whether React has committed yet is a race, not a reading');
ok('it works out what this device would show, from the device',
  /onSignIn\(stored, said, deviceWould\(stored\)\)/.test(provider));
ok('and that reading uses the arrival rule rather than a second copy of it',
  /const deviceWould[\s\S]{0,300}?onArrival\(stored, navigator\.language\)/.test(provider));

ok('the provider uses the rule rather than a second copy of it', /onSignIn\(/.test(provider) && /onArrival\(/.test(provider));
ok(
  'and asks the account only when this browser has nothing to say',
  /asLang\(stored\) \? null : await cloud\.accountLanguage\(\)/.test(provider),
  'otherwise every sign-in is a network call for an answer that cannot be used',
);
/* This assertion used to require the opposite: that the value came through a
   ref rather than being closed over. That was right about the closure and
   wrong about the race — a ref written by an effect is stale for exactly the
   one fire that matters, the immediate one on a page where somebody is
   already signed in. Requiring the ref was requiring the bug.

   Kept as a rule about the shape rather than deleted: nothing in this decision
   may depend on what React has committed. */
ok(
  'nothing in the decision depends on a value another effect has to write',
  !/showingRef/.test(provider) && !/useRef<Lang>/.test(provider),
  'a value another effect fills in is stale on the first fire, which is the fire that matters',
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

/**
 * A reason the room works out has to reach the screen.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Die live se videos wys nogsteeds nie."* The
 * fifth report of the same panel.
 *
 * The round before this one taught `app/api/live/route.ts` to say WHICH of
 * the causes it had hit — the videos could not be read, the row is gone, the
 * file will not sign — because three tasks had been closed on guesses and
 * the room could not tell the three apart. That was the right fix and it was
 * half done: the screen was never taught to print the answer. Every cause
 * still came out as "That file is not there any more", which is a sentence
 * about a deleted file and is wrong for three of the four.
 *
 * A diagnostic nobody can see is the same as no diagnostic, and it cost
 * another round of her looking at the same panel and reporting the same
 * thing. So: every value the route can set, the screen must have a sentence
 * for, in both languages.
 *
 * Read from the route's own union type rather than from a list kept here.
 * A list kept here is a third copy of the same contract, and the one nobody
 * updates — which is exactly the shape of the fault it is meant to catch.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const route = readFileSync('app/api/live/route.ts', 'utf8');
const screen = readFileSync('app/components/LiveChannel.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* The union on the route's own `why`, which is where the causes are
   decided. Matched on the declaration rather than on the assignments: an
   assignment can be added to a branch and a probe looking for assignments
   would not notice one that is never reached. */
const declared = /let why:\s*([^=]+)=/.exec(route)?.[1] ?? '';
const causes = [...declared.matchAll(/'([a-z_]+)'/g)].map((one) => one[1]);

ok('the route declares the causes it can report', causes.length >= 3, declared.trim());

/* And every one of them is actually reachable — a cause in the type that
   nothing ever sets is a sentence on the screen nobody will ever read, and
   reads to the next person as a case that is handled. */
const unreached = causes.filter((one) => !new RegExp(`why = [^;]*'${one}'`).test(route));
ok('  and sets every one of them somewhere', unreached.length === 0, unreached.join(', '));

/* The screen's own ladder. One function, because two copies of a ladder
   disagree — `whySaid` on the cast strip is here for that reason. */
ok('the screen has one place that turns a cause into a sentence',
  /function goneSaid\(/.test(screen),
  'without it the ladder gets copied and the copies drift');
/* Written and never called is the exact shape of the fault this file
   exists for: the route knew which cause it had hit, the answer was in
   the response, and the panel printed the one sentence it had always
   printed. Declaring the ladder is not printing it. */
ok('  and the panel actually prints it',
  /\{goneSaid\(post\.why, t\)\}/.test(screen),
  'a ladder nothing calls is the diagnostic she could not see');

const unsaid = causes.filter((one) => !new RegExp(`why === '${one}'`).test(screen));
ok('  and a sentence for every cause the route can report', unsaid.length === 0,
  unsaid.length ? `${unsaid.join(', ')} — the room would say "that file is gone", which is not true` : '');

/* Read by the same name on both sides. A key printed on the screen and
   missing from the dictionary falls back to its English, which is the
   Afrikaans app quietly speaking English. */
const keys = [...screen.matchAll(/t\('(live\.gone[A-Za-z]*)'/g)].map((one) => one[1]);
ok('  said in more than one way', new Set(keys).size >= causes.length,
  `${new Set(keys).size} sentences for ${causes.length} causes`);

const untranslated = [...new Set(keys)].filter((key) => !words.includes(`"${key}"`));
ok('  and every sentence is in the dictionary, so it is said in Afrikaans too',
  untranslated.length === 0, untranslated.join(', '));

/* And never storage's own words. `check:aifault` holds this for thrown
   errors; this holds it for the one field that was invented to carry a
   reason to a screen. */
ok('the cause never carries a supplier’s sentence to the screen',
  !/why = [^;]*\.message/.test(route) && !/why:\s*[a-z]+\.message/.test(route),
  'a StorageApiError printed on a panel tells nobody anything');

if (failures) {
  console.error(`\ncheck:livewhy — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  `\ncheck:livewhy — the room can report ${causes.length} reasons a video will not play`
  + ', each one is reachable, and each one has its own sentence on the screen in both languages.',
);

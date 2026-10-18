/**
 * The conduct count measures being sworn at, and counts nothing else.
 *
 * ── Why the not-flagged cases are the important half ─────────────────────
 *
 * The owner asked for this so she can set a cut-off from a real number:
 * *"Fair social usage… ons moet 'n afsny punte hê."* A count that is wrong
 * in the generous direction misses some people. A count that is wrong in the
 * other direction puts her own best customers on a list of the worst
 * behaved, and she would not find out until somebody was cut off for writing
 * a song.
 *
 * This app is a music studio. Its members write lyrics, and plenty of good
 * lyrics are filthy. So most of what follows is about what must NOT be
 * counted:
 *
 *   · swearing about the product — she said losing your temper is
 *     understandable, and she is right
 *   · swearing asked for as words in a song
 *   · a swear word with a "you" somewhere else in a long sentence
 *
 * ── And it must stay a measurement ───────────────────────────────────────
 *
 * The last section is the one that matters most and is the easiest to lose:
 * the rule is registered with `counts: false`, and nothing anywhere acts on
 * what `directedAt` returns. The moment something does, this stops being a
 * thirty-day count and becomes an enforcement built on a blunt word list
 * that was never meant to carry one.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { directedAt } from '../app/lib/conduct.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
}

/* ── Counted: aimed at whoever is reading ──────────────────────────────── */

for (const said of [
  'fok jou',
  'jy is \'n poes',
  'fuck you',
  'you are a fucking idiot',
  'you useless piece of shit',
  'jou dom masjien',
  'shut up you moron',
  'jy is onnosel',
]) {
  ok(`counted: "${said}"`, directedAt(said) !== null);
}

/* ── Not counted: annoyed at the thing, which is allowed ──────────────── */

for (const said of [
  'this is fucking broken again',
  'hierdie kak werk nie',
  'the video is shit quality',
  'what a useless error message',
  'fok, ek het dit weer verloor',
  'this stupid thing keeps crashing',
]) {
  ok(`not counted, annoyed at the app: "${said}"`, directedAt(said) === null,
    'she said losing your temper is understandable, and counting it makes the number meaningless');
}

/* ── Not counted: the words are the work ──────────────────────────────── */

for (const said of [
  'write me a chorus that says fok jou',
  'skryf \'n liedjie oor \'n poes van \'n baas',
  'make the lyrics say you are a bastard',
  'can you put "fuck you" in the second verse',
  'a rap line about being called stupid',
]) {
  ok(`not counted, asked for as words: "${said}"`, directedAt(said) === null,
    'this would put the hardest users of a music app at the top of a badly-behaved list');
}

/* ── Not counted: a "you" that is simply elsewhere ────────────────────── */

ok('not counted: a swear word four words past the nearest "you"',
  directedAt('could you have a look at this absolutely fucking hopeless render') === null,
  'proximity is the whole rule — without it every long annoyed sentence counts');

ok('  but counted when it is right beside one',
  directedAt('you absolute fucking waste') !== null);

/* ── The parts of a count ──────────────────────────────────────────────── */

const one = directedAt('jy is \'n poes');
ok('a count says which word and what it was aimed with',
  one?.word === 'poes' && one?.at === 'jy',
  `${one?.word} / ${one?.at}`);

ok('an empty message is not an insult', directedAt('') === null);
ok('  and neither is ordinary help', directedAt('how do I split this song into stems') === null);

/* ── And it is still only a measurement ────────────────────────────────── */

const rules = withoutComments(readFileSync('app/lib/moderation.ts', 'utf8'));
ok('the rule exists', /'abuse'/.test(rules), 'nothing can be filed under a rule that is not declared');

function filesUnder(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.next') filesUnder(path, found);
    } else if (/\.(ts|tsx)$/.test(path)) found.push(path);
  }
  return found;
}

/* Who may even mention it: the file itself, and the one place that records.
   Anything else reading `directedAt` is something acting on it. */
const MAY_USE = new Set(['app/lib/conduct.ts', 'app/lib/server/conduct.ts']);
const acting: string[] = [];
for (const file of filesUnder('app')) {
  if (MAY_USE.has(file)) continue;
  if (/\bdirectedAt\b/.test(withoutComments(readFileSync(file, 'utf8')))) acting.push(file);
}
ok('nothing but the recorder reads the result',
  acting.length === 0,
  `${acting.join(', ')} — the moment a room branches on this, a thirty-day count`
  + ' has quietly become an enforcement built on a blunt word list');

const recorder = withoutComments(readFileSync('app/lib/server/conduct.ts', 'utf8'));
ok('  and it is filed as something that counts against nobody',
  /counts:\s*false/.test(recorder),
  'without this it joins the six-in-thirty ladder and starts suspending people');

if (bad) {
  console.error(`\ncheck:conduct — ${bad} wrong. A count that is wrong in this direction suspends somebody for writing a song.\n`);
  process.exit(1);
}
console.log('\ncheck:conduct — it counts being sworn at, ignores swearing, and still does nothing with either.');

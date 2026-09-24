/**
 * Every room that speaks must let the ear report back.
 *
 * ── The question this answers ────────────────────────────────────────────
 *
 * Carli, 24 September 2026: *"En dan moet ons nog iewers die klient die
 * geleentheid gee om foute in spraak uit te wys. Hoe doen ons dit?"*
 *
 * We already did. `SayItWrong` and `/api/afrikaans` were built in September
 * for exactly this, and they were mounted in two rooms while four rooms
 * produced speech. So the honest answer to "how do we do it" was "we do, but
 * not where you were standing" — which, for the person standing there, is the
 * same as not at all.
 *
 * ── Why a feature existing is not the same as it working ─────────────────
 *
 * `server/sayit.ts` says it about itself: an alias dictionary is easy to build
 * and impossible to build well, because what belongs in it has to come from
 * LISTENING. That makes coverage the whole property. A report box in half the
 * rooms hears half of what is wrong, and the half it misses is invisible —
 * there is no error, no empty state, nothing to notice. It simply gets fewer
 * reports than it should and nobody can tell.
 *
 * Which is this repository's recurring shape again: a check that is green
 * because it measures something ADJACENT to the real thing. "Does the report
 * box exist" was green the whole time.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * A component that calls a route which produces speech must mount
 * `SayItWrong`. Speech, not sound: a room that plays a song somebody else
 * generated is not where a mispronounced word is heard for the first time.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
/* `withoutComments`, not `code` — the thing being looked for IS a string, and
   `code` blanks string bodies. The first run of this check reported that
   `SayItWrong.tsx` does not post to `/api/afrikaans` while reading a file
   whose one fetch does exactly that. See the note in `prose.mts`. */
import { withoutComments } from './prose.mts';

/**
 * The routes that put words in a mouth.
 *
 * `/api/voice/speak` and `/api/eleven` read a script; `/api/dub` performs one
 * in another language; `/api/presenter` drives a face from a reading. Each is
 * a place a listener hears Afrikaans for the first time and can tell us it
 * came out wrong.
 *
 * Deliberately NOT here: `/api/music`. A sung word is a different fault with
 * a different fix — see `check:afrikaans` — and folding the two would put a
 * pronunciation box under a room where the answer is the lyric, not the
 * dictionary.
 */
const SPEAKS = [
  '/api/voice/speak',
  '/api/eleven',
  '/api/dub',
  '/api/presenter',
  /* A podcast episode IS a read — a script put through the speech model — so
     it is the same ear and the same dictionary. */
  '/api/episode',
];

const FILES = readdirSync('app/components', { encoding: 'utf8' })
  .filter((one) => one.endsWith('.tsx'))
  .map((one) => join('app/components', one));

let bad = 0;
let carrying = 0;

/**
 * What a component reaches, following its own imports one hop into `app/lib`.
 *
 * The first version read only the component file, and saw two speaking rooms
 * out of six. `DubEpisode` and `DubFilm` do not `fetch` anything — they call
 * `startDub` out of `lib/dubjob.ts`, which is where `/api/dub` is named. A
 * check that reads only the component is measuring which rooms write their
 * own fetch, which is a fact about coding style and not about which rooms
 * speak. Adjacent again.
 *
 * One hop, not a full graph: every speaking path in this app is component →
 * lib → route, and a transitive walk would start pulling in whatever those
 * libs import for unrelated reasons. If a third hop ever appears, the honest
 * fix is to extend this deliberately rather than to widen it and hope.
 */
function reaches(file: string): string {
  const own = withoutComments(readFileSync(file, 'utf8'));
  let all = own;
  for (const hit of own.matchAll(/from\s+'\.\.\/lib\/([\w/]+)'/g)) {
    const lib = join('app/lib', `${hit[1]}.ts`);
    try {
      all += `\n${withoutComments(readFileSync(lib, 'utf8'))}`;
    } catch {
      // A `.tsx` lib, or one that moved. Not reaching it is the old behaviour.
    }
  }
  return all;
}

for (const file of FILES) {
  const text = reaches(file);
  const speaks = SPEAKS.filter((route) => text.includes(route));
  if (speaks.length === 0) continue;

  /* The box must be in the COMPONENT, not in something it imports — a
     report form is a thing on a screen. */
  if (/<SayItWrong\b/.test(withoutComments(readFileSync(file, 'utf8')))) {
    carrying += 1;
    console.log(`  ok  ${file} speaks (${speaks.join(', ')}) and carries the report`);
    continue;
  }

  bad += 1;
  console.log(
    `  ✗   ${file} calls ${speaks.join(', ')} and has no <SayItWrong>. ` +
      'Somebody hearing a word come out wrong in this room has nowhere to say so, ' +
      'and the dictionary can only be built from what people report.',
  );
}

/* And the box has to reach a route, not merely be drawn. A component nobody
   wired to `/api/afrikaans` is a form that swallows what it is given, which
   is worse than no form: it teaches people that reporting does nothing. */
const box = withoutComments(readFileSync('app/components/SayItWrong.tsx', 'utf8'));
if (!box.includes('/api/afrikaans')) {
  bad += 1;
  console.log('  ✗   SayItWrong.tsx does not post to /api/afrikaans — the box goes nowhere');
} else {
  console.log('  ok  and the box itself posts to /api/afrikaans');
}

console.log(`\n${carrying} speaking room(s) carry the report.`);

if (bad > 0) {
  console.log(`check:earsopen — ${bad} room(s) speak with nowhere to report a wrong word.`);
  process.exitCode = 1;
} else {
  console.log('check:earsopen — every room that speaks lets the person hearing it say so.');
}

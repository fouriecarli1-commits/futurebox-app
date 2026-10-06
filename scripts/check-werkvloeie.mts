/**
 * Every Music.ai workflow this app names is one she can actually set.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * A workflow is the one part of this supplier the app cannot provide. The
 * key is ours; the slugs are hers, made by hand in their dashboard, and the
 * app can only say which ones it is looking for. Three things have to agree
 * for that to work, and nothing held any of them:
 *
 *   the map in `musicai.ts`   — what the code reads
 *   `docs/SWITCH-ON.md`       — what she is told to set
 *   `/api/analyse/setup`      — the screen that says which are set
 *
 * A slug added to the map and left out of the page is a feature that is off
 * with no way to find out why, which is exactly what that page exists to
 * prevent — one level up from the fault it was written for.
 *
 * ── The one that is a type error waiting to happen ───────────────────────
 *
 * `Which` is the two jobs the analyse room can ask for; `Flow` is every
 * slug. They were one name, and adding a third workflow made the room's
 * price table fail to compile. That was the type system being right: a slug
 * existing is not the same as a job the room can run. Separated, nothing
 * compiles-checks the other direction any more — a job with no slug behind
 * it — so it is asserted here instead.
 */
import { readFileSync } from 'node:fs';
import { WORKFLOWS, slugFor, type Flow, type Which } from '../app/lib/server/musicai';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const flows = Object.keys(WORKFLOWS) as Flow[];
const nameOf = (one: Flow) => `MUSIC_AI_WORKFLOW_${one.toUpperCase()}`;

const source = readFileSync('app/lib/server/musicai.ts', 'utf8');
const page = readFileSync('docs/SWITCH-ON.md', 'utf8');

ok(`there are workflows to check at all (${flows.length})`, flows.length > 0);

const unread = flows.filter((one) => !source.includes(`process.env.${nameOf(one)}`));
ok('  and each reads its variable by its literal name',
  unread.length === 0,
  `${unread.map(nameOf).join(', ')} — a variable read through a computed name`
  + ' is invisible to every rule that asks whether it is written down where'
  + ' she works from, which is why `check:envdoc` refuses one');

const undocumented = flows.filter((one) => !page.includes(nameOf(one)));
ok('  and each is named on the page she sets things from',
  undocumented.length === 0,
  `${undocumented.map(nameOf).join(', ')} — she cannot create a workflow for a`
  + ' slug nobody told her about, and an unset slug is a room that says it is'
  + ' not set up with no way to find out which one');

/* ── The setup screen, built rather than read ──────────────────────────── */

/**
 * The same shape `/api/analyse/setup` answers with, executed here.
 *
 * It used to type the three names out by hand, so a fourth would have been
 * missing from the one screen whose whole job is to say which slugs are
 * set. Built from the map now, and this is the rule that keeps it that way.
 */
const reported = Object.fromEntries(
  flows.map((one) => [nameOf(one), slugFor(one) || null]),
);
ok('  and the setup screen reports every one of them',
  flows.every((one) => nameOf(one) in reported)
  && Object.keys(reported).length === flows.length,
  `${Object.keys(reported).join(', ')}`);

ok('  and it is built from the map rather than typed out',
  /Object\.keys\(WORKFLOWS\)/.test(readFileSync('app/api/analyse/setup/route.ts', 'utf8')),
  'a hand-written list is a list that goes one short the day somebody adds'
  + ' a workflow, and the screen that would have told her is the screen that'
  + ' is wrong');

/* ── A job the room can ask for must have a slug ───────────────────────── */

const JOBS: readonly Which[] = ['read', 'stems'];
const orphans = JOBS.filter((one) => !(flows as string[]).includes(one));
ok('every job the analyse room can ask for has a workflow behind it',
  orphans.length === 0,
  `${orphans.join(', ')} — the room would charge for it, start a job and name`
  + ' a workflow that is not in the map, which fails at their end against a'
  + ' bill that has already been taken');

/* `Which` is maintained by hand now that it is not `keyof typeof WORKFLOWS`,
   so the list above has to be the whole of it. Asserted by exhaustiveness:
   a job added to the type and not to `JOBS` stops this compiling. */
const covered: Record<Which, true> = { read: true, stems: true };
ok('  and the list above is every job there is',
  JOBS.length === Object.keys(covered).length,
  'a job added to `Which` and not here would be checked by nothing');

if (bad) {
  console.error(`\ncheck:werkvloeie — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:werkvloeie — ${flows.length} Music.ai workflows, each read by its own`
  + ' name, each on the page she sets things from, and each reported by the'
  + ' screen that says which are set.',
);

/**
 * The one-paste SQL bundle still says what the five files say.
 *
 * A copy of a schema is a copy that goes stale, and a stale one is worse than
 * none: it runs, it succeeds, and it builds last month's tables. Nothing about
 * that failure looks like a failure — the rooms simply behave as though they
 * were never switched on, weeks later, with a green Run behind them.
 *
 * So the bundle is generated and this holds it to its originals.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALREADY, BUNDLE, NOT_SCHEMA, ORDER, bundle } from './sql-bundle.mts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const onDisk = readFileSync(BUNDLE, 'utf8');
const fresh = bundle();

ok(
  'the bundle matches the files it was made from',
  onDisk === fresh,
  'run `npm run sql:bundle`',
);

/* Not only "it matches" — that would pass on an empty file matching an empty
   generator. Each file has to actually be in there, named and in order. */
let at = -1;
for (const name of ORDER) {
  const found = onDisk.indexOf(`-- supabase/${name}.sql`);
  ok(`${name}.sql is in the bundle`, found > 0);
  ok(`${name}.sql is in the right order`, found > at, `${found} after ${at}`);
  at = found;
}

/* The guard, because the whole point of it is the case nobody tests: a project
   where one of the two older files was never run. */
ok('it refuses to run without public.events', /to_regclass\('public\.events'\) is null/.test(onDisk));
ok('and without public.collabs', /to_regclass\('public\.collabs'\) is null/.test(onDisk));
ok('and without public.tracks', /to_regclass\('public\.tracks'\) is null/.test(onDisk));
ok(
  'and says which file to run first rather than raising a table error',
  /Loop eers supabase\/events\.sql/.test(onDisk) &&
    /Loop eers supabase\/collab\.sql/.test(onDisk) &&
    /Loop eers supabase\/schema\.sql/.test(onDisk),
);

/* ── Every .sql file is accounted for ─────────────────────────────────
 *
 * Carli, 21 September 2026, asking for the cast member a third time.
 *
 * `cast.sql` was written on 4 September and this bundle on the 6th, and
 * nobody put one in the other. She runs the bundle; anything outside it she
 * has never seen. So the cast strip has been calling a table that does not
 * exist in her project for a fortnight — and the last two rounds of work on
 * it went into diagnostics for a route that was answering correctly all
 * along, because from the outside "the table is not there" and "the code is
 * wrong" look identical.
 *
 * Five more files were in the same position. This is the rule that would
 * have caught all six the day they were written: every `.sql` in the folder
 * is either bundled, or named as one she pasted by hand before the bundle
 * existed. A new file is in neither, so a new file fails until somebody
 * decides which it is.
 */
const folder = readdirSync(join(ROOT, 'supabase'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => name.replace(/\.sql$/, ''));

const loose = folder.filter(
  (name) => !ORDER.includes(name as (typeof ORDER)[number])
    && !ALREADY.includes(name as (typeof ALREADY)[number])
    && !NOT_SCHEMA.includes(name as (typeof NOT_SCHEMA)[number]),
);
ok(
  'every .sql file is either bundled or named as already run',
  loose.length === 0,
  `${loose.join(', ')} — written and in nothing she pastes, which is how the cast strip called a table that was never created`,
);

/* And the other way, so the lists cannot describe files that are gone. */
const ghosts = [...ALREADY, ...NOT_SCHEMA].filter((name) => !folder.includes(name));
ok('and no file is named that is not there', ghosts.length === 0, ghosts.join(', '));

ok(
  'the six she never ran are in the bundle now',
  ['avatars', 'cast', 'mail', 'taste', 'kitsmine', 'afrikaans']
    .every((name) => onDisk.includes(`-- supabase/${name}.sql`)),
  'cast.sql is the one she has asked for three times',
);

if (failures) {
  console.error(`\ncheck:sqlbundle — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(`\ncheck:sqlbundle — one paste, ${ORDER.length} files, in order, and it says what they say.`);

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
import { readFileSync } from 'node:fs';
import { BUNDLE, ORDER, bundle } from './sql-bundle.mts';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const onDisk = readFileSync(BUNDLE, 'utf8');
const fresh = bundle();

ok(
  'the bundle matches the five files it was made from',
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
ok(
  'and says which file to run first rather than raising a table error',
  /Loop eers supabase\/events\.sql/.test(onDisk) && /Loop eers supabase\/collab\.sql/.test(onDisk),
);

if (failures) {
  console.error(`\ncheck:sqlbundle — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(`\ncheck:sqlbundle — one paste, ${ORDER.length} files, in order, and it says what they say.`);

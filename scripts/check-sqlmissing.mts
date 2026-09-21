/**
 * The "what is missing" query is real, current, and cannot change anything.
 *
 * ── What it guards ───────────────────────────────────────────────────────
 *
 * `supabase/WATKORT.sql` is the answer to the second half of the cast fault.
 * The first half — a file written and never bundled — is `check:sqlbundle`.
 * The second half is that `ALREADY` in `sql-bundle.mts` is a list of
 * ASSUMPTIONS: sixteen files left out of the bundle because somebody believes
 * she ran them in August. WATKORT stops that being a belief.
 *
 * Which makes it exactly the kind of file that is dangerous when stale. It
 * comes back with no rows and she believes her project is complete — the
 * same sentence, whether it checked eighty-two things or none.
 *
 * So: it must match what the `.sql` files currently say, it must actually
 * look for a sensible number of things, and it must not be able to WRITE.
 *
 * ── The last one matters most ────────────────────────────────────────────
 *
 * A diagnostic she is afraid to run is a diagnostic she will not run, and the
 * whole value of this file is that she can paste it on a Saturday with people
 * on the app. One `select`. The rule below reads the generated SQL for any
 * statement that could change something, and a single `insert` slipped in by
 * a later edit fails the build.
 */

import { readFileSync } from 'node:fs';
import { NOT_SCHEMA } from './sql-bundle.mts';
import { REPORT, expected, report } from './sql-missing.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const onDisk = readFileSync(REPORT, 'utf8');
const fresh = report();

ok('supabase/WATKORT.sql is what the .sql files say today', onDisk === fresh,
  'run `npm run sql:missing` — a stale list comes back empty and then you believe it');

const all = expected();
const tables = all.filter((one) => one.kind === 'tabel');
const columns = all.filter((one) => one.kind === 'kolom');
const buckets = all.filter((one) => one.kind === 'emmer');

/* Floors, not exact numbers: the point is that the parser found things, so
   that a regex broken by a reformatted .sql file cannot quietly produce a
   query that looks for nothing and reports everything fine. These are well
   under today's 44 / 32 / 6, so adding schema never fails this and losing
   most of it always does. */
ok('  and it looks for a real number of tables', tables.length >= 30, `${tables.length}`);
ok('  and for the columns that arrived after their table', columns.length >= 15, `${columns.length}`);
ok('  and for the storage buckets', buckets.length >= 4, `${buckets.length}`);

/* The cast fault itself, by name. The one thing this file exists for. */
const named = (kind: string, name: string) => all.some((one) => one.kind === kind && one.name === name);
ok('  and the cast table and its bucket are among them',
  named('tabel', 'public.cast_members') && named('emmer', 'cast'),
  'the fault this file was written for');

/* It reads. It does not write. */
const statements = onDisk.replace(/--.*$/gm, '');
const writes = ['insert', 'update', 'delete', 'drop', 'truncate', 'grant', 'revoke']
  .filter((word) => new RegExp(`\\b${word}\\s`, 'i').test(statements));
/* `create` and `alter` are looked for separately: the words appear inside
   nothing here, so a bare match is right, but the message differs. */
const makes = ['create table', 'create policy', 'alter table']
  .filter((phrase) => new RegExp(phrase, 'i').test(statements));
ok('  and it cannot change anything', writes.length === 0 && makes.length === 0,
  [...writes, ...makes].join(', ') || '',
);
ok('  and it is one select', (statements.match(/\bselect\b/gi) ?? []).length >= 1
  && /^\s*with verwag/m.test(statements), 'the query should be a single read');

/* Every kind it lists has a branch that can find it. A kind with no branch
   is a whole class of missing thing reported as present. */
for (const kind of new Set(all.map((one) => one.kind))) {
  ok(`  and a '${kind}' that is missing has a rule that finds it`,
    new RegExp(`soort = '${kind}' and`, 'i').test(onDisk),
    'listed but never checked, which reads as "nothing missing"');
}

ok('  and the file is filed as generated rather than as schema',
  (NOT_SCHEMA as readonly string[]).includes('WATKORT'),
  'check:sqlbundle would otherwise demand it be bundled and run');

if (failures) {
  console.error(`\ncheck:sqlmissing — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  `\ncheck:sqlmissing — WATKORT.sql matches the ${all.length} things the .sql files describe,`
  + ' every kind it lists has a rule that can find it, and it cannot write.',
);

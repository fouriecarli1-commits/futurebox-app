/**
 * Every file in `supabase/` is actually run by a Postgres.
 *
 * ── What this found the day it was written ───────────────────────────────
 *
 * `supabase/afrikaans.sql` did not run. Its last statement was
 *
 *   create unique index … on public.afrikaans_reports
 *     (owner, lower(btrim(word)), (created_at::date));
 *
 * and Postgres refuses it:
 *
 *   ERROR: functions in index expression must be marked IMMUTABLE
 *
 * A `timestamptz` cast to a `date` depends on the session's TimeZone, so the
 * expression can give a different answer tomorrow than today — and an index
 * has to give the same one. Nothing in this repository could have told us.
 * The file was written, reviewed, committed, bundled, and handed to Carli to
 * paste into the SQL editor, where she would have read an error and had no
 * table.
 *
 * ── Why `check:sqlbundle` did not catch it ───────────────────────────────
 *
 * Because it asks a different question, honestly and well: does the one-paste
 * bundle still say what the files say? It does. Both were equally unrunnable.
 *
 * That is this session's lesson for the seventh time. A check can be green
 * and prove nothing, and the way it happens is never carelessness — it is a
 * check that measures a real property adjacent to the one that matters. The
 * schema had a consistency check and no correctness check, and consistency
 * reads like correctness right up to the moment somebody runs it.
 *
 * ── Where the Postgres comes from ────────────────────────────────────────
 *
 * `PGURL` in the environment, or a local server on the default socket. CI
 * runs a `postgres:16` service and sets it. Without one this check SKIPS
 * loudly rather than passing quietly: a green tick for a check that did not
 * run is the thing this file exists to stop.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const PGURL = process.env.PGURL ?? process.env.DATABASE_URL ?? '';

/**
 * How to name a database to psql.
 *
 * Through `URL` rather than by chopping the string. The first version did
 * `PGURL.replace(/\/[^/]*$/, '')`, which is right for
 * `postgres://host/dbname` and wrong for a unix socket, where the path is in
 * the query — `?host=/tmp` — and the regex eats that instead. The check then
 * could not connect and reported SKIPPED, which is the one outcome it was
 * written to make impossible to get by accident.
 *
 * With no `PGURL`, `-d name` and psql's own `PGHOST`/`PGPORT`/`PGUSER`.
 */
function conn(db: string): string[] {
  if (!PGURL) return ['-d', db];
  const url = new URL(PGURL);
  url.pathname = `/${db}`;
  return [url.toString()];
}

/** The database `PGURL` itself names, which is the one safe to connect to
 *  while creating and dropping the throwaway ones. */
function adminDb(): string {
  if (!PGURL) return 'postgres';
  return new URL(PGURL).pathname.replace(/^\//, '') || 'postgres';
}

/** psql against `db`, returning its combined output; throws with it on error. */
function psql(db: string, args: string[]): string {
  return execFileSync('psql', [...conn(db), '-v', 'ON_ERROR_STOP=1', '-q', '-X', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PGOPTIONS: '--client-min-messages=warning' },
  });
}

/* Reachable at all? A connection that is refused is not a schema fault, and
   reporting it as one sends somebody looking in the wrong file. */
let reachable = true;
let whyNot = '';
try {
  psql(adminDb(), ['-c', 'select 1']);
} catch (error) {
  reachable = false;
  whyNot = String((error as { stderr?: string }).stderr ?? error).split('\n')[0].slice(0, 160);
}

if (!reachable) {
  console.log('\ncheck:sqlruns — SKIPPED: no Postgres.');
  console.log('  Set PGURL, or start one locally. CI runs a postgres:16 service.');
  if (whyNot) console.log(`  psql said: ${whyNot}`);
  console.log('  This is a skip, not a pass. Nothing about the schema was checked.\n');
  process.exit(0);
}

const DB = `sqlruns_${process.pid}`;
const admin = adminDb();
psql(admin, ['-c', `drop database if exists ${DB}`, '-c', `create database ${DB}`]);
process.on('exit', () => {
  try { psql(admin, ['-c', `drop database if exists ${DB}`]); } catch { /* going anyway */ }
});

/* What Supabase provides and a bare Postgres does not. Kept in its own file
   so it is readable as the list of assumptions our SQL makes. */
psql(DB, ['-f', 'scripts/sql-stubs.sql']);

/** Every file somebody is meant to paste into the SQL editor.
 *
 *  `ALMAL.sql` is the generated one-paste bundle and gets its own database
 *  below — running it into the same one would prove only that `if not
 *  exists` works. `TOETSTOEGANG.sql` is a tool with a placeholder in it that
 *  raises on purpose until somebody fills it in, and is handled last. */
const SPECIAL = new Set(['ALMAL.sql', 'TOETSTOEGANG.sql']);
const files = readdirSync('supabase')
  .filter((one) => one.endsWith('.sql') && !SPECIAL.has(one))
  .sort();

ok('there are schema files to run', files.length > 10, `${files.length}`);

/* Run them until the set stops shrinking, rather than hard-coding an order.
 *
 * They genuinely depend on each other — `hearts.sql` needs `live_posts`,
 * `avatars.sql` says out loud to run `radar.sql` first — and a hand-written
 * order is one more thing to keep in step with reality. A fixpoint finds an
 * order that works if one exists, and what is left over when it settles is a
 * file that cannot run in ANY order, which is the real fault.
 */
let left = ['schema.sql', ...files.filter((one) => one !== 'schema.sql')];
const why = new Map<string, string>();
for (let round = 0; round < 6 && left.length; round += 1) {
  const still: string[] = [];
  for (const one of left) {
    try {
      psql(DB, ['-f', `supabase/${one}`]);
      why.delete(one);
    } catch (error) {
      still.push(one);
      const said = String((error as { stderr?: string }).stderr ?? error);
      why.set(one, (said.match(/ERROR:.*/) ?? [said.slice(0, 200)])[0]);
    }
  }
  if (still.length === left.length) break; // Nothing moved; it will not.
  left = still;
}

ok('every schema file runs against a real Postgres', left.length === 0,
  left.map((one) => `\n         ${one}: ${why.get(one)}`).join(''));

/* And twice, because the header of every one of them says "safe to run
   again" and somebody will. A second run that fails is a file that cannot be
   re-pasted after a half-finished first attempt — which is exactly when
   somebody re-pastes it. */
const twice: string[] = [];
for (const one of files) {
  try {
    psql(DB, ['-f', `supabase/${one}`]);
  } catch (error) {
    twice.push(`${one}: ${(String((error as { stderr?: string }).stderr ?? error).match(/ERROR:.*/) ?? [''])[0]}`);
  }
}
ok('  and running it a second time changes nothing', twice.length === 0,
  twice.map((one) => `\n         ${one}`).join(''));

/* ── The one-paste bundle, into a database of its own ──────────────────── */
const BUNDLE_DB = `sqlruns_bundle_${process.pid}`;
psql(admin, ['-c', `drop database if exists ${BUNDLE_DB}`, '-c', `create database ${BUNDLE_DB}`]);
process.on('exit', () => {
  try { psql(admin, ['-c', `drop database if exists ${BUNDLE_DB}`]); } catch { /* going anyway */ }
});
psql(BUNDLE_DB, ['-f', 'scripts/sql-stubs.sql']);
/* The bundle stands on the older files, the way the real project does — it
   is the eleven newer ones, not the whole schema. So the same fixpoint runs
   the others in first, then the bundle. */
let base = ['schema.sql', ...files.filter((one) => one !== 'schema.sql')];
for (let round = 0; round < 6 && base.length; round += 1) {
  const still: string[] = [];
  for (const one of base) {
    try { psql(BUNDLE_DB, ['-f', `supabase/${one}`]); } catch { still.push(one); }
  }
  if (still.length === base.length) break;
  base = still;
}
let bundleSaid = '';
try {
  psql(BUNDLE_DB, ['-f', 'supabase/ALMAL.sql']);
} catch (error) {
  bundleSaid = (String((error as { stderr?: string }).stderr ?? error).match(/ERROR:.*/) ?? ['failed'])[0];
}
ok('the one-paste bundle runs too', bundleSaid === '', bundleSaid);

/* ── The test-access tool, both ways round ─────────────────────────────── */
/*
 * `TOETSTOEGANG.sql` is the one file here that is a tool rather than a
 * schema: it grants the marketing add-on to one account so it can be tested
 * without a payment. Its whole design is that it refuses until somebody
 * names an account, so both halves are asserted — it refuses unfilled, and
 * it actually grants when filled.
 *
 * The address used is a test one. A real person's email does not belong in
 * this repository, and a check that needs one would be a reason to put it
 * there.
 */
const TOETS = 'supabase/TOETSTOEGANG.sql';
const raw = readFileSync(TOETS, 'utf8');

/* The placeholder read off the file rather than typed here. A check that
   knows the placeholder better than the file does goes stale in silence:
   somebody renames it, the fill-in below stops filling anything in, and the
   "it grants" assertion starts passing for the wrong reason. */
const placeholder = (raw.match(/the_email text := '([^']+)'/) ?? [])[1] ?? '';
ok('the test-access script has a placeholder to fill in', placeholder !== '',
  "no `the_email text := '…'` — the two assertions below cannot mean anything");

let refused = false;
try {
  psql(DB, ['-f', TOETS]);
} catch {
  refused = true;
}
ok('  and refuses while it is unfilled', refused,
  'it would grant a paid room to nobody, or to a placeholder');

if (placeholder) {
  const WHO = 'toets@futurebox.test';
  const filled = `${tmpdir()}/toetstoegang-${process.pid}.sql`;
  writeFileSync(filled, raw.replaceAll(placeholder, WHO));
  process.on('exit', () => { try { rmSync(filled); } catch { /* going anyway */ } });

  psql(DB, ['-c',
    `insert into auth.users (id, email) values (gen_random_uuid(), '${WHO}') on conflict do nothing`]);

  let granted = '';
  try {
    psql(DB, ['-f', filled]);
    granted = psql(DB, ['-tAc',
      `select count(*) from public.addons a join auth.users u on u.id = a.owner` +
      ` where u.email = '${WHO}' and a.addon = 'marketing' and a.until > now()`]).trim();
  } catch (error) {
    granted = `threw: ${(String((error as { stderr?: string }).stderr ?? error).match(/ERROR:.*/) ?? [''])[0]}`;
  }
  ok('  and grants the month once an address is in it', granted === '1',
    `${granted} — the tool she runs to open the desk does not open it`);

  /* And it is findable afterwards. The file's own closing note says a
     "test-" reference marks what was given away rather than bought, and
     that is the query somebody runs before a launch — so it had better
     return this row. */
  let marked = '';
  try {
    marked = psql(DB, ['-tAc',
      `select count(*) from public.addons a join auth.users u on u.id = a.owner` +
      ` where u.email = '${WHO}' and a.reference like 'test-%'`]).trim();
  } catch {
    marked = 'threw';
  }
  ok('  and the row says it was given rather than bought', marked === '1',
    `${marked} — nothing marks it, so it cannot be found before a launch`);
}

if (failures) {
  console.error(`\ncheck:sqlruns — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:sqlruns — all ${files.length} schema files and the bundle run, twice, on Postgres.`);

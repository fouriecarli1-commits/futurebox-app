/**
 * Every table this app creates names who may reach it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Supabase to the owner, 20 October 2026: from 30 October a table created in
 * "public" is no longer opened to the API roles by itself. Any table made
 * after that date with no GRANT answers "permission denied" to every read and
 * write — the server's included, since it reaches the database as
 * `service_role` through the same API.
 *
 * The tables already on her project keep the grants they were given. The
 * danger is the next one: a file in `supabase/` run for the first time after
 * the 30th, a new project for Play testing, a preview branch. Thirty-two of
 * the files here named no grant at all on the day the e-mail came, because
 * until then nothing needed them to.
 *
 * So: every `create table` in a file has a grant to `service_role` on that
 * table in the same file, and a table some policy lets people at also has one
 * to `authenticated` — row level security still decides which rows; the grant
 * only lets the role ask. And the bundle the owner actually pastes carries
 * them too.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

/* The bundle and the read-only questions are made from the files, not files
   that make tables of their own. */
const NOT_SOURCES = new Set(['ALMAL.sql', 'WATKORT.sql', 'WATISGEDOEN.sql', 'TOETSTOEGANG.sql']);
const code = (sql: string): string => sql.replace(/--[^\n]*/g, '');

/* Tables the server is deliberately kept out of. A child's own songs are read
   by the child's session alone — check:plankserver forbids any server grant on
   them — so here "names service_role" is the wrong question. Each one is named
   with its reason, so an exception is a decision someone wrote down. */
const NOT_THE_SERVERS: Record<string, string> = {
  kid_shelf: "a child's songs, readable by the child's own session only (check:plankserver)",
};

const missing: string[] = [];
const noUser: string[] = [];
let tables = 0;
for (const name of readdirSync('supabase').filter((one) => one.endsWith('.sql') && !NOT_SOURCES.has(one)).sort()) {
  const sql = code(readFileSync(join('supabase', name), 'utf8'));
  for (const [, table] of sql.matchAll(/create table (?:if not exists )?(?:public\.)?"?([a-z_0-9]+)"?/gi)) {
    tables += 1;
    const grantTo = (role: string): boolean =>
      new RegExp(`grant[^;]*\\bon (?:table )?(?:public\\.)?${table}\\b[^;]*\\bto\\b[^;]*\\b${role}\\b[^;]*;`, 'i').test(sql);
    if (NOT_THE_SERVERS[table]) {
      if (!grantTo('authenticated')) noUser.push(`${name}: ${table}`);
      continue;
    }
    if (!grantTo('service_role')) missing.push(`${name}: ${table}`);
    const policy = new RegExp(`create policy[^;]*?\\bon (?:public\\.)?${table}\\b`, 'i').test(sql);
    if (policy && !grantTo('authenticated') && !new RegExp(`revoke[^;]*\\bon (?:public\\.)?${table}\\b[^;]*authenticated`, 'i').test(sql)) {
      noUser.push(`${name}: ${table}`);
    }
  }
}

ok(`every table names service_role in a grant (${tables} tables)`, missing.length === 0, missing.join(', '));
ok('every table a policy opens to people names authenticated in a grant', noUser.length === 0, noUser.join(', '));

const bundle = readFileSync('supabase/ALMAL.sql', 'utf8');
ok('the bundle she pastes carries the grants', /grant select, insert, update, delete on public\.tracks to service_role;/.test(bundle),
  'run npm run sql:bundle');

if (failures) {
  console.error(
    '\ncheck:sqlgrants — from 30 October 2026 Supabase opens no new table to the API by itself.\n' +
      'Add the grants in the same file that creates the table, then npm run sql:bundle.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:sqlgrants — all ${tables} tables say who may reach them, and the bundle carries it.`);

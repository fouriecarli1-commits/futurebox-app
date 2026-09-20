/**
 * Every column the app reads is a column the SQL creates.
 *
 * ── The evening this is for ──────────────────────────────────────────────
 *
 * Carli, 20 September 2026, twice in one night: *"The gallery could not be
 * read just now."* The first time it was `paid_rand`; the second it was
 * `ends_at` and `won_by`. Both times the room showed one sentence, neither
 * of us could tell which column, and the second one needed a hand-written
 * `information_schema` query composed for her over chat.
 *
 * Those two were HER database being behind the repository — the Supabase
 * editor runs a script as one transaction, so a statement failing at the
 * bottom rolls back the twenty above it while looking like an ordinary
 * error. `missingFrom` in `/api/artmarket` now names the columns at
 * runtime, which is the answer to that.
 *
 * This is the other half, and the one that is mine rather than hers: a
 * route asking for a column that NO sql file creates. Same sentence on her
 * screen, same dead end, except running the SQL would not fix it. I have
 * added four columns to that route this session and could have shipped
 * exactly this at any point — `preview`, `ends_at`, `won_by`, `paid_rand`
 * — and nothing in this repository would have said a word.
 *
 * ── What it can and cannot see ───────────────────────────────────────────
 *
 * It reads `.from('table').select('a, b, c')` pairs out of the routes and
 * looks each column up in `supabase/*.sql`. A table it cannot find a
 * `create table` for is counted and skipped, not failed: `auth.users` and
 * anything Supabase provides are not ours to create. Selects built at
 * runtime are resolved when the array is a plain `const` in the same file
 * and skipped otherwise — the alternative is a check that pretends to
 * cover what it cannot read.
 *
 * Skipped is printed. A number that quietly grows is how a check stops
 * being one.
 *
 *   npm run check:sqlcolumns
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

/* ── What the SQL creates ─────────────────────────────────────────────── */

/* Comments stripped first, and this is not tidiness.
 
   A statement's end is a semicolon, and `livevideo.sql` has one INSIDE a
   comment — *"`seconds` already exists and is what was *asked* for; a
   filmed take's length is…"* — three lines above `add column if not
   exists seconds_real`. The parser stopped at it and reported a column as
   uncreated that is created in the statement it was reading. A prose
   semicolon is not a statement boundary. */
const sql = readdirSync('supabase')
  .filter((name) => name.endsWith('.sql') && name !== 'ALMAL.sql')
  .map((name) => readFileSync(join('supabase', name), 'utf8'))
  .join('\n')
  .replace(/--.*$/gm, '');

/** table → the columns any sql file gives it. */
const made = new Map<string, Set<string>>();
const put = (table: string, column: string): void => {
  const has = made.get(table) ?? new Set<string>();
  has.add(column);
  made.set(table, has);
};

/* `create table [if not exists] public.x ( ... );` — the first word of each
   line inside the parentheses that is not a constraint keyword. */
for (const found of sql.matchAll(
  /create table (?:if not exists )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\)\s*;/g,
)) {
  const table = found[1];
  made.set(table, made.get(table) ?? new Set());
  for (const line of found[2].split('\n')) {
    const bare = line.replace(/--.*$/, '').trim();
    const name = /^(\w+)\s+\S/.exec(bare)?.[1];
    if (!name) continue;
    if (/^(primary|unique|foreign|constraint|check|exclude)$/i.test(name)) continue;
    put(table, name);
  }
}

/* One `alter table` can add several columns, separated by commas, and the
   first version of this took only the first of them — which reported
   `videos.seconds_real` as uncreated when it is created two lines under
   `videos.source` in the same statement. So: the whole statement, then
   every `add column` inside it. */
for (const found of sql.matchAll(/alter table (?:public\.)?(\w+)([\s\S]*?);/g)) {
  for (const one of found[2].matchAll(/add column (?:if not exists )?(\w+)/g)) {
    put(found[1], one[1]);
  }
}

/* A view is read exactly like a table, and its columns are its aliases. */
for (const found of sql.matchAll(
  /create (?:or replace )?view (?:public\.)?(\w+) as([\s\S]*?);/g,
)) {
  made.set(found[1], made.get(found[1]) ?? new Set());
  const body = found[2];
  for (const alias of body.matchAll(/\bas\s+(\w+)/gi)) put(found[1], alias[1]);
  /* And the ones with no alias, which keep their own name. `art_top_bids`
     selects `work, max(rand) as top, count(*) as bids` — two aliases and
     one bare column, and taking only the aliases reported `work` as a
     column of a view that plainly has it. */
  const list = body.slice(body.toLowerCase().indexOf('select') + 6, body.toLowerCase().indexOf(' from '));
  for (const part of list.split(',')) {
    const bare = /^\s*(?:\w+\.)?(\w+)\s*$/.exec(part);
    if (bare) put(found[1], bare[1]);
  }
}

ok(`the sql files describe ${made.size} tables and views`, made.size > 20, `${made.size}`);

/* ── What the routes read ─────────────────────────────────────────────── */

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path, out);
    else if (path.endsWith('.ts')) out.push(path);
  }
  return out;
};

const problems: string[] = [];
let checked = 0;
const skipped = new Map<string, number>();
const skip = (why: string): void => { skipped.set(why, (skipped.get(why) ?? 0) + 1); };

for (const file of walk('app/api')) {
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  /* Arrays a select is built from, when they are plain in this file. */
  const arrays = new Map<string, string[]>();
  for (const found of source.matchAll(/const (\w+) = \[([^\]]*)\] as const;/g)) {
    const items = [...found[2].matchAll(/'([^']+)'/g)].map((one) => one[1]);
    if (items.length) arrays.set(found[1], items);
  }

  for (const found of source.matchAll(
    /\.from\('(\w+)'\)\s*(?:\.\w+\([^)]*\)\s*)*?\.select\(\s*([^)]*?)\s*\)/g,
  )) {
    const table = found[1];
    const raw = found[2].trim();

    let columns: string[] | null = null;
    const literal = /^'([^']*)'$/.exec(raw);
    if (literal) columns = literal[1].split(',').map((one) => one.trim());
    else {
      const built = /^(\w+)\.join\(/.exec(raw);
      if (built && arrays.has(built[1])) columns = [...(arrays.get(built[1]) as string[])];
    }
    if (!columns) { skip('a select this cannot read'); continue; }
    if (columns.some((one) => one === '*' || one === '')) { skip('select(*)'); continue; }

    const has = made.get(table);
    if (!has) { skip(`a table no sql file creates (${table})`); continue; }

    for (const column of columns) {
      /* `count`, an alias, or a joined table — none of them a plain
         column of this table, and none of them this check's business. */
      if (!/^\w+$/.test(column)) continue;
      checked += 1;
      if (!has.has(column)) {
        problems.push(`${file}: ${table}.${column} is selected and no sql file creates it`);
      }
    }
  }
}

ok(`and every one of the ${checked} columns the routes read is created somewhere`,
  problems.length === 0, problems.slice(0, 6).join(' ;; '));

if (skipped.size) {
  console.log('  --   not read, and counted rather than ignored:');
  for (const [why, how] of [...skipped.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`         ${String(how).padStart(3)} × ${why}`);
  }
}

if (failures) {
  console.error(
    '\ncheck:sqlcolumns — a column the app selects and the SQL never creates is the same sentence'
    + ' on her screen as a migration she has not run, except that running it does not help.\n',
  );
  process.exit(1);
}
console.log(
  `\ncheck:sqlcolumns — ${checked} column reads across ${made.size} tables and views, all created.`,
);

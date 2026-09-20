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

  /* ── One chain at a time ────────────────────────────────────────────

     `.from('x')` and everything hanging off it up to the next `.from(`
     or the end of the statement. Taken as a block rather than by
     matching `.from(…).select(…)` directly, because a column can reach
     the database through eight other calls and the one that started
     this check — `/api/radar` ordering by a column that does not exist
     — was BOTH a select and an order. A rule that reads only selects
     would have caught that one by luck. */
  const chains = [...source.matchAll(/\.from\('(\w+)'\)/g)].map((found, i, all) => {
    const from = (found.index ?? 0) + found[0].length;
    /* The chain ends at its own semicolon, or at the next `.from(` if it
       somehow has none. Capping by a character count instead — which is
       what this did first — lets one chain read the next statement's
       calls and blame this table for another table's columns. It found
       nothing wrong here, which is exactly how a false positive of that
       shape would first appear: as a real-looking bug, months later. */
    const semi = source.indexOf(';', from);
    const next = i + 1 < all.length ? (all[i + 1].index ?? source.length) : source.length;
    return { table: found[1], body: source.slice(from, Math.min(semi < 0 ? next : semi, next)) };
  });

  for (const chain of chains) {
    const has = made.get(chain.table);
    if (!has) { skip(`a table no sql file creates (${chain.table})`); continue; }

    /** Every column this chain names, with how it named it. */
    const named: { column: string; how: string }[] = [];

    /* What it reads back. */
    for (const found of chain.body.matchAll(/^\s*\.select\(\s*([^)]*?)\s*\)/gm)) {
      const raw = found[1].trim();
      const literal = /^'([^']*)'$/.exec(raw);
      let columns: string[] | null = null;
      if (literal) columns = literal[1].split(',').map((one) => one.trim());
      else {
        const built = /^(\w+)\.join\(/.exec(raw);
        if (built && arrays.has(built[1])) columns = [...(arrays.get(built[1]) as string[])];
      }
      if (!columns) { skip('a select this cannot read'); continue; }
      if (columns.some((one) => one === '*' || one === '')) { skip('select(*)'); continue; }
      for (const column of columns) named.push({ column, how: 'selected' });
    }

    /* What it filters and sorts on. A `.eq('work', …)` against a column
       that is not there fails the same way a select does. */
    for (const found of chain.body.matchAll(
      /\.(eq|neq|gt|gte|lt|lte|is|in|like|ilike|contains|order)\(\s*'([^']+)'/g,
    )) named.push({ column: found[2], how: found[1] === 'order' ? 'ordered by' : `filtered on with .${found[1]}()` });

    /* And what it writes. An insert naming a column that is not there is
       refused outright, which is a button that does nothing. */
    for (const found of chain.body.matchAll(/\.(insert|update|upsert)\(\s*\{([^}]*)\}/g)) {
      for (const key of found[2].matchAll(/(?:^|,)\s*(\w+)\s*:/g)) {
        named.push({ column: key[1], how: `written by .${found[1]}()` });
      }
      if (/\.\.\./.test(found[2])) skip(`a spread in an ${found[1]}`);
    }

    for (const { column, how } of named) {
      /* An alias, a joined table, a count — none of them a plain column
         of this table and none of this check's business. */
      if (!/^\w+$/.test(column)) continue;
      checked += 1;
      if (!has.has(column)) {
        problems.push(`${file}: ${chain.table}.${column} is ${how} and no sql file creates it`);
      }
    }
  }
}

ok(`and every one of the ${checked} columns the routes read or write is created somewhere`,
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
  `\ncheck:sqlcolumns — ${checked} column uses across ${made.size} tables and views, all created.`,
);

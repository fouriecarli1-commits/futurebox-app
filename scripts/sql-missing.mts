/**
 * One query that answers "is my project actually set up?" instead of guessing.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * The cast strip was broken for a fortnight and no code was wrong. `cast.sql`
 * had never been run, because it was written two days after `ALMAL.sql` and
 * nobody put one in the other. Two rounds of work went into diagnosing a
 * route that was answering correctly the whole time.
 *
 * `check:sqlbundle` now stops a file being written and never bundled. But it
 * cannot stop the other half of that fault, which is this: `ALREADY` in
 * `sql-bundle.mts` is a LIST OF ASSUMPTIONS. Sixteen files are left out of
 * the bundle because somebody believes she pasted them in August. If she
 * missed one, the room that needs it fails exactly the way the cast strip
 * failed — and the bundle will never fix it, because the bundle deliberately
 * excludes it.
 *
 * So rather than assume, ask her project. This writes a query she pastes into
 * the Supabase SQL editor that names every table, added column and storage
 * bucket the app expects, checks each one, and returns a row per missing
 * thing with the file that creates it. Nothing comes back means nothing is
 * missing.
 *
 * ── It reads and writes nothing ──────────────────────────────────────────
 *
 * One `select` over `to_regclass`, `information_schema.columns` and
 * `storage.buckets`. No `create`, no `insert`, no `alter`. Safe to run at any
 * time, including on a Saturday with members on the app, which matters: a
 * diagnostic she is afraid to run is a diagnostic she will not run.
 *
 * ── Generated, and checked ───────────────────────────────────────────────
 *
 * Same argument as `ALMAL.sql`. A hand-written list of what the schema should
 * contain is a list that goes stale, and a stale one is worse than none — it
 * comes back empty and you believe it. Built from the `.sql` files
 * themselves, and `check:sqlmissing` fails when the two disagree.
 *
 * ── Only columns added AFTER a table, on purpose ─────────────────────────
 *
 * A column inside `create table` arrives with its table, so it cannot be
 * missing on its own and listing it is noise. A column added by `alter table
 * ... add column` in a later file is exactly the thing that CAN be missing on
 * its own, which is why those are the ones listed.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { NOT_SCHEMA } from './sql-bundle.mts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export interface Expected {
  readonly file: string;
  readonly kind: 'tabel' | 'kolom' | 'emmer';
  readonly name: string;
}

/** Everything the `.sql` files say the project should contain. */
export function expected(): Expected[] {
  const out: Expected[] = [];
  const files = readdirSync(join(ROOT, 'supabase'))
    .filter((one) => one.endsWith('.sql'))
    .filter((one) => !NOT_SCHEMA.includes(one.slice(0, -4) as never))
    .sort();

  for (const file of files) {
    /* Comments first. A semicolon inside prose is not a statement boundary,
       and reading one as a boundary cut a statement three lines short in
       `livevideo.sql` — see docs §AG. */
    const text = readFileSync(join(ROOT, 'supabase', file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--.*$/gm, '');

    for (const found of text.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)/gi)) {
      out.push({ file, kind: 'tabel', name: `public.${found[1]}` });
    }
    /* The whole `alter table` statement, then every `add column` inside it —
       a multi-column alter has one `alter table` and several columns, and
       reading only the first is the bug §AG names. */
    for (const found of text.matchAll(/alter table (?:if exists )?(?:public\.)?(\w+)([\s\S]*?);/gi)) {
      for (const one of found[2].matchAll(/add column (?:if not exists )?(\w+)/gi)) {
        out.push({ file, kind: 'kolom', name: `public.${found[1]}.${one[1]}` });
      }
    }
    for (const found of text.matchAll(
      /insert into storage\.buckets[\s\S]*?values\s*\(\s*'([^']+)'/gi,
    )) {
      out.push({ file, kind: 'emmer', name: found[1] });
    }
  }

  /* A table created in one file and altered in another appears twice, and a
     bucket upserted twice is still one bucket. */
  const seen = new Set<string>();
  return out.filter((one) => {
    const key = `${one.kind}:${one.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const RULE = '-- ═══════════════════════════════════════════════════════════════════════════';

export function report(): string {
  const rows = expected()
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
    .map((one) => `    ('${one.file}', '${one.kind}', '${one.name}')`)
    .join(',\n');

  const counts = { tabel: 0, kolom: 0, emmer: 0 };
  for (const one of expected()) counts[one.kind] += 1;

  return `${RULE}
-- FutureBox — wat kort in hierdie projek?
${RULE}
--
-- Supabase → SQL Editor → plak alles → Run.
--
-- **Dit verander niks.** Een \`select\`. Geen create, geen insert, geen alter.
-- Veilig om enige tyd te loop, ook met mense op die app.
--
-- Dit kyk na ${counts.tabel} tabelle, ${counts.kolom} kolomme wat later
-- bygekom het, en ${counts.emmer} stoor-emmers, en gee 'n ry terug vir elke
-- een wat kort — met die lêer wat dit maak.
--
--   Niks terug nie  →  alles is daar.
--   Rye terug       →  loop daardie lêers. supabase/ALMAL.sql dra die meeste
--                      van hulle; vir een wat nie daarin is nie, maak die
--                      lêer self oop.
--
-- ── Hoekom hierdie lêer bestaan ───────────────────────────────────────────
--
-- Die cast strip was twee weke stukkend en geen kode was verkeerd nie —
-- \`cast.sql\` het net nooit geloop nie. Die enigste manier om daardie soort
-- fout te sien sonder om weke te verloor, is om die projek self te vra
-- eerder as om te aanvaar.
--
-- ── Moenie hierdie lêer regmaak nie ───────────────────────────────────────
--
-- Dit word geskryf deur \`npm run sql:missing\` uit die .sql lêers self.
-- \`npm run check:sqlmissing\` keer dat dit stilweg verouder — 'n verouderde
-- lys kom leeg terug en dan glo jy dit.

with verwag (l_eer, soort, naam) as (
  values
${rows}
)
select
  l_eer as "loop hierdie lêer",
  soort,
  naam   as "wat kort"
from verwag
where (soort = 'tabel' and to_regclass(naam) is null)
   or (soort = 'kolom' and not exists (
         select 1 from information_schema.columns
         where table_schema = split_part(naam, '.', 1)
           and table_name   = split_part(naam, '.', 2)
           and column_name  = split_part(naam, '.', 3)))
   or (soort = 'emmer' and not exists (
         select 1 from storage.buckets where id = naam))
order by 1, 2, 3;
`;
}

export const REPORT = join(ROOT, 'supabase/WATKORT.sql');

if (process.argv[1] && process.argv[1].endsWith('sql-missing.mts')) {
  const text = report();
  writeFileSync(REPORT, text);
  const all = expected();
  console.log(
    `supabase/WATKORT.sql — ${all.length} things to look for`
    + ` (${all.filter((o) => o.kind === 'tabel').length} tables,`
    + ` ${all.filter((o) => o.kind === 'kolom').length} added columns,`
    + ` ${all.filter((o) => o.kind === 'emmer').length} buckets).`,
  );
}

/**
 * The five SQL files that have never been run, in one paste.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `docs/SWITCH-ON.md` asks for five files to be opened, copied and run in
 * order. That is five chances to run them out of order, five chances to miss
 * one, and five chances to lose track of which is done — and the way a missed
 * one shows up is a room quietly answering "not set up" weeks later.
 *
 * So they are also published as one file. Same content, same order, one paste.
 *
 * ── And the two things they rest on ──────────────────────────────────────
 *
 * `charts.sql` extends `public.events` and `invites.sql` points at
 * `public.collabs`, both from older files. If either is missing the paste
 * fails somewhere in the middle with a Postgres error about a table, on line
 * two hundred of something just pasted. The guard at the top says which file
 * to run first, in a sentence.
 *
 * ── Generated, and checked ───────────────────────────────────────────────
 *
 * A copy of five files is a copy that goes stale, and a stale copy of a schema
 * is worse than no copy: it runs, it succeeds, and it builds last month's
 * tables. `check:sqlbundle` fails when the bundle and the five files disagree,
 * so the copy cannot drift away from its originals in silence.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** In the order they have to run. */
export const ORDER = ['charts', 'addons', 'posting', 'dubs', 'invites'] as const;

export const BUNDLE = join(ROOT, 'supabase/ALMAL.sql');

const RULE = '-- ═══════════════════════════════════════════════════════════════════════════';

const HEAD = `${RULE}
-- FutureBox — die vyf lêers wat nog nooit geloop het nie, in een plak.
${RULE}
--
-- Supabase → SQL Editor → plak alles → Run. Veilig om weer te loop: elke stuk
-- hieronder is geskryf om twee keer te kan loop sonder om iets te breek.
--
-- Wat dit aanskakel:
--
--   charts.sql    Spotlight se Top 10 — sonder dit bly daardie bars vir altyd
--                 leeg, want niks skryf ooit neer dat iemand 'n liedjie
--                 gespeel het nie.
--   addons.sql    Die bemarkings-byvoegsel kan gekoop of toegeken word.
--   posting.sql   Die plaas-tou. Sonder dit antwoord dit "nie opgestel nie".
--   dubs.sql      Oorklanking. Dieselfde antwoord sonder dit.
--   invites.sql   Die uitnodigingsskakel in 'n saamwerk-e-pos.
--
-- ── Twee dinge moet reeds daar wees ────────────────────────────────────────
--
-- Hierdie lêer bou op twee tabelle wat uit ouer lêers kom:
--
--   public.events    uit supabase/events.sql   — charts.sql brei dit uit
--   public.collabs   uit supabase/collab.sql   — invites.sql wys daarna
--
-- Die blok hieronder kyk daarvoor en sê in gewone woorde wat om eerste te
-- loop as een van hulle kort. Dit is met opset 'n sin eerder as 'n Postgres-
-- fout op reël 200 van iets wat jy pas geplak het.
--
-- ── Moenie hierdie lêer regmaak nie ────────────────────────────────────────
--
-- Dit word geskryf deur \`npm run sql:bundle\` uit die vyf lêers self. Verander
-- hulle en loop die skrip weer; \`npm run check:sqlbundle\` keer dat die kopie
-- stilweg van sy oorsprong af wegdryf.

do $$
begin
  if to_regclass('public.events') is null then
    raise exception
      'Loop eers supabase/events.sql — hierdie lêer brei public.events uit en dit bestaan nog nie.';
  end if;
  if to_regclass('public.collabs') is null then
    raise exception
      'Loop eers supabase/collab.sql — invites.sql wys na public.collabs en dit bestaan nog nie.';
  end if;
end $$;
`;

/** The bundle as it should be, from the five files as they are now. */
export function bundle(): string {
  const parts = [HEAD];
  for (const name of ORDER) {
    const body = readFileSync(join(ROOT, `supabase/${name}.sql`), 'utf8').replace(/\n+$/, '');
    parts.push(`\n\n${RULE}\n-- supabase/${name}.sql\n${RULE}\n\n${body}\n`);
  }
  return parts.join('');
}

/* Written only when run directly, so `check:sqlbundle` can import `bundle()`
   and compare without the import itself rewriting the thing it is checking. */
if (process.argv[1] && process.argv[1].endsWith('sql-bundle.mts')) {
  const text = bundle();
  writeFileSync(BUNDLE, text);
  console.log(`supabase/ALMAL.sql — ${text.split('\n').length} lines from ${ORDER.length} files.`);
}

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
export const ORDER = [
  'charts',
  'addons',
  'posting',
  'dubs',
  'invites',
  'listens',
  'kits',
  'eleven',
  'hearts',
  'buildon',
  'elevenrem',
  'roomwords',
] as const;

export const BUNDLE = join(ROOT, 'supabase/ALMAL.sql');

const RULE = '-- ═══════════════════════════════════════════════════════════════════════════';

/**
 * What each file switches on, in one line, for the person about to paste it.
 *
 * Keyed by `ORDER` and rendered into the header below, because the header
 * used to be a hand-written paragraph and it drifted: it said "die vyf lêers"
 * over eleven of them, and named eight. Somebody reading it to decide whether
 * to run this was reading a list that had been wrong for four files. A
 * sentence about a file now lives next to the file's name, and a file added
 * to `ORDER` without one does not build.
 */
const WHAT: Record<(typeof ORDER)[number], string> = {
  charts:
    'Spotlight se Top 10 \u2014 sonder dit bly daardie bars vir altyd leeg, want niks skryf ooit neer dat iemand \u2019n liedjie gespeel het nie.',
  addons: 'Die bemarkings-byvoegsel kan gekoop of toegeken word.',
  posting: 'Die plaas-tou. Sonder dit antwoord dit "nie opgestel nie".',
  dubs: 'Oorklanking. Dieselfde antwoord sonder dit.',
  invites: 'Die uitnodigingsskakel in \u2019n saamwerk-e-pos.',
  listens:
    'Hoeveel kere \u2019n liedjie geluister is, per liedjie, vir die maker. Moet n\u00e1 charts.sql loop.',
  kits:
    'Die Kits.AI minuut-teller. Sonder dit weet die rem nie hoeveel van die 400 aflaaiminute oor is nie, en dan is daar geen rem nie.',
  eleven:
    'Wat ElevenLabs per oproep gehef het, langs wat ons gevat het. Sonder dit is die eerste plek waar \u2019n verkeerde prys wys die faktuur.',
  hearts: 'Harte op \u2019n plasing in die kamer, een per mens per liedjie.',
  buildon:
    'Mag iemand anders op hierdie liedjie voortbou \u2014 \u2019n greep daaruit sny, of by sy styl begin. Bring ook die styl self saam met die plasing.',
  elevenrem:
    'Die rem op die ElevenLabs-toelae. Sonder dit is daar \u2019n waarskuwing per e-pos en niks wat keer nie.',
  roomwords:
    'Die woorde van \u2019n liedjie, saam met die plasing. Sonder dit speel die kamer die liedjie en wys niks om by saam te lees nie.',
};

/**
 * `  name.sql    what it does`, wrapped under itself.
 *
 * Wrapped here rather than written pre-wrapped, because a sentence somebody
 * has to break by hand is a sentence that goes off the right edge the first
 * time it is edited — and this file is read in a SQL editor where a long
 * comment line is a horizontal scroll bar.
 */
function says(name: (typeof ORDER)[number]): string {
  const head = `${name}.sql`.padEnd(13);
  const gap = ' '.repeat(head.length);
  const lines: string[] = [];
  let line = '';
  for (const word of WHAT[name].split(' ')) {
    if (line && `${line} ${word}`.length > 58) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.map((one, n) => `--   ${n === 0 ? head : gap} ${one}`).join('\n');
}

const HEAD = `${RULE}
-- FutureBox — die ${ORDER.length} lêers wat nog nooit geloop het nie, in een plak.
${RULE}
--
-- Supabase → SQL Editor → plak alles → Run. Veilig om weer te loop: elke stuk
-- hieronder is geskryf om twee keer te kan loop sonder om iets te breek.
--
-- Wat dit aanskakel:
--
${ORDER.map(says).join('\n')}
--
-- ── Twee dinge moet reeds daar wees ────────────────────────────────────────
--
-- Hierdie lêer bou op twee tabelle wat uit ouer lêers kom:
--
--   public.events    uit supabase/events.sql   — charts.sql brei dit uit
--   public.collabs   uit supabase/collab.sql   — invites.sql wys daarna
--   public.tracks    uit supabase/schema.sql   — listens.sql tel net jou eie
--
-- Die blok hieronder kyk daarvoor en sê in gewone woorde wat om eerste te
-- loop as een van hulle kort. Dit is met opset \'n sin eerder as \'n Postgres-
-- fout op reël 200 van iets wat jy pas geplak het.
--
-- ── Moenie hierdie lêer regmaak nie ────────────────────────────────────────
--
-- Dit word geskryf deur \`npm run sql:bundle\` uit die ${ORDER.length} lêers self.
-- Verander hulle en loop die skrip weer; \`npm run check:sqlbundle\` keer dat
-- die kopie stilweg van sy oorsprong af wegdryf.

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
  if to_regclass('public.tracks') is null then
    raise exception
      'Loop eers supabase/schema.sql — listens.sql tel luisterbeurte per liedjie en public.tracks bestaan nog nie.';
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

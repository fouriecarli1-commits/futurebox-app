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
  'schema',
  'addons',
  'afrikaans',
  'aikoste',
  'arena',
  'cast',
  'collab',
  'credits',
  'dubs',
  'eleven',
  'elevenrem',
  'finetunes',
  'invites',
  'kits',
  'kitsmine',
  /* ── `events` before the files that alter it ──────────────────────

     `listens.sql` adds `events.times`, and `charts.sql` adds a constraint
     to the same table. Both were ordered BEFORE the file that creates it,
     because when this list grew from eleven files to all of them on 22
     September the new ones were appended alphabetically rather than
     placed. Thirteen statements failed on every fresh project built from
     the bundle — listens, charts and event counting, all dead, with the
     errors scrolling past in a Supabase editor that keeps going. */
  /* `usage` before `events`: `events.sql` defines `stats_board()`, and a
     `language sql` function is parsed when it is created, so it cannot
     name `public.generations` before `usage.sql` has made it. */
  'usage',
  'events',
  'listens',
  'live',
  'mail',
  'moderation',
  'podcast',
  'posting',
  'presence',
  'radar',
  'roomwords',
  'subscriptions',
  'taste',
  'video',
  'video2',
  'abuse',
  'albumart',
  'avatars',
  'buildon',
  'charts',
  'hearts',
  'livevideo',
] as const;

/**
 * Empty, on purpose, as of 22 September 2026.
 *
 * This used to name sixteen files left out of the bundle because somebody
 * believed she had pasted them one at a time in August. It was a list of
 * ASSUMPTIONS, and `supabase/WATKORT.sql` — written the day before to stop
 * exactly this — proved three of them false the first time she ran it:
 *
 *   arena.sql   public.competitions, public.entries, public.winners
 *   abuse.sql   public.generations.email_key, public.generations.ip_hash
 *   cast.sql    public.cast_members and its bucket
 *
 * The cast strip had already cost a fortnight for this reason. Rather than
 * correct the list a fourth time, the list is gone: `ORDER` is now every
 * schema file, so one paste IS the whole schema and there is nothing left to
 * assume. Every file is safe to run again — `check:sqlruns` applies all of
 * them twice against a real Postgres — so re-running what she already has
 * costs nothing and removes a whole class of fault.
 */
export const ALREADY = [] as const;

/**
 * Not schema at all: the notes that live in this folder, and the two
 * generated files. `WATKORT.sql` asks the project what is missing and
 * creates nothing — see `scripts/sql-missing.mts`.
 */
export const NOT_SCHEMA = ['ALMAL', 'TOETSTOEGANG', 'WATISGEDOEN', 'WATKORT'] as const;

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
  schema:
    'Die fondament: jou profiel, jou liedjies, en waar hulle gestoor word. Alles hieronder staan hierop.',
  arena:
    'Kompetisies, inskrywings en wenners. Sonder dit is daar niks om in te skryf nie.',
  collab:
    'Saamwerk-kamers en die boodskappe daarin.',
  credits:
    'Krediete: wat jy het, wat jy gebruik het, en die slot wat keer dat twee oortjies dieselfde laaste krediet spandeer.',
  finetunes:
    'Stemme wat opgelei word, en hoe ver hulle is.',
  live:
    'Die speelkamer self — wie daar is, wat geplaas is, en wat gese word.',
  moderation:
    'Wat die veiligheidshek gekeer het, sodat dit nagegaan kan word.',
  podcast:
    'Potgooie: programme, episodes, stemme en wat ElevenLabs gehef het.',
  presence:
    'Wie nou aanlyn is.',
  radar:
    'Die radar wat die paar mense hier vir mekaar voorstel.',
  subscriptions:
    'Lidmaatskappe en aankope. Sonder dit weet niks wie wat gekoop het nie.',
  usage:
    'Elke generasie wat geloop het, wat dit gekos het, en teen watter model.',
  video:
    'Video’s wat gemaak is.',
  video2:
    'Die tweede helfte daarvan — onderskrifte, tale en wat by ’n snit hoort.',
  abuse:
    'Die twee kolomme wat keer dat een mens honderd rekeninge maak: ’n e-possleutel en ’n IP-vingerafdruk op elke generasie.',
  events:
    'Wat in die app gebeur, wat Spotlight se Top 10 voer.',
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
  livevideo:
    'Video\u2019s in die speelkamer, en \u2019n opname wat jy self gefilm het wat in jou kanaal bly. Sonder dit is daar geen knoppie om \u2019n video te plaas nie.',
  albumart:
    'Album art by regte kunstenaars: wie hulle is, wat te koop is, en die krediet wat saam met \u2019n liedjie na die speelkamer reis. Sonder dit is die kamer leeg en wys Live geen kunstenaar se naam nie.',
  aikoste:
    'Wat elke model-oproep gekos het, en wat die kas werklik gespaar het. Sonder dit bly die besparing \u2019n skatting \u2014 en \u2019n kas wat nooit tref nie lyk presies soos een wat altyd tref, behalwe op die rekening.',
  avatars:
    'Jou eie foto op jou profiel. Sonder dit is daar net \u2019n letter in \u2019n sirkel, en die oplaai antwoord dat dit nie opgestel is nie.',
  cast:
    'Die cast \u2014 gesigte wat jy een keer oplaai en in elke video weer gebruik. Sonder dit lyk die knoppie reg en die oplaai misluk elke keer.',
  mail:
    'Watter e-pos ons al gestuur het. Sonder dit kan niks keer dat dieselfde brief twee keer uitgaan nie.',
  taste:
    'Waarheen jy die meeste gaan en wat jy die meeste maak, sodat \u2019n voorstel joune is eerder as generies.',
  kitsmine:
    'Jou eie Kits.AI minute, los van die huis s\u2019n. Sonder dit trek elke aflaai aan dieselfde teller.',
  afrikaans:
    'Wanneer Afrikaans verkeerd uitkom, gese deur die mense wat dit hoor. Sonder dit is die knoppie daar en die verslag gaan nooit \u00eerens heen nie.',
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
-- FutureBox — die hele skema, al ${ORDER.length} lêers, in een plak.
${RULE}
--
-- Supabase → SQL Editor → plak alles → Run. Veilig om weer te loop: elke stuk
-- hieronder is geskryf om twee keer te kan loop sonder om iets te breek.
--
-- Wat dit aanskakel:
--
${ORDER.map(says).join('\n')}
--
-- ── Niks hoef vooraf te bestaan nie ───────────────────────────────────────
--
-- Hierdie lêer is die HELE skema, nie net die nuwe stukke nie. Dit maak alles
-- wat dit nodig het, in 'n volgorde wat getoets is, en elke stuk is geskryf
-- om twee keer te kan loop. Jy kan dit dus loop op 'n splinternuwe projek of
-- op joune soos hy nou is, en in albei gevalle is die antwoord dieselfde.
--
-- Dit was voorheen net die nuwe lêers, met 'n lys van wat jy glo al geloop
-- het. Daardie lys was drie keer verkeerd — cast.sql, arena.sql en abuse.sql
-- — en elke keer het dit soos 'n kode-fout gelyk. Nou is daar niks om te glo
-- nie.
--
-- ── Moenie hierdie lêer regmaak nie ────────────────────────────────────────
--
-- Dit word geskryf deur \`npm run sql:bundle\` uit die ${ORDER.length} lêers self.
-- Verander hulle en loop die skrip weer; \`npm run check:sqlbundle\` keer dat
-- die kopie stilweg van sy oorsprong af wegdryf.

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

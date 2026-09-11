/**
 * A reported word is a candidate. It must never become a rule on its own.
 *
 * ── The property, and why it is worth a check ────────────────────────────
 *
 * Members can now tell us when an Afrikaans word comes out wrong, which is
 * the only way the pronunciation dictionary ever gets good: `sayit.ts` says
 * so about itself — what belongs in an alias dictionary has to come from
 * listening, and a list invented at a desk is a list of words a model says
 * fine.
 *
 * The obvious next step is the dangerous one. Reading the table and applying
 * the reports would make the feature feel finished and would put whatever
 * anybody typed into the voice that reads other people's podcasts. One
 * person writing something crude into "how should it sound" and it is in
 * everyone's Afrikaans, on a paid account, in the owner's own cloned voice.
 *
 * So the path is: report → a table → a person reads it → a commit to
 * `sayit.ts` → the dictionary is rebuilt. Every step visible, one of them a
 * human. This fails if anything ever short-circuits it.
 *
 *   npm run check:sayitwrong
 */
import { readFileSync } from 'node:fs';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw = '') => {
  if (!ok) problems.push(`  ${what}${saw ? `\n      ${saw}` : ''}`);
};

const strip = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const rules = strip(readFileSync('app/lib/server/sayit.ts', 'utf8'));
const reports = strip(readFileSync('app/api/afrikaans/route.ts', 'utf8'));
const dictionary = strip(readFileSync('app/api/eleven/dictionary/route.ts', 'utf8'));

/* ── The rules are source, and only source ──────────────────────────────
 
   Matched on the shape of a read rather than on a word: any database call
   inside the file that decides what ElevenLabs is told. */
check(
  'the rules the dictionary is built from come from this file, not a table',
  !/from\('afrikaans_reports'\)|supabase|createClient|\.select\(/.test(rules),
  'sayit.ts reads something at runtime; the rules must be source somebody committed',
);
check(
  'and the upload route builds from those rules, not from reports',
  /asRules\(\)/.test(dictionary) && !/afrikaans_reports/.test(dictionary),
  'the dictionary is built from something other than the file under review',
);

/* ── A report writes a row and nothing else ─────────────────────────────
 
   The route may insert and it may read for the owner. It must not touch
   the dictionary, the speech path, or the rules. */
check(
  'reporting a word does not reach ElevenLabs',
  !/elevenlabs|pronunciation-dictionaries|xi-api-key/i.test(reports),
  'a report that calls the supplier is a report that changed something',
);
/* Matched on the OPERATION, not on the filename.

   The first version of this looked for `sayit` anywhere in the route and
   failed — on the line the route returns to whoever reads the list, which
   tells them to add the words they agree with to `app/lib/server/sayit.ts`.
   That sentence is the safety property being explained, reported as a
   violation of it. Sixth time this week: match the thing, not the word for
   it. */
check(
  'and does not write into any source file',
  !/writeFile|appendFile|createWriteStream|from ['"]node:fs['"]/.test(reports),
  'a route that can edit source is a route that can skip the person',
);

/* ── And it does not tell the member it is fixed ────────────────────────
 
   Prose, matched as prose, and here on purpose. The whole reason this is
   safe is that the person is told the truth about what happens next; a
   screen promising a fix makes the delay read as a broken promise, and
   they hear the same mistake tomorrow. The Afrikaans line is the one that
   ships, since the control only draws in Afrikaans. */
const dict = readFileSync('app/lib/i18n.tsx', 'utf8');
const thanks = /"sayit\.thanks":\s*\{[^}]*af:\s*"((?:[^"\\]|\\.)*)"/.exec(dict)?.[1] ?? '';
check('the thank-you exists', thanks.length > 0, 'sayit.thanks has no Afrikaans line');
check(
  'and says somebody reads it first, rather than that it is fixed',
  /lees|kyk/i.test(thanks) && !/reggemaak|dadelik reg|opgelos/i.test(thanks),
  thanks,
);

/* ── The one-a-day rule is in the table, not in the route ───────────────
 
   A rule in the table cannot be missed by a route. The same reasoning as
   live_hearts' composite key, and it is the difference between one person
   being one voice and one person being ten. */
const sql = readFileSync('supabase/afrikaans.sql', 'utf8');
check(
  'one report per person per word per day is enforced by the table',
  /create unique index[\s\S]*afrikaans_reports[\s\S]*owner[\s\S]*created_at::date/i.test(sql),
  'a route can forget; a unique index cannot',
);
check(
  'and a member can read only their own',
  /for select using \(auth\.uid\(\) = owner\)/.test(sql),
  'one member reading everybody else\'s reports is everybody else\'s words',
);
check(
  'and the full list is behind the owner secret',
  /POST_SECRET/.test(reports) && /timingSafeEqual/.test(reports),
  'the list is everybody\'s reports and belongs to whoever can commit the rules',
);

/* ── It is offered where the dictionary actually applies ────────────────
 
   A report control in a room whose words never go through ElevenLabs
   collects reports nothing can act on. Both rooms that read Afrikaans
   aloud have it. */
for (const [file, room] of [
  ['app/components/VoiceScreen.tsx', 'voice_studio'],
  ['app/components/PodcastStudio.tsx', 'podcast'],
] as const) {
  const screen = readFileSync(file, 'utf8');
  check(
    `${room} offers it`,
    /<SayItWrong/.test(screen) && screen.includes(`surface="${room}"`),
    `${file} reads Afrikaans aloud and offers no way to say a word came out wrong`,
  );
}

if (problems.length > 0) {
  console.error(`check:sayitwrong — a reported word could become a rule without anybody reading it:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  'check:sayitwrong — a report writes a row and nothing else, the rules stay source somebody committed, ' +
    'the screen says so, and both rooms that read Afrikaans aloud offer it.',
);

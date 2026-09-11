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
   being one voice and one person being ten.

   ── Why this no longer looks for `created_at::date` ──────────────────

   Because it did, and that is the sixth time this session a check has
   matched the WORDING rather than the thing. The index had to be rewritten
   — `created_at::date` depends on the session's TimeZone, so Postgres
   refuses it outright in an index expression, and the file had never been
   run by anything that would say so. The rewrite spells the zone out.

   So this asks for the three columns the rule is actually made of, and
   leaves the spelling of the day alone. `check:sqlruns` is what proves the
   statement is one Postgres will take; this proves it says the right
   thing. */
const sql = readFileSync('supabase/afrikaans.sql', 'utf8');
const brake = (sql.match(/create unique index[\s\S]*?;/i) ?? [''])[0];
check(
  'one report per person per word per day is enforced by the table',
  /afrikaans_reports/i.test(brake)
    && /\bowner\b/.test(brake)
    && /lower\(btrim\(word\)\)/.test(brake)
    && /created_at/.test(brake)
    && /::date/.test(brake),
  'a route can forget; a unique index cannot',
);
/* And that the day is a fixed one. A bare `created_at::date` reads as the
   same rule and is not: it is whatever the session's timezone says today
   is, which is why Postgres will not index it at all. */
check(
  '  and the day it means is a named one, not the session\'s',
  /at time zone '[A-Za-z]+\/[A-Za-z_]+'/.test(brake) || /at time zone 'UTC'/.test(brake),
  'an unqualified cast is refused by Postgres and means a different day per connection',
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

/* ── Every read carries the dictionary, not most of them ───────────────
 
   ── What this found the day it was written ──────────────────────────
 
   `/v1/text-to-dialogue` — the podcast path — did not send it. `speak`,
   `speakTimed` and `speakStream` all did, each with the same comment
   explaining why, and the fourth was simply never touched. It is the
   LONGEST Afrikaans speech this app produces: a whole episode read aloud,
   every `-tjie` in it coming back as an English "ch" while the one-line
   reads were being fixed. That is this task's own title happening inside
   one file — right in the writing, left alone in the speaking.
 
   Nothing would have shown it. A missing field is not an error; it is a
   read that sounds slightly wrong, in the one room where nobody is
   comparing it to anything.
 
   ── Why it is counted rather than named ─────────────────────────────
 
   Because a list of "the four read functions" goes stale the moment there
   are five, and the fifth is written by somebody copying the fourth —
   which is exactly how this one was missed. So the endpoints are found in
   the source and each is asked, rather than checked off a list.
 
   `speech-to-speech` is excluded on purpose and by shape: it converts
   recorded audio and is given no text at all, so there is nothing for a
   spelling rule to match. */
const wire = readFileSync('app/lib/server/eleven.ts', 'utf8');

/** The fetch call an index sits inside, by matching brackets from its own
 *  `fetch(`. Crude slicing would take the next `);`, and every one of these
 *  bodies has a `}),` inside it that would end the slice early — which is
 *  how a check comes to read half a call and pass. */
function callAt(source: string, index: number): string {
  const opens = source.lastIndexOf('fetch(', index);
  if (opens === -1) return '';
  let depth = 0;
  for (let at = opens + 'fetch'.length; at < source.length; at += 1) {
    if (source[at] === '(') depth += 1;
    else if (source[at] === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(opens, at + 1);
    }
  }
  return '';
}

const reads: string[] = [];
const silent: string[] = [];
for (const found of wire.matchAll(/\$\{BASE\}\/text-to-([a-z-]+)/g)) {
  const call = callAt(wire, found.index ?? 0);
  const name = `text-to-${found[1]}`;
  reads.push(name);
  if (!/sayItRight\(\)/.test(call)) silent.push(name);
}

check('every read endpoint is found', reads.length >= 4, `${reads.length}: ${reads.join(', ')}`);
check(
  'and every one of them carries the pronunciation dictionary',
  silent.length === 0,
  `${[...new Set(silent)].join(', ')} sends none — the rules would be applied to some reads and not others, which nothing on any screen would show`,
);

if (problems.length > 0) {
  console.error(`check:sayitwrong — a reported word could become a rule without anybody reading it:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  'check:sayitwrong — a report writes a row and nothing else, the rules stay source somebody committed, ' +
    'the screen says so, and both rooms that read Afrikaans aloud offer it.',
);

/**
 * The Collab Radar says only what it knows.
 *
 *   npm run check:radar
 *
 * ── What she asked, and what the reading found ───────────────────────────
 *
 * Carli's list, 7 October 2026: *"Kyk nog mooi na colab radar."*
 *
 * Three faults, and all three read as working:
 *
 *   1. **The list she typed was not kept.** `useState([])`, so every show
 *      she found, looked up and entered was gone on the next load — and the
 *      panel's own note says the best targets are shows nobody has pitched
 *      and that FutureBox does not scrape directories, which makes that
 *      typed list the most valuable thing on the screen.
 *   2. **Her topics were invented.** A show added here arrived with
 *      `['ai music', 'ai', 'creators']` written into the panel, whatever
 *      the show was about, and the matcher drew a percentage from them. An
 *      Afrikaans theatre podcast scored on "ai music" is not a weak match;
 *      it is not a match at all, and the screen said 34%.
 *   3. **Three placeholder rows shipped as content** — `[Your target] AI
 *      music creator show` and two more, sorted in among five real shows
 *      and scored like them. This repo already forbids that elsewhere:
 *      `check:posttemplates` refuses `YOUR TEXT HERE` on a photo template.
 *
 * ── What is held here ────────────────────────────────────────────────────
 *
 * That the shipped list has no placeholders in it, that a target with no
 * topics gets `null` rather than a number, that the unscored rows sort to
 * the TOP rather than out of sight, and that reading rubbish out of storage
 * gives no targets rather than a panel that throws on load. The last one is
 * the reason `readOwn` is a pure function at all: what is in storage is a
 * string somebody else's browser handed back.
 */
import {
  MOST, ownTarget, readOwn, scorable, topicsFrom,
} from '../app/lib/radartargets.ts';
import { PODCAST_TARGETS, TRACK_FLAVOURS } from '../app/data/studio.ts';
import { matchPodcasts, profileFromTracks, type CreatorProfile } from '../app/lib/matching.ts';
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── 1. No placeholders in the shipped list ─────────────────────────── */
const holders = PODCAST_TARGETS.filter((one) => /\[your target\]|your target|add the host|add the format|lorem|xxx+/i
  .test(`${one.name} ${one.host} ${one.format} ${one.angle}`));
ok('no show in the shipped list is a placeholder',
  holders.length === 0,
  `${holders.map((one) => one.name).join(', ')} — a placeholder is a second`
  + ' job: it hands back the same blank page with more steps, and this one'
  + ' was sorted in among five real shows and scored like them');

ok('  and every one of them names a real show and a page to find it on',
  PODCAST_TARGETS.every((one) => one.name.trim() && one.host.trim() && /^https?:\/\//.test(one.url)),
  PODCAST_TARGETS.filter((one) => !/^https?:\/\//.test(one.url)).map((one) => one.name).join(', ')
  + ' — a target with no page is a show she cannot look up, and this panel'
  + ' never invents an address');

ok('  and every one of them has topics, so every row can be scored',
  PODCAST_TARGETS.every(scorable),
  PODCAST_TARGETS.filter((one) => !scorable(one)).map((one) => one.name).join(', '));

/* The songs too, which carried `Demo creator` and `@demo-neon` and were also
   dead — the Post Lab's list filters on `onChannel` and all four were
   false, so none was ever drawn. Dead data with placeholder names is worse
   rather than better: it is what the next list to be written gets copied
   from. */
const fakeSongs = TRACK_FLAVOURS.filter((one) => /demo|placeholder|lorem|example/i
  .test(`${one.creator} ${one.handle} ${one.title}`) || one.isDemo);
ok('  and no song in the shipped catalogue is a placeholder',
  fakeSongs.length === 0,
  fakeSongs.map((one) => `${one.title} — ${one.creator}`).join(', '));

ok('  and every song in it is on the channel it is offered from',
  TRACK_FLAVOURS.every((one) => one.onChannel),
  TRACK_FLAVOURS.filter((one) => !one.onChannel).map((one) => one.title).join(', ')
  + ' — the Post Lab’s list filters on this, so a song that is not on the'
  + ' channel is a row nobody can ever reach');

/* ── 2. Her topics are hers ─────────────────────────────────────────── */
ok('what she types becomes the topics',
  JSON.stringify(topicsFrom('Teater, Afrikaanse musiek , komedie'))
    === JSON.stringify(['teater', 'afrikaanse musiek', 'komedie']),
  JSON.stringify(topicsFrom('Teater, Afrikaanse musiek , komedie')));
ok('  and a topic typed twice is counted once',
  topicsFrom('teater, Teater, TEATER').length === 1,
  JSON.stringify(topicsFrom('teater, Teater, TEATER'))
  + ' — `tagOverlap` lower-cases both sides, so two spellings of one topic'
  + ' sit twice in the union and quietly lower her own score');
ok('  and an empty box is no topics rather than one empty one',
  topicsFrom('  ,  , ').length === 0,
  JSON.stringify(topicsFrom('  ,  , ')));

const made = ownTarget({ name: '  Die Teaterpodsending  ', topics: ['teater'] }, 1770000000000);
ok('a show she typed in becomes a target',
  made !== null && made.name === 'Die Teaterpodsending' && made.topics.length === 1,
  JSON.stringify(made));
ok('  and a blank name is no target at all',
  ownTarget({ name: '   ' }) === null,
  'a row with no name is a row she cannot tell apart from the next one');

const twice = [
  ownTarget({ name: 'Same Show' }, 1770000000000),
  ownTarget({ name: 'Same Show' }, 1770000060000),
];
ok('  and two shows with the same name are still two rows',
  twice[0]!.id !== twice[1]!.id,
  `${twice[0]!.id} and ${twice[1]!.id} — React keys the rows off this, and`
  + ' two rows with one key is a list that drops one of them');

/* ── 3. No number where there is nothing to measure ─────────────────── */
const profile: CreatorProfile = {
  name: 'Carli',
  handle: '@carli',
  topics: ['teater', 'afrikaans'],
  followers: 1200,
  models: ['FutureBox'],
  genres: ['teater'],
};

const bare = ownTarget({ name: 'A show with nothing said about it' })!;
const scored = matchPodcasts(profile, [...PODCAST_TARGETS, bare], 'en');
const bareRow = scored.find((one) => one.podcast.id === bare.id)!;
ok('a show with nothing said about it gets no score',
  bareRow.score === null,
  `${bareRow.score} — a percentage worked out from topics the panel invented`
  + ' is a number in the place where a measurement goes');
ok('  and a sentence that asks for the one thing that would give it one',
  /nothing to measure/i.test(bareRow.verdict),
  `"${bareRow.verdict}" — saying the match is poor would be a verdict on a`
  + ' show nothing has been measured about');
ok('  and it sorts to the top, not out of sight',
  scored[0].podcast.id === bare.id,
  `${scored[0].podcast.name} is first — sorted last, her own list is a row`
  + ' nobody scrolls to, which is where it went to die');

const told = ownTarget({ name: 'A theatre show', topics: ['teater', 'afrikaans'] })!;
const toldRow = matchPodcasts(profile, [told], 'en')[0];
ok('  and once she says what it is about, it gets a real one',
  typeof toldRow.score === 'number' && toldRow.score > 0.5,
  `${toldRow.score} — both her topics are on it, so this is the one row that`
  + ' should score high');

/* ── 3b. The other side of the same comparison ──────────────────────── */
const nothingYet: CreatorProfile = { ...profile, topics: [], genres: [] };
const blind = matchPodcasts(nothingYet, PODCAST_TARGETS, 'en');
ok('a member with nothing released gets no scores either',
  blind.every((one) => one.score === null),
  `${JSON.stringify(blind.map((one) => one.score))} — a nought-per-cent bar`
  + ' beside every show says "measured, and all five are a bad fit", which is'
  + ' a verdict on a fit nothing has been measured about');
ok('  and is told what would give them one',
  blind.every((one) => /nothing of yours/i.test(one.verdict)),
  `"${blind[0].verdict}" — the sentence has to be about her side, because`
  + ' the show is fine; it is the other half of the comparison that is missing');

/* ── And her own topics are her own work, not five of ours ───────────
 
   `profileFromTracks` read:
 
       topics: ['ai music', 'ai', 'creators', 'vibe coding', 'building',
                ...source.flatMap((t) => t.tags)],
 
   so every member arrived at the Radar as an AI-music vibe-coder whatever
   they actually make, and an Afrikaans theatre artist was matched on
   "vibe coding". It is the same fault as the invented topics on the show,
   one side over — and a score worked out from invented topics on EITHER
   side is a percentage about nothing. */
const hers = profileFromTracks('Carli', '@carli', 10, [{
  id: 'one',
  title: 'Aandklas',
  creator: 'Carli',
  handle: '@carli',
  genre: 'Afrikaans teater',
  tags: ['teater', 'afrikaans'],
  bpm: 100,
  key: 'A Minor',
  models: ['FutureBox'],
  onChannel: true,
}]);
ok('what a member is about comes off their own work',
  hers.topics.length === 3
    && ['teater', 'afrikaans', 'afrikaans teater'].every((one) => hers.topics.includes(one)),
  `${JSON.stringify(hers.topics)} — five topics in front of hers is every`
  + ' member of this app arriving as an AI-music vibe-coder, whatever they'
  + ' actually make');

/* ── 4. Storage is not ours ─────────────────────────────────────────── */
ok('nothing in storage can stop the panel opening',
  readOwn(null).length === 0
    && readOwn('').length === 0
    && readOwn('not json at all').length === 0
    && readOwn('{"not":"a list"}').length === 0
    && readOwn('[1,2,3]').length === 0
    && readOwn('[{"id":"x"}]').length === 0,
  'a `JSON.parse` and a cast is a type assertion about a string somebody'
  + ' else’s browser handed back, and the first row missing `topics` is a'
  + ' panel that throws inside `tagOverlap` on load');

const mixed = JSON.stringify([
  ownTarget({ name: 'Good one', topics: ['teater'] }, 1770000000000),
  { id: 'half', name: 'Written by an older version' },
]);
ok('  and one bad row does not take the good ones with it',
  readOwn(mixed).length === 1 && readOwn(mixed)[0].name === 'Good one',
  `${readOwn(mixed).length} rows — she typed every one of these by hand`);

ok('  and the list cannot grow without end',
  readOwn(JSON.stringify(
    Array.from({ length: MOST + 20 }, (_, n) => ownTarget({ name: `Show ${n}` }, n + 1)),
  )).length === MOST,
  `${MOST} is the ceiling — past that it is a directory, not a list`);

/* ── 5. The panel really saves it ───────────────────────────────────── */
const panel = readFileSync('app/components/CollabRadar.tsx', 'utf8');
ok('the panel loads her list on the way in and saves it on every change',
  /loadOwn\(\)/.test(panel) && (panel.match(/saveOwn\(/g) ?? []).length >= 2,
  'a list kept in `useState` alone is the fault this check exists for, and'
  + ' a save on add but not on remove brings a show she decided against'
  + ' back on the next load');

/* ── 6. Nothing on the screen is English typed straight into the markup ─
 
   `check:afrikaans` is blind to this and cannot help being: it reads the
   keys the code asks `t` for, and a string that never reaches `t` is not a
   missing translation — it is not a translation at all. Twenty-one pieces
   of English were sitting on this panel on 8 October for exactly that
   reason: "Copy", "Copied", "Add", "Email draft", "Your channels", "Hide",
   "live", "not created yet", "Open", "Posting is Pro", "Ask FutureBox to
   boost", and seven whole paragraphs.
 
   Matched as text between JSX tags that starts with a capital or is a lone
   lower-case word, which is what a rendered sentence looks like and what a
   class list, a URL and an expression do not. */
const rendered = [...panel.matchAll(/>[\t ]*\n?[\t ]*([A-Z’'][^<>{}]{2,}?)[\t ]*\n?[\t ]*</g)]
  .map((one) => one[1].replace(/\s+/g, ' ').trim())
  /* A middle dot, an arrow or a lone piece of punctuation between tags is
     furniture rather than a sentence. */
  .filter((one) => /[A-Za-z]{3}/.test(one));
ok('nothing on the panel is English typed straight into the markup',
  rendered.length === 0,
  `${rendered.slice(0, 6).map((one) => `"${one.slice(0, 48)}"`).join(', ')}`
  + ` (${rendered.length} in all) — \`check:afrikaans\` cannot see these: a`
  + ' string that never reaches `t` is not a missing translation, it is not a'
  + ' translation at all');

if (bad) {
  console.error(`\ncheck:radar — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:radar — the shipped target list holds no placeholders, a show she'
  + ' typed in is kept on her device with her own topics, and a show nothing'
  + ' has been said about gets no score rather than an invented one.',
);

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
import { PODCAST_TARGETS } from '../app/data/studio.ts';
import { matchPodcasts, type CreatorProfile } from '../app/lib/matching.ts';
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

if (bad) {
  console.error(`\ncheck:radar — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:radar — the shipped target list holds no placeholders, a show she'
  + ' typed in is kept on her device with her own topics, and a show nothing'
  + ' has been said about gets no score rather than an invented one.',
);

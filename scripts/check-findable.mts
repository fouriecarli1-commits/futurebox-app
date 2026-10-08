/**
 * A room the app cannot point at is a room nobody finds.
 *
 *   npm run check:findable
 *
 * ── The gap ──────────────────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Maak seker probooth se funksies werk en kan maklik
 * gevind word."*
 *
 * They work: `audit/probooth.mjs` presses 109 things in that room and every
 * one answers. Finding it was the other half, and the answer was no.
 *
 * The Pro Booth has no entry of its own in `lib/surfaces.ts`, because it is a
 * screen inside the vocal booth rather than a `studioTab`. That is fine. What
 * was not fine is that the booth's entry — the room it lives behind —
 * described itself only as singing over a backing track, and the words
 * somebody would actually search with (lanes, mixing, mastering) appeared
 * NOWHERE in that file.
 *
 * `surfaceDirectory()` is what the copilot route hands the model as the list
 * of rooms. So "where do I mix?" had no answer anywhere in the app: not in
 * the menu, which has no card for it, and not from the one part of the app
 * whose whole job is telling somebody where to go.
 *
 * ── Why the second half is the real rule ─────────────────────────────────
 *
 * Naming the words once fixes today. The rule has to survive a rename, and a
 * list of words I happen to have typed here cannot do that — it is the shape
 * that goes stale silently and then reads as coverage.
 *
 * So the directory is held against THE DOOR ITSELF: the label on the button
 * in `VocalBooth.tsx` that opens the room. Change the button to "Multitrack"
 * and this fails, because the directory still says "Lanes and mixing" and the
 * copilot would be sending people to a button that no longer exists.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { surfaceDirectory, helpsWith, seedsFor } from '../app/lib/surfaces.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const directory = surfaceDirectory();

ok('the copilot is given a room directory at all', directory.length > 200,
  `${directory.length} characters`);

/* ── 1. The words somebody would search with ─────────────────────────── */

const boothLine = directory.split('\n').find((one) => one.startsWith('- booth:')) ?? '';
ok('the booth has a line in it', boothLine.length > 0);

for (const word of ['lanes', 'mixing', 'mastering']) {
  ok(`"${word}" is somewhere in the room directory`,
    new RegExp(word, 'i').test(directory),
    'the copilot answers "where do I ..." out of this text and nothing else;'
    + ' a feature missing from it cannot be pointed at');
  ok(`  and it is on the booth's line, not some other room's`,
    new RegExp(word, 'i').test(boothLine),
    `"${word}" is in the directory but points somewhere else, which sends`
    + ' somebody to the wrong room — worse than no answer');
}

/* ── 2. Held against the door, so a rename cannot go quiet ───────────── */

const vocal = withoutComments(readFileSync('app/components/VocalBooth.tsx', 'utf8'));

/* The door is marked, so this finds it by its hook rather than by guessing
   at which button it is. */
ok('the door into the Pro Booth is still marked in the vocal booth',
  /data-probooth/.test(vocal),
  'nothing else in this check can be trusted if the door moved');

const label = /t\('booth\.pro',\s*'([^']+)'\)/.exec(vocal)?.[1] ?? '';
ok('and the door still carries a label this can read', label.length > 0,
  'the label is built some other way now, so the agreement below is unchecked');

ok('the directory sends people to the words actually on the door',
  label.length > 0 && directory.toLowerCase().includes(label.toLowerCase()),
  `the button reads "${label}" and the directory does not say so — the copilot`
  + ' would be naming a button that is not there');

/* ── 3. And a person can ask the question in their own words ─────────── */

for (const lang of ['en', 'af'] as const) {
  const asks = seedsFor('booth', lang).join(' ').toLowerCase();
  ok(`a starter question in ${lang} asks where to mix`,
    /mix|meng/.test(asks),
    'the starters are what somebody presses before they know what to type;'
    + ' none of them went anywhere near the paid room behind this one');
  ok(`  and what the room offers in ${lang} mentions it`,
    /mix|meng|lane|bane/.test(helpsWith('booth', lang).toLowerCase()));
}

console.log(bad === 0
  ? '\ncheck:findable — the Pro Booth is named where the app looks to answer "where do I ...".'
  : `\ncheck:findable — ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);

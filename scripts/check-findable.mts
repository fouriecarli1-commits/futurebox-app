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
import { CREDITS } from '../app/lib/credits.ts';

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

/* ── 4. Every paid capability is nameable ───────────────────────────────

   The Pro Booth was found by tripping over it. This is the same question
   asked of all of them: if a member can SPEND on a thing, the copilot has to
   be able to say where it is. A paid feature nobody can find is a support
   question and money left on the table.

   ── Why the words are a reviewed list and not a guess ───────────────────

   The first version of this walk searched the directory for the words I
   would have used. It reported three gaps and two of them were mine: the
   cutting room says "taking a background out" and "taking an item out",
   where I had looked for "erase" and "rub"; the voice studio says "cloning",
   where I had looked for "clone". A rule that searches for its author's
   vocabulary finds holes that are not there — the same adjacent measurement
   in its other direction, failing instead of passing.

   So the words below are the app's, read off the directory and written down.
   `null` means the capability is deliberately not a place to go, with the
   reason beside it. Every key in `CREDITS` has to appear here, so a new
   price cannot be added without somebody deciding which of the two it is. */
const FINDABLE: Record<string, readonly string[] | null> = {
  song: ['song'],
  /* A format of the thing above, not a room of its own. */
  halfSong: null,
  video: ['video'],
  cover: ['cover'],
  filmOut: ['film'],
  /* The room now says "words set on the picture". Named with the app's
     own phrase rather than mine, which was "caption". */
  filmWords: ['words set on the picture'],
  filmLook: ['look'],
  /* The room says "faded", not "join" or "transition". Another of mine. */
  filmJoin: ['faded'],
  filmMark: ['mark'],
  filmUnder: ['under'],
  mixOut: ['mix'],
  postOut: ['post'],
  /* The room says "change what is IN the picture by saying what to change".
     Named with its own phrase: mine was "repaint", which appears nowhere a
     member will ever read.

     It was `null` for an hour, with the reason, while the control was out of
     the room and `check:kidsafe`'s question was with her — a paid thing
     with no door anywhere is a different state from one nobody can be sent
     to, and it was worth saying which. She answered; the door is back. */
  repaint: ['saying what to change'],
  /* The same film, rendered in the browser instead of bought out. One
     capability, one place; a second entry would be a second door that does
     not exist. */
  browserVideo: null,
  stems: ['instrument'],
  transcribe: ['words of a song'],
  clean: ['clean'],
  voiceChange: ['voice'],
  sing: ['sing'],
  clone: ['cloning'],
  finetune: ['train'],
  dub: ['dub'],
  read: ['reading anything in it'],
  parts: ['part'],
  marketPlan: ['campaign'],
  adLines: ['advert'],
  cutout: ['background out'],
  erase: ['item out'],
};

const priced = Object.keys(CREDITS);
const undecided = priced.filter((one) => !(one in FINDABLE));
ok('every paid capability has been decided about',
  undecided.length === 0,
  `${undecided.join(', ')} — add each to FINDABLE with the words the room`
  + ' directory uses, or null and a reason. A price added without that is a'
  + ' thing somebody can buy and nobody can be sent to');

const unfindable = Object.entries(FINDABLE)
  .filter(([name, words]) => words !== null && priced.includes(name)
    && !words.some((word) => directory.toLowerCase().includes(word.toLowerCase())))
  .map(([name, words]) => `${name} (none of: ${(words ?? []).join(', ')})`);

ok('and every one of them is named where the copilot can find it',
  unfindable.length === 0,
  `${unfindable.join('; ')} — the directory is the whole of what the copilot`
  + ' is told about the rooms, so a capability missing from it cannot be'
  + ' pointed at by the one part of the app whose job is pointing');

console.log(bad === 0
  ? '\ncheck:findable — the Pro Booth is named where the app looks to answer "where do I ...".'
  : `\ncheck:findable — ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);

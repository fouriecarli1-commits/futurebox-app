/**
 * A story becomes pages, the pages cost what they cost, and the pictures
 * turn when the voice does.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink ook 'n story mode om geleesde stories met
 * 'n video sal baie oulik wees."* Then: *"Gaan aan met story mode."*
 *
 * ── The three things that go wrong without saying so ─────────────────────
 *
 * **The bill.** This is the only room in the app where one press buys twelve
 * things. A song is one charge somebody chose; a storybook is a picture and
 * a reading for every page, and the number is only knowable once the story
 * is typed. Summing the characters and charging `readCost` once gives a
 * SMALLER number than the truth, because each page pays that function's own
 * minimum — and the smaller wrong number is the direction that hands
 * somebody a bill they did not agree to.
 *
 * **The page turns.** `timelineOf` is driven by how long each reading
 * actually came back, not by a guess. A slideshow on a fixed interval drifts
 * away from the voice within three pages, and nothing about that fails: it
 * plays, it looks finished, and the pictures are simply wrong.
 *
 * **The lettering.** A picture model asked to illustrate a page of prose
 * will write the prose into the picture unless told not to, and a children's
 * book with garbled invented letters across it is unusable. The instruction
 * is asserted here rather than trusted because it is one clause in a prompt
 * and nothing else would ever notice it going missing.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { CREDITS, readCost } from '../app/lib/credits.ts';
import {
  PAGE_CHARS, PAGE_MIN_CHARS, STORY_MAX_PAGES, billFor, pagesFrom, pictureWords,
  runsFor, timelineOf,
} from '../app/lib/storypages.ts';
import { spreadAt } from '../app/lib/storyfilm.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA story becomes pages, and the pictures turn when the voice does\n');

/* ── 1. The pages ────────────────────────────────────────────────────── */

const three = 'Once there was a small brown dog called Rex.\n\n'
  + 'Every morning Rex waited by the gate for the postman.\n\n'
  + 'One day the postman did not come, and Rex went to look for him.';

ok('a blank line is a page break',
  pagesFrom(three).length === 3,
  `${pagesFrom(three).length} pages out of three paragraphs — asking somebody`
  + ' to mark their own page breaks is asking them to lay out a book they'
  + ' have not seen, so the blank lines they already type are the breaks');

ok('  and a single newline still works',
  pagesFrom(three.replace(/\n\n/g, '\n')).length === 3,
  'somebody pasting from a phone notes app gets single newlines, and reading'
  + ' their whole story as one page is a picture for three paragraphs');

const long = `${'A sentence about the dog. '.repeat(40)}`;
const split = pagesFrom(long);
ok('  and a paragraph too long for a page is split',
  split.length > 1 && split.every((one) => one.text.length <= PAGE_CHARS + 40),
  `${split.length} page(s), longest ${Math.max(...split.map((o) => o.text.length))}`
  + ` against a page of ${PAGE_CHARS} — one picture for a thousand words is a`
  + ' picture nobody looks at while two hundred words are read over it');

ok('  at the end of a sentence, not mid-breath',
  split.slice(0, -1).every((one) => /[.!?]$/.test(one.text.trim())),
  `a page ends "${split[0]?.text.slice(-24)}" — the voice has to stop`
  + ' somewhere, and a picture changing halfway through a clause is a page'
  + ' turn in the wrong place');

/* ── A blank line is a page break, even around three words ───────────────
 
   This asserted the opposite first — that a short paragraph joins the one
   before it — and the assertion two below caught what that costs: a
   children's story written as short lines has NO paragraph over twenty-five
   characters, so every line joined the one before and the whole book came
   out as one page of six hundred characters with a single picture over it.
   Which is the case this feature is most for.
 
   Somebody who puts a blank line around three words means a page. The only
   gluing left is inside `broken`, where a short tail is an artefact of where
   the cut landed rather than something anybody typed. */
const shortLines = ['The dog ran.', 'The cat sat.', 'The bird flew.'].join('\n\n');
ok('  and a story of short lines is a book of short pages',
  pagesFrom(shortLines).length === 3,
  `${pagesFrom(shortLines).length} page(s) from three short lines — a`
  + " children's book is short lines with a picture each, and joining them"
  + ' gives one paragraph with one picture over it');

ok('  while a tail left by splitting joins the piece before it',
  pagesFrom(`${'A sentence about the dog. '.repeat(16)}Ok.`)
    .every((one) => one.text.length >= PAGE_MIN_CHARS),
  'a leftover of two words became a page of its own — that tail is an'
  + ' artefact of where the cut landed, not something anybody typed, so'
  + ' gluing it back is repairing this function\'s own work');

ok('  and a story that opens with three words keeps them',
  pagesFrom('Ok.\n\nThen the long part of the story happened to everyone.').length === 2,
  'the opening was swallowed into page two, which loses the opening — the'
  + ' first page of a book is the one somebody chose most carefully');

const many = pagesFrom(Array.from({ length: 40 }, (_, i) => `Page number ${i}.`).join('\n\n'));
ok('  and a story is capped at the most one holds',
  many.length === STORY_MAX_PAGES,
  `${many.length} against a cap of ${STORY_MAX_PAGES} — a story long enough to`
  + ' need more should be charged for in two halves on purpose rather than by'
  + ' surprise');

/* ── 2. The bill ─────────────────────────────────────────────────────── */

const pages = pagesFrom(three);
const bill = billFor(pages);

ok('the bill charges each page its own reading',
  bill.read === pages.reduce((sum, one) => sum + readCost(one.text.length), 0),
  `${bill.read} — summing the characters and charging once gives a SMALLER`
  + " number, because each page pays `readCost`'s own minimum, and the smaller"
  + ' wrong number is a bill nobody agreed to');

ok('  and a picture for every page',
  bill.pictures === pages.length * CREDITS.repaint,
  `${bill.pictures} against ${pages.length} pages at ${CREDITS.repaint} each`);

ok('  and adds up',
  bill.total === bill.read + bill.pictures && bill.pages === pages.length,
  `${bill.total} against ${bill.read} + ${bill.pictures}`);

ok('  and an empty story costs nothing',
  billFor(pagesFrom('   \n\n  ')).total === 0,
  'a story with nothing in it has a price, so the button offers to spend on'
  + ' an empty book');

/* ── 3. The page turns ───────────────────────────────────────────────── */

const heard = [5.2, 2.0, 7.4];
const shown = timelineOf(pages, heard);

ok('a page is on screen for as long as its reading',
  shown.every((one, i) => one.seconds > heard[i] && one.seconds < heard[i] + 1),
  `${shown.map((o) => o.seconds.toFixed(1)).join(', ')} against readings of`
  + ` ${heard.join(', ')} — a fixed interval drifts away from the voice within`
  + ' three pages, and nothing about that fails: it plays, it looks finished,'
  + ' and the pictures are wrong');

ok('  and they follow one another with no gap and no overlap',
  shown.every((one, i) => i === 0 || Math.abs(one.at - (shown[i - 1].at + shown[i - 1].seconds)) < 1e-9),
  'a page starts before the one before it ends, or after a gap of black');

ok('  and a page not yet read still has a place',
  timelineOf(pages, [5.2, undefined, undefined]).length === 3,
  'the room cannot draw a timeline until everything is made, so it cannot'
  + ' show what it is about to charge for');

ok('  and the whole book is the sum of its pages',
  Math.abs(runsFor(shown) - shown.reduce((sum, one) => sum + one.seconds, 0)) < 1e-9,
  'the length shown on the button is not the length of the film');

/* The film asks which page is up at a given moment. Off by one here is a
   picture that turns a page early for the whole book. */
ok('  and the film shows the right page at each moment',
  spreadAt(shown, 0) === 0
  && spreadAt(shown, shown[1].at + 0.01) === 1
  && spreadAt(shown, shown[2].at + 0.01) === 2
  && spreadAt(shown, 9_999) === 2,
  `${[0, shown[1].at + 0.01, shown[2].at + 0.01, 9_999].map((w) => spreadAt(shown, w)).join(', ')}`
  + ' against 0, 1, 2, 2 — the last one is past the end, where holding the'
  + ' final page is right and falling back to the first is a book that loops');

/* ── 4. The lettering, and what the prompt must not carry ────────────── */

const words = pictureWords(pages[0], '');
ok('the picture is asked for with no lettering in it',
  /no words or lettering/i.test(words),
  'a picture model asked to illustrate a page of prose writes the prose into'
  + ' the picture, and a children\'s book with garbled invented letters across'
  + ' it is unusable. One clause in a prompt, and nothing else would notice'
  + ' it going missing');

ok('  and carries the look so twelve pictures are one book',
  pictureWords(pages[0], 'paper cut-out').includes('paper cut-out'),
  'the look is dropped, so every page is drawn in a different style — the'
  + ' most noticeable thing about a generated storybook and the cheapest to'
  + ' get right');

ok('  and has a look even when nobody chose one',
  words.trim().length > pages[0].text.length + 40,
  'an empty look leaves the model to decide, and it decides differently on'
  + ' every page');

ok('  and the page\'s own words are in it',
  words.includes(pages[0].text),
  'the picture is drawn from the look alone, which is the same picture twelve'
  + ' times');

/* ── 5. The room uses all of it ──────────────────────────────────────── */

const room = withoutComments(readFileSync('app/components/StoryRoom.tsx', 'utf8'));

ok('the room prices from the shared bill rather than its own sum',
  /billFor\s*\(/.test(room),
  'the room works out its own total, so the number on the button and the'
  + ' number charged are two numbers');

ok('  and times the pages from what was actually read',
  /timelineOf\s*\(/.test(room) && /seconds:\s*\w+\.duration|duration/.test(room),
  'the room guesses how long a page lasts instead of reading it off the'
  + ' audio that came back');

ok('  and shows the bill before anything is pressed',
  /data-storybill/.test(room),
  'one press buys twelve things and the total is not on screen until after'
  + ' it is spent');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

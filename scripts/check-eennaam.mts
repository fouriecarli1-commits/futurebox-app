/**
 * No two controls in one room may wear the same word.
 *
 * ── What she saw ─────────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"square word 3 keer genoem in video editor."*
 *
 * Three controls, three entirely different things, one word. The film's
 * SHAPE can be square. A caption box's corners can be square. A picture
 * ratio can be square. Each list was written on its own day by somebody
 * looking at that list, and every one of them was reasonable in isolation —
 * which is exactly why nobody caught it: the fault only exists on the
 * screen, where all three are visible at once.
 *
 * ── Why a check and not a one-time rename ────────────────────────────────
 *
 * Because it will come back. "Wide", "Tall", "Round", "Plain", "None" and
 * "Bold" are the natural name for a dozen different things in an app that
 * makes pictures, films and words, and the next list someone adds will reach
 * for one of them. A rename fixes today; this fixes the day after.
 *
 * ── What it measures ─────────────────────────────────────────────────────
 *
 * The option lists a room actually renders, and whether any two of them
 * offer the same visible word. Not ids — an id is never on the screen and
 * renaming one makes old work forget its setting. The LABEL, which is the
 * only part a person reads.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { BOXES } from '../app/lib/videopaint.ts';
import { EDGES } from '../app/lib/wordsedge.ts';
import { SHAPES as RATIOS } from '../app/lib/pictureshapes.ts';

import { GROUPS, VOICES } from '../app/lib/huminstrument.ts';
import { MOTIONS } from '../app/lib/livingphoto.ts';

/**
 * The faces, read out of the file rather than imported.
 *
 * `postfaces.ts` loads its fonts through `next/font/google`, which only
 * exists inside a Next build — importing it here throws before a single
 * assertion runs. So the labels are read as text.
 *
 * Written down because it is the one list in this file that is not driven,
 * and a reader should know which one that is: a face renamed in a way this
 * regex does not match goes unchecked rather than failing loudly, which is
 * the weaker of the two behaviours and the only one available.
 */
const EDITOR = readFileSync('app/components/VideoEditor.tsx', 'utf8');

/** The film's three shapes, off the ternary that draws them. */
const FILM_SHAPES = [
  ...EDITOR.matchAll(/t\('edit\.(?:tall|wide|square)', '([^']+)'\)/g),
].map((one) => ({ name: one[1] }));

const FACES_FROM_SOURCE = [
  ...readFileSync('app/lib/postfaces.ts', 'utf8')
    .matchAll(/\{ id: '\w+', name: '([^']+)'/g),
].map((one) => ({ name: one[1] }));

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** The English label of every entry in a list, however that list spells it. */
const labels = (
  list: readonly unknown[],
): string[] => list.map((one) => {
  const row = one as {
    en?: string;
    name?: readonly [string, string] | string;
    says?: readonly [string, string];
  };
  if (typeof row.en === 'string') return row.en;
  if (Array.isArray(row.name)) return row.name[1];
  if (typeof row.name === 'string') return row.name;
  if (Array.isArray(row.says)) return row.says[1];
  return '';
}).filter(Boolean);

/**
 * Which lists are on screen together.
 *
 * By ROOM, because that is where the collision happens. The same word in two
 * rooms is fine — nobody is looking at both — and insisting otherwise would
 * force a thesaurus on an app that has four rooms full of options.
 */
const ROOMS: Record<string, { name: string; of: readonly unknown[] }[]> = {
  'the cutting room': [
    { name: 'caption boxes', of: BOXES },
    { name: 'letter edges', of: EDGES },
    /* The film's own shape. Not a list anywhere — three ids and a ternary in
       the component — which is precisely why it was invisible: the other two
       lists could be read side by side and this one could not, so nobody
       compared it with them.
 
       Read from the component's own labels rather than retyped here, so a
       fourth shape or a rename is covered the day it lands. Without this the
       cross-list half of this check does not catch the very fault it was
       written for, which is how it first ran: green, with "Square" sitting in
       two controls on one screen. */
    { name: 'the film\'s shape', of: FILM_SHAPES },
  ],
  'the photo room': [
    { name: 'picture shapes', of: RATIOS },
    { name: 'faces', of: FACES_FROM_SOURCE },
    { name: 'motions', of: MOTIONS },
  ],
  'the hum card': [
    { name: 'instruments', of: VOICES },
    { name: 'headings', of: GROUPS },
  ],
};

for (const [room, lists] of Object.entries(ROOMS)) {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const list of lists) {
    for (const word of labels(list.of)) {
      const key = word.toLowerCase();
      const already = seen.get(key);
      if (already && already !== list.name) {
        clashes.push(`"${word}" is in both ${already} and ${list.name}`);
      } else {
        seen.set(key, list.name);
      }
    }
  }
  ok(`no word means two things in ${room} (${seen.size} labels)`,
    clashes.length === 0,
    `${clashes.join('; ')} — each list was reasonable on the day it was`
    + ' written; the fault only exists on the screen, where both are visible'
    + ' at once');
}

/* ── And no list says the same thing twice to itself ───────────────────── */

for (const [room, lists] of Object.entries(ROOMS)) {
  for (const list of lists) {
    const words = labels(list.of).map((one) => one.toLowerCase());
    ok(`  ${room}: ${list.name} has no two entries with one name`,
      new Set(words).size === words.length,
      'two buttons with one word on them is a choice nobody can make');
  }
}

/* ── The frame's shape keeps the word, and that is the point ───────────── */

const editor = withoutComments(EDITOR);
ok("the film's own shape is still called Square",
  /t\('edit\.square', 'Square'\)/.test(editor),
  'a frame that is as wide as it is tall IS a square, and that is the one of'
  + ' the three with a real claim on the word. The others were renamed');

ok('  and the caption box is named for its corners instead',
  BOXES.some((one) => one.id === 'square' && /corner/i.test(one.name[1])),
  'a band with hard corners sits two buttons from "Rounded", which is what'
  + ' it is really being chosen against');

ok('  and its id did not change with its name',
  BOXES.some((one) => one.id === 'square'),
  'an id is stored on every edit already made; renaming one makes those'
  + ' edits forget which box they had');

console.log(bad === 0
  ? '\n  No word means two things on one screen.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

/**
 * A child's story on paper, without spending a parent's ink on our decoration.
 *
 *   npm run check:boekie
 *
 * ── Why this is a check and not an afternoon of care ─────────────────────
 *
 * Every way a printable goes wrong is invisible on a screen.
 *
 * **Ink.** The preview looks lovely with a tinted heading band behind the
 * title. A browser will not print a background unless something tells it to
 * with `print-color-adjust: exact` — so the day somebody adds that line to
 * make the preview and the paper agree, every sheet starts costing four
 * times as much and the only person who finds out is the parent at the
 * cartridge shop. So: no forced colours, and no painted ground on a sheet.
 *
 * **The rest of the app.** The print rule is `body > *:not([data-storybook])`
 * and it only works because the booklet is a direct child of `<body>`.
 * Written where it is used — inside a shelf, inside a room, inside a layout
 * — that rule hides the booklet itself and prints eleven blank sheets.
 *
 * **The pictures.** A kept picture is a Blob behind an object URL, which
 * loads like anything else. `window.print()` does not wait. A dialog opened
 * before the decodes settle prints the words with a child's drawing missing
 * from every page, and nothing anywhere says so.
 *
 * **The numbers.** A cover counted as a page is a book whose first drawing
 * is labelled 2, which a six-year-old learning to count notices immediately.
 *
 * **The cost.** Nothing in here may reach an engine. The pages were paid for
 * when the book was made; printing is a parent's paper and none of ours.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  TITLE_MOST, coverTitle, sheetCount, sheetsOf,
} from '../app/lib/storybook.ts';
import type { KeptStory } from '../app/lib/storykeep.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA child\'s story on paper, without spending a parent\'s ink\n');

/* Comments out, because the block above the booklet's own styles explains
   what `print-color-adjust` would do and the rule below looks for exactly
   that word. A check that its own reasoning fails is a check nobody keeps. */
const css = readFileSync('app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const book = withoutComments(readFileSync('app/components/StoryBook.tsx', 'utf8'));
const shelf = withoutComments(readFileSync('app/components/StoryShelf.tsx', 'utf8'));

/* The print block, which is the part a printer obeys. Read as its own slice
   so a rule written for the screen is not mistaken for one written for the
   paper, and the other way round. */
const printAt = css.indexOf('@media print');
const printBlock = printAt === -1 ? '' : css.slice(printAt);

/* ── 1. The ink ─────────────────────────────────────────────────────── */

ok('nothing forces a background onto the paper',
  !/print-color-adjust/i.test(css),
  'a `print-color-adjust: exact` anywhere makes the browser print the panels,'
  + ' tints and page colour it would otherwise drop — which is the preview'
  + ' and the paper finally agreeing, at four times the cartridge');

/* Every background declared by a sheet rule. White and nothing are the two
   allowed answers: white is paper, and `none` is the screen's backdrop being
   taken away again for print. */
const grounds = [...css.matchAll(/\[data-sheet[^\]]*\][^{}]*\{[^}]*\}/g)]
  .flatMap((rule) => [...rule[0].matchAll(/background(?:-color)?:\s*([^;}]+)/g)]
    .map((one) => one[1].trim()));
const painted = grounds.filter((one) => !/^(#fff(fff)?|white|none|transparent)$/i.test(one));
ok('  and no sheet paints its own ground',
  painted.length === 0,
  `${painted.join(', ')} — a sheet with a colour behind it is a sheet that`
  + ' costs somebody money to print, and the preview gives no hint of it');

ok('  and the sheet asks for black on white, said once',
  /\[data-sheet\]\s*\{[^}]*background:\s*#ffffff/.test(css)
  && /\[data-sheet\]\s*\{[^}]*color:\s*#000000/.test(css),
  'paper is white and ink is black — that is not a theme, and a themed'
  + ' preview lies about what comes out of the machine');

ok('  and the sheet\'s shadow is a screen thing only',
  /box-shadow:\s*0 1px 12px/.test(css)
  && /\[data-sheet\]\s*\{[^}]*box-shadow:\s*none/.test(printBlock),
  'the edge that makes a sheet read as a sheet is being sent to the printer,'
  + ' which answers it with a band of grey down two sides of every page');

/* ── 2. The rest of the app does not come along ─────────────────────── */

ok('nothing but the booklet reaches the printer',
  /body\s*>\s*\*:not\(\[data-storybook\]\)\s*\{\s*display:\s*none/.test(printBlock),
  'without this the app\'s own bars, scrims and nav print on the first sheet');

ok('  and the booklet is a direct child of the body, so that rule is true',
  /createPortal\(/.test(book) && /document\.body/.test(book),
  'the rule above hides every child of the body that is not the booklet — so'
  + ' a booklet rendered inside the shelf is hidden BY IT, and eleven blank'
  + ' sheets come out');

ok('  and the bar belongs to the screen',
  /\[data-storybookbar\]\s*\{\s*display:\s*none\s*!important/.test(printBlock),
  'the press and the close button print at the top of the first sheet');

/* ── 3. The paper is not wasted ─────────────────────────────────────── */

ok('every sheet is its own page',
  /\[data-sheet\]\s*\{[^}]*break-after:\s*page/.test(printBlock)
  && /page-break-after:\s*always/.test(printBlock),
  'two pages of a child\'s book on one sheet, or twelve of them in a stream');

ok('  and the last sheet is not followed by a blank one',
  /\[data-sheet\]:last-child\s*\{[^}]*break-after:\s*auto/.test(printBlock),
  'a forced break after the final sheet is one more sheet of paper, every'
  + ' time anybody prints anything');

ok('  and the page itself has a size and a margin',
  /@page\s*\{[^}]*size:\s*A4/.test(printBlock)
  && /@page\s*\{[^}]*margin:/.test(printBlock),
  'without a margin the words run into the edge the printer cannot reach');

/* ── 4. The pictures are there when the dialog opens ────────────────── */

ok('the press waits for the pictures',
  /disabled=\{!ready\}/.test(book) && /\.decode\(\)/.test(book),
  '`window.print()` does not wait for an object URL to load — a dialog opened'
  + ' before the decodes settle prints the words and no drawings');

/* Exactly one `window.print()`, and it hangs off a press. An effect that
   calls it is a dialog that opens by itself, over a preview nobody has read
   — the one interaction a browser will not let anybody take back. */
const prints = (book.match(/window\.print\(\)/g) ?? []).length;
ok('  and printing is a press, not something that happens by itself',
  prints === 1 && /onClick=\{\(\) => window\.print\(\)\}/.test(book),
  `${prints} call(s) to print, and the press is not the only way there`);

ok('  and a drawing the browser gives up on still prints the rest',
  /decode\(\)\.catch\(/.test(book),
  '`decode()` rejects on a picture the browser cannot read, and an unhandled'
  + ' rejection here is a press that never lights up — one broken drawing'
  + ' costing the whole book');

ok('  and every object URL is given back',
  /URL\.revokeObjectURL/.test(book),
  'a twelve-page book is tens of megabytes held for as long as the tab lives');

/* ── 5. It costs nothing ────────────────────────────────────────────── */

const spends = [
  /fetch\(/.test(book) && 'a fetch',
  /charge\(|enough\(/.test(book) && 'a charge',
  /\/api\//.test(book) && 'an api path',
].filter(Boolean);
ok('printing reaches nothing and charges nothing',
  spends.length === 0,
  `${spends.join(', ')} — the pages were paid for when the book was made, and`
  + ' this has to work with the aeroplane mode on');

/* ── 6. Who may start a print ───────────────────────────────────────── */

ok('only the grown-up can start a print',
  /grownUp && \(\s*<button[\s\S]{0,400}?data-shelfprint/.test(shelf),
  'a child pressing a printer forty times is a cartridge, and the room the'
  + ' child is in has no grown-up standing next to it');

/* ── 7. The numbers on the inside pages ─────────────────────────────── */

const page = (text: string) => ({
  text, picture: new Blob(['x']), audio: new Blob(['y']), seconds: 1,
});
const story: KeptStory = {
  id: 'one',
  title: 'The cat who went to the moon',
  made: 1,
  pages: [page('A cat.'), page('A rocket.'), page('The moon.')],
};

const sheets = sheetsOf(story);
ok('the first sheet is a cover', sheets[0]?.kind === 'cover', String(sheets[0]?.kind));
ok('  and the inside pages start at 1',
  sheets.slice(1).map((one) => (one.kind === 'page' ? one.number : -1)).join(',') === '1,2,3',
  sheets.slice(1).map((one) => (one.kind === 'page' ? one.number : -1)).join(','),
  );
ok('  and the cover says how many pages are in it',
  sheets[0]?.kind === 'cover' && sheets[0].pages === 3,
  'a grown-up wants the sheet count before the dialog, not after');
ok('  and a sheet is counted for the cover too',
  sheetCount(story) === 4, String(sheetCount(story)));
ok('  and every page keeps its own picture and its own words',
  sheets.slice(1).every((one, at) => one.kind === 'page'
    && one.text === story.pages[at].text
    && one.picture === story.pages[at].picture),
  'a page whose picture belongs to another page prints, and is wrong');

ok('a story with no pages still gives something to print',
  sheetsOf({ ...story, pages: [] }).length === 1,
  'pressing print and getting a silent nothing is the worst answer a button'
  + ' can give');

/* ── 8. A title that fits on a cover ────────────────────────────────── */

ok('a short title is left exactly alone',
  coverTitle('A cat') === 'A cat', coverTitle('A cat'));
const long = 'Once upon a time there was a very small brown dog who lived';
ok('  and a long one is cut on a word',
  coverTitle(long).length <= TITLE_MOST + 1
  && coverTitle(long).endsWith('…')
  && !/\s…$/.test(coverTitle(long))
  && long.startsWith(coverTitle(long).replace('…', '')),
  coverTitle(long));
ok('  and a cut never leaves a cover with nothing but a dot',
  coverTitle('Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa').length > 12,
  'a single long word with no space in it must not cut back to nothing');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

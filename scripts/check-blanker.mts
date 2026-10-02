/**
 * The blanker every other check stands on.
 *
 * ── Why this is worth its own check ──────────────────────────────────────
 *
 * `scripts/prose.mts` is read by most of the source checks in this repo.
 * Every one of them greps a blanked copy of a file. So a region the blanker
 * wrongly wipes is a region NO check can see — and the way that shows up is
 * not an error. It is a green assertion about code that is not there.
 *
 * That is the one failure mode Carli has asked about more than any other: a
 * check that is green because it measured something adjacent to the real
 * thing. Here the adjacent thing is "the file, minus a hole nobody knows
 * about".
 *
 * ── The hole that was really there ───────────────────────────────────────
 *
 * Found on 4 October 2026 while writing `check:editoropen`, which could not
 * see `data-editoropenchannel` in a file that plainly contains it. The cause
 * was eleven characters of perfectly ordinary JSX:
 *
 *     accept="video/*"
 *
 * The blanker looked for `/*` with a regular expression, so the `/` and `*`
 * inside that quoted attribute opened a comment — and it stayed open until
 * the next real `*‌/` in the file, hundreds of lines down. Everything between
 * the two was invisible to every check that read the file.
 *
 * `app/components/VideoEditor.tsx` and `app/components/Booth.tsx` both carry
 * that attribute, and both are among the most heavily checked files here.
 *
 * So the rules below are deliberately about the tokenizing and not about any
 * one file: a `/*` or a `//` inside a string is text, an escape is not a
 * delimiter, and the blanked copy is the same length and the same line shape
 * as the original so that every offset counted off it is real.
 */
import { code, withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* ── A comment opener inside a string is not a comment ─────────────────── */

const attribute = [
  'const a = 1;',
  '<input accept="video/*" />',
  '<div data-findme />',
  '/* a real comment */',
  '<div data-alsofindme />',
].join('\n');

ok('an `accept="video/*"` attribute does not open a comment',
  withoutComments(attribute).includes('data-findme')
  && code(attribute).includes('data-findme'),
  'eleven characters of ordinary JSX used to blank everything from there to'
  + ' the next real comment close — a hole no check could report');

ok('  and the file is still whole after the next real comment',
  withoutComments(attribute).includes('data-alsofindme')
  && code(attribute).includes('data-alsofindme'),
  'the wrongly-opened comment closed at the first genuine `*` + `/`, so the'
  + ' hole ran across whatever sat between them');

ok('a `//` inside a string does not start a line comment',
  withoutComments('const u = "a//b"; const seen = "data-seen";').includes('data-seen'),
  'a path, a URL or a regex written in quotes is text');

ok('the comment itself is still blanked',
  !withoutComments('/* data-hidden */ const a = 1;').includes('data-hidden')
  && !withoutComments('// data-hidden\nconst a = 1;').includes('data-hidden'),
  'this is the blanker’s whole job — a shape named in the paragraph'
  + ' explaining the shape is not that shape');

ok('  including a comment that is never closed',
  !withoutComments('const a = 1;\n/* data-hidden').includes('data-hidden'),
  'an unterminated block comment swallows the rest of the file in the'
  + ' compiler too, so the blanker agreeing with it is the honest reading');

ok('a `//` after a colon is still not a comment',
  withoutComments('const site = https://data-seen;').includes('data-seen'),
  'the rule that protects a bare URL in JSX text, kept');

/* ── The two blankers still differ in the one way that matters ─────────── */

const quoted = 'fetch("/api/kept"); // data-hidden';

ok('withoutComments keeps what a string SAYS',
  withoutComments(quoted).includes('/api/kept'),
  'a check looking FOR a route path reads the path');

ok('code blanks what a string says, and keeps its quotes',
  !code(quoted).includes('/api/kept') && /"\s+"/.test(code(quoted)),
  'a bracket or a `??` inside a quoted sentence is not a bracket — a check'
  + ' reading the SHAPE of a statement must not see one');

/* ── Escapes are not delimiters ────────────────────────────────────────── */

ok('an escaped quote does not end the string',
  code('const a = "he said \\"deep\\" loudly"; const b = 2;').includes('const b = 2;'),
  'a string that ends early makes the code after it read as string and the'
  + ' string after it read as code — every offset past that point is wrong');

ok('a regex written as /\\// does not start a line comment',
  withoutComments('const r = /\\//; const seen = "data-seen";').includes('data-seen'),
  'the escaped slash leaves a `/` and the closing `/` side by side');

ok('a template literal is a string too',
  withoutComments('const a = `hold /* on */ tight`; const seen = "data-seen";')
    .includes('data-seen'),
  'backticks run across lines, so a `/*` mistaken inside one blanks further'
  + ' than anywhere else could');

/* ── Shape and length, because reports point at lines ──────────────────── */

const shaped = 'const a = 1; /* one\ntwo */ const b = "x//y";\n// three\nconst c = 2;';

ok('the blanked copy is the same length as the original',
  withoutComments(shaped).length === shaped.length && code(shaped).length === shaped.length,
  'a blanker that shortened the text would make every line number counted'
  + ' off it point at the wrong line');

ok('  and has the same newlines in the same places',
  withoutComments(shaped).split('\n').length === shaped.split('\n').length
  && code(shaped).split('\n').length === shaped.split('\n').length,
  'including the newlines inside a blanked block comment');

/* ── And the real files the hole was found in ──────────────────────────── */

import { readFileSync } from 'node:fs';

for (const file of ['app/components/VideoEditor.tsx', 'app/components/Booth.tsx']) {
  const raw = readFileSync(file, 'utf8');
  const kept = withoutComments(raw);
  /* Markers written as a JSX attribute on a line of their own. Taken this
     way and not as every `data-…` in the file, because a marker NAMED in a
     paragraph is prose and is supposed to be blanked — reading those as holes
     would make this rule fail on a correct blanker, which is its own kind of
     useless. The shape is read off the raw text, so it owes the tokenizer
     under test nothing. */
  const marks = [...raw.matchAll(/^[ \t]*(data-[a-z]+)[ \t]*$/gm)].map((hit) => hit[1]);
  const holes = [...new Set(marks)].filter((mark) => kept.indexOf(mark) === -1);
  ok(`every marker in ${file.split('/').pop()} survives blanking`,
    marks.length > 0 && holes.length === 0,
    holes.length
      ? `${holes.length} invisible to every check: ${holes.slice(0, 6).join(', ')}`
      : `${new Set(marks).size} markers, none hidden`);
}

if (bad) {
  console.error(`\ncheck:blanker — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:blanker — comments are blanked, a comment opener inside a string is'
  + ' text, escapes are not delimiters, and the blanked copy is the same shape'
  + ' as the file so every offset counted off it is real.',
);

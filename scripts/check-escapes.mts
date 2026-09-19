/**
 * A backslash-u in JSX text is four letters, not a character.
 *
 * ── The one that shipped ─────────────────────────────────────────────────
 *
 * Carli, 19 September 2026, a photograph of the Pro Booth with the zoom
 * readout showing:
 *
 *     4\u00d7
 *
 * The source said `{zoom}\u00d7`, meant as "4×". Inside a string literal
 * that is an escape and comes out as one character; in JSX text it is six
 * characters of nothing, printed exactly as typed. TypeScript is happy,
 * every test that reads the DOM by a role or a label is happy, and the
 * person holding the phone is looking at `4\u00d7`.
 *
 * It only shows on a screen, and only to somebody looking at that one
 * corner of that one room while zoomed in — which is why it survived long
 * enough to arrive in a photograph.
 *
 * ── How it is found ──────────────────────────────────────────────────────
 *
 * Comments come out first, then every quoted string and template literal.
 * What is left is code and JSX text, and a `\uXXXX` in there is always this
 * mistake: in code it would be a syntax error, so in practice it is always
 * text somebody meant to be a character.
 *
 * Stripping in that order matters. An apostrophe inside a comment — and
 * this repo's comments are full of them — would otherwise open a string
 * that swallows the rest of the file, and the check would pass by seeing
 * nothing at all.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

/** Comments first, then strings. See the note above on why that order. */
function bare(source: string): string {
  return source
    /* Newlines kept, so a reported line number is the one in the file.
       The first version collapsed a block comment to a space and pointed
       at line 397 of a 780-line file — a true finding at a false address,
       which is most of the way to not being a finding. */
    .replace(/\/\*[^]*?\*\//g, (hit) => hit.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

const found: string[] = [];
for (const path of walk('app')) {
  const lines = bare(readFileSync(path, 'utf8')).split('\n');
  lines.forEach((line, at) => {
    const hit = /\\u[0-9a-fA-F]{4}/.exec(line);
    if (hit) found.push(`${path}:${at + 1} ${hit[0]}`);
  });
}

ok(
  'no screen prints a backslash-u where a character was meant',
  found.length === 0,
  found.join(', '),
);

/* The check can fail, shown rather than claimed: the string below is the
   shape of the fault, and it is inside a string literal here so it is a
   character and not the mistake. `bare` has to keep the JSX kind and drop
   this kind, and this proves it does both. */
const SAMPLE = 'const a = <p>{n}\\u00d7</p>;\nconst b = <p>{"\\u00d7"}</p>;';
const left = bare(SAMPLE);
ok(
  '  and it can tell the two apart',
  /\\u00d7/.test(left.split('\n')[0]) && !/\\u00d7/.test(left.split('\n')[1]),
  'a JSX one must survive the stripping and a quoted one must not',
);

if (failures) {
  console.error(
    '\ncheck:escapes — a `\\uXXXX` outside a string is printed letter by letter. It looks'
    + ' right in the source, compiles, and reaches somebody\u2019s phone as gibberish.\n',
  );
  process.exit(1);
}
console.log('\ncheck:escapes — every backslash-u in the app is inside a string, where it is a character.');

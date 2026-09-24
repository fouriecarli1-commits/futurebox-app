/**
 * The standards pass, held against the code it describes.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `docs/SAFETY-REVIEW.md` was written on 5 September for exactly the review
 * this app is about to be handed to. On 24 September its figures were wrong
 * in four places at once, and one of them — *"44 checks, of which 82 are
 * browser probes"* — cannot be true of anything.
 *
 * None of that was carelessness. The document was accurate the day it was
 * written and then the app nearly doubled. A count in prose is a measurement
 * with no date on it, and it goes wrong silently in both directions: this one
 * also said *"there is no second factor"* three weeks after an authenticator
 * had been built.
 *
 * A security document that understates the product is not harmless. It is a
 * document nobody can trust in either direction.
 *
 * ── Two kinds of rule, deliberately ──────────────────────────────────────
 *
 * **Absolutes** — `as any`, `@ts-ignore`, TODO — are asserted at nought. They
 * are not allowed to grow, so there is nothing to keep in step.
 *
 * **Counts that legitimately grow** — checks, probes, eslint suppressions —
 * are asserted to match what the DOCUMENT says. Not to a ceiling: the point
 * is not to stop them growing, it is that the page saying how many there are
 * has to be right. Add an `<img>` and this goes red until somebody changes
 * the sentence, which is the whole job.
 *
 * ── It blanks prose first, and that is the point of the file ─────────────
 *
 * The first attempt at re-measuring used a plain grep and reported 23
 * `as any`. Every one was prose — "has any other reason", "has anything in
 * it". A standards pass that measures its own paragraphs is the same failure
 * it is looking for.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { code } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

const sources: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (entry !== 'node_modules' && entry !== '.next') walk(full); }
    else if (/\.(ts|tsx)$/.test(entry)) sources.push(full);
  }
};
walk('app');

let lines = 0;
const found: Record<string, string[]> = { any: [], ignore: [], todo: [], log: [] };
let suppressions = 0;

for (const file of sources) {
  const raw = readFileSync(file, 'utf8');
  lines += raw.split('\n').length;
  const text = code(raw);
  const at = (index: number): string => `${file}:${text.slice(0, index).split('\n').length}`;

  for (const m of text.matchAll(/\bas\s+any\b/g)) found.any.push(at(m.index ?? 0));
  for (const m of text.matchAll(/console\.log\s*\(/g)) found.log.push(at(m.index ?? 0));
  /* These two live in comments by definition, so they are counted on the RAW
     text. Blanking first would report nought and call it clean, which is the
     exact shape of a check that measures something adjacent. */
  for (const _ of raw.matchAll(/@ts-(ignore|nocheck)/g)) found.ignore.push(file);
  for (const _ of raw.matchAll(/\b(TODO|FIXME|HACK)\b/g)) found.todo.push(file);
  suppressions += [...raw.matchAll(/eslint-disable/g)].length;
}

/* ── The absolutes ─────────────────────────────────────────────────────── */

ok(`no \`as any\` anywhere in app/ (${lines.toLocaleString('en-ZA').replace(/,/g, ' ')} lines)`,
  found.any.length === 0,
  found.any.join(', '));
ok('no @ts-ignore or @ts-nocheck', found.ignore.length === 0, [...new Set(found.ignore)].join(', '));
ok('no TODO, FIXME or HACK', found.todo.length === 0, [...new Set(found.todo)].join(', '));

/* ── And the counts the page states ────────────────────────────────────── */

const page = readFileSync('docs/SAFETY-REVIEW.md', 'utf8');
/* Prose writes small numbers as words, and a page that reads well is not a
   page doing it wrong. The first version returned NaN on "Two `console.log`"
   and reported a correct sentence as a stale one — a check demanding its
   subject be written for the check's convenience. */
const WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const stated = (what: RegExp): number | null => {
  const hit = what.exec(page);
  if (!hit) return null;
  const said = hit[1].replace(/\s/g, '');
  return WORDS[said.toLowerCase()] ?? Number(said);
};

const checks = [...readFileSync('package.json', 'utf8').matchAll(/"check:[a-z]+"/g)].length;
const probes = readdirSync('audit').filter((one) => one.endsWith('.mjs')).length;

for (const [what, real, said] of [
  ['checks', checks, stated(/\*\*([\d\s]+) checks\*\* wired into CI/)],
  ['browser probes', probes, stated(/\*\*([\d\s]+) are browser probes\*\*/)],
  ['eslint suppressions', suppressions, stated(/\*\*([\d\s]+) eslint suppressions\*\*/)],
  ['console.log', found.log.length, stated(/\*\*([A-Za-z\d\s]+?) `console\.log`\*\*/)],
] as const) {
  ok(`the review says how many ${what} there are, and it is right`,
    said !== null && said === real,
    said === null ? `the page states no figure for ${what}` : `the page says ${said}, there are ${real}`);
}

/* The one that went wrong in the flattering direction. A security document
   that understates the product is as untrustworthy as one that overstates it,
   and this page said there was no second factor for three weeks after one was
   built. */
ok('and it does not claim the app lacks something it has',
  !/there is no second factor/i.test(page),
  'an authenticator has existed since 23 September');

if (bad > 0) {
  console.log(`\ncheck:standards — ${bad} claim(s) in docs/SAFETY-REVIEW.md no longer describe this code.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:standards — the standards pass describes the code that is actually here.');
}

/**
 * No rule may read "not there" as "first".
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * `indexOf` answers -1 for something absent, and -1 is less than every real
 * position. So the one-line idiom for "A comes before B":
 *
 *     ok('the bytes go down before the row does',
 *       shelf.indexOf('putAudio(') < shelf.indexOf('const all ='));
 *
 * is true of a file that does it in the right order AND of a file that does
 * not do the first thing at all. The second file is the one the rule was
 * written to catch. It is reported as ok.
 *
 * Sixteen rules across fifteen checks were written that way, plus two
 * probes. Proved rather than argued on 23 September 2026: the subtitle draw
 * was deleted out of `app/lib/stitch.ts` — an app that puts no words on any
 * stitched video at all — and `check:logomark`, whose entire subject is what
 * gets drawn in which order, came back green on every one of its rules.
 *
 * The same fault wears a second costume. `text.slice(0, text.indexOf(gone))`
 * is `slice(0, -1)`: the whole file but its last character. A rule scoped to
 * the top of a file quietly widens to all of it and then passes on a match
 * from the part it was written to exclude.
 *
 * It had already been found and fixed privately in three separate checks in
 * one day before anybody went looking for the rest. That is why this check
 * exists and not a fourth private fix: the shape is the thing to ban.
 *
 * ── What is required instead ─────────────────────────────────────────────
 *
 * `before`, `after`, `afterLast`, `upTo` and `from` in `scripts/order.mts`,
 * every one of which requires both ends to be present. In a probe, which
 * runs under plain node and cannot import a `.mts`, the two positions are
 * read into names and tested against -1 before they are compared.
 *
 * ── What this does NOT catch, said plainly ───────────────────────────────
 *
 * Two positions read into names and compared with no -1 test anywhere near
 * them is the same fault, and the second rule below looks for exactly that.
 * What defeats it is a position passed through a function, returned, or
 * stored on an object before being compared. That is not the idiom anybody
 * reaches for, and a check that claims to catch every shape of this would
 * be doing the thing this file is about.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/**
 * The patterns are built out of pieces rather than written whole.
 *
 * A check that bans a shape and then contains that shape reports itself, and
 * the honest ways out of that are to build the pattern so the file genuinely
 * does not contain it, or to exempt itself. An exemption is the thing that
 * later hides a real one, so: pieces.
 */
const CALL = String.raw`\.(?:last)?[Ii]ndexOf\((?:[^()]|\([^()]*\))*\)`;
const NAME = String.raw`[A-Za-z_$][\w$]*(?:\.[\w$]+|\([^()]*\))*`;

/** `a.indexOf(x) < b.indexOf(y)` — two live calls either side of a comparison. */
const TWO_CALLS = new RegExp(`${NAME}${CALL}\\s*[<>]=?\\s*${NAME}${CALL}`);

/** `.slice(0, …indexOf(…))` with no `+ n` to make a missing anchor fail loud. */
const WIDENING = new RegExp(String.raw`\.slice\(\s*0\s*,\s*${NAME}${CALL}\s*\)`);

/**
 * Prose and the insides of strings blanked, offsets kept.
 *
 * Prose for the reason `check:signed` has it: a comment explaining this
 * fault contains this fault's shape, and a check that reads its own
 * explanation as code fails a file that is correct.
 *
 * String bodies because a bracket inside one is not a bracket. The rules
 * below read a call's arguments by matching its brackets, and
 * `page.indexOf('{atDoor && (')` has an opening bracket in the middle of a
 * quoted string with no partner. Unblanked, that call is not recognised as
 * a position at all, and the guard written a line above it stops counting —
 * which is how the first version of this check called `check:quiz` a fault
 * for a rule that is correct. Nothing here ever reads what a string SAYS,
 * only the shape of the code around it, so there is nothing to lose.
 *
 * Replaced with spaces rather than removed, so every reported line number
 * is still the real one.
 */
/* One blanker, shared with `check:whofirst`. See `prose.mts` — two copies
   of this would be two chances to drift. */
import { code } from './prose.mts';

const files: string[] = [
  ...readdirSync('scripts').filter((f) => f.endsWith('.mts')).map((f) => join('scripts', f)),
  ...readdirSync('audit').filter((f) => f.endsWith('.mjs')).map((f) => join('audit', f)),
];

const raw: string[] = [];
const named: string[] = [];
const widened: string[] = [];

for (const file of files) {
  const source = code(readFileSync(file, 'utf8'));
  const lines = source.split('\n');

  /* A comparison can be split over two lines, so each line is read with the
     one after it joined on. That is how `check:boothdock` wrote its pair. */
  for (let n = 0; n < lines.length; n += 1) {
    const window = `${lines[n]} ${lines[n + 1] ?? ''}`;
    if (TWO_CALLS.test(window)) raw.push(`${file}:${n + 1}`);
    if (WIDENING.test(lines[n])) widened.push(`${file}:${n + 1}`);
  }

  /* ── The named form ───────────────────────────────────────────────────

     `const a = x.indexOf(…)` and then `a < b`, with nothing establishing
     that the dangerous end is really there.

     Only one end is dangerous, and which one depends on the operator. In
     `a < b` the fault is `a` being -1, because -1 is below every real
     position and the rule reads as satisfied. In `a > b` it is `b`. The
     other end missing makes the comparison FALSE, which is a rule failing
     loud — the correct outcome, and not something to report.

     An end counts as established if something in the same statement says it
     is at least 0: a test against -1 or 0, or a comparison putting it above
     an end already established. That second form is not cleverness for its
     own sake — `atDoor !== -1 && quizAt > atDoor && quizAt < doorEnds` is
     how four correct rules in this repository are written, and a check that
     called all four of them faults is a check that gets switched off. */
  const positions = new Set<string>();
  for (const found of source.matchAll(new RegExp(String.raw`\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*${NAME}${CALL}`, 'g'))) {
    positions.add(found[1]);
  }
  if (positions.size === 0) continue;

  /** The statement around an offset: the last `;` behind it to the next one. */
  const statement = (at: number): string => {
    const opens = source.lastIndexOf(';', at);
    const shuts = source.indexOf(';', at);
    return source.slice(opens + 1, shuts === -1 ? source.length : shuts);
  };

  /** The names this statement puts at 0 or above, chased until it settles. */
  const established = (text: string): Set<string> => {
    const sure = new Set<string>();
    for (const name of positions) {
      if (new RegExp(String.raw`\b${name}\s*(?:!==|!=|>=?)\s*-?[01]\b|\b-?[01]\s*(?:!==|!=|<=?)\s*${name}\b`).test(text)) sure.add(name);
    }
    for (let pass = 0; pass < positions.size; pass += 1) {
      const was = sure.size;
      for (const found of text.matchAll(/\b([A-Za-z_$][\w$]*)\s*(>=?|<=?)\s*([A-Za-z_$][\w$]*)\b/g)) {
        const [, left, how, right] = found;
        if (how.startsWith('>') && sure.has(right) && positions.has(left)) sure.add(left);
        if (how.startsWith('<') && sure.has(left) && positions.has(right)) sure.add(right);
      }
      if (sure.size === was) break;
    }
    return sure;
  };

  for (const found of source.matchAll(/\b([A-Za-z_$][\w$]*)\s*([<>]=?)\s*([A-Za-z_$][\w$]*)\b/g)) {
    const [, left, how, right] = found;
    if (!positions.has(left) || !positions.has(right)) continue;
    /* `a < b` is undone by a missing `a`; `a > b` by a missing `b`. */
    const risky = how.startsWith('<') ? left : right;
    if (established(statement(found.index)).has(risky)) continue;
    const at = source.slice(0, found.index).split('\n').length;
    named.push(`${file}:${at} (${left} ${how} ${right}, nothing says ${risky} is there)`);
  }
}

console.log(`  read ${files.length} files`);

ok('no rule compares two indexOf calls straight against each other',
  raw.length === 0,
  `${raw.length}: ${raw.slice(0, 6).join(', ')} — use before/after/afterLast from scripts/order.mts, `
  + 'which answer false when either end is missing instead of reading -1 as first');

ok('  nor two positions held in names with nothing checking them against -1',
  named.length === 0,
  `${named.length}: ${named.slice(0, 6).join(', ')} — test each against -1 before comparing them`);

ok('  and nothing slices to an anchor that may not be there',
  widened.length === 0,
  `${widened.length}: ${widened.slice(0, 6).join(', ')} — slice(0, -1) is the whole file bar one character, `
  + 'so a rule scoped to the top of a file quietly widens to all of it; use upTo from scripts/order.mts');

/* ── And the helper itself actually refuses a missing end ───────────────
   The three rules above are worth nothing if what they point people at has
   the fault too, so it is run rather than read. */
const { before, after, afterLast, upTo, from } = await import('./order.mts');
ok('and the helper they point at answers false when either end is missing',
  before('b only', 'a', 'b') === false
  && before('a only', 'a', 'b') === false
  && before('a then b', 'a', 'b') === true
  && after('b only', 'b', 'a') === false
  && after('a then b', 'b', 'a') === true
  && afterLast(['b', 'a', 'b'], 'a', 'b') === false
  && afterLast(['b', 'a'], 'a', 'b') === true
  && afterLast(['a'], 'a', 'b') === false
  && upTo('one|two', 'gone') === ''
  && upTo('one|two', '|') === 'one'
  && from('one|two', 'gone') === ''
  && from('one|two', '|') === '|two',
  'scripts/order.mts does not do what this check tells everybody to use it for');

if (failures) {
  console.log(`\ncheck:ordering — ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  '\ncheck:ordering — nothing reads a missing thing as the first thing: every "A before B" rule '
  + 'requires both ends, and every slice to an anchor fails loud when the anchor goes.',
);

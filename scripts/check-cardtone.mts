/**
 * The warm card stays rare.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `Card` gained a `tone` prop so the studio's regeneration notice could be
 * yellow while shut. Carli: "Maak daai a new take boksie lig geel sodat
 * mense dit wel oop maak." That is a real argument — a fold's one cost is
 * that a shut card is a heading in a row of identical headings, and colour
 * is how one of them says "this is a caution, not a setting".
 *
 * It is also exactly the kind of prop that eats an app. The green sweep
 * earlier this session went from "the studio doors should be green" to
 * sixty-four buttons in one change, and it was right to; a colour that
 * means "look here" is worth nothing once everything has it.
 *
 * So the prop is a literal union with one value, and this counts the
 * cards that use it. The ceiling is not a law about taste — it is a line
 * somebody has to come here and raise on purpose, having read this.
 *
 * ── What it does not check ───────────────────────────────────────────────
 *
 * Whether yellow was the right answer for that one card. No check can have
 * an opinion about that. What it can hold is that the second and third
 * cards to want it are a decision rather than a habit.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/**
 * How many cards may be warm.
 *
 * One today: the studio's "A new take, not an edit". Raise it here, in this
 * file, with the card named — not by adding a prop and moving on.
 */
const CEILING = 3;

const card = readFileSync('app/components/Card.tsx', 'utf8');

/* A literal union, not a colour and not a className. The whole containment
   is in the type: `tone?: string` would let any class through and `Card`
   would stop having a shape. */
ok(
  'Card’s tone is a named literal, not free text',
  /readonly tone\?: (?:'[a-z]+'\s*\|\s*)*'[a-z]+';/.test(card),
  'expected `readonly tone?: \'amber\'` (a union of literals)',
);
ok(
  'and Card takes no className of its own',
  !/readonly className\?:/.test(card),
  'a className prop on a shared card is how a component stops having a shape',
);

const walk = (dir: string, found: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (path.endsWith('.tsx')) found.push(path);
  }
  return found;
};

const users: string[] = [];
const odd: string[] = [];
for (const file of walk('app')) {
  if (file.endsWith('components/Card.tsx')) continue;
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/<Card\b[\s\S]{0,400}?\/?>/g)) {
    const tag = match[0];
    const tone = /\btone=(?:"([^"]*)"|\{'([^']*)'\})/.exec(tag);
    if (!tone) continue;
    const line = source.slice(0, match.index).split('\n').length;
    const value = tone[1] ?? tone[2] ?? '';
    users.push(`${file}:${line}`);
    if (value !== 'amber') odd.push(`${file}:${line} tone="${value}"`);
  }
}

ok('every warm card asks for the one tone there is', odd.length === 0, odd.join(' · '));
ok(
  `at most ${CEILING} cards are warm`,
  users.length <= CEILING,
  `${users.length}: ${users.join(' · ')}`,
);

if (failures) {
  console.error(
    '\ncheck:cardtone — a colour that means "look here" is worth nothing once\n' +
      'everything has it. If a fourth card really needs the tone, raise CEILING in\n' +
      'scripts/check-cardtone.mts and say which card and why.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:cardtone — ${users.length} warm card(s) of ${CEILING} allowed, and the tone is still a named literal.`);

/**
 * No comment is ever printed on a screen.
 *
 * ── The night this is for ────────────────────────────────────────────────
 *
 * Carli sent a photograph of the album art room with eight lines of my own
 * explanation rendered across it, in the room's serif, over the artwork:
 *
 *     /* `max-h-full`, not a share of the viewport. Carli: *"Die back
 *     buttons is daar, maar is ook weggesteek."* They were, and it was my
 *     own fix from an hour earlier…
 *
 * In JSX a comment is `{-* … *-}`. A bare `/* … *-/` between two elements
 * is not a comment at all — it is text, and React prints it. (The dashes
 * here are so this file does not close its own comment while describing
 * the mistake.)
 *
 * Nothing caught it. It is valid JavaScript, valid TypeScript, valid JSX,
 * and the build is perfectly happy: the page renders, with a paragraph of
 * engineering notes on it. Only a person looking at the screen sees it, and
 * on that night the person looking was her.
 *
 * ── What it looks for ────────────────────────────────────────────────────
 *
 * A line whose first non-space characters open a block comment, inside the
 * returned markup of a component. Comments between ATTRIBUTES are fine and
 * common in this repository — those sit inside a tag, where they really are
 * comments — so the rule only fires where the previous line ended the tag.
 *
 *   npm run check:jsxcomment
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === '.next') continue;
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path, out);
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
};

const printed: string[] = [];
let looked = 0;

for (const file of walk('app')) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const [i, line] of lines.entries()) {
    if (!/^\s*\/\*/.test(line)) continue;
    /* Only inside markup. The previous non-blank line has to have CLOSED a
       tag or be markup itself — a comment at the top of a file, above a
       function, or between attributes is not on anybody's screen. */
    let back = i - 1;
    while (back >= 0 && lines[back].trim() === '') back -= 1;
    if (back < 0) continue;
    const before = lines[back].trim();
    const inMarkup = /^(>|\/>|<\/\w[\w.]*>|\{\/\* .*\*\/\}|<\w[\w.]*[^>]*>)$/.test(before)
      || /(?<!=)>$/.test(before) && !/^(import|export|const|let|function|interface|type)\b/.test(before);
    if (!inMarkup) continue;
    looked += 1;
    printed.push(`${file}:${i + 1}: ${line.trim().slice(0, 70)}…`);
  }
}

if (printed.length) {
  console.error(
    `check:jsxcomment — ${printed.length} comment(s) in markup position, which React prints as text:\n`
    + printed.map((one) => `  ${one}`).join('\n')
    + '\n\nWrap them in braces. A comment inside JSX is {/* … */}; a bare /* … */ is a paragraph.\n',
  );
  process.exit(1);
}
console.log(
  `check:jsxcomment — no comment is printed on a screen (${looked} candidate position(s) examined).`,
);

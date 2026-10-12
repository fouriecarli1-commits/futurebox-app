/**
 * No control writes into a void.
 *
 * ── What this is about ───────────────────────────────────────────────────
 *
 * A `useState` pair whose VALUE is never read is a control that moves and
 * changes nothing. The setter runs, React re-renders, and not one pixel
 * depends on what was set. On the screen it is a slider that slides, a
 * toggle that toggles, a field that accepts what you type — and no effect
 * whatsoever. Nothing throws, so nothing reports it.
 *
 * This is the exact shape of the complaint that is hardest to act on: *"dit
 * werk nie"* about a control that visibly responds.
 *
 * ── What it caught ───────────────────────────────────────────────────────
 *
 * `MakeMusic.tsx` held `const [buying, setBuying] = useState<string | null>`
 * — declared, never set, never read. A leftover from the per-track buy flow
 * that came out when she said *"Te veel aankoop punte gaan mense afsit."*
 * Harmless in itself, and the only reason it is worth a check is that the
 * harmless version and the broken version are indistinguishable from here:
 * both are a value nothing reads.
 *
 * ── Why this is not what TypeScript already does ─────────────────────────
 *
 * `noUnusedLocals` does not see it. The pair is destructured, the SETTER is
 * used, and that counts the declaration as used — so a value nothing reads
 * passes a clean `tsc` and a clean lint. Measured, not assumed: the leftover
 * above sat through both for as long as it existed.
 *
 * ── Why the comment-stripping is somebody else's job ─────────────────────
 *
 * The first version of this check reported NINE and eight were false. It
 * stripped comments with `/\/\*[\s\S]*?\*\//g`, and `accept="audio/*"` in
 * VoiceLab opened a comment that was never closed where it looked — eating
 * 3,808 characters of live code, including every read of three values. A
 * check that invents faults is worse than no check, because somebody acts on
 * it.
 *
 * `withoutComments` walks character by character and enters a string before
 * it can see a `/*` inside one, which is the only way to get this right.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

/** Where components live. A `useState` outside a component is not a control. */
const LOOK = ['app/components', 'app'];

/**
 * Values that are deliberately written and never read.
 *
 * Empty, and meant to stay that way. It exists so that a value with a real
 * reason to be write-only — forcing a re-render is the usual one — is a line
 * somebody wrote down rather than a hole in the rule.
 */
const ALLOWED: Readonly<Record<string, string>> = {};

let bad = 0;

function filesUnder(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.next') filesUnder(path, found);
    } else if (path.endsWith('.tsx')) found.push(path);
  }
  return found;
}

const seen = new Set<string>();
const files = LOOK.flatMap((dir) => filesUnder(dir)).filter((one) => {
  if (seen.has(one)) return false;
  seen.add(one);
  return true;
});

for (const file of files) {
  const code = withoutComments(readFileSync(file, 'utf8'));
  const pairs = /const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState/g;
  let found: RegExpExecArray | null;
  while ((found = pairs.exec(code))) {
    const [, value, setter] = found;
    /* The declaration itself is one of the matches, so one occurrence means
       the declaration and nothing else. */
    const reads = (code.match(new RegExp(`\\b${value}\\b`, 'g')) ?? []).length - 1;
    if (reads > 0) continue;
    const why = ALLOWED[`${file}:${value}`];
    if (why) {
      console.log(`  ok   ${value} in ${file} is write-only on purpose — ${why}`);
      continue;
    }
    bad += 1;
    console.log(`  NOT  ${file}: ${value} is set by ${setter} and read by nothing`);
  }
}

if (bad) {
  console.error(
    `\ncheck:intovoid — ${bad} value(s) written and never read. A control bound to`
    + ' one of these responds on the screen and changes nothing, which is the'
    + ' hardest kind of "it does not work" to act on. Read it, or take it out.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:intovoid — ${files.length} screens, and every piece of state they keep is read by something.`);

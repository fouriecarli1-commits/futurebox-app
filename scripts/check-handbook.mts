/**
 * The generated handbook is not older than the pages it was generated from.
 *
 * `app/lib/server/handbook.generated.ts` is what the help assistant reads when
 * somebody asks what happens to their data or whether a free song is theirs.
 * If /terms changes and this does not, the assistant keeps answering out of
 * last month's policy — confidently, in a support conversation, about money
 * and ownership. Nobody would notice until it mattered.
 *
 * So: regenerate in memory, compare, fail with the command that fixes it.
 */
import { readFileSync } from 'node:fs';
import { handbook, fileFor } from './build-handbook.mts';

const OUT = 'app/lib/server/handbook.generated.ts';

let committed: string;
try {
  committed = readFileSync(OUT, 'utf8');
} catch {
  console.error(`\n${OUT} is missing. Run: npm run handbook\n`);
  process.exit(1);
}

const fresh = fileFor(handbook());

if (committed !== fresh) {
  console.error(
    `\n${OUT} does not match app/terms/page.tsx and app/privacy/page.tsx.\n\n` +
      'The help assistant answers policy questions out of that file, so a stale\n' +
      'copy is a wrong answer about money or ownership given with confidence.\n\n' +
      'Run: npm run handbook — then commit the result.\n',
  );
  process.exit(1);
}

const lines = handbook().split('\n');
console.log(
  `check:handbook — ${lines.filter((l) => l.startsWith('##')).length} sections, ` +
    `${lines.length} lines, matching the pages.`,
);

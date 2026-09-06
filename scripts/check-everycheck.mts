/**
 * Every check runs somewhere, or it is not a check.
 *
 * ── What this found the day it was written ───────────────────────────────
 *
 * Seventeen of sixty-one. `check:mail`, `check:entity`, `check:makesong`,
 * `check:listen`, `check:radarshuffle`, `check:tempo` — all written on
 * purpose, all passing, and none of them run by anything except somebody
 * remembering to type them.
 *
 * That is worse than not having written them. A check nobody runs is not a
 * safety net, it is a claim that there is one: the file exists, it is read
 * during a review, and it is taken as evidence that the thing it describes is
 * still true. `check:entity` is the sharpest case — its whole reason for
 * existing is that the legal page is right the first time somebody fills it
 * in, months after it was written, by somebody who will never open it.
 *
 * ── Why this is a check and not a tidy-up ────────────────────────────────
 *
 * Because the seventeen were not added carelessly; they were added one at a
 * time, each in a commit about something else, and wiring CI was a separate
 * step each time that nobody was reminded of. That will happen again with the
 * sixty-second. So the rule is enforced where it cannot be forgotten, and the
 * failure names the script rather than saying coverage has dropped.
 */
import { readFileSync, readdirSync } from 'node:fs';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const scripts = (JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }).scripts;
const workflow = readdirSync('.github/workflows')
  .map((one) => readFileSync(`.github/workflows/${one}`, 'utf8'))
  .join('\n');

const checks = Object.keys(scripts).filter((one) => one.startsWith('check:'));
check('there are checks to check', checks.length > 40, `${checks.length}`);

/**
 * A check that runs itself would always pass, and one that is only ever named
 * inside its own comment is not run either. Matched on the shapes CI actually
 * uses: `npm run check:x`, and the shard lists, which are bare names.
 */
const runs = (name: string) =>
  new RegExp(`(npm run (--silent )?"?${name}\\b|^\\s+probes:.*\\b${name}\\b)`, 'm').test(workflow);

const orphans = checks.filter((one) => !runs(one));
check('every check is run by CI', orphans.length === 0, orphans.join(' ') || 'all of them');

/* And the other direction: a name in the workflow that is not a script is a
   step that has been silently passing by doing nothing at all. */
const named = [...workflow.matchAll(/npm run (?:--silent )?"?(check:[a-z]+)/g)].map((one) => one[1]);
const shardNames = [...workflow.matchAll(/^\s+probes:\s*(.+)$/gm)].flatMap((one) => one[1].trim().split(/\s+/));
const ghosts = [...new Set([...named, ...shardNames])].filter((one) => !checks.includes(one));
check('and CI names no check that does not exist', ghosts.length === 0, ghosts.join(' ') || 'none');

if (failures) {
  console.error(
    '\ncheck:everycheck — a check nobody runs is not a safety net, it is a claim' +
      '\nthat there is one. Add it to .github/workflows, or delete it.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:everycheck — all ${checks.length} checks run, and CI names none that is not there.`);

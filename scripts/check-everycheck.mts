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

/**
 * And it is named in a job that can actually run it.
 *
 * "Named in the workflow" is not the same as "runs". A check that drives a
 * browser needs `npx playwright install --with-deps chromium`, and only the
 * screens job does that — so a browser probe listed as a step in the source
 * job fails on its first line with a missing browser, which reads as the app
 * being broken rather than as the step being in the wrong place.
 *
 * That is exactly what happened to `check:selfie`: added as a step in the
 * source job, passing locally where a browser exists, and this file said all
 * was well because it only ever asked whether the name appeared somewhere in
 * the file. The same shape as the bugs it exists to catch.
 *
 * The tell is the script itself: a check that runs `node audit/…` drives a
 * browser, and every other one does not.
 */
const screens = workflow.slice(workflow.indexOf('  screens:'));
const source = workflow.slice(0, workflow.indexOf('  screens:'));
const inShard = (name: string) => new RegExp(`^\\s+probes:.*\\b${name}\\b`, 'm').test(screens);
const inSource = (name: string) =>
  new RegExp(`npm run (--silent )?"?${name}\\b`, 'm').test(source);

const misplaced = checks.filter((one) => scripts[one].includes('audit/') && !inShard(one));
check(
  'every check that needs a browser is in the job that installs one',
  misplaced.length === 0,
  misplaced.length
    ? `${misplaced.join(' ')} — the source job has no Chromium`
    : 'all of them',
);

const overdressed = checks.filter((one) => !scripts[one].includes('audit/') && inShard(one));
check(
  'and no source check is paying for a browser it does not use',
  overdressed.length === 0,
  overdressed.join(' ') || 'none',
);

const homeless = checks.filter(
  (one) => !scripts[one].includes('audit/') && !inSource(one) && !inShard(one),
);
check(
  'every source check is a step in the source job',
  homeless.length === 0,
  homeless.join(' ') || 'all of them',
);

if (failures) {
  console.error(
    '\ncheck:everycheck — a check nobody runs is not a safety net, it is a claim' +
      '\nthat there is one. Add it to .github/workflows, or delete it.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:everycheck — all ${checks.length} checks run, and CI names none that is not there.`);

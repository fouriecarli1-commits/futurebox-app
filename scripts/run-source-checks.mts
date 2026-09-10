/**
 * Every check the source job runs, in one command.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * On 9 September CI was red on `main` for eight pushes in a row and every one
 * of those pushes was reported as green. Not dishonestly — each time, the
 * checks *related to the change* were run and passed. `check:played` was not
 * one of them. It had gone red when the hearts-and-plays rail moved into the
 * scroller, and it stayed red for a day while nine commits landed on top of
 * it, because nothing ever ran the whole set.
 *
 * "Run the checks you think you touched" is not a method. The whole point of
 * an inventory of 150 checks is that it knows things the person changing the
 * code does not — that is why `check:everycheck` exists at all, and it is
 * undone by there being no way to actually run them.
 *
 * ── Read out of the workflow, not out of a list here ─────────────────────
 *
 * A second list of the checks would drift from the first, which is the fault
 * this whole family of scripts keeps finding in other people's code. The
 * steps are parsed out of `.github/workflows/ci.yml`'s `check` job, so this
 * runs exactly what CI runs and cannot fall behind it.
 *
 * ── The browser jobs are not here, and that is deliberate ────────────────
 *
 * The five `screens` jobs each build the app and drive Chromium; together
 * they are twenty minutes and several rebuilds. Something that takes twenty
 * minutes before a commit is something that gets skipped, and a check that
 * gets skipped is the situation this file is about. The source job is eight
 * seconds in CI, catches the kind of failure that caused this, and is worth
 * running every time. `npm run checks -- --list` prints the browser ones so
 * they can be picked off by hand when a change touches a screen.
 *
 * ── It does not stop at the first failure ────────────────────────────────
 *
 * CI does: step 8 failed and the other seventy-six were skipped, so one red
 * line hid whatever else was wrong. This runs all of them and prints the
 * failures together, because finding out about the second one tomorrow is
 * how a day turns into eight red pushes.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');

/**
 * The `check` job's steps, up to where the next job begins.
 *
 * Two spaces of indent is a job key; the `check:` job is the first one and
 * `screens:` follows it. Sliced rather than regexed across the whole file so
 * a `npm run check:…` inside a browser job is not swept in.
 */
function sourceJob(): string {
  const start = workflow.indexOf('\n  check:\n');
  if (start < 0) throw new Error('the `check` job is not in .github/workflows/ci.yml');
  const after = workflow.indexOf('\n  screens:', start);
  return workflow.slice(start, after < 0 ? undefined : after);
}

const job = sourceJob();
const names = [...job.matchAll(/run:\s*npm run (check:[A-Za-z0-9:_-]+)/g)].map((one) => one[1]);
const unique = [...new Set(names)];

if (process.argv.includes('--list')) {
  const all = [...new Set([...workflow.matchAll(/(check:[A-Za-z0-9:_-]+)/g)].map((one) => one[1]))];
  const browser = all.filter((one) => !unique.includes(one));
  console.log(`${unique.length} source checks:\n  ${unique.join('\n  ')}`);
  console.log(`\n${browser.length} in the browser jobs, not run here:\n  ${browser.join('\n  ')}`);
  process.exit(0);
}

if (!unique.length) {
  console.error('No checks found in the source job. The workflow shape has changed.');
  process.exit(1);
}

console.log(`Running ${unique.length} source checks — the same ones, in the same order, as CI.\n`);

const broken: { name: string; tail: string }[] = [];
for (const name of unique) {
  let output = '';
  let ok = true;
  try {
    output = execSync(`npm run ${name} --silent`, { encoding: 'utf8', stdio: 'pipe' });
  } catch (thrown) {
    ok = false;
    const said = thrown as { stdout?: string; stderr?: string };
    output = `${said.stdout ?? ''}${said.stderr ?? ''}`;
  }
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}`);
  if (!ok) {
    /* The last few lines, which is where these scripts put their summary.
       The whole output of a failing check is hundreds of `ok` lines and the
       three that matter are at the bottom. */
    const lines = output.trimEnd().split('\n');
    broken.push({ name, tail: lines.slice(-6).join('\n    ') });
  }
}

if (broken.length) {
  console.error(`\n${broken.length} of ${unique.length} failed:\n`);
  for (const one of broken) console.error(`  ── ${one.name}\n    ${one.tail}\n`);
  process.exit(1);
}
console.log(`\nAll ${unique.length} source checks pass. The browser jobs are separate: npm run checks -- --list`);

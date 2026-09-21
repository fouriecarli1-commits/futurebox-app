/**
 * No page a probe mounts is ever committed.
 *
 * ── The mistake this is for ──────────────────────────────────────────────
 *
 * Nineteen probes work the same way: a `*.probe.tsx` lives beside the code,
 * the probe copies it to `page.tsx` so Next will serve it, drives a browser
 * at it, and deletes it. The copy exists for the minute the probe runs.
 *
 * A minute is long enough. On 22 September 2026 a probe sweep was running in
 * the background while I committed unrelated work with `git add -A`, and
 * `app/proboothprobe/page.tsx` went to main inside it. Nothing failed — a
 * committed probe page builds fine and serves a route nobody visits. It just
 * quietly becomes part of the app.
 *
 * `.gitignore` now names all nineteen. This keeps that list honest: the
 * paths come from the probes themselves, so a twentieth probe cannot be
 * written and left out, and a page that somehow gets tracked anyway fails
 * the build rather than sitting there.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** The transient page each probe mounts, from the probes themselves. */
const mounted = [...new Set(
  readdirSync('audit')
    .filter((one) => one.endsWith('.mjs'))
    .flatMap((one) => [...readFileSync(join('audit', one), 'utf8')
      .matchAll(/const LIVE = '([^']+)'/g)].map((found) => found[1])),
)].sort();

ok('the probes mount pages this can look for', mounted.length >= 15,
  `${mounted.length} found — if the probes stopped naming them \`LIVE\`, this check reads nothing`);

/* Stop here rather than carry on with an empty list.
 *
 * `git ls-files --` with no paths after it lists the WHOLE repository, so
 * the rule below would name every tracked file as a committed probe page.
 * Found by breaking the parser on purpose: the check failed, correctly, and
 * printed six hundred filenames to say so. A rule is not finished when it
 * goes red — it is finished when what it prints is readable. */
if (!mounted.length) {
  console.error('\ncheck:probepages — the probes name no pages, so nothing below could be checked.\n');
  process.exit(1);
}

/* Tracked is the fault that actually happened. */
const tracked = execFileSync('git', ['ls-files', '--', ...mounted], { encoding: 'utf8' })
  .split('\n').filter(Boolean);
ok('  and not one of them is committed', tracked.length === 0,
  `${tracked.join(', ')} — \`git rm --cached\` it; a probe's page is not part of the app`);

/* Ignored is what stops it happening again. `git check-ignore` answers for
   the real rules rather than a guess at how .gitignore was written. */
let ignored: string[] = [];
try {
  ignored = execFileSync('git', ['check-ignore', '--', ...mounted], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
} catch {
  /* Exit status 1 just means none matched, which the next rule reports. */
}
const loose = mounted.filter((one) => !ignored.includes(one));
ok('  and every one is ignored, so a sweep cannot sweep one up',
  loose.length === 0, loose.join(', '));

/* And the source each is copied from is real, so the list is not stale. */
const orphans = mounted.filter((one) => {
  try {
    readFileSync(one.replace(/page\.tsx$/, 'page.probe.tsx'));
    return false;
  } catch { return true; }
});
ok('  and each is copied from a .probe.tsx that exists', orphans.length === 0,
  `${orphans.join(', ')} — a probe pointing at a page it cannot mount`);

if (failures) {
  console.error(`\ncheck:probepages — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  `\ncheck:probepages — all ${mounted.length} pages the probes mount are ignored, none is`
  + ' committed, and each has the .probe.tsx it is copied from.',
);

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

/* ── And the probes nobody named ────────────────────────────────────────
 
   Everything above asks whether each `check:` script is run. It cannot see a
   probe that was never given a `check:` name at all, and there are sixty of
   those: `audit/mixdown.mjs` measured the whole mix and had been sitting in
   this repository being run by nobody, and `audit/boxes.mjs` — "Buttons with
   no box" — existed for exactly the fault she reported this week and never
   ran once.
 
   So every file in `audit/` is in one of three states, and has to be:
 
     · wired to a `check:` script, which the rules above then hold;
     · a TOOL — no assertions in it, run by a person who reads the output;
     · WAITING — it makes assertions and is not yet run.
 
   The third list is the honest one. It may shrink and it may never grow: a
   probe that asserts something and is not run is a claim of coverage that
   does not exist, and adding to that pile is how three hundred assertions
   came to be written and never executed. */
const audits = readdirSync('audit')
  .filter((one) => one.endsWith('.mjs'))
  .map((one) => one.replace(/\.mjs$/, ''))
  .filter((one) => !['enter', 'where'].includes(one));

/** No assertions in them: they walk, they print, a person reads it. */
const TOOLS = new Set([
  'a11y', 'ads-af', 'ads-af-fail', 'ads-en-fail', 'badge', 'blurshot', 'boxes',
  'buttons', 'copilotplace', 'deep', 'devices', 'errors', 'frame', 'home',
  'home2', 'homelength', 'land', 'landing', 'net', 'newui', 'newui2', 'one',
  'phone', 'phoneshots', 'price', 'probe', 'radarcards', 'rooms', 'shots',
  'slogan', 'small', 'thin', 'touch', 'transcript', 'voices', 'walk',
]);

/**
 * Real checks that nobody runs. Every one of these has assertions in it.
 *
 * They were written against a server somebody had left on port 3000, which is
 * the fault `serve()` exists to fix and `check:probes` holds every wired probe
 * to. Bringing one back means giving it its own server and its own port, and
 * making its assertions true of the app as it is now.
 */
const WAITING = new Set([
  'account', 'addon', 'cast', 'greeting',
  'language', 'photo', 'podlanguage',
  'presenter', 'queue', 'taste', 'videocover',
]);
/** What it was when this rule was written. It may go down and not up. */
const WAITING_WAS = 25;

const wiredProbe = (name: string) =>
  checks.some((one) => new RegExp(`audit/${name}\\.mjs`).test(scripts[one]));
const unaccounted = audits.filter(
  (one) => !wiredProbe(one) && !TOOLS.has(one) && !WAITING.has(one),
);
check(
  'every probe in audit/ is wired, or named as a tool, or named as waiting',
  unaccounted.length === 0,
  unaccounted.join(' ') || `${audits.length} accounted for`,
);
check(
  'and the number waiting has not gone up',
  WAITING.size <= WAITING_WAS,
  `${WAITING.size} waiting, was ${WAITING_WAS}`,
);
/* A name in either list that has since been wired is a list going stale. */
const stale = [...TOOLS, ...WAITING].filter((one) => wiredProbe(one));
check(
  'and nothing is listed as unrun that is now run',
  stale.length === 0,
  stale.join(' ') || 'none',
);

if (failures) {
  console.error(
    '\ncheck:everycheck — a check nobody runs is not a safety net, it is a claim' +
      '\nthat there is one. Add it to .github/workflows, or delete it.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:everycheck — all ${checks.length} checks run, and CI names none that is not there.`);

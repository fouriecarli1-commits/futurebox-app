/**
 * The click-through probes can run on a machine that is not this one.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * The CI job that runs the twenty-six probes was written, merged, and did not
 * work. Not subtly: three separate faults, each of which made whole groups of
 * probes report the app as broken when the app was fine.
 *
 *   1. Two probes went straight to `http://localhost:3000` and assumed
 *      somebody had put a server there. On the machine they were written on
 *      somebody always had. The CI job never did, so both failed on their
 *      first line with ERR_CONNECTION_REFUSED — which reads as a broken app
 *      rather than a missing server.
 *
 *   2. `signupcode` builds with a Supabase address in the environment,
 *      because `cloud.configured()` is read at build time. It never put the
 *      plain build back. `.next` is a directory and not a scope, so every
 *      probe after it in the same job signed in through a project that does
 *      not exist, never reached the app, and reported whatever room it was
 *      looking at as broken.
 *
 *   3. A probe that threw before its own cleanup left its server running.
 *      The next run of that probe then found a server it had not started, on
 *      a build it did not make.
 *
 * All three have the same shape: a probe that works alone and lies in a group.
 * That is the worst kind of test to own, because the run that matters is
 * always the group. So the rules below are about isolation, and they are read
 * off the probe files rather than off a list somebody has to remember to keep.
 *
 * The probes CI runs are parsed out of the workflow, so a probe added to the
 * job is checked from the moment it is added.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The code, without the prose about the code.
 *
 * The first version of the last rule below read the raw file and failed on a
 * comment that *names* `waitForTimeout(1800)` while explaining why it is gone.
 * A rule that a correct file cannot pass is worse than no rule: the next
 * person makes the code match the rule rather than the other way round.
 *
 * Crude on purpose — this reads probe files, not arbitrary JavaScript, and
 * none of them has a `//` inside a string.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* ── Which probes the job actually runs ─────────────────────────────────── */

const workflow = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
const named = [...workflow.matchAll(/^\s*probes:\s*(.+)$/gm)]
  .flatMap((line) => line[1].trim().split(/\s+/))
  .filter((one) => one.startsWith('check:'));

ok('the workflow names probes to run', named.length > 0, `${named.length}`);

const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts as Record<
  string,
  string
>;

/** The probe file behind a script name, or null when it is not one. */
function fileFor(script: string): string | null {
  const line = scripts[script];
  if (!line) return null;
  const found = /audit\/([\w-]+\.mjs)/.exec(line);
  return found ? join(ROOT, 'audit', found[1]) : null;
}

/* ── The rules ──────────────────────────────────────────────────────────── */

for (const script of named) {
  const path = fileFor(script);
  if (!path) {
    ok(`${script} is a script that runs a probe`, false, 'no audit/*.mjs in the script line');
    continue;
  }
  const source = code(readFileSync(path, 'utf8'));
  const name = script.replace('check:', '');

  /* 1. It brings its own server, unless it needs no page at all.

     Either it calls the shared `serve()`, or it spawns `next start` itself.
     What it may not do is navigate at a hard-coded address and hope.

     The exception is a probe that tests a library rather than a screen:
     `stitch` bundles `app/lib/stitch.ts` and runs it in `about:blank`, so
     there is no app to serve and no address to get wrong. Recognised by that
     — a probe that never leaves `about:blank` cannot be talking to a server
     somebody left running — rather than by name, so the same is true of the
     next one written this way. */
  const usesServe = /\bserve\s*\(/.test(source);
  const spawnsOwn = /'next',\s*'start'/.test(source);
  const noPage = /goto\('about:blank'\)/.test(source) && !/localhost/.test(source);
  ok(`${name} starts the server it talks to`, usesServe || spawnsOwn || noPage,
    noPage ? '' : 'it navigates to an address nobody started');

  /* 2. Nothing points at :3000 by hand.

     `enter.mjs` defaults to it for twenty-six older probes that are not in
     this job; a probe in the job passes its own server's url instead. A bare
     literal here is the fault this whole file exists for. */
  ok(`${name} does not hard-code :3000`, !/localhost:3000/.test(source));

  /* 3. A server it starts, it stops.

     `serve()` does this for its caller, including when the probe throws before
     reaching its own cleanup. A probe that spawns for itself has to say so. */
  if (spawnsOwn && !usesServe) {
    ok(`${name} kills the server it spawned`, /process\.kill\(-/.test(source));
  }

  /* 3b. And the stopping actually runs.

     Rule 3 asserts the cleanup is written down. It is not the same as the
     cleanup running: `process.exit` ends the process immediately and a
     `finally` below it never fires, so a probe that exits from inside its own
     try leaves the server holding the port and its `page.tsx` sitting in
     `app/` — which is the one thing that finally exists to prevent, and the
     next run of that probe then talks to a server it did not start, with the
     build from before.

     `singview` did exactly this and rule 3 passed it, because the kill was
     there and unreachable. Twenty-two other probes call `process.exit` too
     and are fine: theirs sits *after* the finally, where the cleanup has
     already happened. So the rule is about where it is, not whether it is.

     `serve()` is exempt on purpose — it registers its stop on the process's
     own `exit` event, which fires however the process leaves. */
  const finallyAt = source.indexOf('} finally {');
  const exitAt = source.search(/\bprocess\.exit\(/);
  if (!usesServe && finallyAt !== -1 && exitAt !== -1) {
    ok(
      `${name} does not exit before its own cleanup`,
      exitAt > finallyAt,
      'process.exit sits inside the try, so the finally below it never runs',
    );
  }

  /* 4. It waits for the app rather than sleeping at it.

     Every one of these signs in and then has to know it is in. A flat
     `waitForTimeout` after the submit is how long that took on an idle
     laptop; on a loaded one it is sometimes short, and the probe then drives
     the signed-out page while believing it is in — which reports the room as
     broken when the fault is the wait. `bringsong` failed exactly that way,
     twice, on a machine doing nothing unusual.

     The bottom bar is the signal because it is on every signed-in screen and
     no signed-out one. Only probes that sign in are asked. */
  const signsIn = /button\[type="submit"\]/.test(source);
  /* One probe never gets in on purpose: `signup` is about the six-digit code
     screen, which is the door rather than the room, and it would wait thirty
     seconds for a bar that is correctly not there. Recognised by what it looks
     for rather than by its name, so the exemption describes itself. */
  const staysAtTheDoor = /one-time-code/.test(source);
  if (signsIn && !staysAtTheDoor) {
    /* A `waitFor` on the bar, not a mention of it.
       The first version asked only whether the file named `nav[aria-label]`
       anywhere. `photosong` names it — and then clicks it, which auto-waits,
       and then reads a room with `count()`, which does not. It read an empty
       room and reported "the picture is measured either way — nothing", a true
       sentence about a room it had not opened yet. A rule that a broken file
       passes is not a rule. */
    ok(
      `${name} waits for the app after signing in`,
      /nav\[aria-label\][\s\S]{0,200}?waitFor/.test(source),
    );
  }

  /* 5. The welcome door is waited for, not counted once.

     It draws after two fetches settle. Asking whether it is there the instant
     the bar appears gets "no", and half a second later it is there — over the
     header, under the next press. `bringsong` timed out on exactly that, three
     runs in a row, long after the first two faults were fixed.

     `dismissDoor` in `enter.mjs` has waited properly since the day it was
     written. The probes with their own way in each rewrote it as a single
     `count()`, twelve times. */
  if (/Not now/.test(source)) {
    ok(
      `${name} waits for the welcome door rather than counting it once`,
      /dismissDoor/.test(source) || /Not now[\s\S]{0,200}?waitFor/.test(source),
    );
  }

  /* 6. A build with a different environment is put back.

     Only `signupcode` does this today. The rule is written for the shape
     rather than for the file, because the next probe that needs a build-time
     variable will be written by somebody who has never seen this go wrong. */
  const buildsWithSupabase = /NEXT_PUBLIC_SUPABASE_URL:/.test(source) && /next build/.test(source);
  if (buildsWithSupabase) {
    /* Two builds, and one of them without the stub in it.

       The first version of this rule looked for `delete env.NEXT_PUBLIC_...`,
       which is how `signupcode` happens to do it — one implementation, not the
       property. `signinwith` never mutates `process.env` at all: it passes the
       stub to the first build and nothing to the second, which is the same
       promise kept more carefully, and the rule called it a failure.

       What actually matters is that the last thing the probe does to the tree
       is an ordinary build. */
    const builds = [...source.matchAll(/execSync\((['`])[^'`]*next build[^'`]*\1[^)]*\)/g)].map(
      (one) => one[0],
    );
    /* Two ways to keep the same promise, and both count: build a second time
       with the variable deleted from a copy of the environment (`signupcode`),
       or simply build a second time passing no environment at all
       (`signinwith`). What is refused is one build, or two with the stub in
       both. */
    const cleared = /delete\s+\w+\.NEXT_PUBLIC_SUPABASE_URL/.test(source);
    const plain = builds.filter((one) => !/env:/.test(one)).length;
    const putsItBack = builds.length >= 2 && (cleared || plain >= 1);
    ok(
      `${name} puts the plain build back afterwards`,
      putsItBack,
      `${builds.length} build(s); ${plain} with no environment, ${cleared ? 'and the stub is deleted' : 'and the stub is never deleted'}`,
    );

    /* And puts it back on the way out, not on the way through.

       `taste` threw before reaching its restore and left the stubbed build
       behind. The next probe then signed in against an app that believed it
       had accounts, could not find its way past the front page, and reported
       that as its own failure — a poisoned build reads as a broken app, in a
       different file, with nothing pointing back here.

       So the restore has to survive a throw: an `exit` handler, or a
       `finally`. The same discipline the probe pages keep with `rmSync`, and
       for the same reason — the failure that skips the tidy-up is the one
       nobody planned for. */
    const finallyAt = source.lastIndexOf('} finally {');
    const restoreAt = source.lastIndexOf('next build');
    ok(
      `${name} restores it even when the run falls over`,
      /process\.on\('exit'/.test(source) || (finallyAt !== -1 && restoreAt > finallyAt),
      'a build restored only at the end of the happy path is a build left behind by every failure',
    );
  }
}

/* ── And the helper keeps the promise the rules rest on ─────────────────── */

const where = code(readFileSync(join(ROOT, 'audit/where.mjs'), 'utf8'));
/**
 * And no probe page is committed.
 *
 * A probe copies `page.probe.tsx` over `page.tsx`, builds, runs, and deletes
 * it again in a `finally`. That works right up until somebody commits while a
 * probe is mid-run: `git add -A` sweeps the copy up, and a probe route ships
 * to production on the branch the site deploys from.
 *
 * Which is exactly what happened — `app/videowords/page.tsx` reached main that
 * way, from my own commit, on the same afternoon I noticed that running a
 * source check beside a probe gives a spurious failure and decided it was
 * harmless because the two are separate jobs in CI. They are. The working
 * tree is not two jobs.
 *
 * Cheap to assert and impossible to notice by eye, because the file is
 * deleted again seconds later and `git status` is clean by the time anybody
 * looks.
 */
{
  const committed = execSync('git ls-files "*/page.probe.tsx"', { cwd: ROOT })
    .toString()
    .split('\n')
    .filter(Boolean);
  const shipped = committed
    .map((one) => one.replace(/page\.probe\.tsx$/, 'page.tsx'))
    .filter((one) => {
      try {
        execSync(`git ls-files --error-unmatch "${one}"`, { cwd: ROOT, stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    });
  ok(
    'no probe page is committed beside its probe',
    shipped.length === 0,
    `${shipped.join(', ')} — swept up by a commit while a probe was mid-run`,
  );
}

ok('serve() exists', /export async function serve\(/.test(where));
ok(
  'serve() kills the whole process group, not just the parent',
  /process\.kill\(-child\.pid/.test(where),
);
ok(
  'serve() also stops on the way out, however the probe leaves',
  /process\.once\('exit'/.test(where),
);
ok('serve() refuses to hand back a server that never came up', /throw new Error\(/.test(where));

/* ── A phone-sized probe has to hold a phone's pointer ──────────────────

   `app/globals.css` keeps a whole block behind `@media (pointer: coarse)`:
   the forty-four pixel minimums, and the rule that sizes a standalone link
   for a thumb. Playwright's desktop Chromium reports a *fine* pointer
   whatever viewport it is handed, so a probe that only shrinks the window is
   measuring an app with those rules switched off.

   That is not a theoretical gap. It is why three rounds of `check:sharesheet`
   came back green while Carli was holding a photograph of the share sheet
   with its buttons printed on top of each other: the rule that broke it only
   exists on a touchscreen.

   Any probe that opens a window narrower than a small tablet has to ask for
   touch — `hasTouch: true` on the page or context, or `touch: true` through
   `enter()`. `WITHOUT_TOUCH` is what was still outstanding when this rule was
   written; it may shrink and it may not grow. */
const WITHOUT_TOUCH = new Set<string>([
  /* Empty. Every wired phone-sized probe asks for touch. Anything added here
     is a probe measuring rules the app does not ship to a phone. */
]);

const PHONE_ENOUGH = 481;
for (const script of named) {
  /* `named` holds the npm script names the workflow runs; the file each one
     drives is in package.json. Reading `audit/check:tabs.mjs` is how the first
     version of this fell over. */
  const file = /audit\/([A-Za-z0-9_-]+)\.mjs/.exec(scripts[script] ?? '')?.[1];
  if (!file) continue;
  const name = file;
  const source = readFileSync(join(ROOT, `audit/${file}.mjs`), 'utf8');
  const widths = [...source.matchAll(/width:\s*(\d+)/g)].map((one) => Number(one[1]));
  const narrow = widths.filter((one) => one < PHONE_ENOUGH);
  if (!narrow.length) continue;
  const asksForTouch = /hasTouch:\s*true|touch:\s*true/.test(source);
  if (WITHOUT_TOUCH.has(name)) {
    ok(
      `${name} is still on the list of probes without a touch pointer`,
      !asksForTouch,
      'it asks for touch now — take it off WITHOUT_TOUCH',
    );
    continue;
  }
  ok(
    `${name} opens its phone window with a touch pointer`,
    asksForTouch,
    `narrowest ${Math.min(...narrow)}px, and pointer: coarse is switched off`,
  );
}

const enter = code(readFileSync(join(ROOT, 'audit/enter.mjs'), 'utf8'));
ok('enter() can be pointed at a port of its own', /\bat = 'http:\/\/localhost:3000'/.test(enter));
ok(
  'enter() waits for the app rather than sleeping a fixed time',
  /nav\[aria-label\]/.test(enter) && !/waitForTimeout\(1800\)/.test(enter),
);

if (failures) {
  console.error(`\ncheck:probes — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(`\ncheck:probes — all ${named.length} probes stand alone: own server, own build, no leaks.`);

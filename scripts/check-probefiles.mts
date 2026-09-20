/**
 * Every file in `audit/` is a test, a helper, or a named tool — and says which.
 *
 * ── What was found ───────────────────────────────────────────────────────
 *
 * 20 September 2026, running yesterday's restructure past the browser
 * probes: `audit/` holds 120 files and 83 of them are wired to a `check:`
 * script. The other 37 are run by nothing.
 *
 * That is `docs/OPEN-QUESTIONS.md`'s "sixty probes nobody runs" again, and
 * the first instinct — wire them up — is wrong. Every one of the 34 that is
 * not a helper was read: **not one of them asserts anything.** No
 * `problems.push`, no `check(`, no `process.exit(1)`. They print what they
 * saw and take screenshots. Adding them to CI would add 34 jobs that cannot
 * fail, which is worse than not running them, because a green job nobody can
 * fail reads as coverage.
 *
 * So they are tools, and the fault is not that they are unrun. It is that
 * somebody reading `audit/` sees 120 files and believes the app has 120
 * tests when it has 83.
 *
 * ── What this holds ──────────────────────────────────────────────────────
 *
 * Three kinds of file, and each declares itself:
 *
 *   · wired    — a `check:` script runs it. Nothing to say here.
 *   · helper   — imported by other probes (`enter`, `where`, `rooms`).
 *   · tool     — named in TOOLS below, with one line saying what it is for.
 *
 * A file that is none of the three fails. And — the rule that earns this
 * file — **a tool that grows an assertion fails too.** That is the real
 * future fault: somebody writes a genuine check into a screenshot script,
 * it never runs, and it looks from the filename like it does.
 */

import { readdirSync, readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/**
 * Files that are eyes, not tests.
 *
 * Each line says what the thing is for. A tool with no reason beside it is a
 * file nobody has looked at since it was written, which is how thirty-four of
 * them accumulated without anybody noticing.
 */
const TOOLS: Record<string, string> = {
  /* Screenshot takers. They produce a picture for a person to look at. */
  shots: 'takes the room screenshots used in the docs',
  phoneshots: 'the same, at phone width',
  blurshot: 'one screenshot of the blurred-cover treatment',
  land: 'a screenshot of the landing page',
  landing: 'the landing page at phone width',
  voices: 'a screenshot of the voice list',
  frame: 'the first frame with an engine pretended into existence',
  slogan: 'the Afrikaans welcome, photographed rather than argued about',
  transcript: 'the transcript panel with a show pretended in',
  badge: 'the rail with a waiting ask pretended in',

  /* Walkthrough reporters. They press things and print what happened; a
     person reads the output. Useful for exploring, useless as a gate. */
  walk: 'presses through every room and prints what it found',
  buttons: 'presses every button in every room and reports',
  deep: 'presses each control from a known-good start and reports',
  probe: 'a bare harness for trying one thing by hand',
  one: 'runs a single named room, from the command line',
  home: 'prints what is on the pages outside the studio',
  home2: 'the home page, pressed quickly',
  homelength: 'prints how far a phone scrolls to the foot of the home page',
  net: 'prints the network calls a sign-in makes',
  price: 'prints the number on the button against the number in the request',
  errors: 'prints what a refusal looks like on the screen',
  a11y: 'prints controls a screen reader cannot name',
  boxes: 'prints buttons drawn without a box',
  radarcards: 'prints what the radar headings open',
  copilotplace: 'prints where the copilot sits, room by room',
  phone: 'prints every room at phone width',
  touch: 'the same count on a coarse pointer',
  small: 'the studio at the narrowest width',
  thin: 'the rooms that draw a thin rail',
  newui: 'a one-off from the week that UI was built',
  newui2: 'the same, a day later',

  /* The two deliberately-wrong fixtures the advert probes read. They assert
     nothing themselves; they exist so a probe can be seen to fail. */
  'ads-af-fail': 'a deliberately wrong advert, to prove the probe fails on it',
  'ads-en-fail': 'the English one, deliberately wrong',
};

/**
 * Real probes that nothing runs. Standing debt, written down.
 *
 * This list is not a category, it is an admission. A file here asserts
 * things — so calling it a tool would be putting a label on it to make this
 * check go quiet, which is the move this whole file exists to prevent.
 *
 * Each line says why it is not wired yet. The list should get shorter.
 */
const UNRUN: Record<string, string> = {
  'ads-af':
    'the advert desk end to end in Afrikaans, 98 lines. Goes straight to '
    + 'localhost:3000 and assumes a server is there, which is exactly what '
    + 'check:probes forbids — it needs its own serve() and port before it can '
    + 'be wired. Some of what it covers is held by check:afrikaansscreen and '
    + 'check:adruns; how much is not known.',
};

const files = readdirSync('audit').filter((one) => one.endsWith('.mjs')).map((one) => one.slice(0, -4));

const scripts: Record<string, string> = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
const wired = new Set<string>();
for (const run of Object.values(scripts)) {
  for (const found of String(run).matchAll(/audit\/([a-zA-Z0-9-]+)\.mjs/g)) wired.add(found[1]);
}

const helpers = new Set<string>();
for (const one of files) {
  const src = readFileSync(`audit/${one}.mjs`, 'utf8');
  for (const found of src.matchAll(/from '\.\/([a-zA-Z0-9-]+)\.mjs'/g)) helpers.add(found[1]);
}

/* ── Every file declares itself ───────────────────────────────────────── */

const stray = files.filter(
  (one) => !wired.has(one) && !helpers.has(one) && !TOOLS[one] && !UNRUN[one],
);
ok(
  'every file in audit/ is a test, a helper, or a named tool',
  stray.length === 0,
  `${stray.join(', ')} — wire it to a check:, or name it in TOOLS with what it is for`,
);

ok(`${wired.size} of ${files.length} are wired to a check`, wired.size > 0);
console.log(`        helpers: ${[...helpers].sort().join(', ')}`);
console.log(`        tools, run by hand: ${Object.keys(TOOLS).length}`);

/* Printed every run rather than left in the file, because debt nobody reads
   is debt nobody pays. */
for (const [one, why] of Object.entries(UNRUN)) {
  console.log(`        UNRUN  ${one} — ${why}`);
}
ok(
  'and the list of real probes nothing runs is not growing',
  Object.keys(UNRUN).length <= 1,
  `${Object.keys(UNRUN).length} of them: ${Object.keys(UNRUN).join(', ')}`,
);
/* A file in UNRUN that has since been wired is debt that was paid and not
   written off — the line has to come out, or the next person reads it as
   still owing. */
const paid = Object.keys(UNRUN).filter((one) => wired.has(one));
ok('  and nothing on it has quietly been wired up', paid.length === 0, paid.join(', '));

/* ── And a tool may not quietly become a test ─────────────────────────── */

/**
 * The rule this file is really for.
 *
 * A screenshot script that grows a `check(` is a genuine assertion nobody
 * runs — and it looks, from the filename and from `audit/` being full of
 * tests, exactly like one that does. Either wire it up or take the
 * assertion out; there is no third answer.
 */
const pretending: string[] = [];
for (const one of Object.keys(TOOLS)) {
  if (!files.includes(one)) {
    pretending.push(`${one} is named in TOOLS and does not exist`);
    continue;
  }
  const src = readFileSync(`audit/${one}.mjs`, 'utf8');
  if (/\bproblems\.push\(|\bcheck\(|process\.exit\(1\)/.test(src)) {
    pretending.push(`${one} asserts something and nothing runs it`);
  }
}
ok('and no tool has grown an assertion nobody runs', pretending.length === 0, pretending.join('; '));

/* ── The check can fail, shown rather than claimed ────────────────────── */

const SAMPLE = "  check('the thing happened', Boolean(thing));";
ok(
  '  and it can tell an assertion from a print',
  /\bproblems\.push\(|\bcheck\(|process\.exit\(1\)/.test(SAMPLE)
    && !/\bproblems\.push\(|\bcheck\(|process\.exit\(1\)/.test("  console.log('the thing happened');"),
  'a line that asserts must match and a line that prints must not',
);

if (failures) {
  console.error(
    '\ncheck:probefiles — a folder of 120 files where 83 are tests reads as 120 tests.'
    + ' A tool is fine; a tool nobody has declared is a test nobody runs.\n',
  );
  process.exit(1);
}
console.log('\ncheck:probefiles — every file in audit/ is a test, a helper, or a tool that says so.');

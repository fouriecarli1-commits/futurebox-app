/**
 * Which build is on the phone, readable from the phone.
 *
 * ── Why this exists, which is the uncomfortable part ─────────────────────
 *
 * Carli reported the same five faults three times. Two of them were fixed and
 * pushed between the first report and the third, and neither of us had any
 * way to tell whether what she was holding contained the fix.
 *
 * That ambiguity is expensive in one specific direction: a repeat reads as
 * "the fix failed", so the next hour goes into rewriting code that was
 * already right, while the actual answer — an old build on the device —
 * stays invisible. Most of what went wrong this week was picking the wrong
 * one of those two.
 *
 * So the build says which build it is, on `/oops`, where she is already
 * being sent when something goes wrong.
 *
 * ── What is held here ────────────────────────────────────────────────────
 *
 * That it is baked in at BUILD time. A value read at request time would be
 * the server's answer about itself, and the question is about the bundle
 * sitting in her phone's cache, which can be days older than the server.
 *
 * And that it does not invent one. A local run has no Vercel variable; an
 * "unknown" sends somebody to check and a made-up number sends them nowhere.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const config = readFileSync('next.config.mjs', 'utf8');
const lib = readFileSync('app/lib/whichbuild.ts', 'utf8');
const oops = readFileSync('app/oops/page.tsx', 'utf8');

ok(
  'the commit is baked in at build time',
  /NEXT_PUBLIC_BUILD_SHA: process\.env\.VERCEL_GIT_COMMIT_SHA/.test(config) &&
    /env: stamp/.test(config),
  'read at request time it would be the server answering about itself, not the bundle on her phone',
);
ok(
  '  and the date with it',
  /NEXT_PUBLIC_BUILT_AT: new Date\(\)/.test(config),
);
ok(
  'it is readable in the browser',
  /NEXT_PUBLIC_/.test(lib),
  'a variable without that prefix never reaches the page, which is the whole point',
);
ok(
  'and it says so rather than inventing one when nothing set it',
  /plaaslik · local/.test(lib) && /onbekend · unknown/.test(lib),
  'a made-up number sends somebody nowhere; "unknown" sends them to check',
);
ok(
  'it is on the page she is sent to when something breaks',
  /data-build=""/.test(oops) && /buildLine\(\)/.test(oops),
);
ok(
  '  in both languages, because it is the first thing read on that screen',
  /Weergawe · Build:/.test(oops),
);

if (failures) {
  console.error(
    '\ncheck:whichbuild — "is this the build with the fix in it" is the first question about\n' +
      'any report, and it was unanswerable three times running. It has to be on the screen.\n',
  );
  process.exit(1);
}
console.log('\ncheck:whichbuild — the phone can say which build it is holding.');

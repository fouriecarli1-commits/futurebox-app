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

/* ── And on a screen somebody reaches without crashing ────────────────────

   3 October 2026. Carli: *"Het jy enige iets gepush en gestoot? Ek sien nie
   veranderings nie."* Six commits had gone to `main` that morning, and neither
   of us could tell whether her phone was holding any of them.

   The answer existed. It was on `/oops`, which is the page you reach by
   crashing — so the one thing that answers "is this the app with the fix in
   it" lived behind a fault, and the moment it is needed most is the one where
   nothing has crashed at all. It was the right stamp in a room nobody visits.

   The account screen, because that is where a version number belongs and where
   somebody looks for one. Asserted separately from the `/oops` copy: the two
   can be removed one at a time, and losing the one you can reach on purpose is
   the loss that matters. */
const account = readFileSync('app/components/Account.tsx', 'utf8');
/* And the host, which is the fault nothing in this repository can see.

   `SITE_HOST` falls back to the Vercel address for good reasons, and the cost
   is that a production deploy with `NEXT_PUBLIC_SITE_HOST` unset looks exactly
   like a working one — every canonical link, sitemap entry and Open Graph tag
   pointing somewhere the app is not. Whether the variable was set lives in
   somebody else's dashboard, so no check here can read it. What a check CAN do
   is insist the app print what it believes, where a person will see it. */
ok(
  'the line says which address this build thinks it is served from',
  /SITE_HOST/.test(lib) && /builtFor/.test(lib),
  'a deploy with the domain variable unset is indistinguishable from a working'
  + ' one, and the difference is every shared link going to the wrong place',
);

ok(
  'and on the account screen, which is reached without crashing first',
  /data-build/.test(account) && /buildLine\(\)/.test(account),
  'a build stamp only on the error page answers the question only after a fault,'
  + ' and the question that needs it most is asked when nothing has crashed',
);

if (failures) {
  console.error(
    '\ncheck:whichbuild — "is this the build with the fix in it" is the first question about\n' +
      'any report, and it was unanswerable three times running. It has to be on the screen.\n',
  );
  process.exit(1);
}
console.log('\ncheck:whichbuild — the phone can say which build it is holding.');

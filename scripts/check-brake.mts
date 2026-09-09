/**
 * The brake actually stops things, and stops the right things.
 *
 * `lib/server/brake.ts` is the only thing between two unauthenticated routes
 * and a model bill. A brake that silently lets everything through looks
 * identical to one that works, from the outside, right up until the invoice.
 * So the numbers are asserted rather than assumed.
 *
 * The hour window is checked by counting past the minute limit: a caller who
 * trips the minute limit must still accumulate an hourly total, or they can
 * sit on the minute ceiling all day and never reach the hourly one. That is
 * one edit away at all times — writing the two windows as `a() || b()` would
 * short-circuit, and every call the minute window refused would stop counting
 * towards the hour. It would pass every other test here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import {
  EXPENSIVE, GENERATION, callerAddress, forgetEverything, tooMany,
} from '../app/lib/server/brake.ts';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

function from(address: string): Request {
  return new Request('https://example.test/api/help', {
    headers: { 'x-forwarded-for': address },
  });
}

const LIMITS = { perMinute: 3, perHour: 5 };

forgetEverything();
{
  const request = from('1.1.1.1');
  const results = [1, 2, 3, 4].map(() => tooMany('t', request, LIMITS));
  ok('lets the first three through, stops the fourth', results.join() === 'false,false,false,true', results.join());
}

forgetEverything();
{
  // Six calls against a per-minute limit of three: the minute window trips on
  // the fourth, and the hour window must still have counted all six.
  const request = from('2.2.2.2');
  for (let i = 0; i < 6; i += 1) tooMany('t', request, LIMITS);
  // A fresh minute window would let this through if the hour had not counted.
  const stillStopped = tooMany('t', request, { perMinute: 1000, perHour: 5 });
  ok('the hour window counts calls the minute window already refused', stillStopped);
}

forgetEverything();
{
  const one = from('3.3.3.3');
  const other = from('4.4.4.4');
  for (let i = 0; i < 10; i += 1) tooMany('t', one, LIMITS);
  ok('one address does not brake another', tooMany('t', other, LIMITS) === false);
}

forgetEverything();
{
  const request = from('5.5.5.5');
  for (let i = 0; i < 10; i += 1) tooMany('help', request, LIMITS);
  ok('heavy use of one route does not brake another', tooMany('enquiry', request, LIMITS) === false);
}

forgetEverything();
{
  ok(
    'the first hop of x-forwarded-for is the caller',
    callerAddress(from('9.9.9.9, 10.0.0.1, 10.0.0.2')) === '9.9.9.9',
  );
  ok(
    'no header at all is one bucket rather than a crash',
    callerAddress(new Request('https://example.test/')) === 'unknown',
  );
}

forgetEverything();

/* ── Coverage: every route that spends a supplier's money is braked ────────
 *
 * The assertions above test the mechanism. Nothing tested who used it, and
 * that is exactly how the gap happened: eleven routes ended up braked and
 * every one of them spent *text* money, while music, stems, dubbing, video and
 * every voice route — the ones that spend ElevenLabs and Kits — had nothing.
 * `docs/SAFETY-REVIEW.md` even recorded the state as complete.
 *
 * Carli, 9 September 2026: "kan een retry op enige funksie nie gestop word
 * nie, kan ons nie iets in bou wat dit stop nie?"
 *
 * So this is discovered rather than listed: any route that reaches a supplier
 * must brake, and a new one that does not is a failure here on the day it is
 * written. The exemptions are named with a reason, and each is checked to still
 * be the read-only thing its reason claims.
 */

/**
 * Reads a supplier's account or reports on it. Spends nothing per call.
 *
 * `finetunes` was on this list, on the strength of the GET that lists trained
 * voices. Its POST trains one and charges for it — the coverage assertion
 * below caught that the first time it ran, which is the reason the exemptions
 * are checked rather than trusted.
 */
const REPORTS_ONLY: Record<string, string> = {
  'app/api/account/route.ts': 'the member’s own account, no supplier call',
  'app/api/allowance/route.ts': 'reports where the allowances stand; reads a cached figure, calls nothing',
  'app/api/analyse/setup/route.ts': 'a guarded report on what Music.ai answers',
  'app/api/eleven/prices/route.ts': 'reads our own eleven_costs rows',
  'app/api/eleven/pronounce/route.ts': 'a fixed pronunciation table, no call',
  'app/api/kits/face/route.ts': 'proxies a picture already listed under our key',
  'app/api/kits/setup/route.ts': 'a guarded report on what Kits answers',
  'app/api/voice/route.ts': 'lists voices, generates nothing',
  'app/api/watch/route.ts': 'reports where the allowance stands',
};

const SUPPLIER = /from '@\/app\/lib\/server\/(eleven|kits|musicai)'/;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(`${dir}/${entry.name}`)
      : entry.name === 'route.ts'
        ? [`${dir}/${entry.name}`]
        : [],
  );

const spenders = walk('app/api').filter((path) => SUPPLIER.test(readFileSync(path, 'utf8')));
ok('there are supplier routes to check', spenders.length > 10, `${spenders.length} found`);

const unbraked: string[] = [];
for (const path of spenders) {
  if (path in REPORTS_ONLY) continue;
  const source = readFileSync(path, 'utf8');
  if (!/refuseIfTooMany\(|tooMany\(/.test(source)) unbraked.push(path);
}
ok(
  'every route that spends a supplier’s money brakes a retry loop',
  unbraked.length === 0,
  unbraked.join(', '),
);

/* An exemption that stopped being read-only is the same gap wearing a reason.
   A route claiming to report on an account must not also charge for one. */
for (const [path, why] of Object.entries(REPORTS_ONLY)) {
  const source = readFileSync(path, 'utf8');
  ok(
    `the exemption for ${path.replace('app/api/', '')} is still a report — ${why}`,
    !/await charge\(/.test(source),
    'it charges the member, so it spends and must brake',
  );
}

/* The numbers themselves, because a limit set too high is not a brake.
   Twenty songs an hour is seventeen hours to eat a 600,000-credit month; the
   warning at half arrives after about eight. Sixty an hour would be five and a
   half, which fits inside one night's sleep. */
ok('a generation limit leaves the warning time to arrive',
  GENERATION.perHour <= 20 && GENERATION.perMinute <= 3,
  `${GENERATION.perMinute}/min, ${GENERATION.perHour}/hour`);
ok('and dearer work is held tighter still',
  EXPENSIVE.perHour < GENERATION.perHour && EXPENSIVE.perMinute < GENERATION.perMinute,
  `${EXPENSIVE.perMinute}/min, ${EXPENSIVE.perHour}/hour`);

/* Dubbing v2 is $2.20 a minute against music's $0.1485 — fifteen times — and
   video is billed per second by Kling. Both are on the tighter limit. */
for (const path of ['app/api/dub/route.ts', 'app/api/video/route.ts']) {
  ok(`${path.replace('app/api/', '')} uses the tighter limit`,
    /refuseIfTooMany\('[a-z-]+', request, EXPENSIVE\)/.test(readFileSync(path, 'utf8')));
}

/* Braked before the money moves, not after. A caller stopped by a limit must
   not have been charged for the turn — the same rule the allowance follows. */
for (const path of spenders) {
  if (path in REPORTS_ONLY) continue;
  const source = readFileSync(path, 'utf8');
  const brake = source.search(/refuseIfTooMany\(|tooMany\(/);
  const charge = source.indexOf('await charge(');
  if (charge === -1) continue;
  ok(`${path.replace('app/api/', '')} brakes before it charges`, brake > -1 && brake < charge);
}

if (failures) {
  console.error(`\ncheck:brake — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:brake — the brake holds, and every route that spends money uses it.');

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
import { tooMany, forgetEverything, callerAddress } from '../app/lib/server/brake.ts';

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
if (failures) {
  console.error(`\ncheck:brake — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:brake — the brake holds.');

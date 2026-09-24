/**
 * The sign-in buttons do not vanish, and none of them wears another
 * company's logo.
 *
 * ── The report ───────────────────────────────────────────────────────────
 *
 * Carli, 24 September 2026: *"Die google sign in op die app het eweskielik
 * verdwyn."*
 *
 * `providersOn` answered `[]` three ways — no environment variables, a
 * response that was not ok, and any thrown error — and the screen drew
 * nothing at all for an empty list. So a network blip, a rate limit, a
 * momentary Supabase hiccup or a changed CORS rule took every sign-in
 * button off the front door **with nothing on screen saying why**, and left
 * it indistinguishable from a project with no providers configured.
 *
 * It is the same fault `check:couldnotask` guards the routes against, and
 * it was sitting on the one screen where nobody can work around it: a
 * person who cannot sign in cannot report that they cannot sign in.
 *
 * ── And the second fault, found while fixing the first ───────────────────
 *
 * `Mark` returned Facebook's logo for anything that was not Google or
 * Apple. With three providers that was correct by accident. The moment the
 * list grew — she asked for more ways in — Discord, Twitch, GitHub and
 * LinkedIn would each have carried Facebook's mark into somebody's sign-in
 * screen, which is worse than a plain letter because it is confidently
 * wrong.
 */

import { readFileSync } from 'node:fs';
import { PROVIDERS } from '../app/lib/cloud';
import { before, from, upTo } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const cloud = readFileSync('app/lib/cloud.ts', 'utf8');
const screen = readFileSync('app/components/SignInWith.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── 1. The three answers are told apart ──────────────────────────────── */

ok('asking which providers are on can answer "we could not ask"',
  /how: 'unreachable'/.test(cloud) && /how: 'off'/.test(cloud) && /how: 'on'/.test(cloud),
  'one empty list for a blip and for a project with none configured is a button that vanishes with no reason');

/* The two failure paths, each returning `unreachable` rather than an empty
   list. Named separately because "there is an unreachable branch" is
   satisfied by either one of them. */
const asking = upTo(from(cloud, 'export async function providersAsked'), '\n}');
ok('  a response that is not ok says so',
  /!response\.ok\) return \{ how: 'unreachable'/.test(asking),
  'a 429 or a 503 from the settings endpoint takes every button off the page');
ok('  and so does anything thrown',
  /catch \(thrown\) \{[\s\S]{0,120}how: 'unreachable'/.test(asking),
  'a network failure takes every button off the page');

/* ── 2. The screen draws the difference ───────────────────────────────── */

ok('the screen says when it could not ask, rather than drawing nothing',
  /data-signinunreachable/.test(screen) && /auth\.providersUnreachable/.test(screen),
  'a person who cannot sign in cannot report that they cannot sign in');

ok('  and offers to ask again without a reload',
  /auth\.providersRetry/.test(screen) && /setAgain\(/.test(screen),
  'a reload is a lot to ask of somebody who only wanted to sign in');

ok('  in both languages',
  /"auth\.providersUnreachable"/.test(words) && /"auth\.providersRetry"/.test(words));

ok('  and the "we could not ask" branch comes before the empty one',
  before(screen, "asked.how === 'unreachable'", '!on.length'),
  'below it, an unreachable answer falls through to the empty case and vanishes again');

/* ── 3. Every provider has its own name, colour and mark ──────────────── */

for (const one of PROVIDERS) {
  ok(`${one} has a name and a colour of its own`,
    new RegExp(`^\\s+${one}: '`, 'm').test(screen),
    'a provider in the list with no entry is a compile error at best and a blank button at worst');
}

ok(`no provider falls through to somebody else’s logo — ${PROVIDERS.length} offered`,
  /provider === 'facebook'/.test(screen)
  && /NAME\[provider\]\.charAt\(0\)/.test(screen),
  'Facebook’s mark on a Discord button is confidently wrong, which is worse than a letter');

/* ── 4. What we cannot offer, said rather than left as a gap ──────────── */

ok('TikTok is written down as something Supabase cannot do',
  /TikTok is not on this list because Supabase does not offer it/.test(cloud),
  'the one she will reach for first, left as a silent gap somebody re-asks about in a month');

if (failures) {
  console.log(`\ncheck:signin — ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  `\ncheck:signin — ${PROVIDERS.length} ways in, each with its own name and mark, and a settings read that `
  + 'cannot be reached says so on the screen instead of taking every button off it.',
);

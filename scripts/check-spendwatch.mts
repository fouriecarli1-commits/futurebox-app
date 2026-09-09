/**
 * The warning she asked for, and the six ways a warning is not a warning.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 September 2026: "Ek gaan op 'n manier 'n alert moet kry as die
 * krediete laag raak, sodat ek kan koop. Is daar 'n manier dat ek 'n
 * waarskuwing kan kry?"
 *
 * ── The six ways ─────────────────────────────────────────────────────────
 *
 * 1. **Arriving only at the end.** A letter at ninety-eight percent is a
 *    letter about a month that is already over. The first step is at half,
 *    with days left to act in.
 * 2. **Lost forever on one bad send.** `send()` claims its dedupe key before
 *    sending and keeps it when the send fails — right for a receipt, wrong
 *    here. A failed warning must give the key back and try again.
 * 3. **Telling her to do half of what is needed.** Buying credits at
 *    ElevenLabs does not raise `ELEVEN_MONTHLY_CREDITS`, and that number is
 *    what actually stops the app. A letter naming only the top-up produces
 *    somebody who has paid and is still refused.
 * 4. **Wired into a route rather than the funnel.** A watcher a new route can
 *    forget to call is a watcher that goes quiet exactly when traffic grows.
 * 5. **Standing in front of a member's song.** It runs after the audio is in
 *    hand, unawaited, and swallows everything.
 * 6. **Having no channel at all.** `MAIL_FROM` is unset until a domain is
 *    settled, so the letter cannot send today. If that were the only channel
 *    this would be a warning system that is off, discovered by invoice.
 *
 *   npm run check:spendwatch
 */
import { readFileSync } from 'node:fs';
import {
  RAND_PER_CREDIT, STEPS, claimKey, elevenLetter, kitsLetter, monthKey, stepFor,
} from '../app/lib/server/spendwatch';
import { PLAN_CREDITS } from '../app/lib/server/elevenceiling';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── 1. It arrives while there is still time ───────────────────────────── */
ok('the first letter goes at half, not at the end', STEPS[0] === 0.5, String(STEPS[0]));
ok('and the last one when it has stopped', STEPS[STEPS.length - 1] === 1);
ok('nothing is written below the first step', stepFor(49, 100) === null, String(stepFor(49, 100)));
ok('half is half', stepFor(50, 100) === 0.5, String(stepFor(50, 100)));
/* The highest crossed step, not the first: a month that jumps from 40% to 95%
   in one large generation must report 90%, or the letter understates it. */
ok('a jump past several steps reports the highest', stepFor(95, 100) === 0.9,
  String(stepFor(95, 100)));
ok('and past the ceiling is still the last step', stepFor(400, 100) === 1,
  String(stepFor(400, 100)));
ok('a ceiling of zero never divides by it', stepFor(10, 0) === null, String(stepFor(10, 0)));

/* ── 2. One per step, per supplier, per month ──────────────────────────── */
const key = claimKey('eleven', 0.75, '2026-09');
ok('the claim names the supplier, the month and the step', key === 'spend:eleven:2026-09:75', key);
ok('two suppliers do not share a claim',
  claimKey('kits', 0.75, '2026-09') !== key);
ok('and next month is a new claim',
  claimKey('eleven', 0.75, '2026-10') !== key);
ok('the month is the calendar month in UTC',
  monthKey(new Date('2026-09-30T23:30:00Z')) === '2026-09',
  monthKey(new Date('2026-09-30T23:30:00Z')));

const source = readFileSync('app/lib/server/spendwatch.ts', 'utf8');

/* ── 3. A failed send tries again ──────────────────────────────────────── */
ok('a failed send gives the dedupe key back', /if \(!sent\.ok\) \{[\s\S]*?await release\(key\);/.test(source));
ok('and clears its own memo, or the retry would skip itself',
  /if \(!sent\.ok\) \{[\s\S]*?tried\.delete\(key\);/.test(source));
ok('the release deletes the claimed row', /\.from\('mail_log'\)\s*\.delete\(\)/.test(source));

/* ── 4. The letter names both halves ───────────────────────────────────── */
const letter = elevenLetter(300_000, PLAN_CREDITS, 0.5);
ok('the letter says how much is spent and of what', letter.body.includes('300,000')
  && letter.body.includes('600,000'), letter.body.slice(0, 80));
ok('and turns what is left into minutes of music', letter.body.includes('333 minutes'),
  letter.body);
ok('it names the top-up at ElevenLabs', /top up/i.test(letter.body));
ok('and it names ELEVEN_MONTHLY_CREDITS, which is what actually stops the app',
  letter.body.includes('ELEVEN_MONTHLY_CREDITS'));
ok('it says doing only the first will not work',
  /doing only the first will not work/i.test(letter.body));
ok('and it says why the ceiling exists rather than Auto Top Up',
  /Auto Top Up[\s\S]*never stops/.test(letter.body));
ok('at the ceiling the subject says it has stopped, not that it is nearly there',
  elevenLetter(600_000, PLAN_CREDITS, 1).subject.includes('used up'),
  elevenLetter(600_000, PLAN_CREDITS, 1).subject);
ok('and the body says the app has stopped generating',
  elevenLetter(600_000, PLAN_CREDITS, 1).body.includes('stopped generating'));

/* Kits is a real roof, so its letter must not tell her to top up — there is
   nothing to top up, and the card is not being charged. */
const kits = kitsLetter(200, 400, 0.5);
ok('the Kits letter says the roof is real', /real roof/.test(kits.body));
ok('and that buying more means a bigger plan, not a top-up',
  /bigger Kits plan, not a top-up/.test(kits.body));
ok('and it repeats that minutes burn on what comes back',
  /burn on what comes back/.test(kits.body));
ok('a four-part split is named as twelve minutes, not three',
  /twelve minutes, not three/.test(kits.body));

/* ── 5. Hooked into the funnel, not into a route ───────────────────────── */
const eleven = readFileSync('app/lib/server/eleven.ts', 'utf8');
ok('the ElevenLabs watch hangs off noteCost, which every call passes through',
  /export function noteCost[\s\S]*?void watchEleven\(\);/.test(eleven));
ok('and it is not awaited in front of the member',
  /void watchEleven\(\);/.test(eleven) && !/await watchEleven\(\)/.test(eleven));
const minutes = readFileSync('app/lib/server/kitsminutes.ts', 'utf8');
ok('the Kits watch hangs off note(), which every download passes through',
  /export async function note\([\s\S]*?watch\.watchKits\(\)/.test(minutes));
/* A static import here would be a cycle: spendwatch reads this module. */
ok('imported dynamically, so the two modules are not a cycle',
  /void import\('\.\/spendwatch'\)/.test(minutes)
  && !/^import .*spendwatch/m.test(minutes));

/* ── 6. Nothing here may break a generation ────────────────────────────── */
ok('the ElevenLabs watch swallows everything', /export async function watchEleven[\s\S]*?catch \{/.test(source));
ok('and so does the Kits one', /export async function watchKits[\s\S]*?catch \{/.test(source));
ok('a missing database is not a warning failure',
  /const db = admin\(\);\s*if \(!db\) return;/.test(source));

/* ── 7. There is a channel that works today ────────────────────────────── */
const page = readFileSync('app/api/allowance/route.ts', 'utf8');
ok('a page reports where both allowances stand', /standing\(\)/.test(page));
ok('and it says outright whether a letter can even be sent',
  /canWrite/.test(page) && /MAIL_FROM is not set/.test(page));
ok('it is guarded by POST_SECRET', /process\.env\.POST_SECRET/.test(page));
ok('compared in constant time', /timingSafeEqual/.test(page));
ok('and it refuses rather than defaulting to open',
  /return Response\.json\(\{ error: 'not_allowed' \}, \{ status: 403 \}\)/.test(page));
ok('no supplier key is in the answer', !/KITS_API_KEY|ELEVEN(LABS)?_API_KEY/.test(page));

/* ── The price quoted is their published one ───────────────────────────── */
ok('a thousand credits is about R3,09', Math.abs(RAND_PER_CREDIT * 1000 - 3.086) < 0.01,
  (RAND_PER_CREDIT * 1000).toFixed(3));

console.log(
  failures
    ? `\ncheck:spendwatch — ${failures} assertion(s) failed.`
    : '\ncheck:spendwatch — warned at half, retried when it fails, and told to raise the ceiling too.',
);
process.exit(failures ? 1 : 0);

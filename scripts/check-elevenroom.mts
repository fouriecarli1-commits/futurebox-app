/**
 * The brake on the ElevenLabs allowance, and the six ways it goes wrong.
 *
 * ── The gap it closes ────────────────────────────────────────────────────
 *
 * Until 10 September 2026 exactly two places in the app read the ElevenLabs
 * allowance — the 07:00 email and the owner-only money page — and NO
 * generation route did. Every route checked the caller's own credits and the
 * per-caller rate limiter, and nothing asked whether the supplier still had
 * anything left to give.
 *
 * `can_extend_character_limit` is false on this account, so running past the
 * allowance does not become a surprise invoice: the work FAILS. Every
 * generation, for everybody, at the same moment, in the third week of the
 * month, after they have paid. An overage costs money; that costs the
 * members.
 *
 * ── What a brake gets wrong, in order of how bad it is ───────────────────
 *
 * 1. Not being there at all, in one route out of five. A ceiling with a hole
 *    in it is not a ceiling, and the hole is invisible until the month it
 *    matters.
 * 2. Failing CLOSED. A brake that stops everything when it cannot read the
 *    allowance causes exactly the outage it exists to prevent, and does it
 *    on a bad minute at the supplier rather than at the end of the month.
 * 3. Braking AFTER the charge. A member refused for OUR shortage and billed
 *    for it has been charged for nothing.
 * 4. Cutting everything at one line. The cost per credit differs by about
 *    eighty times across this app — dubbing a minute is 162 credits,
 *    transcribing one is 2 — so one threshold either stops cheap work far
 *    too early or expensive work far too late.
 * 5. Closing the free tier. The free tier generates nothing, so it costs the
 *    supplier nothing; shutting it during a squeeze loses the audience and
 *    saves nought.
 * 6. Cutting off members who are already paying. They are inside the number
 *    the ceiling was reckoned against. Refusing them mid-month IS the
 *    failure, not a defence against it.
 */
import { readFileSync } from 'node:fs';
import { ROOM, refusal, roomFor, roomToSell, forgetAllowance } from '../app/lib/server/elevenroom';

const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

// ── The ladder ───────────────────────────────────────────────────────────

ok('selling stops before serving does',
  ROOM.selling < ROOM.heavy,
  `selling at ${ROOM.selling}, heavy at ${ROOM.heavy} — we would take money for work that is about to stop`);
ok('and the heavy work stops before the light work',
  ROOM.heavy < ROOM.medium && ROOM.medium < ROOM.light,
  `${ROOM.heavy} / ${ROOM.medium} / ${ROOM.light} — a single cutoff wastes 80x of difference in cost`);
ok('and nothing waits for the plan to be empty',
  ROOM.light < 100,
  'a brake at 100% is the failure, arriving on time');
ok('and the ladder leaves room to sell at all',
  ROOM.selling >= 50,
  'a shop closed for most of the month is a shop that is closed');

// ── Fails open, and only open ────────────────────────────────────────────

/* The whole failure policy, exercised rather than asserted from the source.
   With no key configured `bill()` cannot read anything, which is exactly the
   condition being tested: could-not-ask must not read as no-room. */
const wasKey = process.env.ELEVENLABS_API_KEY;
delete process.env.ELEVENLABS_API_KEY;
forgetAllowance();
const unread = await roomFor('heavy');
const unreadSell = await roomToSell();
if (wasKey !== undefined) process.env.ELEVENLABS_API_KEY = wasKey;
forgetAllowance();

ok('an allowance that cannot be read brakes nothing',
  unread.go && unread.percent === null,
  'a supplier having a bad minute would take the whole app down with it');
ok('and does not close the till either',
  unreadSell.go,
  'a read that did not happen is not a reading of zero and not a reading of a hundred');

// ── Every route that spends it, checks it ────────────────────────────────

const ROUTES: { path: string; weight: string }[] = [
  { path: 'app/api/music/route.ts', weight: 'heavy' },
  { path: 'app/api/dub/route.ts', weight: 'heavy' },
  { path: 'app/api/voice/speak/route.ts', weight: 'medium' },
  { path: 'app/api/transcribe/route.ts', weight: 'light' },
  { path: 'app/api/align/route.ts', weight: 'light' },
];
for (const { path, weight } of ROUTES) {
  const body = code(readFileSync(path, 'utf8'));
  ok(`${path.replace('app/api/', '').replace('/route.ts', '')} asks for room, at '${weight}'`,
    new RegExp(`roomFor\\('${weight}'\\)`).test(body),
    'this route spends the allowance without checking it');
}

// ── Before the charge, not after ─────────────────────────────────────────

/* Position, not presence. A brake that runs after `charge()` refuses the
   member AND keeps their credits, which is worse than no brake: the failure
   it prevents at least gave the money back. */
for (const path of ['app/api/music/route.ts', 'app/api/dub/route.ts']) {
  const body = code(readFileSync(path, 'utf8'));
  const brake = body.indexOf('roomFor(');
  const charged = body.search(/\bcharge\(|allowanceFor\(/);
  ok(`  and ${path.replace('app/api/', '').replace('/route.ts', '')} asks BEFORE it charges`,
    brake > 0 && charged > 0 && brake < charged,
    'a member refused for our shortage must not pay for it');
}

// ── Selling: the free tier stays open, paying members stay served ────────

const checkout = code(readFileSync('app/api/checkout/route.ts', 'utf8'));
ok('the checkout refuses a NEW plan when the month is nearly spent',
  /roomToSell\(\)/.test(checkout),
  'selling a plan that will fail in a fortnight');
ok("  and only to somebody who is not already on one",
  /want\.kind === 'plan' && \(!caller\.tier \|\| caller\.tier === 'free'\)/.test(checkout),
  'cutting off members who are already inside the number the ceiling was reckoned against');
ok('  and a top-up from a paying member is never refused this way',
  !/roomToSell[\s\S]{0,200}kind === 'credits'/.test(checkout),
  'they are already counted; refusing them mid-month is the failure, not the defence');

/* Nothing anywhere may brake the free tier. It generates nothing —
   TIER_CREDITS.free is 0 — so it costs the supplier nothing, and closing it
   during a squeeze loses the audience and saves nought. */
const room = code(readFileSync('app/lib/server/elevenroom.ts', 'utf8'));
ok('and nothing in the brake reaches the free tier',
  !/free/i.test(room.replace(/free tier/gi, '')),
  'the free tier costs the supplier nothing and is the shape of a launch');

// ── What a refused member is told ────────────────────────────────────────

for (const lang of ['af', 'en'] as const) {
  const said = refusal('heavy', lang);
  ok(`the refusal is written in ${lang}, and says when it comes back`,
    said.length > 40 && /rolls over|oorslaan/.test(said),
    'a refusal with no "when" is a member who does not come back');
  ok(`  and it does not blame them, or name our supplier`,
    !/elevenlabs/i.test(said) && /(ours, not yours|ons s’n)/.test(said),
    'how our books work is not something a member can act on');
}

if (failures) {
  console.error(`\ncheck:elevenroom — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:elevenroom — selling stops before serving, heavy before light, before the charge, and an unreadable allowance brakes nothing.');

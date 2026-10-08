/**
 * Our own ceilings under Google's, one per engine.
 *
 *   npm run check:googlecap
 *
 * ── Why ours has to exist ────────────────────────────────────────────────
 *
 * Google's spend cap hangs on one SERVICE, and Lyria, Nano Banana and Veo
 * are all that one service. So the month Veo runs hot, the music and the
 * pictures stop with it — not because anything is wrong with them, but
 * because they share a ceiling with the expensive one.
 *
 * ── What is held, and what is only described ─────────────────────────────
 *
 * The decisions are DRIVEN against a stand-in count rather than read out of
 * the source: which refusal comes first, what "left" says, whether a failed
 * read closes. Those are the parts that can be wrong in a way that costs
 * money, and reading them in a regex would prove nothing.
 *
 * The parts that genuinely are source rules — that a failed read answers
 * null, that the note happens after the work — are read, and say so.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import { CEILINGS, DOLLAR, KINDS, SHARE, ceilingFor, shareFor } from '../app/lib/server/googlespend.ts';
import type { Kind } from '../app/lib/server/googlespend.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. The numbers ───────────────────────────────────────────────────── */

ok('every engine has a ceiling of its own',
  KINDS.every((one) => typeof CEILINGS[one] === 'number' && CEILINGS[one] > 0),
  JSON.stringify(CEILINGS));

const total = KINDS.reduce((sum, one) => sum + CEILINGS[one], 0);
ok('and together they come to LESS than the $100 cap on Google',
  total < 100,
  `$${total} — if ours summed to hers, the first engine to reach its own`
  + ' ceiling would be the one that had already taken everything, and'
  + ' Google’s cap would never be the thing that stopped it. Ours must'
  + ' bind first or they are decoration');

ok('  and video is not given more than it can empty in an afternoon',
  CEILINGS.video <= CEILINGS.music,
  `video $${CEILINGS.video} against music $${CEILINGS.music} — one Veo`
  + ' Standard shot is 160 000 micro-dollars against a picture’s 39 000');

ok('a dollar is a million of whatever this counts in',
  DOLLAR === 1_000_000 && ceilingFor('image') === CEILINGS.image * DOLLAR,
  `${ceilingFor('image')} — a picture is about $0.039, which rounds to 4`
  + ' cents: ten per cent out on every row, always the same way. Over ten'
  + ' thousand calls that is a wrong number, not a rounding');

/* ── 2. The ceilings move when they are told to ───────────────────────── */

process.env.GOOGLE_CAP_VIDEO = '250';
ok('a ceiling can be raised without a deploy',
  ceilingFor('video') === 250 * DOLLAR,
  `${ceilingFor('video')} — "ek sal my budget verhoog soos wat ons wins`
  + ' maak" does nothing if raising Google’s cap leaves ours where it was');

process.env.GOOGLE_CAP_VIDEO = 'rubbish';
ok('  and nonsense falls back rather than opening it',
  ceilingFor('video') === CEILINGS.video * DOLLAR,
  `${ceilingFor('video')} — a typo in an environment variable must not be`
  + ' the thing that takes the ceiling off');

process.env.GOOGLE_CAP_VIDEO = '-5';
ok('  and a negative one too',
  ceilingFor('video') === CEILINGS.video * DOLLAR,
  String(ceilingFor('video')));
delete process.env.GOOGLE_CAP_VIDEO;

ok('one member gets a share of it, not all of it',
  shareFor('music') === Math.round(ceilingFor('music') * SHARE) && SHARE < 1,
  `${shareFor('music')} of ${ceilingFor('music')} — a ceiling one member`
  + ' can empty leaves everybody else with a refusal in a room that worked'
  + ' yesterday');

ok('  and the share moves with the ceiling rather than being its own number',
  (() => {
    process.env.GOOGLE_CAP_MUSIC = '400';
    const big = shareFor('music');
    delete process.env.GOOGLE_CAP_MUSIC;
    return big === Math.round(400 * DOLLAR * SHARE);
  })(),
  'a fixed share is a share that stops meaning anything the first time the'
  + ' budget is raised');

/* ── 3. The decisions, driven ─────────────────────────────────────────── */

/* `enough` reads the database. What is being checked is the arithmetic it
   does with the answer, so the answer is handed in: the same four branches,
   written the way the real one writes them. If this ever disagrees with the
   real one, the source assertions below are what catch it. */
const decide = (
  kind: Kind,
  micros: number,
  used: number | null,
  mine: number | null,
  owner: boolean,
): string => {
  if (owner) {
    if (mine === null) return 'google_unknown';
    if (mine + micros > shareFor(kind)) return 'google_yours_used';
  }
  if (used === null) return 'google_unknown';
  if (used + micros > ceilingFor(kind)) return 'google_kind_used';
  return 'ok';
};

const M = DOLLAR;
const cases: readonly [string, string][] = [
  ['room for it', decide('music', M, 0, 0, true)],
  ['this member has had their share', decide('music', M, 0, shareFor('music'), true)],
  ['the engine’s month is gone', decide('music', M, ceilingFor('music'), 0, true)],
  ['a member with room but an empty engine is still refused', decide('music', M, ceilingFor('music'), 0, true)],
  ['the member’s own count could not be read', decide('music', M, 0, null, true)],
  ['the engine’s count could not be read', decide('music', M, null, 0, true)],
  ['a signed-out caller is still held to the engine’s month', decide('music', M, ceilingFor('music'), null, false)],
];
const want = ['ok', 'google_yours_used', 'google_kind_used', 'google_kind_used',
  'google_unknown', 'google_unknown', 'google_kind_used'];
cases.forEach(([what, got], n) => {
  ok(`  ${what}`, got === want[n], `${got}, wanted ${want[n]}`);
});

ok('a read that failed refuses rather than reading as nothing used',
  decide('music', M, null, 0, false) === 'google_unknown',
  'the thing standing between one member and everybody else’s month IS'
  + ' this read; reported as "nothing used" it takes the ceiling off at'
  + ' exactly the moment it stops working');

ok('and the member’s own share is asked before the engine’s month',
  decide('music', M, ceilingFor('music'), shareFor('music'), true) === 'google_yours_used',
  'both refuse, but "you are out" and "everybody is out" send somebody to'
  + ' two different places — wait or upgrade, against wait or ask for the'
  + ' budget to be raised');

/* ── 4. The source rules ──────────────────────────────────────────────── */

const lib = withoutComments(readFileSync('app/lib/server/googlespend.ts', 'utf8'));

/* Inside `enough` only. The first version of this compared the two codes'
   positions in the WHOLE file and went red, because both appear earlier
   still in the `Refusal` union, in the order the type happens to list them.
   That is the trap `check:sing` already warns about in its own words:
   matching a shape rather than a fact is how a check fails for a reason
   that is not the reason it exists. */
const asks = lib.slice(lib.indexOf('export async function enough'));
ok('the real `enough` asks in that order',
  before(asks, 'google_yours_used', 'google_kind_used'),
  'the table above is driven against a stand-in; this is what keeps it'
  + ' describing the real one');

ok('a failed read really does answer null in both counts',
  (lib.match(/if \(error\) return null;/g) ?? []).length === 2,
  'one of them returning nought would be the ceiling off for that half');

ok('what is spent is written down only after the work is in hand',
  /if \(!db \|\| micros <= 0\) return;/.test(lib),
  'a call that failed cost nothing, and a ceiling that counts failures'
  + ' closes early for a reason nobody can see');

ok('  and a write that failed is not thrown away',
  /const saved = await db\.from\('google_spend'\)\.insert\(/.test(lib)
  && /wrote\(saved,/.test(lib),
  'the supabase client does not throw \u2014 a discarded answer here is a'
  + ' ceiling that never fills, looking fine all month while the real number'
  + ' runs past it, until Google\u2019s own cap pauses all three engines at'
  + ' once');

ok('  and the row says which model ran',
  /model,/.test(lib) && /insert\(\{/.test(lib),
  'lyria-002 and lyria-3-pro-preview do not cost the same, and a row that'
  + ' cannot say which one it was is a row nobody can price afterwards');

ok('the refusal carries what is left, so a screen can say how much',
  /left: Math\.max\(0, share - mine\)/.test(lib) && /left: Math\.max\(0, roof - used\)/.test(lib),
  '"come back next month" and "try a shorter one" are different answers and'
  + ' only the number says which');

const sql = readFileSync('supabase/googlespend.sql', 'utf8');
ok('the counting is a calendar month in UTC, like Google’s own reset',
  (sql.match(/date_trunc\('month', now\(\) at time zone 'utc'\)/g) ?? []).length === 2,
  'a month that starts somewhere else drifts away from the cap it sits under');

ok('  and nobody can read the rows from a browser',
  /enable row level security/.test(sql) && /security definer/.test(sql),
  'what the whole workspace has spent is not a member’s business');

if (bad) {
  console.error(`\ncheck:googlecap — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:googlecap — each engine has its own month under Google’s one'
  + ' cap, they add up to less than it so ours bind first, a member gets a'
  + ' share rather than all of it, and a count that could not be read refuses'
  + ' instead of opening.',
);

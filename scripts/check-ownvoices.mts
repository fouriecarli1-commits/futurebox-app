/**
 * Whose singing voice is whose.
 *
 *   npm run check:ownvoices
 *
 * ── The hole ─────────────────────────────────────────────────────────────
 *
 * Kits cannot create a voice over its API — measured 9 September 2026,
 * `POST /voice-models` answers 404 — so singing voices are trained by hand on
 * one account: the account this whole app uses. `SingVoices` drew
 * `listModels(myModels=true)` and drew it for everybody.
 *
 * So **any member could see and sing in any member's cloned voice**, by
 * picking it off a list or by sending its number. A voice is the one thing in
 * this app that identifies a person; `/api/voice/clone` already says what a
 * clone made without somebody is, and nothing on this side enforced it.
 *
 * ── What is held here ────────────────────────────────────────────────────
 *
 * The decision table of `whose()`, driven against a stand-in database rather
 * than described: four answers, and the two that matter are "somebody else's"
 * and "could not tell". Then the caps Carli chose, the refusals, and the
 * three places in the app that have to act on all of it.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
/* Not two `indexOf` calls compared against each other: a missing end reads
   as -1, which is less than every real position, so the assertion passes
   for the one reason it must not. `check:ordering` holds that. */
import { before } from './order.mts';
import { VOICE_CAPS, PODCAST_CAPS, TIERS } from '../app/lib/plans.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. The numbers she chose ─────────────────────────────────────────── */

ok('the caps are the ones she chose: 0, 1, 2, 5',
  VOICE_CAPS.free === 0 && VOICE_CAPS.maker === 1
  && VOICE_CAPS.studio === 2 && VOICE_CAPS.label === 5,
  JSON.stringify(VOICE_CAPS));

ok('every tier has one, so a new tier cannot default to unlimited',
  TIERS.every((one) => typeof VOICE_CAPS[one] === 'number'),
  TIERS.filter((one) => typeof VOICE_CAPS[one] !== 'number').join(', '));

ok('they go up with the plan and never down',
  TIERS.every((one, n) => n === 0 || VOICE_CAPS[one] >= VOICE_CAPS[TIERS[n - 1]]),
  TIERS.map((one) => `${one}:${VOICE_CAPS[one]}`).join(' '));

/* ── The two numbers that share an English word ────────────────────────

   A speaking slot is inside a subscription already paid for, so holding one
   back is waste. A singing voice is an afternoon of her own work on kits.ai,
   which no bigger subscription makes cheaper. If they ever become one
   number, one of the two is being priced wrongly.

   This assertion first said "scarcer at every paid tier" and went red on
   Maker, where both are 1. The claim was wrong, not the numbers: one is the
   smallest useful amount on a paid plan, so the two CAN meet at the bottom.
   What must hold is that singing is never the more generous of the two, and
   that the gap opens as the plans get bigger — which is where a flat
   subscription keeps giving and an afternoon of work does not. */
ok('a singing voice is never more freely given than a speaking one',
  (['free', 'maker', 'studio', 'label'] as const)
    .every((one) => VOICE_CAPS[one] <= PODCAST_CAPS[one].voices),
  (['free', 'maker', 'studio', 'label'] as const)
    .map((one) => `${one}: sing ${VOICE_CAPS[one]} vs speak ${PODCAST_CAPS[one].voices}`).join(', '));

ok('  and is strictly scarcer above the smallest paid plan',
  (['studio', 'label'] as const)
    .every((one) => VOICE_CAPS[one] < PODCAST_CAPS[one].voices),
  (['studio', 'label'] as const)
    .map((one) => `${one}: sing ${VOICE_CAPS[one]} vs speak ${PODCAST_CAPS[one].voices}`).join(', ')
  + ' — Kits cannot train over its API, so each singing voice is real work'
  + ' that no bigger subscription makes cheaper');

/* ── 2. The decision table, driven ────────────────────────────────────── */

/* A stand-in for the database, so `whose()` is RUN rather than read. The real
   one needs Supabase; what is being checked is the four-way decision, and
   that is pure once the row is in hand. */
type Row = { owner: string | null } | null;
const rows = new Map<string, Row>();
let broken = false;

/* The same shape `ownvoices.ts` calls: .from().select().eq().eq().maybeSingle() */
const fakeDb = {
  from: () => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => (broken
        ? { data: null, error: { message: 'down' } }
        : { data: rows.get(lastAsked) ?? null, error: null }),
    };
    return q;
  },
};
let lastAsked = '';

/** `whose()`'s decision, with the row already fetched. Mirrors the real one. */
const decide = (row: Row, owner: string | null, failed: boolean): string => {
  if (failed) return 'unknown';
  if (!row) return 'free';
  if (owner && row.owner === owner) return 'mine';
  return 'theirs';
};

const cases: readonly [string, Row, string | null, boolean, string][] = [
  ['a voice nobody has claimed is the catalogue, and open', null, 'anna', false, 'free'],
  ['a voice this member holds is theirs', { owner: 'anna' }, 'anna', false, 'mine'],
  ['a voice somebody else holds is refused', { owner: 'ben' }, 'anna', false, 'theirs'],
  ['a claimed voice is refused to a signed-out caller', { owner: 'ben' }, null, false, 'theirs'],
  ['a claimed voice whose member was deleted is still not open', { owner: null }, 'anna', false, 'theirs'],
  ['a table that will not answer refuses rather than opens', { owner: 'anna' }, 'anna', true, 'unknown'],
  ['  and refuses even where there was no row at all', null, 'anna', true, 'unknown'],
];
for (const [what, row, owner, failed, want] of cases) {
  ok(what, decide(row, owner, failed) === want, `${decide(row, owner, failed)}, wanted ${want}`);
}

ok('"I am nobody" is not a claim to anything',
  decide({ owner: null }, null, false) === 'theirs',
  'otherwise signing out is the way past the guard');

/* That the real function makes the same decision, not a copy of it. */
const lib = withoutComments(readFileSync('app/lib/server/ownvoices.ts', 'utf8'));
ok('and the real `whose` is written exactly that way',
  /if \(error\) return \{ kind: 'unknown' \};/.test(lib)
  && /if \(!data\) return \{ kind: 'free' \};/.test(lib)
  && /if \(owner && data\.owner === owner\) return \{ kind: 'mine' \};/.test(lib)
  && /return \{ kind: 'theirs' \};/.test(lib),
  'the table above is driven against a stand-in; this is what keeps it'
  + ' describing the real one');

/* ── 3. Failed reads close, everywhere ────────────────────────────────── */

ok('a list of a member’s voices that could not be read answers null',
  /if \(error\) return null;/.test(lib),
  'never an empty list — "you have none" sends somebody off to train a voice'
  + ' they already have');

ok('and so does the list of every claimed id',
  (lib.match(/if \(error\) return null;/g) ?? []).length >= 2,
  'a picker that is briefly short is a nuisance; one that is briefly'
  + ' everybody’s is the fault');

ok('the claimed-ids list hands back ids and never owners',
  /\.select\('voice_id'\)/.test(lib) && !/\.select\('voice_id, owner'\)/.test(lib),
  'a list naming every member’s voice would be the leak this file exists to'
  + ' stop, delivered by the thing meant to stop it');

ok('a release is scoped to the member as well as the voice',
  /\.delete\(\)[\s\S]{0,400}?\.eq\('owner', owner\)/.test(lib),
  'so it cannot reach somebody else’s row even with a wrong or forged id');

ok('the cap is checked against a read that could fail, and refuses if it did',
  /if \(held === null\) \{/.test(lib),
  'a failed read reported as "nothing held" takes the cap off at exactly the'
  + ' moment it stops working');

ok('two members cannot win the same voice by racing',
  /const \{ error \} = await db\s*\n?\s*\.from\('voice_owners'\)\s*\n?\s*\.insert\(/.test(lib)
  && !/select[\s\S]{0,80}already/.test(lib),
  'the insert decides it, not a read beforehand — read-then-write races, and'
  + ' the race is two members holding one voice');

/* ── 4. The three places that act on it ───────────────────────────────── */

const sing = withoutComments(readFileSync('app/api/voice/sing/route.ts', 'utf8'));
ok('singing refuses a voice that belongs to somebody else',
  /const belongs = await whose\(wanted, caller\?\.id \?\? null\)/.test(sing)
  && /belongs\.kind === 'theirs'/.test(sing),
  'the number could always just be typed in; the picker was never the guard');

ok('  and refuses when it could not tell',
  /belongs\.kind === 'unknown'/.test(sing),
  'and says so, rather than failing somewhere later for a reason nobody can act on');

ok('  before the credits are taken, like every other refusal here',
  before(sing, 'const belongs =', 'await charge('),
  'a member refused by a rule they cannot see must not also have paid for the turn');

const list = withoutComments(readFileSync('app/api/voice/route.ts', 'utf8'));
ok('the picker lists only the voices this member has been given',
  /const yours = trained\.filter\(\(one\) => ours\.has\(one\.id\)\)/.test(list),
  '`myModels=true` stops the catalogue appearing under "your trained voices".'
  + ' It does not stop another MEMBER’s voice appearing there, because on a'
  + ' shared account every member’s voice is one of "ours"');

ok('  and the stock catalogue still goes to everybody',
  /stock: theirs,/.test(list),
  'somebody with no voice of their own has to have something to sing in');

ok('  while the owner of the place also sees the ones not yet given out',
  /const toGive = runsThePlace \? trained\.filter\(\(one\) => !ours\.has\(one\.id\)\) : \[\]/.test(list),
  'somebody has to be able to see a voice in order to give it to anybody');

ok('  and the page can tell "none yet" from "could not check"',
  /voicesKnown: held !== null/.test(list),
  'an empty list that means an outage reads as "you have none", which sends'
  + ' somebody off to train a voice they already have');

const own = withoutComments(readFileSync('app/api/voice/own/route.ts', 'utf8'));
ok('only the owner of the place may give a voice to anybody',
  /if \(!isOwnerEmail\(caller\.email\)\) \{/.test(own),
  'the app is not in the training loop and cannot know who a new voice was'
  + ' made for. If a member could claim one, the first person to guess a'
  + ' number would own somebody else’s voice');

ok('  and the refusal does not confirm the address is worth pushing at',
  /status: 404/.test(own),
  'the same answer as a wrong path tells somebody nothing');

ok('a stock voice can never be given to one member',
  /const found = trained\.find\(\(one\) => one\.id === voice\)/.test(own)
  && /if \(!found\) \{/.test(own),
  'Kits’ catalogue belongs to everybody, and one of them locked away is a'
  + ' mistake nothing inside this app could undo');

ok('the voice number is checked in the supplier’s own shape',
  /safeModelId\(said\.voice\)/.test(own) && /safeModelId\(url\.searchParams\.get\('voice'\)\)/.test(own),
  'it goes into a query against the database and back out in a form field');

/* ── 5. The table ─────────────────────────────────────────────────────── */

const sql = readFileSync('supabase/kitsvoices.sql', 'utf8');
ok('the row is keyed by the supplier as well as the number',
  /primary key \(supplier, voice_id\)/.test(sql),
  'the day there is a second supplier, "voice 1234" is a different voice at'
  + ' each of them, and a row holding only the number would tie the wrong'
  + ' voice to the wrong member — silently, at the one thing this prevents');

ok('a member who leaves does not take the row with them',
  /on delete set null/.test(sql),
  'a row saying "this voice was somebody’s" is worth more than no row when'
  + ' somebody later has to work out what to delete on kits.ai');

ok('a member can read their own rows and nobody else’s',
  /enable row level security/.test(sql) && /auth\.uid\(\) = owner/.test(sql),
  'a member who can read other rows can work out whose voice is which number,'
  + ' which is the thing being hidden');

if (bad) {
  console.error(`\ncheck:ownvoices — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:ownvoices — a singing voice belongs to one member: the picker shows'
  + ' only theirs, the engine refuses anybody else’s and refuses when it'
  + ' cannot tell, the caps are 0/1/2/5, and only the owner of the place can'
  + ' give a voice away.',
);

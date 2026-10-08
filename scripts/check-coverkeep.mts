/**
 * A cover that was made is a cover that comes back.
 *
 *   npm run check:coverkeep
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Wanneer 'n liedjie se album art gegenerate word dan
 * moet daar 'n opsie wees 'keep'. Ek sien ek het een gegenerate en nou is dit
 * weg."*
 *
 * She had asked for a keep button on 14 September and been told there was
 * nothing to keep: a cover is saved the moment it is drawn, and all that was
 * missing was a sentence saying so. Both halves of that answer were wrong in
 * the same place.
 *
 *   The copy into our storage was done by HER BROWSER — inside the `?id=`
 *   poll in `Sleeve.tsx`. Anything that ended that loop early left the
 *   picture at the engine on a link that expires, with nothing anywhere
 *   recording that it existed.
 *
 *   And the sentence I added to reassure her printed over that exact failure,
 *   because the route answers `kept: false` when the copy did not land and
 *   the panel tested the PICTURE rather than the keeping.
 *
 * ── So the two rules, and neither is a spelling check ────────────────────
 *
 * **Not known is not saved.** Driven through `standingOf` over every value
 * the server can send, the two nobody writes a branch for included.
 *
 * **An uncollected cover is found, a collected one is not offered again.**
 * `pending` takes its client, so this hands it a fake that applies the
 * filters it is actually given. Drop `.is('kept_at', null)` and the fake
 * returns a cover already in storage — which is what the bug would look like
 * on screen: a keep button on a song that has nothing to keep, forever.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import {
  hasPicture, offersKeep, saysSaved, standingOf, type Standing,
} from '../app/lib/coverstate.ts';
import { pending, type Asked } from '../app/lib/server/coverkeep.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const PICTURE = 'https://example.test/sleeve.png';

/* ── 1. Not known is not saved ────────────────────────────────────────── */

const words: readonly [string, Record<string, unknown>, Standing][] = [
  ['nothing drawn and nothing owed', {}, 'none'],
  ['nothing drawn, one owed', { pending: true }, 'uncollected'],
  ['a picture the server kept', { url: PICTURE, kept: true }, 'kept'],
  ['a picture the server could NOT keep', { url: PICTURE, kept: false }, 'adrift'],
  /* The two nobody writes a branch for. `undefined` is what an older
     deployment's answer looks like while a new page is live; `null` is what a
     half-parsed one looks like. Both used to reach the green line. */
  ['a picture with no word either way', { url: PICTURE }, 'adrift'],
  ['a picture with a null word', { url: PICTURE, kept: null }, 'adrift'],
  ['an empty url, which is not a picture', { url: '', kept: true }, 'none'],
  ['an empty url with one owed', { url: '', pending: true }, 'uncollected'],
];

for (const [what, word, want] of words) {
  const got = standingOf(word);
  ok(`${what} reads as ${want}`, got === want, `read as ${got}`);
}

ok('only a kept cover may say it is saved',
  words.filter(([, word]) => saysSaved(standingOf(word))).length === 1
  && saysSaved('kept') && !saysSaved('adrift') && !saysSaved('uncollected') && !saysSaved('none'),
  'the sentence "it is saved and it goes wherever the song goes" is the one'
  + ' thing on this panel that must never be a guess');

ok('a keep is offered in both states that have something to keep',
  offersKeep('uncollected') && offersKeep('adrift')
  && !offersKeep('kept') && !offersKeep('none'));

ok('a picture is drawn in both states that have one',
  hasPicture('kept') && hasPicture('adrift')
  && !hasPicture('uncollected') && !hasPicture('none'));

/* ── 2. The panel asks the function rather than the picture ───────────── */

const sleeve = withoutComments(readFileSync('app/components/Sleeve.tsx', 'utf8'));

ok('the panel decides what to say with saysSaved',
  /saysSaved\(standing\)/.test(sleeve),
  'testing `url` instead is the bug: a picture on screen says nothing about'
  + ' whether a copy of it reached our storage');

ok('and the keep button is behind offersKeep',
  /offersKeep\(standing\)/.test(sleeve));

/* The reassurance must sit inside the branch, not beside it: `saysSaved`
   appears before it in the file, which a sentence printed unconditionally
   cannot do.
 
   Through `before` rather than two `indexOf` calls compared to each other,
   which `check:ordering` caught in the first version of this file — a missing
   anchor is -1, -1 is less than everything, and the comparison then reads as
   "the question comes first" precisely when the question is not there at all.
   The rule being broken was written against this exact mistake. */
ok('the saved sentence comes after the question, not instead of it',
  before(sleeve, 'saysSaved(standing)', 'It is saved and it goes wherever the song goes'),
  'the sentence was printed above the picture for three weeks with no'
  + ' question in front of it');

/* ── 3. Which rows a keep goes looking for ────────────────────────────── */

interface Row {
  id: string;
  owner: string;
  track_id: string;
  kept_at: string | null;
  failed_at: string | null;
  created_at: string;
}

/**
 * A few rows, and a fake that applies the filters it is handed.
 *
 * This is the point of the whole section: it does not look at the source for
 * the word `kept_at`, it answers the query that was actually built. A missing
 * condition comes back as the wrong row.
 */
function fake(rows: readonly Row[]): { asked: Asked; sawTable: () => string } {
  let table = '';
  const build = (left: readonly Row[], order: 'asc' | 'desc' | null) => {
    const chain = {
      select: () => chain,
      eq: (column: string, value: string) =>
        build(left.filter((row) => String(row[column as keyof Row] ?? '') === value), order),
      is: (column: string, value: null) =>
        build(left.filter((row) => (row[column as keyof Row] ?? null) === value), order),
      order: (column: string, options: { ascending: boolean }) => {
        const sorted = [...left].sort((a, b) => {
          const one = String(a[column as keyof Row] ?? '');
          const two = String(b[column as keyof Row] ?? '');
          return options.ascending ? one.localeCompare(two) : two.localeCompare(one);
        });
        return build(sorted, options.ascending ? 'asc' : 'desc');
      },
      limit: (count: number) => Promise.resolve({ data: left.slice(0, count), error: null }),
    };
    return chain as unknown as ReturnType<Asked['from']>;
  };
  return {
    asked: {
      from: (name: string) => {
        table = name;
        return build(rows, null);
      },
    },
    sawTable: () => table,
  };
}

const MINE = 'owner-one';
const SONG = 'track-one';

/* ── The dates are the test, and the first version of them was not ───────
 
   Written once with the kept and failed rows OLDER than the newest open one.
   Every assertion passed — and then passed again with `.is('kept_at', null)`
   deleted from the query, because the newest row was the open one either way.
   A check that cannot tell the difference between the rule being there and
   the rule being gone is not checking the rule; it is agreeing with it.
 
   So the two rows that must be skipped are the two NEWEST. Drop either
   condition and `limit(1)` hands back exactly the wrong one. */
const rows: Row[] = [
  { id: 'old-open', owner: MINE, track_id: SONG, kept_at: null, failed_at: null, created_at: '2026-10-01T00:00:00Z' },
  /* The answer: the newest of the ones still worth collecting. */
  { id: 'new-open', owner: MINE, track_id: SONG, kept_at: null, failed_at: null, created_at: '2026-10-02T00:00:00Z' },
  { id: 'it-failed', owner: MINE, track_id: SONG, kept_at: null, failed_at: '2026-10-03T00:00:00Z', created_at: '2026-10-03T00:00:00Z' },
  { id: 'already-kept', owner: MINE, track_id: SONG, kept_at: '2026-10-04T00:00:00Z', failed_at: null, created_at: '2026-10-04T00:00:00Z' },
  { id: 'somebody-else', owner: 'owner-two', track_id: SONG, kept_at: null, failed_at: null, created_at: '2026-10-08T00:00:00Z' },
  { id: 'other-song', owner: MINE, track_id: 'track-two', kept_at: null, failed_at: null, created_at: '2026-10-08T00:00:00Z' },
];

const one = fake(rows);
const found = await pending(MINE, SONG, one.asked);

ok('the newest uncollected cover for this song is the one found',
  found === 'new-open', `found ${found ?? 'nothing'}`);
ok('a cover already in storage is not offered for collection again',
  found !== 'already-kept',
  'a keep button that collects something already kept never goes away');
ok('a cover the engine refused is not offered either',
  found !== 'it-failed',
  'otherwise a song whose cover cannot be made keeps asking to fetch it');
ok('and it is read from the cover_jobs table',
  one.sawTable() === 'cover_jobs', one.sawTable());

const mine = await pending('owner-two', SONG, fake(rows).asked);
ok('somebody else gets their own, not mine', mine === 'somebody-else', String(mine));

const none = await pending(MINE, 'track-three', fake(rows).asked);
ok('a song with no cover ordered has nothing to collect', none === null, String(none));

/* A read that falls over must answer "nothing to collect" rather than
   throwing, because this runs on every panel open. */
const broken: Asked = {
  from: () => ({
    select: () => broken.from(''),
    eq: () => broken.from(''),
    is: () => broken.from(''),
    order: () => broken.from(''),
    limit: () => Promise.resolve({ data: null, error: { message: 'no' } }),
  } as unknown as ReturnType<Asked['from']>),
};
ok('a failed read offers no keep rather than throwing',
  (await pending(MINE, SONG, broken)) === null);

ok('and no client at all is the same answer',
  (await pending(MINE, SONG, null)) === null);

/* ── 4. The panel cannot unmount while it is drawing ─────────────────── */

/* The CAUSE, as against the recovery everything above adds. The booth mounts
   this panel on `playing === track.id || sleeveFor === track.id`, and a song
   that reaches its end sets `playing` to null — so pressing "Make a cover
   image" while a song plays and letting it finish took the panel, and the
   poll inside it, down a few seconds before the picture arrived.
 
   The prop is REQUIRED, so the compiler is the real check here: a room that
   mounts a sleeve and never pins it does not build. These two hold the wiring
   that a type cannot — that it is called on both paths that do work, and that
   the booth does something with it. */
ok('a draw and a keep both tell the room they are working',
  (sleeve.match(/working\(true\)/g) ?? []).length === 3
  && (sleeve.match(/working\(false\)/g) ?? []).length === 3,
  'make, keep and take-off each set it on the way in and off on the way out;'
  + ' a path that sets `setBusy` directly is a path that does not pin');

ok('and the panel offers no way to set busy without pinning',
  !/setBusy\((true|false)\)/.test(sleeve),
  'the point of routing both through one helper is that neither can forget');

const booth = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));
ok('the booth pins the panel open while it works',
  /onWorking=\{/.test(booth) && /setSleeveFor\(track\.id\)/.test(booth),
  'this is the fault itself: a finished song unmounted the panel mid-draw');

/* ── 5. The copy into storage happens in exactly one place ───────────── */

const route = withoutComments(readFileSync('app/api/cover/route.ts', 'utf8'));
const uploads = (route.match(/\.upload\(/g) ?? []).length;
ok('one place copies the picture into storage',
  uploads === 1,
  `${uploads} of them — the version that drifts is the one that stops marking`
  + ' the job kept, which turns every later panel open into an offer to'
  + ' collect a cover that is already there');

ok('the job is written down before the credits are charged',
  before(route, 'const paid = await charge(', 'remember('),
  'an unrecorded job is a cover that cannot be recovered');

ok('a failed cover gives the credits back',
  /claimRefund\(/.test(route) && /refund\(owner, give/.test(route),
  'a cover the engine refused was charged for and never given back');

ok('the keep carries no id from the request',
  /export async function PUT/.test(route)
  && !/searchParams\.get\('id'\)[\s\S]{0,400}export async function PUT/.test(route),
  'the job is found from who is asking and which song, which is also what'
  + ' stops it being a way to fetch somebody else’s picture');

console.log(bad === 0 ? '\ncover keep: all good.' : `\ncover keep: ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);

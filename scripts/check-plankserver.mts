/**
 * The shelves moved to the account, and nothing was lost on the way.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Skuif die stories en liedjies na die server
 * toe."*
 *
 * ── Why the move is driven and not read ──────────────────────────────────
 *
 * Because every way it goes wrong is silent and permanent.
 *
 * Delete from the device before the account confirms, and a failed upload
 * leaves the item in NEITHER place — and it looks exactly like the feature
 * being broken rather than like a move that went wrong. Skip the already-up
 * check and an interrupted move makes a second copy of everything that got
 * through. Treat a full shelf as a reason to drop the device's copy and the
 * fullest shelves lose the most.
 *
 * None of those throws. All of them pass a build. So `moveShelf` is run here
 * against two shelves this file makes out of arrays — one that works, one
 * that refuses everything, one that is already full — and what is left on
 * each side afterwards is counted.
 *
 * ── And the one that is read ─────────────────────────────────────────────
 *
 * The bucket. A private bucket is the difference between a child's songs
 * being the account's and being anybody's who knows a path, and it is one
 * word in a SQL file.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { moveShelf } from '../app/lib/shelfmove.ts';
import type { Put, Shelf } from '../app/lib/ondevice.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nThe shelves moved to the account, and nothing was lost\n');

interface Thing { id: string; made: number; title: string }

/** A shelf made of an array, which answers however this test needs it to. */
function fake(start: Thing[], answer: (one: Thing) => Put = () => 'kept'): Shelf<Thing> & { rows: Thing[] } {
  const rows = [...start];
  return {
    rows,
    most: 99,
    keep: async (one) => {
      const said = answer(one);
      if (said === 'kept') rows.push(one);
      return said;
    },
    all: async () => [...rows].sort((a, b) => b.made - a.made),
    forget: async (id) => {
      const at = rows.findIndex((one) => one.id === id);
      if (at >= 0) rows.splice(at, 1);
    },
  };
}

const three = (): Thing[] => [
  { id: 'a', made: 1, title: 'One' },
  { id: 'b', made: 2, title: 'Two' },
  { id: 'c', made: 3, title: 'Three' },
];

/* ── 1. The happy move ───────────────────────────────────────────────── */

const from = fake(three());
const to = fake([]);
const done = await moveShelf(from, to);

ok('everything on the device goes up',
  done.moved === 3 && to.rows.length === 3,
  `${done.moved} moved, ${to.rows.length} on the account`);

ok('  and the device is emptied only after',
  from.rows.length === 0,
  `${from.rows.length} left behind — which on the next visit is moved again,`
  + ' and on an account that already has them is a duplicate');

ok('  and the ids are carried over unchanged',
  to.rows.map((one) => one.id).sort().join() === 'a,b,c',
  `${to.rows.map((one) => one.id).join()} — the ids are what tells an`
  + ' interrupted move what is already up, so a new one each time makes a'
  + ' second copy of everything');

/* ── 2. The upload that fails ────────────────────────────────────────── */

const stuck = fake(three());
const refuses = fake([], () => 'off');
const hard = await moveShelf(stuck, refuses);

ok('an item the account refuses stays on the device',
  stuck.rows.length === 3 && refuses.rows.length === 0,
  `${stuck.rows.length} left on the device — anything less is an item in`
  + ' NEITHER place, which is permanent and looks like the feature being'
  + ' broken rather than like a move');

ok('  and it says how many it could not take',
  hard.moved === 0 && hard.left === 3,
  `${hard.moved} moved and ${hard.left} left, wanted 0 and 3`);

const full = fake(three());
const brimming = fake([], () => 'shelfFull');
await moveShelf(full, brimming);
ok('  and a full shelf is a reason to leave them alone, not to drop them',
  full.rows.length === 3,
  `${full.rows.length} left — treating "full" as done means the fullest`
  + ' shelves lose the most, which is the worst possible way round');

/* ── 3. The move that was interrupted ────────────────────────────────── */

const half = fake(three());
const got = fake([{ id: 'a', made: 1, title: 'One' }]);
const again = await moveShelf(half, got);

ok('an item already up is not sent twice',
  got.rows.filter((one) => one.id === 'a').length === 1,
  `${got.rows.filter((one) => one.id === 'a').length} copies of 'a' — an`
  + ' interrupted move run again makes a second copy of everything that got'
  + ' through the first time');

ok('  and is taken off the device, which finishes the move',
  half.rows.length === 0 && again.moved === 3,
  `${half.rows.length} left on the device, ${again.moved} counted as moved`);

/* ── 4. Nothing moves when the account cannot be read ────────────────── */

const blind = fake(three());
const broken: Shelf<Thing> = {
  most: 99,
  keep: async () => 'kept',
  all: async () => { throw new Error('no connection'); },
  forget: async () => {},
};
const nothing = await moveShelf(blind, broken);
ok('nothing moves when the account cannot be read',
  blind.rows.length === 3 && nothing.moved === 0,
  `${blind.rows.length} left — moving blind risks a second copy of`
  + ' everything, so the device keeps it all until the account answers');

/* ── 5. The bucket is private, and the paths are the owner\'s ─────────── */

/* ── Comments off first ──────────────────────────────────────────────────
 
   The last assertion below reddened on its first run, against a file that
   was correct: the ONLY mention of `service_role` in it is a comment saying
   there is no service_role path. A check that reads prose is the same
   failure `check:standards` exists to catch — its own note says a standards
   pass that measures its own paragraphs is the thing it is looking for.
 
   `prose.mts` blanks TypeScript comments; SQL's are `--` to end of line, and
   a dollar-quoted body cannot contain one that matters here. */
const sql = readFileSync('supabase/kinderplank.sql', 'utf8')
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n');

ok('the kids\' bucket is private',
  /values \('kidshelf', 'kidshelf', false\)/.test(sql)
  && /do update set public = false/.test(sql),
  'the bucket is public, so anybody who knows a path can fetch a child\'s'
  + ' song or a storybook written for them — one word, and not a trade worth'
  + ' making for a round trip');

ok('  and only the owner may read it',
  !/for select using \(\s*bucket_id = 'kidshelf'\s*\)/.test(sql)
  && /read own kidshelf[\s\S]{0,300}?auth\.uid\(\)::text = \(storage\.foldername\(name\)\)\[1\]/.test(sql),
  'the read policy does not key on the owner, so the bucket is private in'
  + ' name and open to every signed-in account in fact');

ok('  and the table is the owner\'s too',
  /alter table public\.kid_shelf enable row level security/.test(sql)
  && /auth\.uid\(\) = owner/.test(sql),
  'row level security is off, or the policies do not key on the owner — one'
  + ' account can list another\'s children\'s books');

ok('  and nothing on the server can read it',
  !/service_role/.test(sql),
  'a service_role grant is a route that CAN read a child\'s songs, and a'
  + ' route that can is a route that one day does');

/* ── 6. The rooms kept their shape ───────────────────────────────────── */

const story = withoutComments(readFileSync('app/lib/storykeep.ts', 'utf8'));
const song = withoutComments(readFileSync('app/lib/songkeep.ts', 'utf8'));

ok('both shelves are on the account now',
  /cloudShelfOf\s*[<(]/.test(story) && /cloudShelfOf\s*[<(]/.test(song),
  'a shelf is still the device\'s, so a story made on a laptop is not on the'
  + ' phone');

ok('  and both still know the device shelf they came from',
  /OLD_DB = 'futurebox-stories'/.test(story) && /OLD_DB = 'futurebox-kidsongs'/.test(song),
  'the old database name changed, so anything kept before the move cannot be'
  + ' found to carry up — it is simply gone, with nothing saying so');

ok('  and the shelves run the move before they look',
  /moveShelf\s*\(/.test(withoutComments(readFileSync('app/components/StoryShelf.tsx', 'utf8')))
  && /moveShelf\s*\(/.test(withoutComments(readFileSync('app/components/SongShelf.tsx', 'utf8'))),
  'nothing ever runs the move, so what is on a device stays there and the'
  + ' account shelf opens empty');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

/**
 * A story a grown-up made, on a shelf a child can reach, for nothing.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Gaan aan met die shelf van stories in die kids
 * kamer."*
 *
 * ── The four things that go wrong without saying so ──────────────────────
 *
 * **A stored object URL.** The room hands out `URL.createObjectURL` handles
 * for every picture, and a handle is into THIS tab and nothing else. A story
 * put on the shelf with one in it saves perfectly, lists perfectly, and
 * opens to a broken picture tomorrow. The shelf has to hold the Blob, and
 * the only way to know it does is to look at what the room puts in.
 *
 * **Playing costing credits.** The pictures and the readings were paid for
 * when the book was made. If anything in the shelf charges, a child hearing
 * the same story four times has spent an allowance on something already
 * bought — in the one room built around somebody pressing things repeatedly.
 *
 * **A child reaching the bin.** Taking a story off the shelf is the only
 * press in that room that cannot be undone, and a six-year-old will find it.
 *
 * **The shelf quietly making room.** A cap that drops the oldest story to fit
 * a new one is work that stops existing, which `filmkeep.ts` calls the worst
 * class of fault this app can have — and it is invisible, because the new
 * story saves perfectly.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { MOST_STORIES, titleOf } from '../app/lib/storykeep.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA story on a shelf a child can reach, for nothing\n');

const shelf = withoutComments(readFileSync('app/components/StoryShelf.tsx', 'utf8'));
const room = withoutComments(readFileSync('app/components/StoryRoom.tsx', 'utf8'));
const kids = withoutComments(readFileSync('app/components/KidsRoom.tsx', 'utf8'));
const door = withoutComments(readFileSync('app/components/KidsDoor.tsx', 'utf8'));
const keep = withoutComments(readFileSync('app/lib/storykeep.ts', 'utf8'));
/* The shelf's behaviour moved here when the songs needed the same one. The
   two assertions about the cap follow it: left pointing at `storykeep.ts`
   they would have gone green the moment the machinery left that file, which
   is a check reporting a property it can no longer see. */
const device = withoutComments(readFileSync('app/lib/ondevice.ts', 'utf8'));
const make = withoutComments(readFileSync('app/lib/storymake.ts', 'utf8'));

/* ── 1. What goes on the shelf is the picture, not a handle to it ───── */

ok('the story room shelves the picture itself',
  /picture:\s*made\[[^\]]+\]!\.blob!/.test(room),
  'an object URL is being stored — it is a handle into the tab that made it,'
  + ' so the story saves perfectly, lists perfectly, and opens to a broken'
  + ' picture tomorrow');

ok('  and the picture call hands the Blob back to be shelved',
  /readonly blob: Blob/.test(make) && /blob,?\s*\}/.test(make),
  '`drawPage` returns only a URL, so the room has nothing to store even if'
  + ' it wanted to');

/* ── 2. Nothing in the shelf spends ──────────────────────────────────── */

const spends = [
  /fetch\(\s*['"`]\/api\//.test(shelf) && 'it calls an API',
  /charge\s*\(/.test(shelf) && 'it charges',
  /accessToken\s*\(/.test(shelf) && 'it takes a token',
].filter(Boolean);
ok('playing a kept story spends nothing and asks nobody',
  spends.length === 0,
  `${spends.join(', ')} — the pictures and the readings were paid for when the`
  + ' book was made, and a child hearing one four times must not pay four'
  + ' times in the one room built around pressing things repeatedly');

ok('  and it reads only from the device',
  /allStories\s*\(/.test(shelf) && !/supabase|storage\.from/.test(shelf),
  'the shelf reaches a server, so a story needs a connection and a bucket to'
  + ' be heard');

/* ── 3. The child cannot take a story off the shelf ──────────────────── */

ok('the bin is drawn only for a grown-up',
  /grownUp\s*&&\s*\(/.test(shelf) && /forgetStory\s*\(/.test(shelf),
  'taking a story off the shelf is the one press in the kids room that cannot'
  + ' be undone, and it is not behind the grown-up flag');

ok('  and the child\'s room does not pass that flag',
  /<StoryShelf\s*\/>/.test(kids) && !/<StoryShelf[^/>]*grownUp/.test(kids),
  'the kids room hands the shelf `grownUp`, so a six-year-old has a bin');

ok('  while the grown-up\'s own page does',
  /<StoryShelf\s+grownUp/.test(door),
  'there is nowhere a grown-up can take a story off, so a full shelf is a'
  + ' dead end');

/* ── 4. The shelf never makes room by itself ─────────────────────────── */

ok('a full shelf refuses rather than dropping the oldest story',
  /shelfFull/.test(device) && !/shift\(\)|splice\(0/.test(device),
  'the cap makes room by deleting, which is work that stops existing — and'
  + ' invisible, because the new story saves perfectly');

ok('  and the count is taken inside the write',
  /transaction\(\[store\], 'readwrite'\)[\s\S]{0,400}?count\(\)/.test(device),
  'the shelf is counted in one transaction and written in the next, which'
  + ' leaves room for a second save to land between them — the cap present'
  + ' and not holding');

/* ── The refactor's own hazard ───────────────────────────────────────────
 
   Moving the machinery to `ondevice.ts` is safe only while the NAMES stay
   put. A database or store renamed in passing is every story kept before
   today quietly gone, with the shelf reporting nothing wrong — it opens a new
   empty database and says there are no stories, which is indistinguishable
   from never having made one. */
ok('  and the stories\' database is the one they were kept in',
  /'futurebox-stories'/.test(keep) && /'stories'/.test(keep),
  'the database or store was renamed, so every story kept before today is'
  + ' gone and the shelf says, truthfully and uselessly, that there are none');

ok('  and the shelf is the shared one, not a second copy',
  /shelfOf\s*[<(]/.test(keep),
  '`storykeep.ts` has its own IndexedDB wrapper again — two copies is two'
  + ' places the cap is enforced and two places somebody fixes a bug in one'
  + ' of');

ok('  and it holds a sane number',
  MOST_STORIES >= 4 && MOST_STORIES <= 50,
  `${MOST_STORIES} — a shelf of one is not a shelf, and a shelf of hundreds`
  + ' is a phone quietly full of books nobody plays');

/* ── 5. A name a child can tell apart ────────────────────────────────── */

ok('a story is named from its own first words',
  titleOf('Once there was a small brown dog called Rex.') === 'Once there was a small brown',
  `got "${titleOf('Once there was a small brown dog called Rex.')}" — a shelf`
  + ' of twelve books all called "A story" is a shelf nobody can use');

ok('  with no trailing punctuation',
  !/[,;:.!?]$/.test(titleOf('Hello, there was a dog, and he ran away.')),
  `got "${titleOf('Hello, there was a dog, and he ran away.')}" — a title that`
  + ' ends in a comma reads as a mistake rather than as a title');

ok('  and a story with no words still has a name',
  titleOf('   ').length > 0,
  'an empty title is a button with nothing on it');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

/**
 * A child's song survives the page closing, and costs nothing to hear again.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Gaan aan met die kind se liedjies wat keepbaar
 * is."*
 *
 * A song played in the room and was gone when the page closed. That is the
 * fault `filmkeep.ts` calls the worst class this app can have — work that
 * stops existing — and it is worse in this room than anywhere: the song cost
 * real credits out of an allowance a parent set, and the person it happens
 * to is six and will think the app ate it.
 *
 * ── The four ways this fails silently ────────────────────────────────────
 *
 * **Keeping a handle instead of the song.** The room holds an object URL to
 * play the audio with, and an object URL is a handle into THIS tab. A song
 * kept with one in it saves perfectly, lists perfectly, and plays nothing
 * tomorrow. The story shelf shipped with exactly that bug the day before,
 * found by driving what the room puts in rather than reading the shelf.
 *
 * **Charging to play one back.** It was paid for when it was made. Charging
 * again means an allowance that runs out by LISTENING, which is the opposite
 * of what an allowance is for, in the room where somebody presses the same
 * button forty times.
 *
 * **A child reaching the bin.** Losing a song they made is worse than losing
 * one somebody made for them, and a six-year-old will find it.
 *
 * **A full shelf making room.** Held in `check:kinderverhaal` against
 * `lib/ondevice.ts`, which both shelves now share — this file asserts the
 * songs use that shelf rather than a third copy of it.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { MOST_SONGS } from '../app/lib/songkeep.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA child\'s song survives the page closing\n');

const room = withoutComments(readFileSync('app/components/KidsRoom.tsx', 'utf8'));
const shelf = withoutComments(readFileSync('app/components/SongShelf.tsx', 'utf8'));
const door = withoutComments(readFileSync('app/components/KidsDoor.tsx', 'utf8'));
const keep = withoutComments(readFileSync('app/lib/songkeep.ts', 'utf8'));

/* ── 1. The song itself is kept, not a handle to it ──────────────────── */

ok('the room keeps the song and not its address',
  /audio:\s*songBlob/.test(room),
  'an object URL is being kept — it is a handle into this tab, so the song'
  + ' saves perfectly, lists perfectly, and plays nothing tomorrow. The'
  + ' story shelf shipped with this exact bug the day before');

ok('  and holds the blob from the moment the song arrives',
  /setSongBlob\s*\(/.test(room),
  'the room never keeps the audio, so there is nothing to store even if the'
  + ' button were pressed');

ok('  and stops offering to keep one twice',
  /setKept\s*\(\s*true\s*\)/.test(room) && /disabled=\{!songBlob \|\| kept\}/.test(room),
  'the same song can be kept over and over, which fills a shelf of eight with'
  + ' one song');

/* ── 2. Hearing one back spends nothing ──────────────────────────────── */

const spends = [
  /fetch\(\s*['"`]\/api\//.test(shelf) && 'it calls an API',
  /charge\s*\(/.test(shelf) && 'it charges',
  /accessToken\s*\(/.test(shelf) && 'it takes a token',
].filter(Boolean);
ok('playing a kept song spends nothing and asks nobody',
  spends.length === 0,
  `${spends.join(', ')} — it was paid for when it was made, and charging again`
  + ' means an allowance that runs out by listening');

ok('  and the keeping itself is free',
  !/charge|credits|CREDITS/.test(keep),
  'the shelf charges to store something already bought');

/* ── 3. The bin is the grown-up\'s ───────────────────────────────────── */

ok('the bin is drawn only for a grown-up',
  /grownUp\s*&&\s*\(/.test(shelf) && /forgetSong\s*\(/.test(shelf),
  'losing a song they made is worse than losing one somebody made for them,'
  + ' and the bin is not behind the grown-up flag');

ok('  and the child\'s room does not pass that flag',
  /<SongShelf\s+again=/.test(room) && !/<SongShelf[^/>]*grownUp/.test(room),
  'the kids room hands the shelf `grownUp`, so a six-year-old has a bin');

ok('  while the grown-up\'s page does',
  /<SongShelf\s+grownUp/.test(door),
  'there is nowhere a grown-up can take a song off, so a full shelf is a'
  + ' dead end');

/* ── 4. One shelf, not three ─────────────────────────────────────────── */

ok('the songs use the shared shelf rather than a third copy of it',
  /shelfOf\s*[<(]/.test(keep) && !/indexedDB\.open/.test(keep),
  'a third IndexedDB wrapper is a third place the cap is enforced and a third'
  + ' place somebody later fixes a bug in one of');

ok('  with a database of its own',
  /'futurebox-kidsongs'/.test(keep),
  'the songs share a database with the stories, so adding either means'
  + ' bumping a version and breaking any tab still running the old code —'
  + ' which is the reason `filmkeep.ts` took its own in the first place');

ok('  and a shelf a child can still look at',
  MOST_SONGS >= 4 && MOST_SONGS <= 20,
  `${MOST_SONGS} — past about eight it stops being "my songs" and becomes a`
  + ' list');

/* ── 5. The shelf notices a new song without a reload ────────────────── */

/* The shelf re-reads when `again` changes, which means the dependency has to
   BE there — a prop taken and not depended on is a prop that does nothing,
   and it looks identical from the outside. */
ok('keeping a song makes the shelf look again',
  /setShelfAgain/.test(room) && /\[\s*look\s*,\s*again\s*\]/.test(shelf),
  'the shelf is read once on mount, so a song just kept does not appear until'
  + ' the room is reopened — which reads as the Keep button not working');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

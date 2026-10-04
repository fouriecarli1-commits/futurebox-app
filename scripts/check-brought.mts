/**
 * The shelf for sound and video carried in from outside.
 *
 * ── The gap ──────────────────────────────────────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md` has said since the picture library was built:
 * *"Still open: audio and video files. Nothing yet keeps a piece of music
 * somebody brought in from outside."* `docs/GOING_LIVE.md` carries the same
 * line under what is not finished in the product.
 *
 * ── Why the rules are nearly all about eviction ──────────────────────────
 *
 * Because that is the part that loses somebody's work, and it is invisible
 * until after it has happened. A shelf that drops the wrong thing looks
 * exactly like a shelf that is working, right up to the moment a person goes
 * looking for the file they starred.
 *
 * So `roomFor` is a pure function with the writing kept out of it, and the
 * cases below are the ones that cannot be seen on a screen: a starred item
 * under pressure, a file larger than the whole budget, a shelf already at the
 * count, and the two loops that would either delete the arriving file or
 * never end.
 *
 * ── And why the cap is bytes rather than a count ─────────────────────────
 *
 * `assets.ts` keeps twenty pictures by count, which is right for tens of
 * kilobytes each. A minute of phone video is tens of megabytes, so twenty of
 * those is most of a browser's quota — and a quota that runs out fails the
 * next write, silently, at the moment somebody is saving.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  KEEP_BYTES, KEEP_ITEMS, MOST_ONE, broughtFrom, roomFor, usedBytes, type Brought,
} from '../app/lib/brought';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const MB = 1024 * 1024;
const item = (id: string, mb: number, when: string, star = false): Brought => ({
  id,
  kind: 'video',
  name: id,
  mime: 'video/mp4',
  bytes: mb * MB,
  seconds: 10,
  createdAt: `2026-10-0${when}T00:00:00.000Z`,
  ...(star ? { favourite: true } : {}),
});

/* ── The caps ──────────────────────────────────────────────────────────── */

ok('the shelf is capped by bytes, not only by how many things are on it',
  KEEP_BYTES >= 100 * MB && KEEP_BYTES <= 1024 * MB && KEEP_ITEMS <= 20,
  `${Math.round(KEEP_BYTES / MB)}MB and ${KEEP_ITEMS} items — a minute of phone`
  + ' video is tens of megabytes, so a count alone would let twelve files be'
  + ' most of a browser’s quota');

ok('  and one file may not be the whole budget',
  MOST_ONE > 0 && MOST_ONE <= KEEP_BYTES / 2,
  `${Math.round(MOST_ONE / MB)}MB — a file bigger than that could only be filed`
  + ' by evicting everything else, and would then be the only thing on a shelf'
  + ' meant to hold a working set');

/* ── What eviction takes, and what it never takes ──────────────────────── */

const full = [item('a', 100, '1'), item('b', 100, '2'), item('c', 100, '3')];

ok('a new file pushes the oldest one off when the shelf is full',
  roomFor(full, item('d', 150, '4')).drop.map((one) => one.id).join() === 'a',
  JSON.stringify(roomFor(full, item('d', 150, '4')).drop.map((one) => one.id)));

ok('  and keeps pushing until it fits',
  roomFor(full, item('d', 250, '4')).drop.map((one) => one.id).join() === 'a,b',
  JSON.stringify(roomFor(full, item('d', 250, '4')).drop.map((one) => one.id)));

ok('a starred file is never the one that goes',
  roomFor([item('a', 100, '1', true), item('b', 100, '2'), item('c', 100, '3')],
    item('d', 150, '4')).drop.map((one) => one.id).join() === 'b',
  'the same bargain `makes.ts` and `assets.ts` strike, in the same words, so'
  + ' there is one rule to learn');

ok('  even when everything else is starred too',
  roomFor([item('a', 300, '1', true), item('b', 300, '2', true)], item('c', 100, '3'))
    .drop.length === 0,
  'the loop has to stop rather than take one anyway — a shelf that deletes a'
  + ' starred file under pressure is a shelf that breaks its own promise at'
  + ' exactly the moment somebody was relying on it');

ok('the file arriving is never the one dropped to make room for it',
  !roomFor(full, item('d', 150, '4')).drop.some((one) => one.id === 'd')
  && roomFor(full, item('d', 150, '4')).keep[0]?.id === 'd',
  'a loop that could pick the arriving item would delete what it was asked to'
  + ' keep, and the person would watch a file they just chose disappear');

ok('bringing the same file again replaces it rather than doubling it',
  roomFor(full, { ...item('b', 100, '5') }).keep.filter((one) => one.id === 'b').length === 1,
  'and it moves to the front, because choosing it again is a use');

ok('nothing is dropped while there is room',
  roomFor([item('a', 10, '1')], item('b', 10, '2')).drop.length === 0
  && roomFor([item('a', 10, '1')], item('b', 10, '2')).keep.length === 2,
  'the common case, and the one a rule about eviction can quietly break');

ok('the count is a fence as well as the bytes',
  roomFor(
    Array.from({ length: KEEP_ITEMS }, (_, at) => item(`x${at}`, 1, '1')),
    item('new', 1, '9'),
  ).drop.length === 1,
  `${KEEP_ITEMS} tiny files is nothing in bytes and still a strip nobody can`
  + ' pick from');

ok('what is used adds up to what is on it',
  usedBytes(full) === 300 * MB,
  `${Math.round(usedBytes(full) / MB)}MB — the line that says how full it is`);

/* ── The details taken off a file ──────────────────────────────────────── */

const file = { type: 'audio/mpeg', size: 4 * MB } as Blob;

ok('a filed thing keeps its name without the extension',
  broughtFrom(file, 'audio', 'My Song.mp3', 12).name === 'My Song',
  'the same thing `bringIn` does for a clip, so a file reads the same on the'
  + ' shelf and on the clock');

ok('  and a length only when one could be measured',
  broughtFrom(file, 'audio', 'x.mp3', Number.NaN).seconds === 0
  && broughtFrom(file, 'audio', 'x.mp3', 12).seconds === 12,
  'NaN on a strip is "NaNs" under a name');

ok('  and falls back to a name rather than an empty one',
  broughtFrom(file, 'audio', '.mp3', 1).name === 'untitled',
  'a blank row is a row nobody can tell from the next');

/* ── Where it lives ────────────────────────────────────────────────────── */

const shelf = withoutComments(readFileSync('app/lib/brought.ts', 'utf8'));

ok('the bytes go to the store the songs are already in',
  /from '\.\/library'/.test(shelf) && /putAudio\(one\.id, blob\)/.test(shelf),
  'a second database is a second thing to clear, a second thing counted'
  + ' against the quota and a second place to look when something is missing');

ok('  and a dropped file takes its bytes with it',
  /for \(const gone of drop\) await deleteAudio\(gone\.id\)/.test(shelf),
  'an orphan blob in IndexedDB is invisible and still counts against the'
  + ' quota, which is the worst kind of leak — `assets.ts` learnt that first');

ok('  and nothing puts a video in localStorage',
  !/dataUrl/.test(shelf) || !/localStorage\.setItem\(KEY, JSON\.stringify\(all\)\)[\s\S]{0,200}dataUrl/.test(shelf),
  'a data URL of a video is the video, in a string, in about five megabytes'
  + ' of room');

ok('a save answers rather than throws',
  /Promise<Filed>/.test(shelf) && /return 'too-big'/.test(shelf) && /return 'full'/.test(shelf),
  'too big and no room left need different sentences, and a thrown error up a'
  + ' click handler is neither');

if (bad) {
  console.error(`\ncheck:brought — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:brought — the shelf is capped in bytes, drops the oldest unstarred'
  + ' thing and never a starred one, never drops what it was asked to keep,'
  + ' and takes a file’s bytes with its details.',
);

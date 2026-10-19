/**
 * A child's playlists keep their rules.
 *
 *   npm run check:kidsplaylists
 *
 * The owner, 19 October 2026: *"Mens moet in kids room ook playlists kan
 * create."* `lib/kidsplaylists.ts` holds the rules the screen leans on:
 * names only from the sticker list, a second list of the same name numbered,
 * a ceiling on lists and on songs, songs that left the shelf passed over,
 * and storage read back without trusting it.
 */
import {
  MOST_IN_LIST, MOST_LISTS, NAMES, listName, moved, newList, order, playable, pruned, readLists, toggled,
  type Playlist,
} from '../app/lib/kidsplaylists';

let bad = 0;
const ok = (label: string, pass: boolean, detail = ''): void => {
  console.log(`  ${pass ? 'ok  ' : 'NOT '} ${label}${pass || !detail ? '' : ` — ${detail}`}`);
  if (!pass) bad += 1;
};

ok('every sticker has a name in both languages', NAMES.every((one) => one.emoji && one.en && one.af));

const first = newList([], 'dance', 1)!;
ok('a new list is empty and named from the stickers', first.songs.length === 0 && first.name === 'dance' && first.number === 1);
ok('  and says its name in each language', listName(first, 'en') === '🕺 Dance party' && listName(first, 'af') === '🕺 Danspartytjie', listName(first, 'af'));
const second = newList([first], 'dance', 2)!;
ok('a second list of the same name is numbered', second.number === 2 && listName(second, 'en') === '🕺 Dance party 2', listName(second, 'en'));
const typed = newList([], 'my secret name', 3)!;
ok('a name that is not a sticker is not kept', NAMES.some((one) => one.id === typed.name), typed.name);
let full: Playlist[] = [];
for (let i = 0; i < MOST_LISTS; i += 1) full = [newList(full, 'happy', i)!, ...full];
ok(`no more than ${MOST_LISTS} lists`, newList(full, 'happy', 99) === null);

let list = toggled(toggled(toggled(first, 'a'), 'b'), 'c');
ok('songs go in, in the order they were tapped', list.songs.join() === 'a,b,c');
ok('tapping again takes one out', toggled(list, 'b').songs.join() === 'a,c');
ok('a song moves up', moved(list, 'c', -1).songs.join() === 'a,c,b');
ok('  and the ends stay put', moved(list, 'a', -1) === list && moved(list, 'c', 1) === list);
let long = first;
for (let i = 0; i < MOST_IN_LIST + 5; i += 1) long = toggled(long, `s${i}`);
ok(`no more than ${MOST_IN_LIST} songs in a list`, long.songs.length === MOST_IN_LIST);

const shelf = [{ id: 'c' }, { id: 'a' }];
ok('a song that left the shelf is passed over', playable(list, shelf).map((one) => one.id).join() === 'a,c');
ok('  and taken out when the list is tidied', pruned(list, ['a', 'c']).songs.join() === 'a,c');
ok('  a list with nothing gone is left as it is', pruned(list, ['a', 'b', 'c']) === list);

ok('in order, the list plays in its own order', order(4, false).join() === '0,1,2,3');
const seq = [0.9, 0.1, 0.5];
let k = 0;
const mixed = order(4, true, () => seq[k++ % seq.length]);
ok('mixed up, every song still plays once', mixed.slice().sort().join() === '0,1,2,3' && mixed.join() !== '0,1,2,3', mixed.join());

ok('storage that is not lists reads as none', readLists('{"x":1}').length === 0 && readLists('not json').length === 0 && readLists(null).length === 0);
const back = readLists(JSON.stringify([{ id: 'l', name: 'bed', number: 'x', songs: ['a', 3, 'b'], made: 5 }, { nope: true }]));
ok('lists read back are cleaned, not trusted', back.length === 1 && back[0].number === 1 && back[0].songs.join() === 'a,b', JSON.stringify(back));

if (bad) {
  console.error(`\ncheck:kidsplaylists — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:kidsplaylists — a child names a list from the stickers, fills it, orders it, and plays it.');

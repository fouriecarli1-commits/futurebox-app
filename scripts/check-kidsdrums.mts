/**
 * check:kidsdrums — the drum game's rules, held without a browser.
 *
 * The owner, 19 October 2026: *"Daar moet lekker musiek met elektric guitar
 * byvoorbeeld speel, en die push van die buttons is die dromme vir die liedjie
 * en hou dan die beat. Onthou die awards wat kinders wen met elke try."*
 * `audit/kidsdrums.mjs` plays it; this holds the rules it plays by.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import {
  AWARDS, DRUM_SONGS, EIGHTHS, GOOD_MS, MOST_AWARDS, NO_DRUMS, PERFECT_MS, afterTry, awardFor, judge, noteFor, readDrums, starsFor,
} from '../app/lib/kidsdrums.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('three songs, each with a guitar part', DRUM_SONGS.length >= 3 && DRUM_SONGS.every((one) => one.chords.length && one.strum.some(Boolean)));
const band = withoutComments(readFileSync('app/lib/kidsband.ts', 'utf8'));
const bandBody = band.slice(band.indexOf('export function startBand'), band.indexOf('export function clock'));
ok('  through a fuzz, with a bass — and no drums in the band: the child is the drummer',
  /sawtooth/.test(bandBody) && /createWaveShaper/.test(band) && /triangle/.test(bandBody) && !/playSound\(/.test(bandBody));
for (const song of DRUM_SONGS) {
  const sizes = song.units.map((one) => one.notes.length);
  ok(`${song.id}: each unit asks a little more than the one before`, sizes.every((n, i) => i === 0 || n >= sizes[i - 1]), sizes.join(','));
  ok(`${song.id}: every note is inside the song`, song.units.every((unit) => unit.notes.every((note) => note.at >= 0 && note.at < EIGHTHS)));
}

ok('a press near the line is perfect, a little off is good, far off is a miss',
  judge(PERFECT_MS - 1) === 'perfect' && judge(-(GOOD_MS - 1)) === 'good' && judge(GOOD_MS + 50) === 'miss');
const notes = [{ lane: 'kick' as const, at: 0 }, { lane: 'snare' as const, at: 2 }, { lane: 'kick' as const, at: 4 }];
ok('a press counts for the nearest note on its own drum only',
  noteFor(notes, new Set(), 'kick', 3.9, 300)?.index === 2 && noteFor(notes, new Set(), 'snare', 0, 300) === null);
ok('  and a note already played is not played twice', noteFor(notes, new Set([0]), 'kick', 0.1, 300) === null);

const none = { perfect: 0, good: 0, total: 16, streak: 0 };
const great = { perfect: 15, good: 1, total: 16, streak: 16 };
ok('every try wins an award, even one that hit nothing',
  awardFor(none, false, false, 1).id === 'brave' && awardFor(none, false, false, 2).id === 'again');
ok('  and a great try wins a great one', starsFor(great) === 3 && ['rockstar', 'perfect', 'band'].includes(awardFor(great, true, false, 3).id));
ok('  and every award has words', AWARDS.every((one) => one.icon && one.says[1]));

const song = DRUM_SONGS[0];
const first = afterTry(NO_DRUMS, song, 1, great, 1);
ok('a good try opens the next unit, and the award is kept', first.unlocked && first.kept.open[song.id] === 2 && first.kept.awards.length === 1);
const again = afterTry(first.kept, song, 1, none, 2);
ok('  a missed try keeps what was opened, and still wins one', !again.unlocked && again.kept.open[song.id] === 2 && again.kept.awards.length === 2);
ok('  and playing an earlier unit well does not skip a unit', !afterTry({ ...first.kept, open: { [song.id]: 3 } }, song, 1, great, 3).unlocked);
const messy = readDrums({ open: { rock: 99, surf: -4 }, best: { 'rock:1': 7, nonsense: 2 }, awards: [{ id: 'brave', at: 1 }, { id: 'fake', at: 2 }], tries: 'x' });
ok('what is read back off the phone is made sensible',
  messy.open.rock === song.units.length && messy.open.surf === 1 && messy.best['rock:1'] === 3 && !('nonsense' in messy.best) && messy.awards.length === 1 && messy.tries === 0);
ok('  and the awards shelf is bounded', readDrums({ awards: Array.from({ length: 200 }, (_, i) => ({ id: 'brave', at: i })) }).awards.length === MOST_AWARDS);

const room = withoutComments(readFileSync('app/components/KidsRoom.tsx', 'utf8'));
ok('the game is in Studio Games & Beats', /tab === 'games'[\s\S]{0,1200}<KidsDrumGame/.test(room));
ok('Studio Games & Beats is the door under Easy Editing', before(room, "id: 'edit'", "id: 'games'") && before(room, "id: 'games'", "id: 'quiz'"));

if (bad) {
  console.error(`\ncheck:kidsdrums — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:kidsdrums — a guitar band with no drums, units that ask a little more each time, fair judging, and an award for every try.');

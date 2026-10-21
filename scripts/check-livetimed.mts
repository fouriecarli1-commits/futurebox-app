/**
 * A song in the live channel carries the second each line is sung, and the
 * room lights the words on those seconds, in the booth's neon.
 *
 * The owner, 21 October 2026: *"Wanneer iemand 'n liedjie na die live channel
 * post, moet dit betaald standaard die liedjie eers luister, om die lyrics
 * presies op die image te kry … die live se woorde op die prente, se
 * glowiness net soos in probooth se recording."*
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const { timedParts, cleanTimes, linesFromParts } = await import('../app/lib/livetimed.ts');
const heard = [
  { text: 'Die son sak laag', section: 'Verse 1', opensSection: true, start: 12, end: 15.5 },
  { text: 'Oranje strepe', section: 'Verse 1', opensSection: false, start: 16, end: 19 },
  { text: 'Huis toe', section: 'Chorus', opensSection: true, start: 36, end: 39.25 },
];
const parts = timedParts(heard);
ok('measured lines go back into the sections the room reads', parts.length === 2 && parts[0].lines.length === 2 && parts[1].name === 'Chorus');
ok('  each with the second every line starts and ends', JSON.stringify(parts[0].at) === '[12,16]' && JSON.stringify(parts[1].end) === '[39.25]');
const back = linesFromParts(parts) ?? [];
ok('and the room reads them back to the same seconds', back.length === 3 && back[2].start === 36 && back[0].end === 15.5);
ok('a post from before, with no times, falls back to the even spread', linesFromParts([{ name: 'V', lines: ['a'], seconds: 10 }]) === null);
ok('times that do not line up one to one with the lines are not kept', cleanTimes({ at: [1, 2], end: [1.5] }, 2) === null);
ok('  nor times that run backwards', cleanTimes({ at: [5, 2], end: [6, 3] }, 2) === null);
ok('  nor a second past the longest a song may be', cleanTimes({ at: [5000], end: [5001] }, 1) === null);

const route = read('app/api/live/route.ts');
ok('the room keeps the times a post arrives with, cleaned, and only while they still line up',
  /lines\.length === sent\.length\s*\?\s*cleanTimes\(/.test(route) && /\.\.\.\(times \?\? \{\}\)/.test(route));

const time = read('app/lib/lyrictime.ts');
ok('posting listens with the paid rungs, and reuses only an answer that came from listening',
  /export async function listenedFor/.test(time) && /before\.how === 'aligned' \|\| before\.how === 'heard'/.test(time));

const channel = read('app/components/LiveChannel.tsx');
const posting = read('app/components/PostToLive.tsx');
ok('both ways of posting a song listen first, on by default, with the price on it',
  /useState\(true\)/.test(channel) && /wordsForRoom\(track, listenFirst/.test(channel) && /data-postlisten/.test(channel)
  && /useState\(true\)/.test(posting) && /wordsForRoom\(track, listenFirst/.test(posting) && /data-postlisten/.test(posting));
ok('  and a post that could not be listened to says so', /live\.notListened/.test(channel) && /live\.notListened/.test(posting));

const screen = read('app/components/RoomScreen.tsx');
ok('the room plays the words on the measured seconds when the post has them', /linesFromParts\(plan\) \?\?/.test(screen));
ok('  and the line being sung lights up in the booth\'s neon sweep', /now \? <Swept line=\{line\} at=\{along\} \/>/.test(screen));
ok('the full-screen room sits above the tab bar, as the other full screens do', /fixed inset-0 z-\[100\]/.test(screen));

if (failures) {
  console.error(`\ncheck:livetimed — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:livetimed — a song in the room carries when each line is sung, and lights it then.');

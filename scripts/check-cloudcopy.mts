/**
 * The cloud keeps an MP3 of a WAV, and nothing else is touched.
 *
 *   npm run check:cloudcopy
 *
 * The third part of the growth plan (`lib/cloudcopy.ts`): a booth mixdown or
 * a kids' reading crosses to the account as a 320 kbps MP3, a fifth the size.
 * This holds the two things that would quietly undo it — a WAV type the test
 * no longer recognises, and an upload that sends the original blob — and the
 * one that would do harm: shrinking something that is not a WAV.
 */
import { readFileSync } from 'node:fs';
import { CLOUD_KBPS, shrinksForCloud } from '../app/lib/cloudcopy';

let bad = 0;
const ok = (label: string, pass: boolean): void => {
  console.log(`  ${pass ? 'ok  ' : 'NOT '} ${label}`);
  if (!pass) bad += 1;
};

ok('a WAV is shrunk, by every name browsers give it',
  ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/vnd.wave', 'AUDIO/WAV', 'audio/wav; codecs=1'].every(shrinksForCloud));
ok('anything else is kept as it is',
  ['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'video/mp4', 'image/png', '', 'application/octet-stream'].every((type) => !shrinksForCloud(type)));
ok('at the most an MP3 holds', CLOUD_KBPS === 320);

const strip = (path: string): string => readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const cloud = strip('app/lib/cloud.ts');
ok('a song is shrunk before it is sent', /const kept = await cloudCopyOf\(audio\)/.test(cloud)
  && /\.upload\(audioPath\(account\.id, track\.id\), kept,/.test(cloud));
const shelf = strip('app/lib/cloudshelf.ts');
ok('a shelf file is shrunk before it is sent', /const blob = await cloudCopyOf\(file\.blob\)/.test(shelf)
  && /\.upload\(path, blob,/.test(shelf));
const copy = strip('app/lib/cloudcopy.ts');
ok('a copy that is not smaller, or fails, is the original', /mp3\.size < audio\.size \? mp3 : audio/.test(copy) && /catch \{\s*return audio;/.test(copy));

if (bad) {
  console.error(`\ncheck:cloudcopy — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:cloudcopy — the cloud keeps a 320 kbps MP3 of every WAV, and the device keeps the WAV.');

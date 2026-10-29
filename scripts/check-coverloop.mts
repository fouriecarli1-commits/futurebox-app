/**
 * A song's cover, moving: the engine, the loop, the price, and where it plays.
 * The owner, 29 October 2026: "Gaan aan met die moving cover."
 */
import { readFileSync } from 'node:fs';
import { LOOP_MODEL, LOOP_SECONDS, loopInput, loopPath } from '../app/lib/coverloop.ts';
import { CREDITS } from '../app/lib/credits.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('the engine is fal.ai\'s own, the one Wake it up already uses', LOOP_MODEL === 'fal-ai/ltx-2.3/image-to-video/fast');
const input = loopInput('https://example.test/cover.png');
ok('the cover is the first frame and the last, so it loops', input.image_url === input.end_image_url && input.image_url === 'https://example.test/cover.png');
ok('  six seconds, no sound of its own', input.duration === LOOP_SECONDS && LOOP_SECONDS === 6 && input.generate_audio === false);
ok('kept beside the cover', loopPath('o', 't') === 'o/t.cover.mp4');
ok('priced like a woken photo, for the same work', CREDITS.coverLoop === CREDITS.alive);

const route = withoutComments(readFileSync('app/api/cover/loop/route.ts', 'utf8'));
ok('the song has to be theirs, and have a cover', /\.from\('tracks'\)\.select\('id'\)\.eq\('owner', caller\.id\)/.test(route) && /Give the song a cover first/.test(readFileSync('app/api/cover/loop/route.ts', 'utf8')));
ok('charged before the engine is asked, given back when it fails', /await charge\([\s\S]{0,200}falQueue\(/.test(route) && /paid\.refund\(\)/.test(route) && /await giveBack\(ticket\)/.test(route));
ok('the clip is copied into our storage before it is shown', /\.upload\(loopPath\(caller\.id, ticket\.track\)/.test(route));

const sleeve = readFileSync('app/components/Sleeve.tsx', 'utf8');
ok('the cover panel says the price on the button', /cover\.loopGo[\s\S]{0,80}creditsSaid\(CREDITS\.coverLoop/.test(sleeve));
ok('  asks the two yeses first', /if \(!yes && !agreed\) \{ setAskYes\(true\)/.test(sleeve) && /<YesSheet/.test(sleeve));
ok('  and plays the loop in place of the still', /data-coverloopplays/.test(sleeve));
ok('the Live room plays it on the post', /data-livecoverloop/.test(readFileSync('app/components/LiveChannel.tsx', 'utf8'))
  && /coverLoop: post\.kind === 'track'/.test(readFileSync('app/api/live/route.ts', 'utf8')));

if (bad) {
  console.error(`\ncheck:coverloop — ${bad} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:coverloop — a cover moves in a seamless loop, priced on its button, kept, and played where the song is.');

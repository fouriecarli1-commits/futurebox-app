/**
 * A member's own picture is looked at before strangers see it, or before an
 * engine is paid to work on it: step 0 of the fal.ai plan.
 */
import { readFileSync } from 'node:fs';
import { judged, probabilityOf, SCREEN_LINE, SCREEN_MODEL } from '../app/lib/server/picturescreen.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

ok('the screen is fal.ai\'s own model', SCREEN_MODEL === 'fal-ai/imageutils/nsfw');
ok('  and its fields are written down', readFileSync('docs/FAL-SKEMAS.md', 'utf8').includes('`fal-ai/imageutils/nsfw`'));
ok('the answer is read as a number from 0 to 1, and nothing else',
  probabilityOf({ nsfw_probability: 0.42 }) === 0.42 && probabilityOf({ nsfw_probability: '0.9' }) === null
  && probabilityOf({}) === null && probabilityOf(null) === null && probabilityOf({ nsfw_probability: 3 }) === null);
ok('at the line a picture is refused, under it it goes on',
  judged(SCREEN_LINE).state === 'refused' && judged(SCREEN_LINE - 0.01).state === 'clear' && judged(0).state === 'clear');

const art = withoutComments(readFileSync('app/api/artmarket/route.ts', 'utf8'));
ok('a work is looked at before it hangs on the wall', /screenPicture\([\s\S]{0,3000}\.from\('art_works'\)\s*\.insert/.test(art));
const creator = withoutComments(readFileSync('app/api/creator/route.ts', 'utf8'));
ok('a new profile picture is looked at, and taken away when refused',
  /screenPicture\(looked\.signedUrl, 'profile picture'\)[\s\S]{0,200}\.remove\(\[avatar\]\)/.test(creator));
const become = withoutComments(readFileSync('app/api/become/route.ts', 'utf8'));
ok('a photo for an engine is looked at before a credit is spent', /screenPicture\(picture[\s\S]{0,300}const paid = await charge\(/.test(become));
const channel = readFileSync('app/components/Channel.tsx', 'utf8');
ok('the channel says why a picture was not kept', /setPhotoSaid\(failed\)/.test(channel) && /data-photosaid/.test(channel));

if (bad) {
  console.error(`\ncheck:picturescreen — ${bad} problem(s).`);
  process.exit(1);
}
console.log('\ncheck:picturescreen — the art wall, profile pictures and engine photos are looked at first.');

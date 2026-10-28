/**
 * What fal.ai is allowed to see and keep, held in the code that calls it.
 *
 * `docs/FAL-TERME.md` is the reading of their terms; this is the part of it
 * that lives in code, so that a tidy-up cannot quietly undo it: the two
 * headers that stop fal.ai keeping a member's clip, no partner model (a
 * partner sends the clip on to another company), the key only on the
 * server, and the two yeses the route will not go without.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { FAL_MODELS, FAL_KEEP_SECONDS, maskUrlOf } from '../app/lib/server/fal.ts';
import { BECOMES, becomeInput } from '../app/lib/becomes.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const lib = readFileSync('app/lib/server/fal.ts', 'utf8');
const route = readFileSync('app/api/footage/route.ts', 'utf8');
const screen = readFileSync('app/components/FootageEngine.tsx', 'utf8');

ok('fal.ai does not store the request and its answer', /'X-Fal-Store-IO': '0'/.test(lib),
  'without it fal.ai keeps both for 30 days for its dashboard');
ok('and the finished clip deletes itself within the hour',
  /X-Fal-Object-Lifecycle-Preference/.test(lib) && FAL_KEEP_SECONDS > 0 && FAL_KEEP_SECONDS <= 3600,
  'without it a clip on their CDN is kept until the account says otherwise, which is forever');
ok('and a job is never run twice behind our back', /'X-Fal-No-Retry': '1'/.test(lib));
ok('only models fal.ai runs itself',
  Object.values(FAL_MODELS).every((id) => id.startsWith('fal-ai/')),
  `${Object.values(FAL_MODELS).join(', ')} — a partner model sends the clip on to another company (API terms, section 2)`);
ok('the key is read on the server and nowhere on the screen',
  /process\.env\.FAL_KEY/.test(lib) && !/FAL_KEY/.test(screen),
  'their API terms forbid exposing it to a member');
ok('the route refuses without both yeses',
  /body\.abroad !== true \|\| body\.adult !== true/.test(route),
  'the clip leaves South Africa (POPIA s72(1)(b)) and fal.ai needs every user to be 18');
ok('and the screen asks both before the button is live',
  /data-footageabroad/.test(screen) && /data-footageadult/.test(screen) && /abroad && adult/.test(screen));
ok('what to take out is screened as footage', /guard\(request, words, 'footage', caller\)/.test(route));
ok('our copy of the clip is deleted when the job ends', /storage\.from\(BUCKET\)\.remove\(\[path\]\)/.test(route));
ok('a failed job gives the credits back once', /reason', 'refund'\)/.test(route) && /await refund\(/.test(route));

/* ── Bring to life (`lib/becomes.ts`, `app/api/become`), 27 October 2026 ── */
const become = readFileSync('app/api/become/route.ts', 'utf8');
const bench = readFileSync('app/components/BecomeBench.tsx', 'utf8');
ok('every make is a model fal.ai runs itself',
  Object.values(BECOMES).every((one) => one.model.startsWith('fal-ai/')),
  Object.values(BECOMES).map((one) => one.model).join(', '));
ok('a make refuses without both yeses', /body\.abroad !== true \|\| body\.adult !== true/.test(become));
ok('  and the screen asks both, once, before the first press', /data-becomeabroad/.test(bench) && /data-becomeadult/.test(bench) && /abroad && adult/.test(bench));
/* No kids screen draws the engine presses: fal.ai needs every user to be
   18. (Refusing every account that HAS a kids room refused the parent in
   the Photo Editor, 27 October 2026, so the line is drawn at the screens.) */
const kidsScreens = readdirSync('app/components').filter((name) => /^Kids/i.test(name))
  .map((name) => readFileSync(`app/components/${name}`, 'utf8'));
const kidsPages = readdirSync('app/kids', { recursive: true }).filter((name) => /\.tsx$/.test(String(name)))
  .map((name) => readFileSync(`app/kids/${name}`, 'utf8'));
ok('no kids screen reaches the engine presses (Bring to life, the Video Editor\u2019s two)',
  [...kidsScreens, ...kidsPages].every((code) => !/BecomeBench|FootageEngine|\/api\/become|\/api\/footage|PostStudio|VideoEditor/.test(code)),
  'fal.ai needs every user to be 18');
/* Pending Enterprise Ready (fal.ai, 27 October 2026): fal.ai may train on
   what is sent to these, so the app may not call them anywhere. */
const PENDING = ['florence-2-large/caption', 'image-preprocessors/depth-anything/v2', 'fal-ai/birefnet/v2'];
const appFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((one) => (
  one.isDirectory() ? appFiles(`${dir}/${one.name}`) : /\.(ts|tsx)$/.test(one.name) ? [`${dir}/${one.name}`] : []
));
const callsPending = appFiles('app').filter((file) => PENDING.some((model) => readFileSync(file, 'utf8').includes(model)));
ok('no model fal.ai marks Pending Enterprise Ready is called anywhere in the app', callsPending.length === 0, callsPending.join(', '));
ok('a sticker is cut from the MASK, never the preview (which is the whole photo again)',
  /spec\.gives === 'mask' \? maskUrlOf\(ran\.data\)/.test(become)
  && maskUrlOf({ image: { url: 'https://v3.fal.media/preview.png' }, masks: [{ url: 'https://v3.fal.media/mask.png' }] }) === 'https://v3.fal.media/mask.png'
  && maskUrlOf({ image: { url: 'https://v3.fal.media/preview.png' }, masks: [] }) === null);
const tapOnly = becomeInput('sticker', 'data:image/jpeg;base64,AA', { tap: { x: 10.4, y: 20.6 } });
ok('a tap with no words sends an EMPTY prompt, never none (none means "wheel", fal.ai support, 28 October 2026)',
  tapOnly.prompt === '' && JSON.stringify(tapOnly.point_prompts) === '[{"x":10,"y":21,"label":1}]');
ok('every call keeps nothing past the hour (X-Fal-Object-Lifecycle-Preference, as fal.ai support named it)',
  /'X-Fal-Object-Lifecycle-Preference': JSON\.stringify\(\{ expiration_duration_seconds: FAL_KEEP_SECONDS \}\)/.test(readFileSync('app/lib/server/fal.ts', 'utf8')) && FAL_KEEP_SECONDS === 3600);
ok('a make\'s words are screened as footage is', /guard\(request, words, 'footage', caller\)/.test(become));
ok('a make that fails gives the credits back once', /await paid\.refund\(\)/.test(become) && /reason', 'refund'\)/.test(become));
ok('the key stays off the screen here too', !/FAL_KEY/.test(bench));

console.log(bad === 0
  ? '\ncheck:falwire — fal.ai keeps nothing past the hour, sees only fal.ai\'s own models, never the key, and nothing goes without both yeses.'
  : `\ncheck:falwire — ${bad} failing.`);
process.exit(bad === 0 ? 0 : 1);

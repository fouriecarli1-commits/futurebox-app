/**
 * What fal.ai is allowed to see and keep, held in the code that calls it.
 *
 * `docs/FAL-TERME.md` is the reading of their terms; this is the part of it
 * that lives in code, so that a tidy-up cannot quietly undo it: the two
 * headers that stop fal.ai keeping a member's clip, no partner model (a
 * partner sends the clip on to another company), the key only on the
 * server, and the two yeses the route will not go without.
 */
import { readFileSync } from 'node:fs';
import { FAL_MODELS, FAL_KEEP_SECONDS } from '../app/lib/server/fal.ts';

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

console.log(bad === 0
  ? '\ncheck:falwire — fal.ai keeps nothing past the hour, sees only fal.ai\'s own models, never the key, and nothing goes without both yeses.'
  : `\ncheck:falwire — ${bad} failing.`);
process.exit(bad === 0 ? 0 : 1);

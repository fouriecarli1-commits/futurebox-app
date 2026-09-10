/**
 * The one thing the app promised and could not do.
 *
 * §9 of `docs/DIENSTE-EN-KOSTE.md` called singing voice conversion the gap
 * between a song made here and somebody's own voice, and the Pro Booth has
 * carried a warning under its "Sing it" button saying the model behind it is
 * built for speech. Carli chose Kits.AI on 7 September 2026 and this is the
 * wiring of it.
 *
 * ── Why this file is half assertions about behaviour ─────────────────────
 *
 * Because half of what is in `lib/server/kits.ts` could not be checked against
 * the real service: arpeggi.io is blocked from the machine this was built on.
 * The half she sent me — the POST that starts a job — is safe. The half that
 * reads the answer back is inferred, and inferred code that nobody exercises
 * is a guess with a comment on it.
 *
 * So the readers are actually run, against answers shaped the several ways
 * this kind of API answers, including the ones that would be expensive to get
 * wrong: a queued job read as a finished one (she is charged and handed
 * nothing), and the file she uploaded handed back to her as the conversion.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { audioUrlIn, idIn, namedModels, outputIn, safeModelId, stateIn } from '../app/lib/server/kits.ts';
import { CREDITS } from '../app/lib/credits.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const lib = read('app/lib/server/kits.ts');
const route = read('app/api/voice/sing/route.ts');
const booth = read('app/components/ProBooth.tsx');
const state = read('app/api/voice/route.ts');

/* ── 1. The half that is hers, sent exactly as she sent it ──────────────── */

ok(
  'the conversion goes to the endpoint she gave',
  lib.includes("https://arpeggi.io/api/kits/v1") && /voice-conversions/.test(lib),
);
ok(
  'with a bearer key, which is what their own page says',
  /Authorization: `Bearer \$\{key\(\)\}`/.test(lib),
);
ok(
  'and as a multipart form with their two field names',
  /form\.append\('voiceModelId'/.test(lib) && /form\.append\('soundFile'/.test(lib),
  'their Quick Start says every POST that starts a job is multipart',
);

/* ── 2. The readers, run rather than described ──────────────────────────── */

ok('a job id is found under any of the usual names', idIn({ id: 42 }) === '42' && idIn({ jobId: 'ab-9' }) === 'ab-9');
ok('and its absence is null, not a guess', idIn({ nothing: true }) === null);

/* The expensive one. A job that is queued must not read as finished: she has
   already been charged by then, and "done with no file" is the shape that
   hands her nothing and keeps the credits. */
ok('a queued job is not finished', stateIn({ status: 'queued' }) === 'running');
ok('nor is a word nothing here has ever seen', stateIn({ status: 'moderating' }) === 'running');
ok('an answer with no status at all is not finished', stateIn({}) === 'running');
ok('success in any of its spellings is', stateIn({ status: 'success' }) === 'done' && stateIn({ status: 'COMPLETED' }) === 'done');
ok('and a failure is a failure', stateIn({ status: 'error' }) === 'failed' && stateIn({ status: 'job_failed' }) === 'failed');

/* The other expensive one. Kits' answer can carry the file that was sent up
   beside the one that came back; handing her back her own take, billed, would
   look exactly like a conversion that changed nothing. */
ok(
  'the input she uploaded is never mistaken for the output',
  audioUrlIn({
    inputFileUrl: 'https://arpeggi.io/in/take.wav',
    outputFileUrl: 'https://arpeggi.io/out/sung.wav',
  }) === 'https://arpeggi.io/out/sung.wav',
);
ok(
  'and the full-quality file wins over the preview',
  audioUrlIn({
    lqAudioUrl: 'https://arpeggi.io/out/small.mp3',
    outputFileUrl: 'https://arpeggi.io/out/sung.wav',
  }) === 'https://arpeggi.io/out/sung.wav',
);
ok('an answer with no file in it is null', audioUrlIn({ status: 'running' }) === null);
ok(
  'and a plain http address is refused',
  audioUrlIn({ outputFileUrl: 'http://arpeggi.io/out/sung.wav' }) === null,
);

/* A model id reaches a URL and a form. Digits only, refused rather than
   stripped — the rule `lib/server/ownedpath.ts` works under. */
ok('a model id that is not digits is refused', safeModelId('1014961/../x') === null && safeModelId('') === null);
ok('and one that is, is kept', safeModelId('1014961') === '1014961');
ok(
  'the named models list drops anything that is not a number',
  (() => {
    process.env.KITS_VOICE_MODELS = '1014961=Carli, rubbish=Nope, 22=Koor';
    const got = namedModels();
    delete process.env.KITS_VOICE_MODELS;
    return got.length === 2 && got[0].name === 'Carli' && got[1].id === '22';
  })(),
);

/* ── 3. The route, held to the same rules as its siblings ───────────────── */

ok(
  'the take arrives as a key in her own folder, never as a URL',
  /audioFrom\(form, request, 'audio'\)/.test(route) && !/form\.get\('url'\)/.test(route),
  'a route that fetched any URL handed to it is an open proxy',
);
ok(
  'the finished file is fetched from Kits’ own answer and from nowhere else',
  /fetchResult\(url\)/.test(lib) && /outputIn\(answer, want\)/.test(lib) && !/fetchResult\([^)]*form/.test(route),
);
/* And the right one of the three files it answers with.

   `outputFileUrl` is the bare converted voice; `recombinedAudioFileUrl` is
   that voice back over the music; `lossyOutputFileUrl` is a smaller, worse
   copy. Somebody pressing "sing this in my voice" on a finished song is asking
   to hear their song, so that path asks for the mix. A Pro Booth lane asks for
   nothing and gets the voice, which is right: the music is already on its own
   lanes. */
ok(
  'a finished song asks for the music back with the voice',
  /form\.append\('want', 'mix'\)/.test(readFileSync('app/components/SingItMine.tsx', 'utf8')),
);
ok(
  'and the lossy copy is never preferred to the real one',
  outputIn({
    outputFileUrl: 'https://arpeggi.io/out/real.wav',
    lossyOutputFileUrl: 'https://arpeggi.io/out/small.mp3',
  }) === 'https://arpeggi.io/out/real.wav',
);
ok(
  'even when their answer lists it first',
  outputIn({
    lossyOutputFileUrl: 'https://arpeggi.io/out/small.mp3',
    outputFileUrl: 'https://arpeggi.io/out/real.wav',
  }) === 'https://arpeggi.io/out/real.wav',
  'a tie on the field name used to be broken by whichever came first',
);
ok(
  'the mix is the recombined file, not the bare voice',
  outputIn({
    outputFileUrl: 'https://arpeggi.io/out/voice.wav',
    recombinedAudioFileUrl: 'https://arpeggi.io/out/with-music.wav',
  }, 'mix') === 'https://arpeggi.io/out/with-music.wav',
);
ok(
  'and a lane gets the bare voice even when a mix is offered',
  outputIn({
    outputFileUrl: 'https://arpeggi.io/out/voice.wav',
    recombinedAudioFileUrl: 'https://arpeggi.io/out/with-music.wav',
  }) === 'https://arpeggi.io/out/voice.wav',
);
/* One job a minute, for the whole account rather than per key — their own
   documented limit, and the reason a second person pressing Sing it in the
   same minute has to be told something true rather than shown a failure. */
ok(
  'the one-a-minute limit is honoured before the request, not only after it',
  /A_MINUTE/.test(lib) && /status: 429/.test(lib),
);
ok('and only over https', /parsed\.protocol !== 'https:'/.test(lib));
ok('the credits are taken before the work', /const paid = await charge\(/.test(route));
ok(
  'and given back when the work fails',
  /if \(!done\.ok\) \{\s*await paid\.refund\(\);/.test(route),
);
ok(
  'the wait is bounded, so a job that never finishes is not an open function',
  /Date\.now\(\) \+ WAIT_MS/.test(route) && /maxDuration = 300/.test(route),
);
ok('it says so plainly when the key is not set', /Singing in your own voice is not switched on/.test(route));

/* ── 4. The room: two engines, each honest about itself ─────────────────── */

ok('the panel offers the singing engine only when it is switched on', /canSing && \(/.test(booth));
ok('and chooses it when it is there', /if \(canSing\) setEngine\('singing'\)/.test(booth));
ok(
  'the speech model keeps its warning',
  booth.includes('pro.singBuilt'),
  'the caveat §80 put on the button',
);
ok('and the singing model has one of its own', booth.includes('pro.singReal'));

/* Both caveats before the money, on the same screen, whichever engine is
   chosen. The whole point of §80 was that being told after the press is being
   told too late, and a second engine is a second chance to get that wrong. */
/* The cost *on this panel*, which means the first one after the caveat — not
   the first in the file. `check:voicechange` carries the same note and the
   same scar: searching from zero finds an earlier panel's price and reports a
   caveat as coming after it while it sits two lines above. */
for (const key of ['pro.singBuilt', 'pro.singReal']) {
  const at = booth.indexOf(key);
  ok(
    `${key} is read before the cost, not after`,
    at !== -1 && booth.indexOf('<Cost', at) !== -1,
    at === -1 ? 'the caveat is not on the panel at all' : 'the price is shown first',
  );
}

ok(
  'the price is the engine’s own, not the other one’s',
  /engine === 'singing' && canSing \? CREDITS\.sing : CREDITS\.voiceChange/.test(booth),
);
ok(
  'and the better engine is not the cheaper one',
  CREDITS.sing >= CREDITS.voiceChange,
  `sing ${CREDITS.sing} against voiceChange ${CREDITS.voiceChange} — people would pick the worse one to save credits`,
);

/* `await` allowed, because the answer stopped being local.

   The list of singing voices is fetched from Kits now rather than read out of
   an environment variable, so the call is asynchronous. What this line is for
   is unchanged: the room is told which engines exist in the same request that
   tells it everything else, rather than finding out afterwards and redrawing
   itself. */
ok(
  'the room is told which engines exist before it draws itself',
  /singing: (await )?singing\([^)]*\)/.test(state),
  'the room finds out which engines exist after it has drawn itself, and redraws',
);
/* The argument is the member, and it is not optional decoration.

   `singing()` took nothing when this line was written. It takes an owner now,
   because the Kits cap is five minutes *each* — so the answer to "can this
   person sing" depends on which person is asking, and a room told the
   account-wide answer would offer the button to somebody who has no minutes
   left. This assertion accepted no argument at all and went red the day the
   per-member cap landed, which is a check calling an improvement a
   regression. It asks for the shape now and this asks for the meaning. */
ok('and told it about the member asking, because the cap is five minutes each',
  /singing\(caller\?\.id \?\? null\)/.test(state),
  'a room told the account-wide answer offers the button to somebody with no minutes left');

/* ── 5. Make a song, the other half of "in Pro Booth en in Make a song" ── */

const mine = read('app/components/SingItMine.tsx');
const make = read('app/components/MakeMusic.tsx');

ok('a finished song can be sung in her own voice from the room it was made in',
  /<SingItMine/.test(make));
ok('and it goes to the singing engine, never the speech one',
  /'\/api\/voice\/sing'/.test(mine) && !/voice\/change/.test(mine));
ok('the result is a new song rather than the old one overwritten',
  /mixOf: \{ source: track\.id \}/.test(mine) && /const id = `t-\$\{Date\.now\(\)\}`/.test(mine));
ok('and the recording says what sang it',
  /models: \[\.\.\.track\.models, 'Kits\.AI singing model'\]/.test(mine),
  'a release whose credits do not name the voice on it is the one thing this must not be');
ok('the whole song goes through storage rather than at the body limit',
  /attach\(form, music, 'audio', 'song\.wav'\)/.test(mine));
ok('whether the engine exists is asked once for the page, not once per song',
  /let asked: Promise<Singing> \| null/.test(mine),
  'twenty songs on a screen must not be twenty requests');
ok('and nothing is drawn at all when it is switched off',
  /if \(!state\?\.configured\) return null;/.test(mine));

/* ── 6. The page that turns the remaining guesses into facts ───────────── */

const setup = read('app/api/kits/setup/route.ts');
const lib2 = lib;

ok('there is a page that asks the account what it actually has',
  /CANDIDATES/.test(setup) && /probe\(/.test(setup));
ok('the candidate list keeps the known endpoint as a control',
  /'voice-conversions',/.test(lib2),
  'if the one endpoint that is known to work fails too, the key is the problem and no other answer means anything');
ok('the page refuses without the shared secret',
  /process\.env\.POST_SECRET/.test(setup) && /return new Response\('no', \{ status: 404 \}\)/.test(setup));
ok('and compares it in constant time, after a length check',
  /timingSafeEqual/.test(setup) && /a\.length !== b\.length/.test(setup));
ok('it reports shapes rather than content',
  /fields\?: string\[\]/.test(lib2) && !/answer,\s*\}\);/.test(setup),
  'a page that gets pasted into a chat must not carry somebody’s audio or account details');
ok('and the key is never in what it answers', !/KITS_API_KEY/.test(setup));

/* The two things the first real run taught it.

   Carli ran the page on 8 September and every real endpoint answered
   `403 {"error":"Free tier users are not allowed to use the api"}`. That is
   not a refused key — it is the key working and the account not paying — and
   it is the exact question the page was built to settle, so it gets its own
   sentence rather than being read as "the key is wrong".

   The same run showed nine of thirteen candidates answering 200 with no
   fields, which looked like nine real endpoints and was their website
   answering an unknown path with a page. A 403 proves a path exists and is
   guarded; a 200 full of HTML proves nothing. */
ok('a plan-shaped refusal is told apart from a wrong key',
  /needsPlan/.test(setup) && /free tier/i.test(setup),
  'the most useful answer this page can give is "the key is fine, pay them"');
ok('and a page from their website is not counted as an endpoint',
  /not an endpoint/.test(lib2) && /content-type/i.test(lib2),
  'a 200 that is HTML looked exactly like a real endpoint that happens to be empty');
ok('the report says which paths are actually real',
  /realPaths/.test(setup) && /one\.status === 403/.test(setup));

/* ── 6b. The month's 400 minutes, and the brake on them ─────────────────── */

const minutes = read('app/lib/server/kitsminutes.ts');
const sing = read('app/api/voice/sing/route.ts');

ok('the plan\u2019s roof is written down as a number, not assumed',
  /KITS_MONTHLY_MINUTES/.test(minutes) && /: 400;/.test(minutes),
  'Kits\u2019 Professional Plan is R640 for 400 download minutes \u2014 unlimited conversion time, not unlimited audio');
ok('the count is shared state, not one instance\u2019s memory',
  /kits_seconds_this_month/.test(minutes) && /admin\(\)/.test(minutes),
  'a brake in local memory is multiplied by however many instances are running; this one is a row in Postgres');
ok('the table and its function exist in SQL',
  /create table if not exists public\.kits_minutes/.test(read('supabase/kits.sql'))
    && /kits_seconds_this_month/.test(read('supabase/kits.sql')));
ok('and the function is not reachable from the browser',
  /revoke all on function public\.kits_seconds_this_month\(\) from public, anon, authenticated/.test(
    read('supabase/kits.sql'),
  ));

ok('singing asks whether there is room before it charges',
  sing.indexOf('await enough(') < sing.indexOf("await charge(") && sing.includes('await enough('),
  'a member turned away by a ceiling they cannot see must not also have paid for the turn');
ok('and the refusal says how much is left',
  /left: room\.left/.test(sing) && /\$\{minutes\} minute/.test(minutes),
  '"come back next month" and "try a shorter take" are different answers, and only the number says which');
/* Found by position rather than by a literal argument list.

   This assertion used to look for the exact string `void note(billed, 'sing'`.
   When `downloadSeconds` arrived the variable was renamed to `spend`, the
   literal stopped matching, and `indexOf` answered -1 — which is less than
   every real position, so the assertion failed rather than passing wrongly.
   That is the good direction to break in, but it had stopped testing the
   order it was written for. A regex for the call keeps it testing that. */
const noteAt = sing.search(/void note\(/);
ok('the spend is written down only after the audio is in hand',
  noteAt > -1 && noteAt > sing.indexOf('if (!done.ok)'),
  'the minutes burn on download, and a conversion that failed downloaded nothing');
/* And the number written down is what came back, not the length of the song.
   The two are the same here — one file — and `downloadSeconds` is what makes
   that a stated fact rather than a coincidence the next route can break. */
ok('and what is written down is the downloaded length, not the song\u2019s',
  /const spend = downloadSeconds\(/.test(sing) && /void note\(spend,/.test(sing),
  'a two-file job downloads twice the audio and must count twice the minutes');
ok('the bookkeeping cannot fail the member\u2019s request',
  /void note\(/.test(sing) && /\(\) => undefined,/.test(minutes));
/* Matched on the fields rather than on the literal `minutes: {`.

   That literal went stale the moment the setup route hoisted the object into
   a `const` so the JSON and the plain-text report could share one read — and
   this assertion sat red through a commit because I ran typecheck and the
   build after that change and not this. Matching a shape rather than a fact
   is how a check fails for a reason that is not the reason it exists. */
ok('the setup page reports where the month stands',
  /minutes:/.test(setup) && /leftMinutes/.test(setup) && /usedMinutes/.test(setup));

/* ── 7. The key stays on the server ─────────────────────────────────────── */

for (const path of [
  'app/components/ProBooth.tsx',
  'app/components/VoiceLab.tsx',
  'app/components/SingItMine.tsx',
  'app/api/voice/route.ts',
]) {
  ok(`${path} never names the key`, !read(path).includes('KITS_API_KEY'));
}

if (failures > 0) {
  console.log(`\ncheck:sing — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:sing — the singing engine is wired, priced, bounded, and honest about which half was guessed.');
}

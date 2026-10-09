/**
 * Where Google's engines are, and that nothing can be billed by asking.
 *
 *   npm run check:google
 *
 * ── The fault this is written against ────────────────────────────────────
 *
 * A URL built wrong answers 404, and a 404 reads as "the model is not
 * available to us". That is an afternoon spent in Model Garden looking for a
 * model that was there all along.
 *
 * So the address shape is held here, against the one thing about this that
 * was MEASURED rather than read. On 8 October 2026, from the machine this app
 * is written on and with no key at all:
 *
 *   regional host   + project/location path  → 401
 *   unregional host + the same path          → 404
 *
 * 401 is the shape being right and only the key being absent. That is worth
 * more than any documentation page, and it is why the region belongs in the
 * host rather than in a parameter.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { CHOSEN, MODELS, addressOf, configured, region } from '../app/lib/server/google.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. The address ───────────────────────────────────────────────────── */

process.env.GOOGLE_PROJECT = 'a-project';
process.env.GOOGLE_REGION = 'us-central1';

const url = addressOf('lyria-002');

ok('the region is in the host, not in a parameter',
  url.startsWith('https://us-central1-aiplatform.googleapis.com/'),
  `${url} — the same path on the unregional host answered 404 while the`
  + ' regional one answered 401, and a wrong region has to fail as a bad'
  + ' address rather than as a missing model');

ok('  and the project and location are both in the path',
  url.includes('/projects/a-project/locations/us-central1/'),
  url);

ok('  and the model is asked to predict',
  url.endsWith('/publishers/google/models/lyria-002:predict'),
  url);

process.env.GOOGLE_REGION = 'europe-west4';
ok('a different region moves the host as well as the path',
  addressOf('x').startsWith('https://europe-west4-aiplatform.googleapis.com/')
  && addressOf('x').includes('/locations/europe-west4/'),
  addressOf('x'));

delete process.env.GOOGLE_REGION;
ok('and an unset region is us-central1 rather than empty',
  region() === 'us-central1' && !addressOf('x').includes('--'),
  `${region()} / ${addressOf('x')} — an empty region builds`
  + ' "https://-aiplatform…", which fails as DNS and not as anything a'
  + ' person could act on');

/* ── 2. Nothing is switched on by accident ────────────────────────────── */

delete process.env.GOOGLE_VERTEX_KEY;
ok('no key means not configured, whatever else is set',
  !configured(),
  'a half-set deployment must read as off rather than as broken');

process.env.GOOGLE_VERTEX_KEY = 'pretend';
delete process.env.GOOGLE_PROJECT;
ok('  and so does a key with no project',
  !configured(),
  'the project is what the spending lands on; a key without one would bill'
  + ' somewhere nobody chose');

/* ── 3. Both of each, because the sources disagree ────────────────────── */

/* Three now, not two: her console shows `lyria-3-pro-preview` for a whole
   song and `lyria-3-clip-preview` for a clip, both on the interactions api,
   beside the older `lyria-002` which really is a publisher model. Counted
   rather than named, so a fourth does not have to be argued with. */
ok('every Lyria her console shows is carried, not one of them picked',
  MODELS.filter((one) => one.what === 'music').length >= 3
  && MODELS.some((one) => one.id === 'lyria-3-clip-preview'),
  MODELS.filter((one) => one.what === 'music').map((one) => one.id).join(', ')
  + ' — a clip and a whole song are different jobs and she has both');

/* Her console shows two real ones — `veo-3.0-generate-001` and
   `veo-3.1-lite-generate-001` — and the app carries a third as a candidate.
   Counted as "more than one and the Lite one among them" rather than pinned
   to a number, because the number moved the moment she looked. */
ok('  and the Veo she can actually see is carried, cheap tier included',
  MODELS.filter((one) => one.what === 'video').length >= 2
  && MODELS.some((one) => one.id === 'veo-3.1-lite-generate-001'),
  MODELS.filter((one) => one.what === 'video').map((one) => one.id).join(', '));

ok('  and the image ones too, where the names are worst of all',
  MODELS.filter((one) => one.what === 'image').length >= 3,
  MODELS.filter((one) => one.what === 'image').map((one) => one.id).join(', ')
  + ' \u2014 on the day Carli chose Nano Banana, Google\u2019s own page, a'
  + ' third-party guide and two Google shutdown notices disagreed about every'
  + ' one of these. One of the shutdown dates had already passed');

ok('  and every one of them says what it is for',
  MODELS.every((one) => one.note.length > 20
    && ['music', 'video', 'image'].includes(one.what)),
  'a list of ids with no note is a list somebody has to look up again');

/* ── The verb, which is the same fault one level down ─────────────────── */

ok('each model carries the verb it actually answers to',
  MODELS.every((one) => !!one.verb),
  'Lyria takes :predict, Veo takes :predictLongRunning because a video is a'
  + ' job rather than an answer, and Nano Banana is a Gemini model and takes'
  + ' :generateContent');

ok('  and they are not all the same one',
  new Set(MODELS.map((one) => one.verb)).size === 3,
  [...new Set(MODELS.map((one) => one.verb))].join(', ')
  + ' \u2014 asking all of them to :predict reports 404 for most of the list'
  + ' and sends somebody hunting for models that were there all along');

ok('  and a video is asked for as a long-running job',
  MODELS.filter((one) => one.what === 'video').every((one) => one.verb === 'predictLongRunning'),
  MODELS.filter((one) => one.what === 'video').map((one) => one.verb).join(', '));

/* The probe used to carry each model's verb, and this held it to that.
   It no longer has a verb to carry: a read has none, which is the point —
   `:predict` is what let the body check answer for the model. The concern
   moves to where a verb is still real, which is the calls that generate. */
const googleLib = withoutComments(readFileSync('app/lib/server/google.ts', 'utf8'));
ok('  and the probe deliberately carries no verb at all',
  !/readAddressOf[\s\S]{0,200}verb/.test(googleLib)
  && !/addressOf\(model, spec\?\.verb/.test(googleLib),
  'a verb on the probe is a generate endpoint, and a generate endpoint is'
  + ' what answered for the body instead of for the model');

/* Music no longer goes through `addressOf` at all — it is not a publisher
   model. What has to stay true is that each engine calls its OWN address:
   music the interactions one, video the long-running publisher one. */
const videoLib = withoutComments(readFileSync('app/lib/server/video/google.ts', 'utf8'));
ok('  while the calls that really generate each use their own address',
  /interactionsAddress\(\)/.test(
    withoutComments(readFileSync('app/lib/server/lyria.ts', 'utf8')))
  /* `addressOf(CHOSEN.video, verb)` until 9 October 2026, when the rungs
     split and the model became an argument. What has to stay true is that
     video builds the PUBLISHER address and never the interactions one —
     not which variable holds the model's name. */
  && /addressOf\(model, verb\)/.test(videoLib)
  && !/interactionsAddress/.test(videoLib),
  'music is an interaction and video is a long-running publisher job; one'
  + ' address for both is a 404 on whichever one it is not');

ok('  and the address builder puts the verb after the colon',
  addressOf('m', 'generateContent').endsWith('/models/m:generateContent'),
  addressOf('m', 'generateContent'));

/* ── 4. The probe cannot generate anything ────────────────────────────── */

const lib = withoutComments(readFileSync('app/lib/server/google.ts', 'utf8'));

/* ── These four asserted the OLD probe, and the old probe was wrong ──────
 
   Until 8 October 2026 they read: the probe POSTs an empty body, a 400 means
   the model is THERE, and a 2xx must shout because something was generated
   from nothing. Every one of them passed, every day, while the probe was
   answering a question about my own request.
 
   Carli's screen settled it: `lyria-3-pro-preview` — which this probe had
   reported as "there" — came back from a real call as *"was not found or
   your project does not have access to it"*. On `:predict` Google validates
   the body BEFORE resolving the model, so an empty body earns a 400 from the
   body check and the name is never looked up. The 400 meant "your body is
   empty", and this check insisted on reading it as "your model exists".
 
   The concern underneath them was always right and is kept: **the probe must
   not be able to generate anything.** It is now guaranteed by shape rather
   than by malformedness — a GET on the model as a resource cannot generate,
   whatever Google does with it, where a POST only avoided generating by
   being broken. */

/* ── Wrong twice, and the second time for a new reason ───────────────────
 
   These asserted that the probe READS the model rather than poking it, which
   was the 8 October rewrite. Carli pressed it on 9 October and Google
   answered, for all eight models:
 
     API keys are not supported by this API. Expected OAuth2 access token or
     other authentication credentials that assert a principal.
 
   The read and the list do not take the credential this app has. So the
   probe is back on the generate verb with an empty body — the only door an
   API key may use — and the rule has moved to the thing that was missing
   from BOTH versions.
 
   Neither of them could tell whether it was measuring anything. The first
   read a body check as a model reading; the second asked a question the
   credential could not carry; and both printed eight confident rows. The
   method was never the fault. Not checking was.
 
   So: a control. The same request, against a name that cannot exist. If a
   made-up name is told apart from a real one, the rows mean something. If it
   is not, the probe says so and says nothing else. */

ok('the probe cannot generate: an empty body and no prompt',
  /body: '\{\}'/.test(lib) && !/prompt/.test(lib.slice(lib.indexOf('export async function reach'))),
  'the one thing that was right in every version, and the reason an empty'
  + ' body was chosen in the first place');

ok('  and it carries a control that cannot exist',
  /export const NO_SUCH/.test(lib) && /reach\(NO_SUCH, verb\)/.test(lib),
  'without one, a probe cannot tell a reading from the shape of its own'
  + ' request — which is how this file was wrong twice');

ok('  and only a 404 on the control counts as being able to see',
  /canTell: control\.answer === 'no'/.test(lib),
  'a made-up name answering the same as a real one means the name was never'
  + ' looked up; anything softer than 404 here is wishful');

ok('  and a 401 about the KIND of credential is not read as a permission',
  /API keys are not supported/.test(lib)
  && /not a permission, and/.test(lib),
  '"ask for access to this model" sent her to a page that could not have'
  + ' helped: there is nothing to grant when the method refuses the whole'
  + ' class of credential');

ok('  while a 404 and a 403 stay different answers',
  /response\.status === 404/.test(lib) && /response\.status === 401 \|\| response\.status === 403/.test(lib),
  '"not on this account" and "this key may not" send somebody to two'
  + ' different pages, and one sentence for both sends them to the wrong one');

/* ── And the question the old one could not ask at all ─────────────── */

ok('Google is asked for its own list of what this project has',
  /export async function catalogue/.test(lib) && /listAddress\(\)/.test(lib),
  'a list cannot be faked by a malformed request: either the name is in it'
  + ' or it is not. Every per-model reading is an inference; this is the'
  + ' answer');

ok('  and the list is read with no body either',
  !/listAddress\(\)[\s\S]{0,200}(body:|method: 'POST')/.test(lib));

ok('  and what it finds that this app has never heard of is said out loud',
  /newToThisApp/.test(readFileSync('app/api/google/setup/route.ts', 'utf8')),
  'the ids nobody had to guess are the most useful rows on that page, and a'
  + ' report that only grades OUR guesses can never introduce a new one');

/* ── 5. The key does not leak ─────────────────────────────────────────── */

const route = withoutComments(readFileSync('app/api/google/setup/route.ts', 'utf8'));
/* ── The door moved, and these assertions followed it ──────────────

   Until 9 October 2026 the gate was forty lines pasted into this route and a
   dozen others, and these five assertions read THIS FILE for them. That made
   them true of one copy out of thirteen: the drifted copy was never the one
   being measured.

   So the gate is one file now and these read that file, plus one assertion
   that this route really goes through it and keeps no compare of its own. */
const door = withoutComments(readFileSync('app/lib/server/ownerdoor.ts', 'utf8'));

ok('the setup page goes through the one door rather than its own copy of it',
  /opened\(request\)/.test(route) && !/timingSafeEqual/.test(route),
  'a second implementation of a gate is a second gate to get wrong, and the'
  + ' wrong one answers 404 exactly like the right one');

ok('the setup page is behind the secret, compared in constant time',
  /crypto\.timingSafeEqual/.test(door) && /POST_SECRET/.test(door),
  'it confirms whether a paid key works, so it must refuse rather than'
  + ' default to open');

ok('a secret with a + in it is not mangled into a space',
  /\[\?&\]key=\(\[\^&\]\*\)/.test(door),
  '`searchParams.get` url-decodes, so a `+` in a base64-ish secret arrives as'
  + ' a space and a perfectly typed secret fails — answering 404, which is the'
  + ' same answer as a wrong one, which is an afternoon re-reading a value that'
  + ' was right');

ok('  and every form goes through the constant-time compare',
  /tries\.some\(\(one\) => sameSecret\(one, wanted\)\)/.test(door),
  'trying three forms must not mean comparing one of them loosely');

ok('  and answers a wrong secret the way a wrong path answers',
  /new Response\('no', \{ status: 404 \}\)/.test(door),
  'a 403 confirms the address is real and worth pushing at');

ok('the key is never in the answer',
  !/GOOGLE_VERTEX_KEY/.test(route.replace(/'GOOGLE_VERTEX_KEY or GOOGLE_PROJECT[^']*'/, '')),
  'the page reports status codes and model names, and the only mention of'
  + ' the variable is the sentence telling her it is unset');

ok('  and it is sent as a header rather than in the URL',
  /'x-goog-api-key': key\(\)/.test(lib) && !/\?key=\$\{/.test(lib),
  'a key in a query string lands in every log and every proxy on the way');

/* ── 6. It is not public ──────────────────────────────────────────────── */

ok('none of the three variables can reach a browser',
  !/NEXT_PUBLIC_GOOGLE/.test(lib),
  '`NEXT_PUBLIC_` puts a value in the bundle, which puts this key in'
  + ' everybody’s hands. `check:security` scans for it too');

/* ── 6b. What was measured, and the summary that nearly hid it ───────── */

/* On 8 October 2026 the probe answered against her real project, and the
   report it sent back said nothing at all about images — while the answer
   she needed was in the rows above it. The summary was two hand-written
   sentences, written when there were two kinds, and a third had since
   arrived. */

ok('the summary is built from the list, not written out by hand',
  /const kinds = \[\.\.\.new Set\(MODELS\.map\(\(one\) => one\.what\)\)\]/.test(route),
  'a sentence per kind, typed once, describes the list as it was the day'
  + ' somebody wrote it \u2014 and silently omits the kind added afterwards,'
  + ' which is exactly what happened');

ok('  so a kind with nothing working says so rather than vanishing',
  /are on this project/.test(route),
  'an absent line reads as "fine", which is the opposite of the truth');

ok('  and a kind the probe could not measure says THAT, not "none"',
  /NOT MEASURED/.test(route) && /!tells\.get\(verb\)/.test(route),
  'on 9 October this printed "NONE answered — check Model Garden" for all'
  + ' three kinds, when the truth was that the credential had been refused'
  + ' before a single model was reached. A sentence that reads the same'
  + ' whether or not anything was measured is the whole fault');

ok('every chosen id is one that was actually measured',
  Object.values(CHOSEN).every((id) => MODELS.some((one) => one.id === id)),
  Object.values(CHOSEN).join(', ')
  + ' \u2014 a default that is not in the list is a default nothing has ever'
  + ' asked Google about');

/* ── Chosen because she SAW them, not because a probe inferred them ─────
 
   Until 9 October 2026 these asserted a model picked from a probe reading
   and a model picked from a web page. Carli opened Model Garden on her own
   project and pasted what it shows, and two of the three were wrong:
 
     video   veo-3.0-generate-001        the app had veo-3.1-…
     image   gemini-nano-banana-2.1      the app had gemini-2.5-flash-image
     music   lyria-3-pro-preview         right id, wrong API entirely
 
   So the rule is no longer which id — a name I would be hard-coding from
   the same kind of source that was wrong twice — but that every default is
   one with a note saying it was SEEN. */
const seen = (id: string): boolean =>
  /Model Garden page|her own console|HER Model Garden/i.test(
    MODELS.find((one) => one.id === id)?.note ?? '',
  );

for (const [kind, id] of Object.entries(CHOSEN)) {
  if (kind === 'bed') continue;
  ok(`the ${kind} default is one she has actually seen listed`,
    seen(id),
    `${id} — its note does not say it was seen in her console, which means it`
    + ' came from the same kind of source that got video and image wrong');
}

ok('and the music default is reached through the interactions api',
  /interactionsAddress/.test(lib)
  && /locations\/global\/interactions/.test(lib),
  'lyria-3-pro-preview is not a publisher model; asking it to :predict'
  + ' answered "Publisher model was not found", which was true and which I'
  + ' read as a wrong id for a day');

ok('  and a global model is addressed without a region',
  /where === 'global'/.test(lib) && /locations\/global\/publishers/.test(lib),
  'one builder that put the region in the host AND the path was right for'
  + ' exactly one of her three engines');

/* ── 7. A person does not have to spend a secret to use it ───────────── */

/* Carli, 8 October 2026, on being told to open `?key=<POST_SECRET>`:
   *"maar dan gaan ek nou weer 'n password weggee wat ek weer gaan moet
   verander."*

   She was right, and an hour earlier her Google key had been burned by
   exactly that. A secret in a query string is a secret in the browser
   history, in the access log and in any screenshot of the address bar. So a
   signed-in owner gets in with no secret, and the secret stays for the
   things that are not people. */

ok('a signed-in owner gets in without a secret',
  /if \(await ownerOf\(request\)\) return \{ open: true/.test(door),
  'telling her to type a second secret into a URL is asking her to burn a'
  + ' second one');

ok('  and the owner is tried FIRST, before any secret is wanted',
  (() => {
    const person = door.indexOf('ownerOf(request)');
    const secret = door.indexOf("process.env.POST_SECRET");
    /* Both required: a missing one answers -1, which is less than every
       real position, so the comparison would pass loudest exactly when the
       thing it is about has gone. */
    return person >= 0 && secret >= 0 && person < secret;
  })(),
  'a deployment with no POST_SECRET set must still let her in on her own'
  + ' sign-in rather than answering 503 at her');

ok('  and being an owner is a signed-in email, not a header she can set',
  /await callerFrom\(request\)/.test(door) && /isOwnerEmail\(caller\.email\)/.test(door),
  'anything a browser can type is not an authorisation');

ok('  and the secret still works, for the things that are not people',
  /sameSecret\(one, wanted\)/.test(door) && /POST_SECRET/.test(door),
  'a terminal and a script have no session; removing it trades one'
  + ' awkwardness for another');

ok('  and no secret AND no owner is said plainly rather than as a 404',
  /Sign in as the owner, or set POST_SECRET/.test(door),
  'that case is a deployment nobody can get into, which is worth a sentence'
  + ' rather than the silence a wrong secret gets');

const page = withoutComments(readFileSync('app/google/page.tsx', 'utf8'));
ok('the page sends her token in a header, never in the address',
  /Authorization: `Bearer \$\{token\}`/.test(page) && !/\?key=/.test(page),
  'a header is the one place a secret travels that nothing writes down');

ok('  and it shows what came back even when that is not JSON',
  /\$\{answer\.status\}: \$\{body\}/.test(page),
  'a 404 of "no" IS the answer \u2014 it means this account is not an owner,'
  + ' and a page that swallowed it would leave her pressing a button that'
  + ' does nothing');

if (bad) {
  console.error(`\ncheck:google — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:google — the region is in the host where a wrong one fails as an'
  + ' address, both disputed model ids are carried rather than one guessed at,'
  + ' and the page that asks which of them answers cannot generate anything'
  + ' or show the key.',
);

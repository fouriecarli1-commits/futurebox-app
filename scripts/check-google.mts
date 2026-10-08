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
import { MODELS, addressOf, configured, region } from '../app/lib/server/google.ts';

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

ok('both Lyria ids are named, not one of them picked',
  MODELS.filter((one) => one.what === 'music').length === 2,
  MODELS.filter((one) => one.what === 'music').map((one) => one.id).join(', ')
  + ' — Google’s own page documents lyria-002 and its newer pages show'
  + ' lyria-3-pro-preview. Hard-coding either is a 404 nobody can read');

ok('  and both Veo ids, so the cheap one can be tried first',
  MODELS.filter((one) => one.what === 'video').length === 2,
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

ok('  and the probe uses each model\u2019s own verb rather than a default',
  /addressOf\(model, spec\?\.verb \?\? 'predict'\)/
    .test(withoutComments(readFileSync('app/lib/server/google.ts', 'utf8'))),
  'a probe with one verb hard-coded answers the wrong question for most of'
  + ' the list');

ok('  and the address builder puts the verb after the colon',
  addressOf('m', 'generateContent').endsWith('/models/m:generateContent'),
  addressOf('m', 'generateContent'));

/* ── 4. The probe cannot generate anything ────────────────────────────── */

const lib = withoutComments(readFileSync('app/lib/server/google.ts', 'utf8'));

ok('the probe asks with an empty body, which a model must refuse',
  /body: '\{\}'/.test(lib),
  'a probe that sends a real prompt is a probe that makes a song every time'
  + ' somebody checks whether the key works');

ok('  and a 400 is read as the model being THERE',
  /response\.status === 400 \|\| response\.status === 422/.test(lib),
  'refused on contents means the address and the permission are both fine,'
  + ' which is the whole question');

ok('  while a 404 and a 403 stay different answers',
  /response\.status === 404/.test(lib) && /response\.status === 401 \|\| response\.status === 403/.test(lib),
  '"not on this account" and "this key may not" send somebody to two'
  + ' different pages, and one sentence for both sends them to the wrong one');

ok('  and a success is reported as a thing that should be impossible',
  /UNEXPECTED: an empty body was ACCEPTED/.test(lib),
  'a 2xx here means something was generated from nothing, which is a charge'
  + ' nobody asked for — it must shout rather than fold into "unclear"');

/* ── 5. The key does not leak ─────────────────────────────────────────── */

const route = withoutComments(readFileSync('app/api/google/setup/route.ts', 'utf8'));

ok('the setup page is behind the secret, compared in constant time',
  /crypto\.timingSafeEqual/.test(route) && /POST_SECRET/.test(route),
  'it confirms whether a paid key works, so it must refuse rather than'
  + ' default to open');

ok('a secret with a + in it is not mangled into a space',
  /\[\?&\]key=\(\[\^&\]\*\)/.test(route),
  '`searchParams.get` url-decodes, so a `+` in a base64-ish secret arrives as'
  + ' a space and a perfectly typed secret fails — answering 404, which is the'
  + ' same answer as a wrong one, which is an afternoon re-reading a value that'
  + ' was right');

ok('  and every form goes through the constant-time compare',
  /tries\.some\(\(one\) => sameSecret\(one, wanted\)\)/.test(route),
  'trying three forms must not mean comparing one of them loosely');

ok('  and answers a wrong secret the way a wrong path answers',
  /new Response\('no', \{ status: 404 \}\)/.test(route),
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

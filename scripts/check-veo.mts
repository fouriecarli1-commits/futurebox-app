/**
 * Veo straight from Google, as one more engine in the list that exists.
 *
 *   npm run check:veo
 *
 * ── What it is, and what it is not ───────────────────────────────────────
 *
 * There was already a `veo` provider. That one is Veo **resold by
 * ElevenLabs**. This is Veo on Carli's own Vertex project, measured working
 * on 8 October 2026 — same model, same grade, same picture. The difference
 * is where the money goes and who can stop it.
 *
 * So most of what matters here is not the pictures, it is the plumbing: that
 * it declares what it can do rather than letting the router find out four
 * minutes and one charge later, that its ceiling is the one Google number
 * and not a second copy of it, and that a finished clip is found whichever
 * field it arrives in.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { PROVIDERS } from '../app/lib/server/video/index.ts';
import { nearestLength, suits } from '../app/lib/server/video/types.ts';
import { VIDEO_FIELDS, googleVeo, videoIn } from '../app/lib/server/video/google.ts';
import { CHOSEN } from '../app/lib/server/google.ts';
import { ceilingFor } from '../app/lib/server/googlespend.ts';
import type { StartRequest } from '../app/lib/server/video/types.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. It is in the list, and in the right place ─────────────────────── */

const ids = PROVIDERS.map((one) => one.id);
ok('Google’s Veo is one of the engines, not a route beside them',
  ids.includes('google-veo'),
  ids.join(', ')
  + ' — `/api/video` already is what a video engine needs: a job, a row so'
  + ' closing the tab does not lose it, a charge before and a refund if every'
  + ' engine gives up. A second route would have thrown all of that away');

/* Both looked up first, and both required. `indexOf(a) < indexOf(b)` is the
   shape `check:ordering` refuses, and it is right to: an id that is not
   there at all answers -1, which is less than every real position, so the
   assertion passes loudest exactly when the engine has gone missing. */
const atGoogle = ids.indexOf('google-veo');
const atResold = ids.indexOf('veo');
ok('  and it is tried before the one that resells the same model',
  atGoogle >= 0 && atResold >= 0 && atGoogle < atResold,
  `${ids.join(' → ')} — cheaper at Google's own rate, and it stops at a`
  + ' ceiling she controls');

ok('  on the same rung, because it is the same picture',
  googleVeo.grade === (PROVIDERS.find((one) => one.id === 'veo')?.grade),
  'a grade is a promise about the RESULT; which account billed for it is'
  + ' ours to decide and invisible to the member');

ok('  and the two are counted separately',
  googleVeo.id !== 'veo',
  'different accounts with different ceilings, and `video_spend_this_month`'
  + ' already keys on the provider id, so that came free');

/* ── 2. It declares what it can do, rather than failing later ─────────── */

const ask = (over: Partial<StartRequest> = {}): StartRequest => ({
  prompt: 'a kingfisher over still water', aspect: '16:9', seconds: 8, speak: false, ...over,
});

ok('a square frame is refused before anything is started',
  !googleVeo.can.aspects.includes('1:1'),
  'Veo’s own request takes wide and tall only, and offering a shape it'
  + ' will refuse is a button that cannot work');

ok('a request that needs a spoken line is never offered to it',
  googleVeo.can.speaks === false && !suits(googleVeo, ask({ speak: true })),
  'the clip is made silent on purpose: this app’s voices are Afrikaans and'
  + ' the video models are English-first, so the line is spoken afterwards by'
  + ' ElevenLabs — cheaper, and the only way this app gets Afrikaans');

ok('  and the request it sends really does ask for silence',
  /generateAudio: false/.test(withoutComments(readFileSync('app/lib/server/video/google.ts', 'utf8'))),
  'declaring `speaks: false` to the router and then asking for audio anyway'
  + ' is paying for a thing nobody wanted');

ok('a start frame is declared AND actually sent',
  googleVeo.can.startFrame === true
  && /bytesBase64Encoded: request\.image\.data/.test(readFileSync('app/lib/server/video/google.ts', 'utf8')),
  'an image field an endpoint does not read is a member paying for a clip'
  + ' that has nothing to do with the picture they attached');

ok('an odd length is rounded to one it will really make',
  nearestLength(googleVeo.can, 7) === 6 && nearestLength(googleVeo.can, 9) === 8,
  JSON.stringify(googleVeo.can.seconds));

/* ── 3. The money ─────────────────────────────────────────────────────── */

/* Driven, not compared. The first version of this asserted the two VALUES
   were equal — which a hard-coded `40_000_000` passes, because it happens to
   equal the default. An assertion that cannot tell "reads the number" from
   "equals the number today" is an assertion that goes green the day somebody
   copies it. So the budget is MOVED and the ceiling has to move with it. */
ok('the ceiling is the one Google number, not a second copy of it',
  (() => {
    process.env.GOOGLE_CAP_VIDEO = '250';
    const moved = googleVeo.ceiling() === ceilingFor('video') && googleVeo.ceiling() === 250_000_000;
    delete process.env.GOOGLE_CAP_VIDEO;
    return moved && googleVeo.ceiling() === ceilingFor('video');
  })(),
  'two numbers for one budget is two budgets, and the second is always the'
  + ' stale one. Raising GOOGLE_CAP_VIDEO has to raise this or the variable'
  + ' is decoration');

ok('a clip costs what Google charges a second, in micro-dollars',
  googleVeo.cost(8) === 640_000 && googleVeo.cost(4) === 320_000,
  `${googleVeo.cost(8)} for eight seconds — $0.08 a second video-only, which`
  + ' is $0.64, which is 640 000 millionths');

ok('  and the cheap model is the one it runs',
  googleVeo.model === CHOSEN.video && CHOSEN.video.includes('fast'),
  `${googleVeo.model} — $0.08 a second against $0.20, and CREDITS.video has`
  + ' one cent of margin');

/* ── 4. A finished clip, found whichever field it is in ───────────────── */

const CLIP = 'A'.repeat(2000);
const shapes: readonly [string, unknown][] = [
  ['response.videos[].bytesBase64Encoded', { response: { videos: [{ bytesBase64Encoded: CLIP }] } }],
  ['response.predictions[].videoBytes', { response: { predictions: [{ videoBytes: CLIP }] } }],
  ['a sample nesting it under video', { response: { generatedSamples: [{ video: { bytes: CLIP } }] } }],
  ['no wrapper at all', { videos: [{ bytesBase64Encoded: CLIP }] }],
];
for (const [what, body] of shapes) {
  ok(`the clip is found in ${what}`, videoIn(body)?.base64 === CLIP,
    JSON.stringify(videoIn(body))?.slice(0, 60));
}

ok('  and its own mime is kept where it gave one',
  videoIn({ response: { videos: [{ bytesBase64Encoded: CLIP, mimeType: 'video/webm' }] } })?.mime === 'video/webm',
  'guessing mp4 over a webm is a file that will not open');

for (const [what, body] of [
  ['an empty answer', {}],
  ['a status word', { response: { videos: [{ bytesBase64Encoded: 'running' }] } }],
  ['null', null],
] as readonly [string, unknown][]) {
  ok(`  ${what} is not mistaken for a clip`, videoIn(body) === null, JSON.stringify(videoIn(body)));
}

ok('every name it tries is a plausible one',
  VIDEO_FIELDS.length >= 3 && VIDEO_FIELDS[0] === 'bytesBase64Encoded',
  VIDEO_FIELDS.join(', '));

/* ── 5. The two ways a wait can go wrong ──────────────────────────────── */

const lib = withoutComments(readFileSync('app/lib/server/video/google.ts', 'utf8'));

ok('a network blip while it is still working is NOT a failure',
  /state: 'unknown', message: 'Google could not be reached\.'/.test(lib),
  'the route refunds on failure, and refunding a clip Google is still making'
  + ' pays for it twice');

ok('but a clip that finished with the bytes missing says exactly that',
  /Google finished but the video was not where this app looked for it/.test(lib),
  'finished, paid for, and the bytes somewhere this app did not look.'
  + ' Reported as an ordinary failure, that is the one description that'
  + ' stops anybody investigating');

ok('a data URL is handed back, because Cloud Storage is deliberately off',
  /url: `data:\$\{got\.mime\};base64,\$\{got\.base64\}`/.test(lib),
  'every other engine returns a link the route copies into our bucket.'
  + ' Google returns bytes, because switching Cloud Storage on would put'
  + ' spending outside the one capped service. `fetch` reads a data URL, so'
  + ' nothing else had to learn a second shape');

if (bad) {
  console.error(`\ncheck:veo — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:veo — Google’s Veo is one more engine in the list that already'
  + ' existed, tried before the reseller of the same model, declaring what it'
  + ' can do rather than failing four minutes in, counted against the one'
  + ' Google ceiling, and finding a finished clip whichever field it is in.',
);

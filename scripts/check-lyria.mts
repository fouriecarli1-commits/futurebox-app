/**
 * A song out of Lyria, and reading an answer nobody here has seen.
 *
 *   npm run check:lyria
 *
 * ── The expensive failure this is written against ────────────────────────
 *
 * A 200 from Google with the audio in a field this app did not look in.
 * Google has been paid, the member has been charged, and the song is on the
 * floor — reported as "that did not work", which is the one description of
 * it that stops anybody investigating.
 *
 * The address and the key were measured on 8 October 2026; the field the
 * bytes arrive in was not, because the proxy here blocks Google's
 * documentation. So the reader tries every plausible name and SAYS WHICH ONE
 * answered, and this drives it over every shape that name could come in.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import { FIELDS, audioIn } from '../app/lib/server/lyria.ts';
import { COSTS } from '../app/lib/server/google.ts';
import { CREDITS } from '../app/lib/credits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** Long enough that the reader will accept it as audio rather than a word. */
const SONG = 'U'.repeat(900);

/* ── 1. Every shape the audio might come back in ──────────────────────── */

const shapes: readonly [string, unknown, string | null][] = [
  ['predictions with bytesBase64Encoded, the Imagen shape',
    { predictions: [{ bytesBase64Encoded: SONG }] }, 'bytesBase64Encoded'],
  ['predictions with audioContent',
    { predictions: [{ audioContent: SONG }] }, 'audioContent'],
  ['candidates instead of predictions',
    { candidates: [{ audio: SONG }] }, 'audio'],
  ['a bare object with no list at all',
    { data: SONG }, 'data'],
  ['the second row, when the first is empty',
    { predictions: [{}, { content: SONG }] }, 'content'],
];
for (const [what, body, want] of shapes) {
  const got = audioIn(body);
  ok(`the audio is found in ${what}`, got?.under === want,
    `${got?.under ?? 'nothing'}, wanted ${want}`);
}

ok('and the field it was found under is reported back',
  audioIn({ predictions: [{ audioContent: SONG }] })?.base64 === SONG,
  'the first real song settles a guess this app had to make, and it can only'
  + ' settle it if the answer comes back out');

/* ── 2. What must NOT be taken for a song ─────────────────────────────── */

const rubbish: readonly [string, unknown][] = [
  ['a status word in a field called data', { data: 'ok' }],
  ['an empty answer', {}],
  ['null', null],
  ['a list of nothing', { predictions: [] }],
  ['a number where the audio should be', { predictions: [{ audioContent: 12345 }] }],
  ['a short string that is not audio', { predictions: [{ audio: 'pending' }] }],
];
for (const [what, body] of rubbish) {
  ok(`  ${what} is not mistaken for a song`, audioIn(body) === null,
    JSON.stringify(audioIn(body)));
}

ok('a field holding three bytes would have been handed over as a file',
  audioIn({ data: 'ok' }) === null && SONG.length > 512,
  'which is why the reader wants length as well as a string: `data: "ok"` is'
  + ' a status, and a song of three bytes is worse than an error');

ok('every name the reader tries is a plausible one, in order',
  FIELDS.length >= 4 && FIELDS[0] === 'bytesBase64Encoded',
  FIELDS.join(', ')
  + ' — most likely first, so the common case does not walk the whole list');

/* ── 3. The route: the order everything happens in ────────────────────── */

const route = withoutComments(readFileSync('app/api/google/music/route.ts', 'utf8'));

ok('our own ceiling is asked before the member is charged',
  before(route, "await enough('music'", 'await charge('),
  'a member refused by a ceiling they cannot see must not also have paid for'
  + ' the turn');

ok('  and what is safe to send is decided before either',
  before(route, 'await guard(request', "await enough('music'"),
  'a refusal that has already taken credits is a refusal nobody accepts');

ok('  and the plan is checked before the engine is asked',
  before(route, 'needsPlan', 'await charge('),
  'offering a song and then taking it away is worse than not offering it');

ok('a failed engine puts the credits back',
  /if \(!made\.ok\) \{\s*await paid\.refund\(\);/.test(route),
  'the charge happens before the engine because the engine is what costs'
  + ' money; a charge that survives a failure is what makes somebody stop'
  + ' pressing buttons');

ok('what it cost US is written down only once the audio is in hand',
  before(route, 'if (!made.ok)', "void note('music'"),
  'a call that failed cost nothing, and a ceiling that counts failures'
  + ' closes early for a reason nobody can see');

ok('  and never awaited, so bookkeeping cannot hold her song',
  /void note\('music'/.test(route),
  'the file is ready; the row can take its time');

ok('the row says which model ran',
  /note\('music', COSTS\.music, CHOSEN\.music/.test(route),
  'lyria-002 and lyria-3-pro-preview do not cost the same, and a row that'
  + ' cannot say which it was is a row nobody can price against the invoice');

/* ── 4. The money, as far as it is known ──────────────────────────────── */

ok('a song costs us a published rate, not a guess at one',
  COSTS.music === 60_000,
  `${COSTS.music} micro-dollars — $0.06 for a 30-second Lyria-002 clip, from`
  + ' the pricing she sent on 8 October. A published rate is not an invoice,'
  + ' which is why every call writes down what it was charged at');

ok('and the member pays the app’s own song price, not a number invented here',
  /CREDITS\.song/.test(route) && CREDITS.song > 0,
  'two prices for one thing is how the two drift apart');

/* ── 5. A paid call whose audio was lost says so loudly ───────────────── */

const lib = withoutComments(readFileSync('app/lib/server/lyria.ts', 'utf8'));

ok('a 200 with unreadable audio is not reported as "that did not work"',
  /the audio was not where this app looked for it/.test(lib)
  && /The answer began/.test(lib),
  'Google has been paid and the song is on the floor. Reported as a plain'
  + ' failure, that is the one description that stops anybody investigating');

ok('  and their own words survive a refusal',
  /text\.slice\(0, 300\)/.test(lib),
  'a sentence invented here would hide the one thing worth seeing, which is'
  + ' what Google actually objected to');

if (bad) {
  console.error(`\ncheck:lyria — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:lyria — the audio is found whichever of five fields it arrives in'
  + ' and nothing short is mistaken for it, the ceiling is asked before the'
  + ' credits and the credits come back on a failure, and a paid call whose'
  + ' audio was lost says so rather than looking like an ordinary error.',
);

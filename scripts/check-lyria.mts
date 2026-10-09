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
import { FIELDS, audioIn, wordsIn } from '../app/lib/server/lyria.ts';
import { cannot, promptFor } from '../app/lib/server/lyriaprompt.ts';
import { CHOSEN, COSTS } from '../app/lib/server/google.ts';
import { CREDITS } from '../app/lib/credits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** Long enough that the reader will accept it as audio rather than a word. */
const SONG = 'U'.repeat(900);

/* ── 0. The shape her own console shows ───────────────────────────────── */

/* Measured at last, 9 October 2026, off Carli's Model Garden page. Every
   assertion below this used to be about shapes I had guessed at; this one is
   about the shape that actually arrives, and it is first because it is the
   only one with evidence behind it. */
const HERS = {
  status: 'completed',
  outputs: [
    { text: 'LYRICS', type: 'text' },
    { text: 'DESCRIPTION', type: 'text' },
    { mime_type: '', data: SONG, type: 'audio' },
    {},
  ],
  role: 'model',
  object: 'interaction',
  model: 'lyria-3-pro-preview',
};

ok('the song is found in the shape her console actually shows',
  audioIn(HERS)?.base64 === SONG,
  'this is the one shape that is not a guess');

ok('  and it is taken from the row that calls itself audio',
  audioIn(HERS)?.under === 'outputs[audio].data',
  `${audioIn(HERS)?.under} — the lyrics are a long string too, so a reader`
  + ' that took the longest field would hand somebody a .wav full of words');

ok('  and the words it wrote are read out rather than thrown away',
  wordsIn(HERS).join('|') === 'LYRICS|DESCRIPTION',
  `${wordsIn(HERS).join('|')} — the engine sends the lyrics and a description`
  + ' beside the audio, which nobody here knew until she pasted it');

ok('  and an outputs list with no audio row is not a song',
  audioIn({ outputs: [{ text: SONG, type: 'text' }] }) === null,
  'a text output as long as a song is still text');

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

/* ── The correction this nearly shipped without ────────────────────────

   `CHOSEN.music` was `lyria-002`, picked because it is the documented one.
   That is choosing a name without asking what it does: Lyria 2 is
   INSTRUMENTAL ONLY and THIRTY SECONDS, per Google's own model page. This
   app makes sung songs of about two minutes, so the first real press would
   have come back as half a minute of backing track with nobody singing. */
ok('the song engine is one that can actually sing',
  CHOSEN.music === 'lyria-3-pro-preview',
  `${CHOSEN.music} — lyria-002 is instrumental only and 30 seconds, which`
  + ' is a bed, not a song');

ok('  and the instrumental one is kept for the job it is right for',
  CHOSEN.bed === 'lyria-002' && COSTS.bed === 60_000,
  'thirty seconds of instrumental is what goes under a video');

ok('a song costs us a rate, and the least certain one in the file',
  COSTS.music === 80_000,
  `${COSTS.music} micro-dollars — $0.08 for a Lyria 3 Pro song, from a`
  + ' secondary source rather than a Google page. The honest number is her'
  + ' first invoice, which is why every call writes down which model ran');

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

/* ── 6. The plan, written out as one string ──────────────────────────── */

/* ElevenLabs Music takes a composition plan: sections, lines, seconds each.
   Lyria takes one string. So the translation is lossy, and these hold what
   survives and what is refused rather than dropped. */

const plan = {
  style: 'Afrikaanse volksrock, akoestiese kitaar',
  seconds: 127,
  sections: [
    { name: 'Verse 1', lines: ['Ek sit hier stil', 'En word van alles waar'], seconds: 20 },
    { name: 'Chorus', lines: ['Altyd vry'], seconds: 18 },
    { name: '[Bridge]', lines: ['Voeltjie van my vrede'], seconds: 12 },
  ],
};

const out = promptFor(plan);

ok('the style leads, because it is what the model leans on hardest',
  out.prompt.startsWith('Afrikaanse volksrock'),
  out.prompt.slice(0, 60));

ok('every section becomes a tag Lyria reads',
  out.prompt.includes('[Verse 1]') && out.prompt.includes('[Chorus]'),
  'section tags are how a structure is asked for, and they are the same'
  + ' vocabulary the plan already uses');

ok('  and a name that is already bracketed is not bracketed twice',
  out.prompt.includes('[Bridge]') && !out.prompt.includes('[[Bridge]]'),
  'a pasted lyric sheet often brings its own brackets');

ok('  and every line of the lyric survives',
  ['Ek sit hier stil', 'En word van alles waar', 'Altyd vry', 'Voeltjie van my vrede']
    .every((line) => out.prompt.includes(line)),
  'the words are the one thing that must not be summarised');

ok('the length is said in words, rounded, because it is not a parameter',
  /About 130 seconds long\./.test(out.prompt) && out.seconds === 127,
  `${out.prompt.match(/About [^.]*\./)?.[0]} — "about 127 seconds" claims a`
  + ' precision nothing on the other side honours');

const quiet = promptFor({ style: 'warm piano', instrumental: true, sections: plan.sections });
ok('an instrumental says so in the prompt AND in the negative',
  /Instrumental only, no vocals\./.test(quiet.prompt) && /vocals/.test(quiet.negative),
  'Lyria 3 Pro sings by default, and this is the setting somebody notices'
  + ' immediately if it fails');

ok('  and does not then send the words to be sung',
  !quiet.prompt.includes('Altyd vry'),
  'an instrumental with a lyric in its prompt is a model being given two'
  + ' instructions and picking one');

ok('a trained sound is refused rather than quietly dropped',
  (cannot({ style: 'x', finetuneId: 'ft_123' }) ?? '').includes('other music engine'),
  'it is an ElevenLabs model on an ElevenLabs account with no Lyria'
  + ' equivalent \u2014 dropping it hands her a song in the wrong voice after'
  + ' she chose hers');

ok('  and an empty ask is refused before anything is charged',
  cannot({}) !== null && cannot({ style: 'warm piano' }) === null,
  JSON.stringify([cannot({}), cannot({ style: 'warm piano' })]));

/* ── 7. One button, two engines ──────────────────────────────────────── */

const booth = withoutComments(readFileSync('app/api/music/route.ts', 'utf8'));

ok('the booth\u2019s own button is what reaches Lyria',
  /MUSIC_ENGINE/.test(booth) && /await makeSong\(/.test(booth),
  'a second "make a song" beside the first is two controls nobody can'
  + ' choose between \u2014 the same objection that put Kits and Music.ai'
  + ' behind one split button');

ok('  and the engine that works today stays the default',
  /=== 'google'/.test(booth),
  'switching back is one variable rather than a deploy, and a default that'
  + ' changed under her is a room that broke by itself');

ok('  with the ceiling asked before the credits on that path too',
  before(booth, "await enoughGoogle('music'", 'const bill = await charge('),
  'the rule does not stop applying because it is a different supplier');

ok('  and the credits given back when Lyria refuses',
  /if \(!made\.ok\) \{\s*await bill\.refund\(\);/.test(booth),
  'a charge that survives a failure is what makes somebody stop pressing');

ok('  and the answer says which engine made it',
  /'X-Music-Engine': 'google'/.test(booth),
  'a song that came back should be tellable from the other engine\u2019s'
  + ' without guessing from how it sounds');

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

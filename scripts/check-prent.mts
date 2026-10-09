/**
 * The picture engine: the address, the reader, the order, and the money.
 *
 * ── Why a check and not a try ────────────────────────────────────────────
 *
 * Because this machine cannot reach Google and must not hold a key, so the
 * first time this code runs for real it will be on her account, with her
 * money, on a picture she cares about. Everything below is the part that can
 * be settled without a network: that the address is built the way her own
 * Model Garden card says, that the reader finds a picture in both spellings
 * Vertex has been seen to use, that a refusal is reported as a refusal
 * rather than as a broken reader, and that the money cannot go the wrong
 * way round.
 *
 * The reader is the one that matters most. `check:veo` exists because the
 * video reader was guessed at and nearly threw away a paid clip because the
 * field was called something else. This is the same risk with the same
 * answer: the reader is exported, and it is driven here with the shapes
 * Google is documented to answer in.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { PER_PICTURE, pictureIn, wordsIn } from '../app/lib/server/picture.ts';
import { CHOSEN, addressOf } from '../app/lib/server/google.ts';
import { CEILINGS, DOLLAR } from '../app/lib/server/googlespend.ts';
import { CREDITS } from '../app/lib/credits.ts';
import { screen } from '../app/lib/moderation.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. The address, off her own card ──────────────────────────────────── */

const where = addressOf(CHOSEN.image, 'generateContent');

ok('the picture model is called on the unregional host',
  where.startsWith('https://aiplatform.googleapis.com/'),
  `${where} — her Model Garden card gives locations/global for this one, and`
  + ' a regional host answers 404 for a global model, which reads exactly'
  + ' like a wrong model name');

ok('  and at locations/global',
  where.includes('/locations/global/'), where);

ok('  and with generateContent after the colon',
  where.endsWith(`/models/${CHOSEN.image}:generateContent`), where);

/* ── 2. The reader, in both spellings ──────────────────────────────────── */

const LONG = 'A'.repeat(2048);

ok('a picture is found under inlineData',
  pictureIn({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: LONG } }] } }] })?.base64 === LONG);

ok('  and under inline_data, which Vertex has also answered in',
  pictureIn({ candidates: [{ content: { parts: [{ inline_data: { mime_type: 'image/jpeg', data: LONG } }] } }] })?.mime === 'image/jpeg');

ok('  and past a text part that came first',
  pictureIn({ candidates: [{ content: { parts: [
    { text: 'Here is your picture.' },
    { inlineData: { mimeType: 'image/png', data: LONG } },
  ] } }] })?.base64 === LONG,
  'the model is a chat model that draws, so it very often says something'
  + ' before the picture, and a reader that takes the first part finds words');

ok('  and it says which field it found it under',
  /parts\[1\]\.inlineData$/.test(
    pictureIn({ candidates: [{ content: { parts: [
      { text: 'hi' }, { inlineData: { mimeType: 'image/png', data: LONG } },
    ] } }] })?.under ?? ''),
  'one real press has to settle the guess, and a header is where that answer'
  + ' can be read without a log');

ok('a status word is not mistaken for a picture',
  pictureIn({ candidates: [{ content: { parts: [{ inlineData: { data: 'OK' } }] } }] }) === null,
  'a short string under the right name is the failure mode a length test'
  + ' exists for');

ok('  and an empty answer is not either',
  pictureIn({}) === null && pictureIn(null) === null && pictureIn({ candidates: [] }) === null);

/* ── 3. A refusal is reported as a refusal ─────────────────────────────── */

const refused = { candidates: [{ content: { parts: [{ text: 'I cannot make that.' }] }, finishReason: 'SAFETY' }] };

ok('words are read off an answer that carried no picture',
  wordsIn(refused).join(' ').includes('cannot make that'),
  'a safety block is a 200 with text and no picture, and reporting that as'
  + ' "the picture was not where this app looked" sends somebody hunting a'
  + ' field-name bug that is not there');

ok('  and why it stopped is read too',
  wordsIn(refused).some((one) => one.includes('SAFETY')),
  'the finish reason is the only place a block says it was a block');

ok('  and a plain finish is not reported as a reason',
  !wordsIn({ candidates: [{ content: { parts: [{ text: 'done' }] }, finishReason: 'STOP' }] })
    .some((one) => one.includes('STOP')));

/* ── 4. The request's own shape ────────────────────────────────────────── */

const lib = withoutComments(readFileSync('app/lib/server/picture.ts', 'utf8'));

ok('the picture to be changed is put BEFORE the words',
  /if \(from\) parts\.push\(\{ inlineData[\s\S]{0,120}parts\.push\(\{ text: words \}\)/.test(lib),
  'Gemini reads a conversation in order, so an instruction that arrives'
  + ' before the thing it is about is an instruction about nothing');

ok('  and TEXT is asked for beside IMAGE',
  /responseModalities: \['TEXT', 'IMAGE'\]/.test(lib),
  'asked for an image alone the model has nowhere to put a refusal, and a'
  + ' refusal with nowhere to go comes back as an empty answer that reads'
  + ' like a broken reader');

ok('  and a size is always asked for, so the price is knowable',
  /imageConfig: \{ imageSize: SIZE/.test(lib) && /const SIZE = '(1K|2K|4K)'/.test(lib),
  'Nano Banana is priced PER RESOLUTION — about $0.0336 at 1K against'
  + ' $0.0504 at 2K on this model. A request that leaves the size to the'
  + ' model is a cost this app cannot predict, counted against a ceiling'
  + ' that is supposed to be predictable');

ok('  and the price written down is the one for that size',
  (() => {
    /* The quoted figures, in micro-dollars, from Carli's price layout of
       9 October 2026. The rate must cover the size being asked for — and
       must not be another model's number, which is how 150 000 (Nano Banana
       PRO) got in here in the first place. */
    const QUOTED: Record<string, number> = { '1K': 33_600, '2K': 50_400, '4K': 100_000 };
    const size = /const SIZE = '(1K|2K|4K)'/.exec(lib)?.[1] ?? '';
    const quoted = QUOTED[size];
    return quoted !== undefined && PER_PICTURE >= quoted && PER_PICTURE <= quoted * 2;
  })(),
  `${PER_PICTURE} against the quoted rate for the size this file asks for.`
  + ' Below it is a bill nobody saw coming; more than double it is another'
  + " model's price, which is exactly what $0.15 turned out to be");

ok('  and the key travels in a header, never in the address',
  /'x-goog-api-key'/.test(lib) && !/\?key=\$\{/.test(lib),
  'a key in a query string lands in every log and every proxy on the way');

/* ── 5. The money ──────────────────────────────────────────────────────── */

ok('one picture is counted in micro-dollars, not in dollars',
  PER_PICTURE > 1_000 && PER_PICTURE / DOLLAR < 1,
  `${PER_PICTURE} — this project has already had a cost out by a factor of a`
  + ' thousand in exactly this spot, because a per-song figure was read as a'
  + ' per-second one. A picture is cents, so it is tens of thousands of'
  + ' millionths and not tens');

ok('  and the image ceiling still stops a real number of pictures',
  (() => {
    const howMany = Math.floor((CEILINGS.image * DOLLAR) / PER_PICTURE);
    return howMany >= 20 && howMany <= 5_000;
  })(),
  `${Math.floor((CEILINGS.image * DOLLAR) / PER_PICTURE)} pictures a month at`
  + ` $${CEILINGS.image} — outside that range the rate and the cap disagree by`
  + ' enough that one of them is wrong: a ceiling nobody reaches stops'
  + ' nothing, and one reached in five presses is a feature switched off');

ok('  and the member pays more than twice what the picture costs us',
  CREDITS.repaint * 1.49 > ((PER_PICTURE / DOLLAR) * 16) * 2,
  `${CREDITS.repaint} credits against R${((PER_PICTURE / DOLLAR) * 16).toFixed(2)}`
  + ' — `check:kredietkoste` is the full version of this against every tier;'
  + ' this one is here so the engine and its price cannot be moved apart');

/* ── 6. The route's order, and what it must not do ─────────────────────── */

const route = withoutComments(readFileSync('app/api/google/picture/route.ts', 'utf8'));

ok('the ceiling is asked before the member is charged',
  (() => {
    const ceiling = route.indexOf("enough('image'");
    const paid = route.indexOf('await charge(');
    return ceiling >= 0 && paid >= 0 && ceiling < paid;
  })(),
  'a member refused by a ceiling they cannot see must not also have paid'
  + ' for the turn');

ok('  and the charge is before the engine, with a refund if it fails',
  (() => {
    const paid = route.indexOf('await charge(');
    const engine = route.indexOf('await makePicture(');
    return paid >= 0 && engine >= 0 && paid < engine && /await paid\.refund\(\)/.test(route);
  })(),
  'the engine is the thing that costs money, and a charge that survives a'
  + ' failure is what makes somebody stop pressing buttons');

ok('  and what Google cost us is written down only once the picture is in hand',
  (() => {
    const engine = route.indexOf('await makePicture(');
    const noted = route.indexOf("note('image'");
    return engine >= 0 && noted >= 0 && engine < noted;
  })(),
  'a call that failed cost nothing, and a ceiling that counts failures'
  + ' closes early for a reason nobody can see');

ok('the route never writes the member’s picture into our storage',
  !/\.storage\b/.test(route) && !/upload\(/.test(route),
  'a route that quietly saved every edit would put somebody’s photograph'
  + ' in our bucket without them asking. A picture reaches the device, or'
  + ' our storage, because somebody pressed something — see'
  + ' check:onthisdevice');

ok('  and a picture coming in has its type checked before it is sent on',
  /MIMES\.has\(mime\)/.test(route) && /MOST_BYTES/.test(route),
  'the route has to know what it is before anything leaves this machine,'
  + ' and an unbounded base64 body is a way to make this route hold a'
  + ' phone’s whole gallery in memory');

/* ── 7. It is screened as itself ───────────────────────────────────────── */

ok('the prompt is screened on its OWN surface, not borrowed from video',
  /guard\(request, words, 'picture', caller\)/.test(route)
  && !/guard\(request, words, 'video'/.test(route),
  'the moderation log is the evidence this platform enforces its own rules,'
  + ' and a refusal filed under `video` for a route that films nothing is'
  + ' evidence of the wrong thing');

ok('  and that surface really carries the rules it has to',
  screen('a photo of President Ramaphosa announcing a new tax', 'picture')?.rule === 'likeness'
  && screen('breaking news photograph of the crash', 'picture')?.rule === 'fabricated-news'
  && screen('a nude photograph', 'picture')?.rule === 'explicit',
  'a still of a public figure saying something they never said is the same'
  + ' wrong as the clip, and a fake photograph has never been harmless for'
  + ' not moving');

console.log(bad === 0
  ? '\ncheck:prent — the picture engine is called at the address her own console gives,'
  + ' reads a picture in either spelling, reports a refusal as a refusal, counts'
  + ' one press in millionths, and cannot charge before it has room or save'
  + " somebody's photograph without being asked."
  : `\ncheck:prent — ${bad} assertion(s) failed.`);
process.exit(bad === 0 ? 0 : 1);

/**
 * What MiniMax and OpenArt would cost us, against what we charge.
 *
 *   npm run check:minimax
 *
 * ── Where these prices come from ─────────────────────────────────────────
 *
 * Carli pasted them on 8 October 2026: MiniMax's own pay-as-you-go tables,
 * and OpenArt's four plans with the credit cost of each model on them.
 *
 * **I could not read either page.** The outbound network blocks both, as it
 * blocks render.com and fal.ai — so every figure below is hers, dated, and
 * the arithmetic on top of it is mine. That distinction matters: if the
 * prices move, the conclusions move with them and this file is the place
 * that says so out loud rather than a paragraph nobody re-runs.
 *
 * ── Why a check rather than a document ───────────────────────────────────
 *
 * Because the conclusion is a comparison against OUR prices, and ours are in
 * the code. `CREDITS.video` is 15 a five-second unit and a credit is worth
 * between R0.23 and R0.48 to us depending on the plan it was bought on —
 * `credits.ts` works that out and says the two are a factor of two apart.
 *
 * A document stating "MiniMax at 768P would lose money on a five-second
 * clip" is true today and silently false the day `CREDITS.video` moves. So
 * the arithmetic lives here, reads `CREDITS` and `RAND_PER_USD` from the
 * code, and fails when a conclusion in `docs/MINIMAX-PRYSE.md` stops being
 * the one the numbers give.
 *
 * ── The one that matters ─────────────────────────────────────────────────
 *
 * Buying MiniMax DIRECTLY is dearer than buying the same model through
 * OpenArt's plans, because their plans carry volume discounts we would not
 * have. That is the opposite of what anybody expects of a reseller, and it
 * is the whole finding.
 */
import { readFileSync } from 'node:fs';
import { CREDITS } from '../app/lib/credits.ts';
import { RAND_PER_USD } from '../app/lib/plans.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── Hers, 8 October 2026, pasted from the pricing pages ────────────── */

/** MiniMax pay-as-you-go, in dollars. */
const MINIMAX = {
  videoPerSecond: { h3_768: 0.08, h3_2k: 0.13, max_480: 0.05, max_768: 0.08 },
  ttsPerMillionChars: { hd: 100, turbo: 60 },
  asrPerHour: 0.38,
  voiceClone: 1.5,
  voiceDesign: 3,
  imagePerImage: 0.0035,
} as const;

/**
 * OpenArt's plans. The dollar figure is the annual-billed monthly price she
 * pasted; the monthly-billed one is dearer and is named beside it.
 *
 * The credit allowance is DERIVED rather than quoted, because she pasted the
 * allowance for only one plan — Wonder's 106 000 — and the per-model counts
 * for all four. GPT Image 2.5 costs 5 credits and the four plans give 800,
 * 2 400, 4 800 and 21 200 of them, so the allowances are 4 000, 12 000,
 * 24 000 and 106 000. Wonder's derivation lands on the number she pasted,
 * which is what makes the other three trustworthy.
 */
const OPENART = {
  starter: { yearly: 13, monthly: 14, credits: 800 * 5 },
  plus: { yearly: 27, monthly: 34, credits: 2400 * 5 },
  pro: { yearly: 44, monthly: 56, credits: 4800 * 5 },
  wonder: { yearly: 175, monthly: 240, credits: 21200 * 5 },
} as const;

/** What each model costs in OpenArt credits, as she pasted them. */
const IN_CREDITS = {
  h3MaxTurbo5s768: 100,
  h3Max5s768: 200,
  gemini5s720: 250,
  seedance20_5s720: 400,
  seedance25_5s720: 650,
  gptImage2_5: 5,
  nanoBanana2: 20,
  seedream5Pro: 30,
  lyria3Pro: 50,
  elevenSfx10s: 10,
} as const;

ok('Wonder’s own allowance confirms how the credit counts work',
  OPENART.wonder.credits === 106_000,
  `${OPENART.wonder.credits} against the 106 000 she pasted — the other three`
  + ' allowances are derived the same way and are only as good as this one');

const perCredit = (plan: keyof typeof OPENART): number =>
  OPENART[plan].yearly / OPENART[plan].credits;

const rand = (usd: number): number => usd * RAND_PER_USD;

/* ── What we take for a five-second clip ────────────────────────────── */

/* The LOW end of what a credit is worth to us, because that is the plan
   where the margin is thinnest and the only one worth pricing against. A
   price that works on the generous plan and loses on the mean one loses. */
const CREDIT_RAND_LOW = 0.23;
const takenFor5s = CREDITS.video * CREDIT_RAND_LOW;

console.log('');
console.log(`  a five-second clip brings in R${takenFor5s.toFixed(2)}`
  + ` (${CREDITS.video} credits at R${CREDIT_RAND_LOW.toFixed(2)}, the thinnest plan)`);
console.log('');
console.log('  what the same five seconds would cost us:');
const options: readonly [string, number][] = [
  ['MiniMax direct, H3 768P', MINIMAX.videoPerSecond.h3_768 * 5],
  ['MiniMax direct, H3-Max 768P', MINIMAX.videoPerSecond.max_768 * 5],
  ['MiniMax direct, H3-Max 480P', MINIMAX.videoPerSecond.max_480 * 5],
  ['MiniMax direct, H3 2K', MINIMAX.videoPerSecond.h3_2k * 5],
  ['OpenArt Wonder, H3-Max Turbo', IN_CREDITS.h3MaxTurbo5s768 * perCredit('wonder')],
  ['OpenArt Pro, H3-Max Turbo', IN_CREDITS.h3MaxTurbo5s768 * perCredit('pro')],
  ['OpenArt Wonder, H3-Max', IN_CREDITS.h3Max5s768 * perCredit('wonder')],
  ['OpenArt Pro, H3-Max', IN_CREDITS.h3Max5s768 * perCredit('pro')],
  ['OpenArt Wonder, Seedance 2.5', IN_CREDITS.seedance25_5s720 * perCredit('wonder')],
];
for (const [name, usd] of options) {
  const margin = takenFor5s - rand(usd);
  console.log(`    ${name.padEnd(30)} $${usd.toFixed(3)}  R${rand(usd).toFixed(2)}`
    + `  ${margin >= 0 ? '+' : ''}R${margin.toFixed(2)}`);
}
console.log('');

/* ── The findings the write-up rests on ─────────────────────────────── */

ok('buying MiniMax directly loses money on a five-second clip at our price',
  rand(MINIMAX.videoPerSecond.max_768 * 5) > takenFor5s,
  `R${rand(MINIMAX.videoPerSecond.max_768 * 5).toFixed(2)} to buy against`
  + ` R${takenFor5s.toFixed(2)} taken — if this ever passes, `
  + ' `docs/MINIMAX-PRYSE.md` is telling her the opposite of the truth');

ok('  and the cheapest direct resolution still loses on the thinnest plan',
  rand(MINIMAX.videoPerSecond.max_480 * 5) > takenFor5s,
  `480P is R${rand(MINIMAX.videoPerSecond.max_480 * 5).toFixed(2)} against`
  + ` R${takenFor5s.toFixed(2)}`);

ok('  but the same model through OpenArt’s biggest plan does not',
  rand(IN_CREDITS.h3MaxTurbo5s768 * perCredit('wonder')) < takenFor5s,
  `R${rand(IN_CREDITS.h3MaxTurbo5s768 * perCredit('wonder')).toFixed(2)} against`
  + ` R${takenFor5s.toFixed(2)}`);

ok('a reseller is CHEAPER than the supplier it resells, which is the finding',
  IN_CREDITS.h3Max5s768 * perCredit('wonder') < MINIMAX.videoPerSecond.max_768 * 5,
  `$${(IN_CREDITS.h3Max5s768 * perCredit('wonder')).toFixed(3)} against`
  + ` $${(MINIMAX.videoPerSecond.max_768 * 5).toFixed(3)} — their plans carry`
  + ' volume discounts we would not have at our size');

/* ── And the other way round for images ─────────────────────────────── */
ok('for images, buying direct is the cheap way round',
  MINIMAX.imagePerImage < IN_CREDITS.gptImage2_5 * perCredit('wonder'),
  `$${MINIMAX.imagePerImage} direct against`
  + ` $${(IN_CREDITS.gptImage2_5 * perCredit('wonder')).toFixed(4)} through the`
  + ' biggest plan — the comparison is not one-way, and a decision made on'
  + ' the video numbers alone would buy images at three times the price');

ok('  and a cover at our price still carries it several times over',
  CREDITS.cover * CREDIT_RAND_LOW > rand(MINIMAX.imagePerImage) * 4,
  `${CREDITS.cover} credits is R${(CREDITS.cover * CREDIT_RAND_LOW).toFixed(2)}`
  + ` against R${rand(MINIMAX.imagePerImage).toFixed(3)} to make one`);

/* ── Voice, against the supplier we already pay ─────────────────────── */
/* ElevenLabs' own published rates, from `docs/ELEVENLABS-PRYSE.md`, which
   was written off the page Carli sent on 8 September 2026. */
const ELEVEN = { ttsPerThousandChars: 0.10, asrPerHour: 0.22 } as const;

ok('MiniMax reads text aloud for less than we pay now',
  MINIMAX.ttsPerMillionChars.turbo / 1000 < ELEVEN.ttsPerThousandChars,
  `$${(MINIMAX.ttsPerMillionChars.turbo / 1000).toFixed(3)} a thousand characters`
  + ` against $${ELEVEN.ttsPerThousandChars.toFixed(3)}`);

ok('  but transcribes for more, so this is not one decision',
  MINIMAX.asrPerHour > ELEVEN.asrPerHour,
  `$${MINIMAX.asrPerHour} an hour against $${ELEVEN.asrPerHour} — moving`
  + ' everything to one supplier because its headline looked cheaper is how'
  + ' a bill goes up while the spreadsheet says it went down');

/* ── Mureka, which is the one that matters ──────────────────────

   Carli sent their whole price list on 8 October 2026, signed in to their
   site. A song is the biggest single cost in this app and the one the
   whole credit scale was built round, so this comparison is worth more
   than the other two put together.

   Pay-as-you-go, in dollars, from their APIs & Pricing tables. */
const MUREKA = {
  /** Lyrics to song, by model. Up to 5m30s. */
  songFromLyrics: { v76: 0.03, v8v9: 0.045, v95: 0.15 },
  /** Prompt to song — a style and a prompt, no lyrics written. */
  songFromPrompt: { older: 0.30, v95: 0.50 },
  bgm: { v76: 0.03, v8v9: 0.045, v95: 0.15 },
  /** A picture or a clip in, music out. */
  soundtrack: 0.10,
  lyrics: 0.009,
  singleTrack: 0.09,
  vocalClone: 5,
  stems: { two: 0.20, five: 0.06, twelve: 0.70 },
  extend: { v76: 0.036, v8: 0.10 },
  remix: 0.20,
  regionEdit: 0.10,
  describe: 0.10,
  transcribe: 0.20,
  ttsPerHour: 4.9,
  lyricsVideo: 0.10,
} as const;

/* What a song costs us today: ElevenLabs music at $0.15 a minute, and a
   song is two minutes. `docs/ELEVENLABS-PRYSE.md` works it out off the
   page Carli sent on 8 September 2026. */
const SONG_NOW = 0.15 * 2;

console.log(`  a song brings in R${(CREDITS.song * CREDIT_RAND_LOW).toFixed(2)}`
  + ` (${CREDITS.song} credits at R${CREDIT_RAND_LOW.toFixed(2)})`);
console.log(`    what one costs us now      $${SONG_NOW.toFixed(3)}  R${rand(SONG_NOW).toFixed(2)}`);
for (const [name, usd] of [
  ['Mureka V7.6, lyrics to song', MUREKA.songFromLyrics.v76],
  ['Mureka V8/V9, lyrics to song', MUREKA.songFromLyrics.v8v9],
  ['Mureka 9.5, lyrics to song', MUREKA.songFromLyrics.v95],
  ['Mureka V8/V9, prompt to song', MUREKA.songFromPrompt.older],
  ['Mureka 9.5, prompt to song', MUREKA.songFromPrompt.v95],
] as readonly [string, number][]) {
  console.log(`    ${name.padEnd(26)} $${usd.toFixed(3)}  R${rand(usd).toFixed(2)}`
    + `  ${(CREDITS.song * CREDIT_RAND_LOW) - rand(usd) >= 0 ? '+' : ''}`
    + `R${((CREDITS.song * CREDIT_RAND_LOW) - rand(usd)).toFixed(2)}`);
}
console.log('');

ok('a song costs us more than it brings in today, on the thinnest plan',
  rand(SONG_NOW) > CREDITS.song * CREDIT_RAND_LOW,
  `R${rand(SONG_NOW).toFixed(2)} to make against`
  + ` R${(CREDITS.song * CREDIT_RAND_LOW).toFixed(2)} taken — this is the`
  + ' biggest single cost in the app and the one the whole credit scale was'
  + ' built round');

ok('  and Mureka’s working model makes it cost a fraction of that',
  MUREKA.songFromLyrics.v8v9 < SONG_NOW / 5,
  `$${MUREKA.songFromLyrics.v8v9} against $${SONG_NOW.toFixed(2)}`);

ok('  which turns the song from a loss into a margin',
  rand(MUREKA.songFromLyrics.v8v9) < CREDITS.song * CREDIT_RAND_LOW,
  `R${rand(MUREKA.songFromLyrics.v8v9).toFixed(2)} against`
  + ` R${(CREDITS.song * CREDIT_RAND_LOW).toFixed(2)}`);

ok('  and even their dearest song model is cheaper than what we pay now',
  MUREKA.songFromLyrics.v95 < SONG_NOW,
  `$${MUREKA.songFromLyrics.v95} against $${SONG_NOW.toFixed(2)} — if this`
  + ' ever fails, the write-up’s headline is wrong');

/* The one that is NOT cheaper, because a comparison with only good news in
   it is a comparison somebody stopped reading too early. */
ok('  but writing the song from a prompt alone is dearer than what we pay now',
  MUREKA.songFromPrompt.older >= SONG_NOW,
  `$${MUREKA.songFromPrompt.older} against $${SONG_NOW.toFixed(2)} — the cheap`
  + ' price is lyrics-to-song, and this app writes the lyrics first, which is'
  + ' the half that makes the cheap price the one we would actually pay');

ok('  and their lyrics are cheap enough that writing them first is free in practice',
  MUREKA.lyrics + MUREKA.songFromLyrics.v8v9 < MUREKA.songFromPrompt.older,
  `$${(MUREKA.lyrics + MUREKA.songFromLyrics.v8v9).toFixed(3)} for lyrics and a`
  + ` song against $${MUREKA.songFromPrompt.older} for prompt-to-song`);

/* ── The write-up says all of this, and says whose numbers they are ─── */
const doc = readFileSync('docs/MINIMAX-PRYSE.md', 'utf8');
ok('the write-up exists and dates the prices to the day she sent them',
  doc.includes('8 Oktober 2026') && doc.length > 2000,
  `${doc.length} characters`);
ok('  and says I could not read either page myself',
  /kon nie|blokkeer/i.test(doc),
  'a figure in a document with no provenance is a figure somebody will'
  + ' charge a member against next year');
/* ── The catch that can turn the headline finding upside down ─────────
 
   OpenArt's prices are written `$175 /Seat/mo`. That is a subscription for a
   PERSON using their product — their own screen offers Short Film, Product
   Ads, Character Builder, Image Upscale — and not a wholesale API rate for
   serving another app's members.
 
   The arithmetic above is right and is not a plan until somebody reads their
   terms. A pricing document whose headline has a licensing catch has to
   carry the catch on the same page, or the next person to open it buys on
   the number. */
ok('  and says their plans are priced per seat, which may not be a wholesale rate',
  /per sitplek|\/Seat/i.test(doc) && /herverkoop|terme/i.test(doc),
  'the comparison is arithmetic on a consumer subscription. "Commercial use'
  + ' rights" is permission to use what YOU make, not to resell generation to'
  + ' third parties, and a document that leaves that out reads as a plan');

ok('  and carries the song comparison, which is the biggest number in it',
  /Mureka/.test(doc) && /0,045|0\.045/.test(doc),
  'a song is the largest single cost in this app, and a price comparison'
  + ' that leaves it out is a comparison about the small things');

ok('  and names the credit expiry, which is the catch in every plan',
  /verval|verstryk/i.test(doc),
  'unused credits expire monthly and do not roll over — which turns a'
  + ' discount into a loss at a volume she has not reached yet');

/* ── Lyria, and the one number here that is NOT from a pricing page ──

   Carli, 8 October 2026: *"Ek is baie beindruk met google se lyria. Die
   Afrikaans is baie mooi."*

   Her sentence is the most valuable line in this whole file and the only
   measurement in it I could not have made. Every other figure here is
   arithmetic on a published price; quality in Afrikaans is a thing a
   person with an ear has to judge, in a language most of these models
   have barely been trained on, and nobody else on this project can judge
   it. It is also the exact question the letter to Mureka asks.

   The PRICE is a different matter. The screenshot she sent is an AI
   answer citing OpenRouter, RightsDocket and Pixazo — not Google. So
   `$0.08 per track` is third-hand, and this check marks it as such rather
   than letting it sit in a table looking like the others.

   What raises confidence is an independent line through OpenArt: they
   resell Lyria 3 Pro at 50 credits, which on the Wonder plan is $0.0825.
   Two routes landing within half a cent of each other is worth more than
   either alone — and it is still not Google's own page. */
const LYRIA_SAID = 0.08;
const lyriaViaOpenArt = IN_CREDITS.lyria3Pro * perCredit('wonder');

ok('the two routes to a Lyria price agree closely enough to be worth using',
  Math.abs(lyriaViaOpenArt - LYRIA_SAID) < 0.01,
  `$${LYRIA_SAID} said third-hand against $${lyriaViaOpenArt.toFixed(4)} worked`
  + ' out from OpenArt’s own credit cost — if these ever diverge, one of them'
  + ' is wrong and the write-up should stop quoting either');

ok('  and a Lyria song would cost less than what we pay now',
  rand(LYRIA_SAID) < rand(SONG_NOW),
  `R${rand(LYRIA_SAID).toFixed(2)} against R${rand(SONG_NOW).toFixed(2)}`);

ok('  but more than Mureka’s working model, so quality has to carry the difference',
  LYRIA_SAID > MUREKA.songFromLyrics.v8v9,
  `$${LYRIA_SAID} against $${MUREKA.songFromLyrics.v8v9} — which is the`
  + ' comparison her ear decides and no figure here can');

ok('  and it still leaves a margin at our price',
  rand(LYRIA_SAID) < CREDITS.song * CREDIT_RAND_LOW,
  `R${rand(LYRIA_SAID).toFixed(2)} against`
  + ` R${(CREDITS.song * CREDIT_RAND_LOW).toFixed(2)}`);

/* ── And the thing in that screenshot nobody had raised ────────────

   Both halves of her screenshot say the same thing in passing: every track
   from the official Lyria API carries an inaudible SynthID watermark.

   Nothing in this app knows that word. It is not a reason not to use
   Lyria — it sits well beside the openly-labelled-AI line in the
   marketing — but a member whose song carries a provenance watermark
   should be told, and `lib/filmrights.ts` already exists because this repo
   does not let a claim about somebody's rights go unsaid. */
const everywhere = readFileSync('docs/MINIMAX-PRYSE.md', 'utf8');
ok('the write-up raises the watermark, which the app does not yet know about',
  /SynthID/.test(everywhere),
  'every track from the official Lyria API carries an inaudible provenance'
  + ' watermark, and a member releasing that song commercially should hear'
  + ' it from us rather than from somebody else');

/* ── The line that is not about a supplier at all ───────────────

   Carli sent Lyria's terms summary on 8 October 2026. The royalty answer
   is good — no royalties, no ownership claim, commercial use permitted —
   but it carried a sentence that has nothing to do with Google:

     purely AI-generated music does not hold exclusive traditional
     copyright in most jurisdictions … you cannot stop others using
     similar material unless human creative modification is added.

   That is true of every generated song in this app today, with the
   supplier it already has. The terms page had the other direction —
   "generated music is not guaranteed to be unique", which is the risk of
   HER infringing — and had never said whether she can stop anybody else.
   Those are different questions and only one was answered.

   It is held here rather than left as prose because the page is the thing
   a member reads before releasing something, and a paragraph removed in a
   tidy-up six months from now would take the warning with it. */
const terms = readFileSync('app/terms/page.tsx', 'utf8');
ok('the terms say a generated song may not be hers to DEFEND, not only that it may not be unique',
  /not be yours to defend/i.test(terms) && /human authorship/i.test(terms),
  'the page warns that a model can produce something close to somebody'
  + ' else’s — the risk of her infringing — and never said the other'
  + ' direction: whether she can stop anybody else');

ok('  and points at the thing in this app that answers it',
  /Pro Booth/.test(terms) && /performance/i.test(terms),
  'singing on it is the human authorship that sentence turns on, and the'
  + ' room for it is already built — a warning with no way out of it is a'
  + ' warning that just makes somebody anxious');

ok('  and says it is unsettled rather than stating it as the law',
  /not settled/i.test(terms) && /attorney/i.test(terms),
  'the source is an AI summary, the position differs by country, and this'
  + ' page already refuses to bet on our own reading of somebody else’s'
  + ' contract — betting on our own reading of a statute would be worse');

/* ── The correction, kept where the wrong claim was ─────────────

   I read Carli's eight Lyria code examples and concluded the model was
   instrumental. Every example WAS instrumental and one of them listed
   `vocals` in its negative prompt — but that is a conclusion about the
   examples written as a conclusion about the model. Examples show what a
   vendor wanted to show; they do not show where a model stops.

   She then sent a song it had made: Afrikaans, sung, 2:58.

   The correction stays in the document rather than being tidied away,
   because the write-up is what somebody reads in three months and the
   reasoning that was wrong is the part worth keeping. */
ok('the write-up carries the correction about Lyria singing',
  /sing wel/.test(everywhere) && /verkeerd/.test(everywhere),
  'an inference about the examples was written as a fact about the model,'
  + ' and a document that quietly drops a wrong claim teaches nobody');

/* And the measurements off the file itself, which are the only figures in
   this file I took rather than was given. 178.6 seconds against the
   third-hand 184-second ceiling is the first independent support that
   ceiling has had. */
ok('  and the length measured off her own file supports the quoted ceiling',
  /178,6|178\.6/.test(everywhere) && /184/.test(everywhere),
  'the ceiling was third-hand; a song that uses 178.6 of a stated 184'
  + ' seconds is the first evidence for it that did not come from a summary');

ok('  and names the timed-text track, which is the part that matters',
  /tx3g/.test(everywhere) && /getydsde/.test(everywhere),
  'the hard part of a lyric video is knowing when each line lands, and that'
  + ' track is that answer — `drawCaption` and `wordsFrom`/`wordsTo` are'
  + ' already in this app, so the rest is assembly rather than an engine');

/* ── And the letter that goes with it ──────────────────────────
 
   Carli, 8 October 2026: *"Kan jy my help om vir mureka ’n custom sales
   epos te skryf, wie ons is, die vrae oor ryalties, asook, wat hulle dak
   is?"* Three questions, and the royalties one first — because if they
   claim a share of revenue on music their model made, every figure above
   is wrong and the comparison falls over. A price per song that later
   becomes a percentage of turnover is not a price. */
const letter = readFileSync('docs/EPOS-MUREKA.md', 'utf8');
ok('the letter to Mureka asks the three questions she named',
  /[Rr]oyalt/.test(letter) && /ceiling/i.test(letter) && /concurren/i.test(letter),
  'royalties, their ceiling and concurrency — and royalties first, because'
  + ' it is the one that can make every number above meaningless');
ok('  and says the size she is actually at, not a number that sounds better',
  /2\s?000/.test(letter) && /8\s?000/.test(letter),
  'an inflated figure becomes a quote written for a business that does not'
  + ' exist, and then she has to take it back');
ok('  and keeps our own costings out of it',
  !/R1[.,]58/.test(letter) && !/CREDITS/.test(letter),
  'a letter that names our margin tells the other side exactly how much'
  + ' room we have');
ok('  and says what happens if they do not answer',
  /22 Oktober 2026/.test(letter) && /niks is nie/.test(letter),
  'a deadline with no consequence behind it is a request asked twice');

if (bad) {
  console.error(`\ncheck:minimax — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:minimax — the supplier prices she sent, against our own credit'
  + ' price out of the code: direct video loses, the same model through a'
  + ' plan does not, and images are the other way round.',
);

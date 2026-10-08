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

ok('  and names the credit expiry, which is the catch in every plan',
  /verval|verstryk/i.test(doc),
  'unused credits expire monthly and do not roll over — which turns a'
  + ' discount into a loss at a volume she has not reached yet');

if (bad) {
  console.error(`\ncheck:minimax — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:minimax — the supplier prices she sent, against our own credit'
  + ' price out of the code: direct video loses, the same model through a'
  + ' plan does not, and images are the other way round.',
);

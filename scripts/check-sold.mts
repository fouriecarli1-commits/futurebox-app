/**
 * Everything the platform charges for is on the packages, and the packages
 * are drawn whole.
 *
 * ── The question, asked twice ────────────────────────────────────────────
 *
 * Carli, 22 September 2026: *"Kyk ook dat die nuwe album art afdeling deel
 * van die free, en betalings pakkette vorm en wys."* A room had been built,
 * it sold, and no package mentioned it existed. A line was added to all four.
 *
 * Carli, 24 September 2026: *"Gaan check asb ons betalings planne of dit
 * alles op ons platvorm insluit."* The same question, and it found two more:
 *
 * - The **marketing desk**, a real product at R199 a month, appeared on
 *   neither the sales page nor the account screen. It could only be found by
 *   already being inside the adverts room. A price nobody browsing prices can
 *   see is not a price.
 * - **Dubbing**, at 162 credits a minute, is the dearest thing here and was
 *   on no card. Maker gave 90 credits a month then, so a Maker member could not dub
 *   one minute — and nothing said so until they tried.
 *
 * And the album-art line she asked for by name was in `plans.ts` and still
 * not on the account screen, because that screen drew `includes.slice(0, 4)`
 * and every list is five to seven long. It formed part of the packages and
 * it did not show — which is the half of her question a check that only read
 * `plans.ts` would have answered "yes" to.
 *
 * ── So there are two rules, not one ──────────────────────────────────────
 *
 * 1. Every priced thing is named on the cards.
 * 2. The screens draw every line of them.
 *
 * The second is the one that is easy to forget exists, and it is the one
 * that made the first rule a lie for two days.
 */

import { readFileSync } from 'node:fs';
import { creditsSaid, CREDITS, TIER_CREDITS, dubCost, videoCost } from '../app/lib/credits';
import { ADDONS } from '../app/lib/addons';
import { TIER_SPECS, type Tier } from '../app/lib/plans';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const everywhere = (needle: RegExp): Tier[] =>
  (Object.keys(TIER_SPECS) as Tier[]).filter(
    (tier) => !TIER_SPECS[tier].includes.some((line) => needle.test(line)),
  );

/* ── 1. Every priced thing is named ───────────────────────────────────── */

/**
 * What the member is charged for, and the words that count as naming it.
 *
 * Keyed off the real cost table rather than a list written here, so a new
 * price cannot be added without this file being opened. `NAMED_ELSEWHERE`
 * carries the ones that are deliberately not a headline, each with its
 * reason — a card that listed all nineteen would be read by nobody.
 */
const MUST_BE_ON_EVERY_CARD: { readonly what: string; readonly says: RegExp }[] = [
  { what: 'album art by real artists', says: /[Aa]lbum art/ },
  { what: 'the marketing desk', says: /marketing desk/i },
  /* The two rooms that stopped being free on 24 September 2026. A room that
     used to cost nothing and now needs a plan is the one thing a card must
     never be vague about — somebody finding that out at the door has been
     told nothing and charged nothing, which reads as the app breaking. */
  { what: 'the Pro Booth', says: /Pro Booth/ },
  /* Renamed twice. On 1 October the editor became its own room and was called
     the Cutting room, because the room next door is the Video desk and two
     rooms whose names both begin with "Video" is how somebody opens the wrong
     one. On 4 October Carli, asked directly, said *"Nee, Video Editor"* — so
     that cost is one she has weighed and accepted, and the room carries the
     name she wants it to carry.

     The rule has not moved either time: the room is named on every card. Only
     the name it looks for has. */
  { what: 'the Video Editor', says: /video editor/i },
  { what: 'dubbing, the dearest thing here', says: /[Dd]ubbing/ },
];

for (const { what, says } of MUST_BE_ON_EVERY_CARD) {
  const missing = everywhere(says);
  ok(`${what} is on every plan`, missing.length === 0,
    `missing from ${missing.join(', ')} — a thing that is sold and is on no card is a thing nobody buys`);
}

/** Priced things that are deliberately not on the cards, and why. */
const NAMED_ELSEWHERE: Record<string, string> = {
  /* Nano Banana in the photo editor, 9 October 2026. Exempt for the same
     reason `postOut` is and not for a special one: the cards name ROOMS and
     what they cost to run, and a line for every press inside one would be
     read by nobody.

     It was exempt for a different reason for an hour — "deliberately
     without a door" — while `check:kidsafe` had the control out of the
     room and the question with her. She answered that the child version is
     the booth, so the door is back and so is the ordinary reason. */
  repaint: 'five credits to have a picture redrawn, inside the photo editor,'
    + ' whose other tools are free because they run on her own phone. The'
    + ' cards name the room; this is one press inside it',
  /* Priced before the screen that spends it exists, deliberately. Carli set
     the rule on 6 October — "elke keer wanneer iets afgelaai word kos dit
     krediete" — and a price agreed while the feature is being designed is a
     price nobody has to argue about later. It goes on the cards the day the
     post studio opens; until then a card naming a button nobody can press is
     the worse of the two mistakes. */
  postOut: 'two credits to take a finished post off the device, and the tools'
    + ' that made it free, because they run on her own phone. The cards name'
    + ' ROOMS and what they cost to run, not every press inside one — a line'
    + ' for every action would be read by nobody, which is the fault this'
    + ' list exists to avoid',
  song: 'the headline of every card, as credits and as songs',
  halfSong: 'the same price twice; the card counts full songs',
  video: 'the headline of every card, as music videos',
  browserVideo: 'free, and named as "unlimited browser sketches"',
  free: 'not a price',
  credits: 'the unit the cards are written in',
  id: 'not a price', label: 'not a price', maker: 'not a price', studio: 'not a price',
  clone: 'named as "your own voice, cloned"',
  sing: 'named as the voice, and priced at the button',
  finetune: 'named as "train a sound of your own"',
  read: 'named as "for reading and for the show"',
  transcribe: 'a step inside a read, priced at the button',
  stems: 'a Pro Booth tool, priced at the button it sits on',
  parts: 'a Pro Booth tool, priced at the button it sits on',
  clean: 'a Pro Booth tool, priced at the button it sits on',
  voiceChange: 'a Pro Booth tool, priced at the button it sits on',
  cover: 'the generated cover, priced at the button; the artist route is the card line',
  dub: 'on every card as of 24 September 2026',
  /* All four are on every card as of 24 September 2026 — the rooms by name,
     the prices in the same line. The two `MUST_BE_ON_EVERY_CARD` rules above
     are what actually holds them there; these entries only say they were
     thought about rather than forgotten. */
  marketPlan: 'on every card, priced beside the marketing desk',
  adLines: 'on every card, priced beside the marketing desk',
  cutout: 'on every card, priced beside the cutting room',
  /* The cutting room's own price, 1 October 2026. Carli: *"Onthou dat
     hierdie ook 'n betaalde produk is wat krediete werd is."* It is on every
     card in the same sentence as the room, because a room that charges and a
     room that does not are two different products and the card has to say
     which one it is selling. */
  filmOut: 'on every card, in the same sentence as the cutting room',
  /* The Pro Booth's own price, 2 October 2026, and on every card for the
     same reason: a room that charges and a room that does not are two
     different products. One a minute against the cutting room's three,
     because a mix is bounced many times by its nature — see `mixOut` in
     `lib/credits.ts` for the whole of that reasoning. */
  mixOut: 'on every card, in the same sentence as the Pro Booth',
  erase: 'on every card, in the same line as the background — same rate, same sentence',
  /* ── What is IN the film, 3 October 2026 ───────────────────────────────

     Carli: *"elke element wat op die video editing gebruik word [moet]
     krediete dra ... Dus moet die tekste, die filters, die generations ens
     alles krediete dra."*

     On every card, but as ONE line rather than five. "1 for each thing in it"
     with the cap in the same sentence and a worked example beside it — a card
     listing five one-credit rows would be read by nobody, which is the whole
     reason this list exists.

     What the card has to carry is the SHAPE, because that is what somebody is
     buying: the cutting is free, the export costs, and the price has a known
     top. The five rows themselves are shown itemised at the moment they are
     charged, on the bill in the room, where somebody can act on them. */
  filmWords: 'on every card as "1 for each thing in it"; itemised on the bill in the room',
  filmLook: 'the same line; itemised on the bill in the room',
  filmJoin: 'the same line; itemised on the bill in the room',
  filmMark: 'the same line; itemised on the bill in the room',
  filmUnder: 'the same line; itemised on the bill in the room',
};

const priced = Object.keys(CREDITS);
const unexplained = priced.filter((key) => !(key in NAMED_ELSEWHERE));
ok(`every price in the table is on a card or has a written reason not to be — ${priced.length} prices`,
  unexplained.length === 0,
  `${unexplained.join(', ')} — add it to a plan card, or to NAMED_ELSEWHERE in this file with the reason`);

/* ── Two tills, and only two ──────────────────────────────────────────────
   Carli, 24 September 2026: *"Te veel aankoop punte gaan mense afsit."*

   This loop used to walk the add-on shelf and insist each thing on it was
   named on the cards. The shelf is empty now and the rule is stronger: there
   may BE nothing on it. A plan and a top-up are the two ways to pay, and a
   third — whatever it is sold as — is a third chance to decide against all of
   them. `lib/addons.ts` says why the file still exists at all. */
ok('nothing is sold beside a plan and a top-up',
  ADDONS.length === 0,
  `${ADDONS.length} add-on(s) on the shelf — every purchase point past the second costs more than it makes`);

/* ── 2. The screens draw every line ───────────────────────────────────── */

/* This is the rule that matters, and the one that was missing. A card can
   say the right thing in `plans.ts` and show four of seven lines on the
   screen, which is what happened to the album art for two days. */
for (const file of ['app/components/Account.tsx', 'app/components/Landing.tsx']) {
  const src = readFileSync(file, 'utf8');
  if (!/includes/.test(src)) continue;
  ok(`  and ${file.split('/').pop()} draws every line of them`,
    !/includes\s*\.\s*slice\(/.test(src) && /includes\s*\.\s*map\(/.test(src),
    'it slices the list before drawing it, so the last lines are in the file and on no screen');
}

/* ── 3. A plan that cannot buy what its own card offers ───────────────── */

/* The Maker card now says dubbing starts at Studio. This is the arithmetic
   behind that sentence, so the sentence cannot outlive the prices: if
   dubbing ever comes down, or Maker's credits go up, this goes red and the
   card gets rewritten rather than quietly becoming wrong. */
const aMinute = dubCost(60);
for (const tier of ['studio', 'label'] as const) {
  const month = TIER_SPECS[tier].songs * 10;
  ok(`${TIER_SPECS[tier].name} can actually afford the dubbing its card offers`,
    month >= aMinute,
    `${month} credits a month against ${aMinute} for one minute`);
}
ok('  and Maker still cannot, which is why its card says so',
  TIER_SPECS.maker.songs * 10 < aMinute
    && TIER_SPECS.maker.includes.some((one) => /starts at Studio/.test(one)),
  `Maker has ${TIER_SPECS.maker.songs * 10} credits against ${aMinute} — if that changed, the card must change with it`);

/* ── And the same arithmetic for everything else a card quotes a price for ─

   The dubbing rule above was written for one line and caught one thing. The
   prices rose on 24 September — Carli: *"Die krediete wat ons hef vir die
   ekstra produkte is heeltemal te min"* — and a price rise is exactly when a
   card starts offering somebody something their month cannot reach.

   The unit matters and is deliberately the unit the CARD quotes. A card that
   says "8 credits per five seconds" has promised five seconds, not a minute,
   and holding it to a minute would fail a sentence that is true. A card that
   says "a month's plan is 40 credits" has promised one plan. So: every tier
   must afford at least one of every unit its own card names. */
const QUOTED: { readonly what: string; readonly credits: number }[] = [
  { what: "a month's marketing plan", credits: CREDITS.marketPlan },
  { what: 'one roll of advert lines', credits: CREDITS.adLines },
  { what: 'five seconds with the background out', credits: CREDITS.cutout },
  { what: 'five seconds with an item out', credits: CREDITS.erase },
];

for (const tier of ['maker', 'studio', 'label'] as const) {
  const month = TIER_CREDITS[tier];
  for (const one of QUOTED) {
    ok(`${TIER_SPECS[tier].name} can afford ${one.what}, which its card quotes`,
      month >= one.credits,
      `${month} credits a month against ${one.credits} — either the price comes down or the card must say which plan it starts at`);
  }
}

/* ── 3. And the headline each card leads with says the plan's real size ──

   Every paid card opens with the same shape of sentence: "100 credits a month
   — 10 full songs, or 3 music videos". Three numbers, all of them prose, none
   of them checked by anything — and the first number is the single most
   important fact on the card.

   The three went stale on 4 October 2026. The allowances were raised to 100,
   210 and 490 and the cards went on saying 90, 190 and 440 for as long as it
   took somebody to notice, which is a card that undersells a plan somebody is
   deciding whether to buy. (Underselling, this time. The same drift in the
   other direction is a card that promises music the plan cannot make.)

   So the sentence is read back and held against the constants: the credits
   against `TIER_CREDITS`, and the two counts against what a song and a short
   video actually cost. */

/* Ten seconds at the base grade, which is what "a music video" has meant on
   these cards since they were written: the standard engine's own default
   length, and the one the counts were worked out from. */
const VIDEO_SECONDS = 10;
const videoPrice = videoCost('standard', VIDEO_SECONDS);

for (const tier of ['maker', 'studio', 'label'] as const) {
  const headline = TIER_SPECS[tier].includes[0] ?? '';
  const said = /^(\d+) credits a month — (\d+) full songs, or (\d+) music videos$/
    .exec(headline);

  ok(`${TIER_SPECS[tier].name}'s headline is the sentence this check can read`,
    said !== null,
    `"${headline}" — if the shape of the line changes, change the pattern with it`
    + ' rather than letting the numbers go unread');

  if (!said) continue;
  const [, credits, songs, videos] = said.map(Number);

  ok(`  and the credits it leads with are the credits the plan grants`,
    credits === TIER_CREDITS[tier],
    `the card says ${credits}, the plan grants ${TIER_CREDITS[tier]}`);

  ok(`  and the songs it promises are what ${credits} credits buy`,
    songs === Math.floor(TIER_CREDITS[tier] / CREDITS.song),
    `the card says ${songs}, ${TIER_CREDITS[tier]} credits buy`
    + ` ${Math.floor(TIER_CREDITS[tier] / CREDITS.song)} at ${CREDITS.song} a song`);

  ok(`  and the music videos likewise, at ${VIDEO_SECONDS} seconds each`,
    videos === Math.floor(TIER_CREDITS[tier] / videoPrice),
    `the card says ${videos}, ${TIER_CREDITS[tier]} credits buy`
    + ` ${Math.floor(TIER_CREDITS[tier] / videoPrice)} at ${videoPrice} a video`);

  ok(`  and TIER_SPECS.${tier} counts the same as its own sentence`,
    TIER_SPECS[tier].songs === songs && TIER_SPECS[tier].videos === videos,
    `the fields say ${TIER_SPECS[tier].songs} songs and ${TIER_SPECS[tier].videos}`
    + ` videos, the sentence beside them says ${songs} and ${videos}`);
}

/* ── "1 credit", not "1 credits" ───────────────────────────────────────

   This app had no flat price of exactly one until the post studio, so every
   screen that printed an amount said `${n} credits` and was right every
   time. The first one-credit price made it wrong in both languages — "1
   credits" and "1 krediete" — on a button somebody presses to pay.

   Executed rather than grepped: the function is given a translator that
   answers with the key, so what is asserted is WHICH word it reaches for,
   and then the dictionary is read to check both words are really there and
   really differ. A singular that resolves to the plural would pass the
   first half on its own. */
{
  const say = (key: string) => key;
  ok('one credit is said in the singular',
    creditsSaid(1, say) === '1 credits.one', creditsSaid(1, say));
  ok('  and two in the plural',
    creditsSaid(2, say) === '2 credits.credits', creditsSaid(2, say));

  const words = readFileSync('app/lib/i18n.tsx', 'utf8');
  const said = (key: string, tongue: string): string =>
    new RegExp(`"${key}":\\s*\\{[^}]*${tongue}:\\s*"([^"]*)"`).exec(words)?.[1] ?? '';
  for (const tongue of ['en', 'af'] as const) {
    const one = said('credits.one', tongue);
    const many = said('credits.credits', tongue);
    ok(`  and ${tongue} has both words, and they differ — "${one}" / "${many}"`,
      one.length > 0 && many.length > 0 && one !== many,
      'a singular that resolves to the plural is the bug with an extra step');
  }
}

if (failures) {
  console.log(`\ncheck:sold — ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  '\ncheck:sold — everything the platform charges for is named on the packages or has a written reason '
  + 'not to be, both screens draw every line, and no card offers a plan what that plan cannot afford.',
);

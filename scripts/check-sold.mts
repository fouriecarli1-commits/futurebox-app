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
 *   on no card. Maker gives 90 credits a month, so a Maker member cannot dub
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
import { CREDITS, dubCost } from '../app/lib/credits';
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
  { what: 'the R199 marketing desk', says: /marketing desk/i },
  { what: 'dubbing, the dearest thing here', says: /[Dd]ubbing/ },
];

for (const { what, says } of MUST_BE_ON_EVERY_CARD) {
  const missing = everywhere(says);
  ok(`${what} is on every plan`, missing.length === 0,
    `missing from ${missing.join(', ')} — a thing that is sold and is on no card is a thing nobody buys`);
}

/** Priced things that are deliberately not on the cards, and why. */
const NAMED_ELSEWHERE: Record<string, string> = {
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
};

const priced = Object.keys(CREDITS);
const unexplained = priced.filter((key) => !(key in NAMED_ELSEWHERE));
ok(`every price in the table is on a card or has a written reason not to be — ${priced.length} prices`,
  unexplained.length === 0,
  `${unexplained.join(', ')} — add it to a plan card, or to NAMED_ELSEWHERE in this file with the reason`);

for (const addon of ADDONS) {
  ok(`the ${addon.id} add-on at R${addon.rand} is on the cards`,
    everywhere(new RegExp(`R${addon.rand}`)).length === 0,
    'an add-on sold from inside one room only is invisible to anybody comparing plans');
}

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

if (failures) {
  console.log(`\ncheck:sold — ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  '\ncheck:sold — everything the platform charges for is named on the packages or has a written reason '
  + 'not to be, both screens draw every line, and no card offers a plan what that plan cannot afford.',
);

/**
 * Does every credit price cover what the work actually costs us?
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * Because for some months it did not, and nothing noticed.
 *
 * `CREDITS.dub` was 15 credits a minute against an upstream cost of R40,48 a
 * minute. At the credit prices the tiers work out to, that was about R18,60
 * charged for R40,48 spent: R21,88 lost on every minute anybody dubbed, live
 * in `/api/dub`, for as long as the number stood.
 *
 * `check-prices.mts` did not catch it and was never going to. It asks a
 * different and equally necessary question — does the number on the button
 * match the number that is charged — and the answer was yes. Both sides
 * agreed on a price that was too low. Two checks, two questions:
 *
 *     check:prices        the button and the charge agree
 *     check:kredietkoste  and the price they agree on covers the bill
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * Every action priced in credits must sell for more than it costs us, at the
 * WORST credit rate any tier gets — because a member on that tier is who will
 * press it. Anything at or below 1,0x is a leak; anything under the warning
 * mark is thin enough to be worth knowing about before an invoice says so.
 *
 * The upstream rates come from `docs/ELEVENLABS-PRYSE.md`, which derives them
 * from ElevenLabs' own page: a plan is a dollar budget, and $990 buys 6 600
 * minutes of music, 8 250 of stem separation, 4 500 hours of transcription,
 * 9,9 million characters of speech, or 450 minutes of dubbing v2.
 *
 * ── What this check cannot do ────────────────────────────────────────────
 *
 * Video is deliberately not asserted. `server/video/eleven.ts` carries two
 * numbers for the same clip that are forty-three times apart, and a check
 * built on a number nobody trusts would either pass wrongly or fail wrongly.
 * It is reported instead of asserted, and it stays that way until a real
 * invoice settles it. See `docs/PRYSVOORSTEL.md` §6.
 */
import { CREDITS, TIER_CREDITS, readCost } from '../app/lib/credits.ts';
import { TIER_SPECS, RAND_PER_USD } from '../app/lib/plans.ts';
import { PER_PICTURE } from '../app/lib/server/picture.ts';
import { paid } from '../app/data/aiprices.ts';

let bad = 0;
const say = (ok: boolean, line: string) => {
  if (!ok) bad += 1;
  console.log(`${ok ? '  ok ' : '  ✗  '} ${line}`);
};

/** What ElevenLabs Business costs a month, VAT in. `docs/MAANDELIKSE-KOSTE.md`. */
const BUSINESS_RAND = 18216;

/* Their own equivalences at $990. Each is "how much of this thing the whole
   plan buys", so the plan's rand over that number is the rand per unit. */
const MUSIC_PER_MIN = BUSINESS_RAND / 6_600;
const STEMS_PER_MIN = BUSINESS_RAND / 8_250;
const SPEECH_PER_MIN = BUSINESS_RAND / (4_500 * 60);
const CHAR = BUSINESS_RAND / 9_900_000;
const DUB_PER_MIN = BUSINESS_RAND / 450;
/** Kits is a flat R640 a month against a 400-minute ceiling. */
const SING_PER_MIN = 640 / 400;

/* ── The model calls, costed by the app's own money model ────────────────
   `paid()` takes the four token counts and returns rand, and it is what the
   `ai_costs` rows are priced with — so the check and the ledger cannot
   disagree about what a call costs. Both are worked at their route's
   `max_tokens` ceiling rather than at an average, because the ceiling is the
   only figure that stays true whatever the model sends back. */
const PLAN_CALL = paid({ input: 500, output: 12_000, cacheRead: 0, cacheWrite: 0 });
const ADS_CALL = paid({ input: 500, output: 8_000, cacheRead: 0, cacheWrite: 0 });

/* fal.ai VEED video background removal, standard grade: $0.0225 per thirty
   frames, which at 30fps is one second. The dearest grade that may be picked,
   for the reason `CREDITS.video` gives.

   Per FIVE SECONDS, because that is the unit `filterCost` charges in and a
   check must measure the unit the till uses. Held per minute here first, it
   made a five-second background removal look twelve times better value than
   it is. */
const CUTOUT_PER_5S = 0.0225 * 5 * RAND_PER_USD;

/**
 * Music.ai reading a song — chords, key, tempo — per minute of audio.
 *
 * $0.07, and for once that is a MEASURED number rather than a published
 * one. Carli opened the Chords and Beat Mapping workflow on 5 October 2026
 * and their own editor printed `Estimated (per minute) $0.07` beside a run
 * that finished in 7.44 seconds and came back with `Eb major` and `bpm 76`.
 *
 * It matters that it is measured. `docs/DIENSTE-EN-KOSTE.md` said of
 * `CREDITS.read`: *"Die presiese koers kon nie hiervandaan nagegaan word nie
 * — music.ai is ook geblokkeer"* — the host is refused from the build
 * environment, so this number could not be looked up, only guessed at and
 * set deliberately high. This row is the guess finally meeting a rate.
 *
 * Only `read`. The stem workflow's own estimate was not on that screen and
 * is not inferred from this one: a different workflow is a different set of
 * modules and a different price, and a cost check built on an inferred rate
 * is the adjacent measurement this file exists to prevent. `CREDITS.parts`
 * stays unheld until somebody reads its estimate off the same editor.
 */
const SONGREAD_PER_MIN = 0.07 * RAND_PER_USD;

/**
 * The worst rand-per-credit any tier gets.
 *
 * Bulk tiers give more credits for each rand, so the cheapest credit in the
 * app is the one to price against — that member can press the same button.
 */
const RATES = (['maker', 'studio', 'label'] as const).map(
  (tier) => TIER_SPECS[tier].rand / TIER_CREDITS[tier],
);
const WORST = Math.min(...RATES);

console.log(`\nA credit sells for between R${Math.max(...RATES).toFixed(3)} and R${WORST.toFixed(3)}.`);
console.log(`Everything below is priced against R${WORST.toFixed(3)} — the cheapest one, because that member presses the same buttons.\n`);

/** Below this, an action is losing money outright. */
const FLOOR = 1;

/**
 * And one whole credit of margin on top of that, which is Carli's rule.
 *
 * Carli, 7 October 2026: *"alles in die app wat na 'n outside supplier toe
 * gaan moet darem een krediet meer vra as wat die supplier aan ons eis, sodat
 * ons ook op daardie manier geld maak."*
 *
 * `FLOOR` only says an action is not sold below cost. A job costing R1.60 and
 * charged one credit (R1.49 at the cheapest tier) fails that; a job costing
 * R1.40 charged one credit passes it with nine cents in it, which is not a
 * business, it is a rounding error. Her rule puts a floor under the MARGIN
 * rather than under the price: whatever the supplier bills, the app charges
 * that and one credit more.
 *
 * Expressed in rand because that is what the two sides have in common — the
 * supplier bills rand and a credit sells for rand — and against `WORST`, the
 * cheapest credit anybody gets, because that member presses the same button.
 *
 * It is a floor and not a target. Nearly everything in this file clears it
 * many times over; what it catches is the next price set by looking at a
 * supplier's page and adding nothing.
 */
const OVER_SUPPLIER = WORST;
/** Below this it is not losing money but has no room in it. */
const THIN = 1.8;

/**
 * The multiple a PRODUCT is expected to clear, as against routine work.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 24 September 2026: *"Die krediete wat ons hef vir die ekstra
 * produkte is heeltemal te min."* She was right, and the table below is what
 * should have told me so before she did.
 *
 * Read it and there are plainly two families. Stems, cleaning, a voice
 * change, a song and a half song all land on 3.0x — that is ElevenLabs
 * per-minute routine work, file in and the same file back changed. Everything
 * sold as a product sits far above it: video at 7.2x, dubbing at 6.6x, a read
 * at 6.0x.
 *
 * The first pricing of the marketing desk and the editor filters took the
 * 3.0x cluster for "the house rate" and landed all four new actions on it,
 * including a VIDEO operation while the app's own video sat at 7.2x two lines
 * up in this check's own output.
 *
 * So the distinction is asserted rather than left to be noticed. Nothing
 * fails on it — a low multiple on a genuinely commodity job is correct — but
 * a product priced like a stem separation is now printed as such, next to the
 * number it should have been measured against.
 */
const PRODUCT = 6;

const priced: {
  what: string;
  credits: number;
  cost: number;
  product?: boolean;
  decided?: string;
  /**
   * A rate rather than a press.
   *
   * Carli's supplier-plus-one rule is about what somebody is CHARGED for one
   * action. A row that prices an internal unit — 150 characters of reading —
   * is not an action: nobody is ever billed for 150 characters on its own,
   * because `readCost` has a floor of two credits. Held against the smallest
   * real charge instead, which is its own row below.
   *
   * Marked rather than left out, because the multiple it prints is still the
   * thing to look at when the supplier's rate moves.
   */
  rate?: boolean;
}[] = [
  { product: true, decided: 'Carli, 24 Sept: the plan is prepaid capacity, so a dearer song adds nothing to margin. See credits.ts',
    what: 'a two-minute song', credits: CREDITS.song, cost: 2 * MUSIC_PER_MIN },
  { product: true, decided: 'half of the song, same decision',
    what: 'a one-minute half song', credits: CREDITS.halfSong, cost: MUSIC_PER_MIN },
  { what: 'splitting stems, per minute', credits: CREDITS.stems, cost: STEMS_PER_MIN },
  { what: 'transcribing, per minute', credits: CREDITS.transcribe, cost: SPEECH_PER_MIN },
  { what: 'cleaning a take, per minute', credits: CREDITS.clean, cost: STEMS_PER_MIN },
  { what: 'a voice change, per minute', credits: CREDITS.voiceChange, cost: STEMS_PER_MIN },
  { what: 'singing it, per minute (Kits)', credits: CREDITS.sing, cost: SING_PER_MIN },
  { product: true, what: 'dubbing, per minute', credits: CREDITS.dub, cost: DUB_PER_MIN },
  /* `readCost` is one credit per 150 characters with a floor of two, so one
     credit is what 150 characters must cover. */
  { rate: true, what: 'reading 150 characters (a rate, not a press)', credits: 1, cost: 150 * CHAR },
  /* And the smallest thing anybody is actually charged for a read, which is
     what Carli's rule governs: `readCost` is `Math.max(2, ...)`, so two
     credits buys up to 300 characters and nothing smaller can be billed. */
  { what: 'the smallest read anybody is charged (300 characters)', credits: readCost(300), cost: 300 * CHAR },
  /* Not the line above. That one is a voice reading text aloud; this one is
     Music.ai reading a song for its chords, key and tempo. Two different
     suppliers and two different bills under one English word, which is
     worth the sentence.

     Printed here for the multiple, and held by the rule below rather than by
     this row. A minute costs R1.12, so even ONE credit at R1.49 clears the
     floor: this row cannot fail at any price the app can charge, and a row
     that cannot fail is a row that reassures without asserting. Breaking
     `read` to 1 credit and watching it still say `ok` is how that was
     found. */
  { what: 'reading a song, per minute (Music.ai)', credits: CREDITS.read, cost: SONGREAD_PER_MIN },
  /* The three rooms that used to be sold separately, or not at all. Entering
     them is included in every paid plan; generating in them is these. */
  { product: true, what: 'a marketing plan', credits: CREDITS.marketPlan, cost: PLAN_CALL },
  { product: true, what: 'eight advert lines', credits: CREDITS.adLines, cost: ADS_CALL },
  { product: true, what: 'a background taken out, per five seconds', credits: CREDITS.cutout, cost: CUTOUT_PER_5S },
  /* Estimated at the dearest thing in the same family — see `CREDITS.erase`.
     Held against that same rate so it can never quietly fall under it. */
  { product: true, what: 'an item taken out, per five seconds', credits: CREDITS.erase, cost: CUTOUT_PER_5S },
  /* A still picture changed by saying what to change — Nano Banana on her
     own Google project. `PER_PICTURE` is micro-dollars and is itself the
     expensive end of an unread price, so this asserts the margin against a
     figure deliberately set too high. If it passes here it passes on the
     real invoice. */
  { product: true, what: 'a still picture changed by saying what to change', credits: CREDITS.repaint, cost: (PER_PICTURE / 1_000_000) * RAND_PER_USD },
];

for (const one of priced) {
  const sold = one.credits * WORST;
  const over = sold / one.cost;
  const line = `${one.what}: ${one.credits} credits = R${sold.toFixed(2)}, costs R${one.cost.toFixed(2)} — ${over.toFixed(1)}x`;
  if (over < FLOOR) {
    say(false, `${line}  ← SOLD BELOW COST`);
  } else if (!one.rate && sold < one.cost + OVER_SUPPLIER) {
    /* Above cost but not by a whole credit — see `OVER_SUPPLIER`. */
    say(false,
      `${line}  ← UNDER THE SUPPLIER-PLUS-ONE RULE:`
      + ` R${(one.cost + OVER_SUPPLIER).toFixed(2)} is the least this may sell for,`
      + ` which is ${Math.ceil((one.cost + OVER_SUPPLIER) / WORST)} credit(s)`);
  } else if (over < THIN) {
    say(true, `${line}  (thin, but above cost)`);
  } else if (one.product && over < PRODUCT && one.decided) {
    /* Below the product multiple, and settled. A check that keeps flagging a
       decision somebody already took is a check people learn to scroll past,
       and the next real finding scrolls past with it. So it reports the
       decision instead of the finding. */
    say(true, `${line}  ← below the product rate, decided: ${one.decided}`);
  } else if (one.product && over < PRODUCT) {
    /* Not a failure. A product below the product multiple may be a deliberate
       loss-leader — but it may equally be the mistake of 24 September, and
       that one was invisible until somebody said so out loud. */
    say(true, `${line}  ← priced like routine work, not like a product`);
  } else {
    say(true, line);
  }
}

/**
 * The order of the three per-minute jobs, which the floor cannot see.
 *
 * `credits.ts` says of the song read: *"Deliberately not lower than
 * `stems`: it is a heavier job than splitting a voice off."* That was a
 * decision, and nothing held it. The floor cannot: a minute of reading costs
 * R1.12, so every price the app can charge clears it, and the row above says
 * `ok` at one credit as loudly as at six.
 *
 * This is what can actually break. Reprice stems upward, or read downward,
 * and the sentence in `credits.ts` becomes false while every other number
 * in this file stays green.
 */
console.log('');
say(
  CREDITS.read >= CREDITS.stems,
  `reading a song (${CREDITS.read}) is priced at or above splitting it (${CREDITS.stems})`
  + ' — credits.ts calls the read the heavier job, and the cost floor is too'
  + ' far below both to notice if that stopped being true',
);
say(
  CREDITS.parts >= CREDITS.stems,
  `named parts (${CREDITS.parts}) are priced at or above two-way stems (${CREDITS.stems})`
  + ' — more stems out of the same minute is more of their work, not less',
);

/* Reported, not asserted — see the header. Two numbers, forty-three times
   apart, and no invoice yet to say which is real. */
console.log('');
const VIDEO_UNIT_STATED = 3.44;
const videoSold = CREDITS.video * WORST;
console.log(
  `  --  five seconds of video: ${CREDITS.video} credits = R${videoSold.toFixed(2)}. ` +
    `The file says about R${VIDEO_UNIT_STATED.toFixed(2)} (${(videoSold / VIDEO_UNIT_STATED).toFixed(1)}x) ` +
    `and the music-side rate says about R0,06 (${(videoSold / 0.06).toFixed(0)}x). Not asserted until an invoice settles it.`,
);

if (bad > 0) {
  console.log(
    `\ncheck:kredietkoste — ${bad} price(s) do not hold: below what they cost`
    + ' us, or out of the order credits.ts states.',
  );
  process.exitCode = 1;
} else {
  console.log(
    '\ncheck:kredietkoste — every credit price covers its own upstream bill,'
    + ' and every one that goes to an outside supplier charges at least a whole'
    + ' credit more than that supplier bills us.',
  );
}

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
import { CREDITS, TIER_CREDITS } from '../app/lib/credits.ts';
import { TIER_SPECS } from '../app/lib/plans.ts';

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
/** Below this it is not losing money but has no room in it. */
const THIN = 1.8;

const priced: { what: string; credits: number; cost: number }[] = [
  { what: 'a two-minute song', credits: CREDITS.song, cost: 2 * MUSIC_PER_MIN },
  { what: 'a one-minute half song', credits: CREDITS.halfSong, cost: MUSIC_PER_MIN },
  { what: 'splitting stems, per minute', credits: CREDITS.stems, cost: STEMS_PER_MIN },
  { what: 'transcribing, per minute', credits: CREDITS.transcribe, cost: SPEECH_PER_MIN },
  { what: 'cleaning a take, per minute', credits: CREDITS.clean, cost: STEMS_PER_MIN },
  { what: 'a voice change, per minute', credits: CREDITS.voiceChange, cost: STEMS_PER_MIN },
  { what: 'singing it, per minute (Kits)', credits: CREDITS.sing, cost: SING_PER_MIN },
  { what: 'dubbing, per minute', credits: CREDITS.dub, cost: DUB_PER_MIN },
  /* `readCost` is one credit per 150 characters with a floor of two, so one
     credit is what 150 characters must cover. */
  { what: 'reading 150 characters', credits: 1, cost: 150 * CHAR },
];

for (const one of priced) {
  const sold = one.credits * WORST;
  const over = sold / one.cost;
  const line = `${one.what}: ${one.credits} credits = R${sold.toFixed(2)}, costs R${one.cost.toFixed(2)} — ${over.toFixed(1)}x`;
  if (over < FLOOR) {
    say(false, `${line}  ← SOLD BELOW COST`);
  } else if (over < THIN) {
    say(true, `${line}  (thin, but above cost)`);
  } else {
    say(true, line);
  }
}

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
  console.log(`\ncheck:kredietkoste — ${bad} action(s) sell below what they cost us.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:kredietkoste — every credit price covers its own upstream bill.');
}

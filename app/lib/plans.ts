/**
 * What FutureBox charges, and what it costs to deliver.
 *
 * One file, so a price can never mean two different things in two places. The
 * pricing page, the entitlement caps and the checkout all read from here.
 *
 * ── The shape of it ──────────────────────────────────────────────────────
 *
 * A ladder, not a wall. Somebody who will never subscribe can still spend
 * something, and somebody who spends twice is shown that subscribing is
 * cheaper than a third purchase.
 *
 *   free      unlimited browser sketches, and two 15-second sung previews
 *             with a watermark. Costs almost nothing to give away, which is
 *             what makes it survivable — see the note on abuse below.
 *   R14       open one preview into the full-length song. Still watermarked.
 *   +R35      keep that song: clean, downloadable, the rights are yours.
 *             R14 + R35 = R49, so opening first never costs extra. Charging
 *             the full R49 on top of the R14 would earn more per sale and is
 *             the reason this reads as a credit rather than a second price.
 *   monthly   for people making more than a couple of songs.
 *
 * ── Why the free tier is two 15-second previews ──────────────────────────
 *
 * Not meanness — arithmetic. At a 5% purchase rate every buyer carries twenty
 * free users, so the free tier is roughly 80% of the music bill. Two full
 * songs given away costs about R102 per eventual sale; two 15-second previews
 * cost about R13. The second number is a business and the first is not.
 *
 * It is also the whole anti-abuse strategy. Somebody with a hundred email
 * addresses can farm two hundred watermarked 15-second clips, and nobody
 * wants those. Make the free thing not worth stealing and there is nothing
 * left to defend.
 *
 * ── What the monthly prices have to carry ────────────────────────────────
 *
 * Fixed, per month, at R16/USD:
 *
 *   ElevenLabs Business   R15,840   the only genuinely expensive input
 *   Anthropic (copilot)    ~R1,500   small per message, adds up at volume
 *   Workshops               R4,000   production, or arranging the real thing
 *   Competitions            R3,000   prizes
 *   Supabase Pro              R400
 *   Vercel Pro                R320
 *   GitHub                     R64
 *   Video                        R0   drawn in the viewer's own browser
 *                          ────────
 *                           R25,124
 *
 * Video being free is worth saying out loud: it is a permanent margin
 * advantage over anything that calls a hosted video model per clip.
 *
 * Break-even lands near 130 paying members on a 60/30/10 mix across the three
 * tiers. At 250 members the month clears roughly R23,000.
 *
 * ── Start smaller than Business ──────────────────────────────────────────
 *
 * R15,840 a month is not a day-one commitment. ElevenLabs Creator ($22) or
 * Pro ($99) carries the first few hundred members; the per-song cost is
 * roughly double, which the margins below absorb. Step up when the credit
 * ceiling actually binds, not before.
 */

import { priceFor, regionByCode, type LocalPrice, type Region } from './pricing';

export type Tier = 'free' | 'maker' | 'studio' | 'label';

/** Ordered cheapest first, so "the next tier up" is a list position. */
export const TIERS: readonly Tier[] = ['free', 'maker', 'studio', 'label'];

export interface TierSpec {
  readonly id: Tier;
  readonly name: string;
  /** Rand per month. Regional pricing converts from this. */
  readonly rand: number;
  /** Full-length songs included per month. */
  readonly songs: number;
  /** The one line that says who it is for. */
  readonly who: string;
  readonly includes: readonly string[];
}

export const TIER_SPECS: Record<Tier, TierSpec> = {
  free: {
    id: 'free',
    name: 'Free',
    rand: 0,
    songs: 0,
    who: 'Hear what it can do before anything costs anything.',
    includes: [
      'Unlimited browser sketches — real audio, made on your device',
      'Two 15-second sung previews, watermarked',
      'Music videos, in full',
      'Hooks, the timeline, the soundboard and the radar',
      'Enter competitions on the same terms as everyone',
    ],
  },
  maker: {
    id: 'maker',
    name: 'Maker',
    rand: 149,
    songs: 12,
    who: 'A song or two a week, kept and posted.',
    includes: [
      '12 full songs a month, clean and yours',
      'No watermark, no per-song charge',
      'The copilot, uncapped',
      'Post to your own channels',
      'Every workshop',
    ],
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    rand: 349,
    songs: 40,
    who: 'Releasing regularly, and pitching for collabs.',
    includes: [
      '40 full songs a month',
      'Everything in Maker',
      'Ask FutureBox to boost a collab',
      'The full radar — every item, every reason',
      'Priority in competition judging queues',
    ],
  },
  label: {
    id: 'label',
    name: 'Label',
    rand: 899,
    songs: 120,
    who: 'Running a catalogue, or a room full of artists.',
    includes: [
      '120 full songs a month',
      'Everything in Studio',
      'Five seats on one account',
      'A say in which workshops get made',
    ],
  },
};

/** The two one-off purchases, for people who will never subscribe. */
export const ONE_OFF = {
  /** Open a 15-second preview into the whole song. Watermark stays. */
  open: { rand: 14, label: 'Hear the whole thing' },
  /**
   * Keep it clean and downloadable. Priced so that open + keep equals what
   * keeping costs on its own — opening first is never punished.
   */
  keep: { rand: 35, label: 'Keep it, clean', fullRand: 49 },
} as const;

/* ────────────────────────────────────────────────────── what it costs us ─ */

/** Credits ElevenLabs charges per minute of music. */
const CREDITS_PER_MINUTE = 900;
/** Rand per credit on the Business plan: $990 for 11,000,000, at R16/USD. */
const RAND_PER_CREDIT = (990 * 16) / 11_000_000;

export const PREVIEW_SECONDS = 15;
export const FREE_PREVIEWS = 2;
/** What a full song is, in minutes, for both costing and generation. */
export const SONG_MINUTES = 2;

export function randCost(minutes: number): number {
  return minutes * CREDITS_PER_MINUTE * RAND_PER_CREDIT;
}

/** What one full song costs to generate. About R2.59 on Business. */
export const SONG_COST = randCost(SONG_MINUTES);

/**
 * What a payment gateway takes. South African gateways sit near 3.5% plus a
 * couple of rand fixed, and the fixed part is what hurts: it is 18% of R14 and
 * 8% of R49. That is the known cost of a low entry price, accepted on purpose
 * because a lower step converts more people.
 */
export function gatewayFee(rand: number): number {
  return rand * 0.035 + 2;
}

/** What a tier leaves after its songs and the gateway. */
export function marginOf(tier: Tier): number {
  const spec = TIER_SPECS[tier];
  if (spec.rand === 0) return 0;
  return spec.rand - spec.songs * SONG_COST - gatewayFee(spec.rand);
}

/** Monthly fixed costs, in rand. Edit these as the real bills arrive. */
export const FIXED_MONTHLY: Record<string, number> = {
  'ElevenLabs Business': 990 * 16,
  'Anthropic (copilot)': 1500,
  Workshops: 4000,
  Competitions: 3000,
  'Supabase Pro': 400,
  'Vercel Pro': 320,
  GitHub: 64,
  Video: 0,
};

export const FIXED_TOTAL = Object.keys(FIXED_MONTHLY).reduce(
  (sum, key) => sum + FIXED_MONTHLY[key],
  0,
);

/** Members needed to cover the fixed base, on a 60/30/10 mix. */
export function breakEvenMembers(): number {
  const blended =
    0.6 * marginOf('maker') + 0.3 * marginOf('studio') + 0.1 * marginOf('label');
  return Math.ceil(FIXED_TOTAL / blended);
}

/* ──────────────────────────────────────────────────────────── display ─── */

/**
 * These prices were chosen in rand, against rand costs, for a South African
 * market. So rand is the base — not dollars.
 *
 * `pricing.ts` converts a *dollar* amount by a purchasing-power factor, which
 * means a rand figure has to be turned back into the dollar it represents
 * before it can be sent anywhere else. Dividing by the exchange rate is the
 * wrong move, and was the first thing I got wrong here: it showed R6 for a R14
 * price, because R14 of local burden is about $1.94 of pricing power rather
 * than $0.88 of currency.
 */
const ZA_PPP = regionByCode('ZA')?.pppFactor ?? 7.2;

/** What a rand price is worth as a dollar burden, for every other region. */
function asDollarBurden(rand: number): number {
  return rand / ZA_PPP;
}

/**
 * At home the number is shown exactly as chosen. `tidy()` rounds to charm
 * prices, which is right when deriving a foreign price and wrong here: it
 * turns R35 into R34, and then opening a song plus keeping it no longer adds
 * up to the R49 the app promises it will.
 */
function localised(rand: number, region: Region): LocalPrice {
  if (region.code === 'ZA') {
    return {
      amount: rand,
      currency: 'ZAR',
      display: `R${rand.toLocaleString('en-ZA')}`,
      usd: asDollarBurden(rand),
    };
  }
  return priceFor(asDollarBurden(rand), region);
}

export function tierPrice(tier: Tier, region: Region): LocalPrice {
  const spec = TIER_SPECS[tier];
  if (spec.rand === 0) {
    return { amount: 0, currency: region.currency, display: 'Free', usd: 0 };
  }
  return localised(spec.rand, region);
}

export function oneOffPrice(rand: number, region: Region): LocalPrice {
  return localised(rand, region);
}
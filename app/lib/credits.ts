/**
 * Credits — one currency across everything that costs money to make.
 *
 * The scale is built backwards from what each thing actually costs, so that a
 * credit means roughly the same amount of money whichever way it is spent. A
 * currency that is generous on video and mean on music is not a currency, it
 * is a subsidy with a counter on it.
 *
 * ── What is measured and what is not ─────────────────────────────────────
 *
 * Songs and video are derived from published rates and are trustworthy:
 *
 *   a 2-minute song   900 credits/min on ElevenLabs Business  →  R2.59
 *   a 10-second video 70 credits on Kling Ultra               →  R6.89
 *
 * At 10 credits for a song those land at R0.259 and R0.230 a credit — within
 * 12% of each other, which is what makes one currency honest across both.
 *
 * The rest — reading a script, cloning a voice, training a sound — are priced
 * from estimates, marked below, and set deliberately high. Under-pricing an
 * expensive thing is a bill you discover at the end of the month; over-pricing
 * it is a number you can lower once you have measured it.
 *
 * ── Where the counter appears, and where it must not ─────────────────────
 *
 * On generation: making a song, a video, a reading. Not on the booth. Singing
 * a take again, retuning it, moving the words — those cost nothing to run and
 * they are the reason anybody stays. A counter ticking while somebody decides
 * whether to try one more take is the fastest way to make them stop trying.
 */

import type { Tier } from './plans';

/* ──────────────────────────────────────────────────────────── the scale ─ */

export const CREDITS = {
  /** A full song: two minutes, clean, yours. */
  song: 10,
  /**
   * The free format: one minute, watermarked. Half a song, and the whole point
   * of it is that hearing the rest costs credits.
   */
  halfSong: 5,
  /** Ten seconds from the video engine. */
  video: 30,
  /**
   * A cover for a song.
   *
   * Two, because it is genuinely cheap: one square from the lightest image
   * model, which is a fraction of a cent. Priced above zero anyway — a free
   * button gets pressed forty times in a row by somebody deciding, and forty
   * of anything is a bill.
   */
  cover: 2,
  /** Drawn on the device instead. Costs nothing to run, so it costs nothing. */
  browserVideo: 0,
  /** Splitting a song into the voice and the backing. */
  stems: 4,
  /** Hearing what was actually sung, so the words can follow it. */
  transcribe: 2,
  /** Taking the room out of a recording. */
  clean: 2,
  /** A recording said again in another voice. */
  voiceChange: 4,
  /** Making a voice from a minute of somebody reading. Estimated. */
  clone: 20,
  /** Training a sound of your own. Estimated, and deliberately high. */
  finetune: 300,
  /** A minute of an episode dubbed into another language. Estimated. */
  dub: 15,
} as const;

/**
 * A song, by its length.
 *
 * Five credits a minute, rounded up, which is what makes the free format
 * exactly half a song: one minute for five, two minutes for ten. Nobody has to
 * be told the rule — it is the same rule everywhere.
 */
/**
 * What a video costs the member, by grade.
 *
 * Three rungs because the engines behind them differ by thirteen times the
 * money — R2.62, R10.72 and R33.48 a clip, from this project's own invoices —
 * and a single price would either lose money on the dear one or overcharge for
 * the cheap one. At 30 credits ≈ R30 on Studio, every rung clears its cost
 * with room for the failures and the retries.
 *
 * Read by the desk to label the button and by the route to take the money.
 * They must never be two numbers: a button promising one price while the
 * server charges another is the sort of thing people are right to be angry
 * about.
 */
export type VideoGrade = 'standard' | 'better' | 'premium';

export function videoCost(grade: VideoGrade): number {
  if (grade === 'premium') return CREDITS.video * 4;
  if (grade === 'better') return CREDITS.video * 2;
  return CREDITS.video;
}

export function songCost(seconds: number): number {
  return Math.max(CREDITS.halfSong, Math.ceil(Math.max(0, seconds) / 60) * CREDITS.halfSong);
}

/**
 * An episode dubbed into another language, by its length.
 *
 * ElevenLabs bill dubbing by the minute of source audio, and it is the dearest
 * thing this app asks them for by some distance — a translation, a voice match
 * and a re-performance of every speaker, not a read. Priced per minute and
 * rounded up, with a floor so that dubbing a thirty-second trailer still costs
 * something.
 *
 * Estimated, like the read, and for the same reason: the exact rate is not
 * knowable from a pricing page with any confidence. What it should be checked
 * against is what the account is actually billed, once there are real dubs to
 * measure — the same conclusion `video_costs` exists for.
 */
export function dubCost(seconds: number): number {
  return Math.max(CREDITS.dub, Math.ceil(Math.max(0, seconds) / 60) * CREDITS.dub);
}

/**
 * A script read aloud, by length.
 *
 * Estimated. ElevenLabs charge speech per character, and a long episode is a
 * real bill rather than a rounding error — a six-thousand-character read is
 * several minutes of audio. Priced per 150 characters until the exact rate is
 * confirmed against their own account page, and rounded up so that a short
 * line still costs something.
 */
export function readCost(characters: number): number {
  return Math.max(2, Math.ceil(Math.max(0, characters) / 150));
}

/* ────────────────────────────────────────────────── what each tier gets ─ */

/**
 * Credits included every month. Free is a monthly allowance like any other.
 *
 * These are sized against the engines rather than against the price. Both
 * engines are fixed monthly buckets — 12,222 minutes of music and 371 videos —
 * so the question is not what a tier can afford to give away, it is how many
 * members the buckets hold if everybody spends everything.
 *
 * At 200/600/1600 they held 96, and break-even was 136: the two numbers never
 * met, and a full month would have run the music engine dry before the
 * business worked. At these numbers they hold 155 against a break-even of 109.
 * There is air between them now.
 */
export const TIER_CREDITS: Record<Tier, number> = {
  // Two half songs, given whole on the first visit of the month.
  //
  // There was a weekly refill on top of this — five now, five on Monday — as a
  // reason to come back. It was not one. The month's budget is ten, so the
  // second Monday's five was the last, and "five every Monday" then said
  // nothing for the rest of the month. A weekly promise that stops halfway
  // through is worse than no weekly promise, and making it genuinely weekly
  // costs 20 to 25 a month — which puts what the engines can serve *below*
  // what break-even needs. So it is one grant, and the card says one grant.
  free: 10,
  maker: 120,
  studio: 350,
  label: 800,
};

/**
 * The most credits an account may hold.
 *
 * Not meanness — the video engine has a hard monthly ceiling, and a hundred
 * people who saved six months of credits and spent them in one week would go
 * through it in a day. On a paid tier the cap is three months of the
 * allowance, which nobody reaches by using the product normally.
 */
export function capFor(tier: Tier): number {
  return tier === 'free' ? TIER_CREDITS.free : TIER_CREDITS[tier] * 3;
}

/**
 * The most that may be *granted* in one calendar month, whatever the balance.
 *
 * The same number as the monthly allowance, which is the point: this runs on
 * every visit, and a second visit must not be a second month.
 */
export function budgetFor(tier: Tier): number {
  return TIER_CREDITS[tier];
}

/* ─────────────────────────────────────────────────────────── the packs ─ */

export interface Pack {
  readonly id: string;
  readonly credits: number;
  readonly rand: number;
}

/**
 * Top-ups, shown when somebody runs out and nowhere else.
 *
 * ── The rule these have to obey ──────────────────────────────────────────
 *
 * **Every pack must cost more per credit than every plan.** Not most of them,
 * and not on average: every one against every one. A pack that undercuts a
 * subscription is a reason not to subscribe, and a subscription business whose
 * own shop sells the same thing cheaper has no subscribers.
 *
 * The first version of this got it exactly backwards — the packs were 47% to
 * 60% *cheaper* per credit than the dearest plan, because they were designed
 * to reward a heavy user. A heavy user rewarded with a better rate than the
 * plan is a heavy user who cancels the plan.
 *
 * So the rate here sits above the dearest plan (Maker, at R1.24 a credit),
 * and `capacity.test` refuses to pass if a pack ever slips under it.
 *
 * A volume discount *between the packs* is still fine, and still true here —
 * it is the comparison against the plans that has to hold.
 *
 * Nothing under R99: the gateway takes R2 flat on every charge, which is 13%
 * of a R20 pack and 6% of a R99 one. A cheap pack is a donation to Paystack.
 */
export const PACKS: readonly Pack[] = [
  { id: 'small', credits: 60, rand: 99 },
  { id: 'mid', credits: 150, rand: 239 },
  { id: 'large', credits: 400, rand: 599 },
];

export function packById(id: string): Pack | null {
  return PACKS.find((one) => one.id === id) ?? null;
}

/* ──────────────────────────────────────────────────────────── in words ─ */

/** What a balance buys, said in things rather than in credits. */
export function buys(credits: number): string {
  const songs = Math.floor(credits / CREDITS.song);
  const videos = Math.floor(credits / CREDITS.video);
  if (songs < 1) return `${Math.floor(credits / CREDITS.halfSong)} half songs`;
  if (videos < 1) return `${songs} ${songs === 1 ? 'song' : 'songs'}`;
  return `${songs} songs or ${videos} videos`;
}

/** The period key a monthly grant is written under, e.g. 'maker-2026-08'. */
export function monthKey(tier: Tier, when: Date = new Date()): string {
  const month = `${when.getUTCFullYear()}-${String(when.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${tier}-${month}`;
}



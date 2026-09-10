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
 *   a 2-minute song   $0.15 a minute, ElevenLabs' own price  →  R4.80
 *   a 10-second video 70 credits on Kling Ultra               →  R6.89
 *
 * At 10 credits for a song those land at R0.480 and R0.230 a credit, which is
 * a factor of two apart rather than the 12% this note used to claim.
 *
 * The song figure was R2.59 until 8 September 2026, worked out from a credit
 * rate nobody had ever checked against ElevenLabs. Carli sent their pricing
 * page that day: music is $0.15 a minute, so a two-minute song costs us
 * $0.30 — eighty-five per cent more than the number this file was built on.
 * `docs/ELEVENLABS-PRYSE.md` has the whole list and what it does to the
 * profit sums, and the short version is that the free tier can no longer be
 * given music.
 *
 * The scale below has deliberately *not* been moved yet. Ten credits for a
 * song is what everybody who has bought credits has been charged, and moving
 * it is a price rise that belongs in its own decision rather than in a
 * comment repair.
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
  /**
   * **Five seconds** from the video engine, at the base grade. A unit, not a
   * clip — see `videoCost`.
   *
   * This was a flat 30 for a clip of any length, which was very nearly
   * defensible while the server clamped every request to five or ten seconds.
   * It stopped being defensible the moment the longer lengths the engines
   * declare were actually let through: the standard engine charges us
   * `ceil(seconds / 5) * 20` of its own units, so a thirty-second clip costs
   * six times what a five-second one does, and we were asking the same 30 for
   * both.
   *
   * Fifteen, from the dearest engine that can serve the base grade at each
   * length:
   *
   *   Kling      5s  = 35 units ≈ R3.44      10s = 70 units ≈ R6.89
   *   Seedance   5s  = 20 units ≈ R2.62      30s = 120 units ≈ R15.72
   *
   * At the R0.23–R0.26 a credit the rest of this scale is built on, Kling's ten
   * seconds is 28 credits and its five is 14. Fifteen a unit keeps a ten-second
   * clip at the 30 it has always been — so nothing in the common case moves —
   * and makes a thirty-second one 90, against an upstream cost of about 64.
   * The margin is deliberate: the queue picks the engine, and pricing on the
   * dearest one it may pick is the only way the number on the button is safe
   * whichever answers.
   */
  video: 15,
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
  /**
   * Four jobs below are charged **by the minute**, not per press.
   *
   * They were flat — two or four credits however long the file was — and that
   * is the wrong shape for anything billed upstream by the minute. Against
   * ElevenLabs' published rates the break-even on taking the room out of a
   * recording was about fifty seconds: every take longer than that lost money,
   * and an hour-long podcast cleaned for two credits cost more upstream than
   * the member's entire monthly plan.
   *
   * The numbers are their rates plus the usual margin. See `perMinute` below.
   */
  /** Splitting a song into the voice and the backing, per minute. */
  stems: 4,
  /** Hearing what was actually sung, per minute. Their speech-to-text. */
  transcribe: 2,
  /** Taking the room out of a recording, per minute. Their voice isolator. */
  clean: 4,
  /** A recording said again in another voice, per minute. */
  voiceChange: 4,
  /**
   * A recording *sung* again in another voice, per minute. Kits.AI.
   *
   * The same four as the speech model above, and deliberately not less.
   * Kits is a flat forty dollars a month rather than a per-minute bill, so
   * the marginal cost of one conversion is close to nothing and the number
   * could be argued down — but the two buttons sit on the same panel, and
   * making the better engine the cheaper one would have people picking the
   * worse one to save credits. One price, and the choice is about the result.
   */
  sing: 4,
  /** Making a voice from a minute of somebody reading. Estimated. */
  clone: 20,
  /** Training a sound of your own. Estimated, and deliberately high. */
  finetune: 300,
  /**
   * A minute of an episode dubbed into another language.
   *
   * ── This was 15, and 15 sold below cost ──────────────────────────────
   *
   * The old value was a guess, and its comment said so: "Estimated, like the
   * read, and for the same reason: the exact rate is not knowable from a
   * pricing page with any confidence."
   *
   * It became knowable on 8 September 2026. ElevenLabs' own pricing page,
   * which Carli sent, gives the plan's equivalences at $990:
   *
   *     450 minutes of dubbing v2 = $990
   *
   * On Business with VAT that is R18 216 / 450 = **R40,48 a minute paid**.
   * Fifteen credits sold at Maker's effective R1,24 is R18,60 a minute
   * charged. Every minute dubbed cost R21,88 out of her own pocket, and a
   * twenty-minute episode lost R437,60 on one press. It was live in
   * `/api/dub`.
   *
   * ── Where 162 comes from ─────────────────────────────────────────────
   *
   * The same anchor the rest of this scale is built on: **one credit is about
   * R0,25 of what the work costs us.** R40,48 / R0,25 = 162. So this is not a
   * price rise — it is this action finally being priced the way every other
   * one already was.
   *
   * ── What it means, and it is not small ───────────────────────────────
   *
   * Dubbing becomes expensive, because dubbing IS expensive. A ten-minute
   * episode is 1 620 credits, which is more than Maker or Studio hold. That
   * is the honest shape: this is a Label-scale feature or a top-up purchase,
   * and pretending otherwise was costing money on every press.
   *
   * `check:kredietkoste` now holds every one of these against its real
   * upstream cost, so the next one cannot drift below the floor in silence.
   */
  dub: 162,
  /**
   * Reading a song: chords, key, tempo and where the sections are. Per minute.
   *
   * Music.ai bill per minute of audio per workflow run, and their published
   * rate is not something this file can know for an account it cannot see —
   * so this is set from their entry pricing plus the usual margin, and it is
   * the first number to check against a real invoice. Deliberately not lower
   * than `stems`: it is a heavier job than splitting a voice off.
   */
  read: 6,
  /** Splitting a song into named parts rather than two. Per minute. */
  parts: 8,
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

/**
 * What a clip costs: its length and its grade, both.
 *
 * Length in five-second units, because that is how the engines bill us, and
 * grade as a multiplier on top. The desk shows this number and the route
 * charges this number, from this one function, so they cannot disagree — which
 * is the only property that matters here. A price that moves when you change
 * the length and a charge that does not is worse than a flat price.
 */
export function videoCost(grade: VideoGrade, seconds: number): number {
  const units = Math.max(1, Math.ceil(Math.max(0, seconds) / 5));
  const base = CREDITS.video * units;
  if (grade === 'premium') return base * 4;
  if (grade === 'better') return base * 2;
  return base;
}

/**
 * A presenter reading a script, by the length of the reading.
 *
 * Priced as the 'better' grade of video, in the same five-second units, and
 * that is a placeholder held on purpose rather than a measurement. Nothing in
 * ElevenLabs' SDK says what `creatify-aurora` costs, and this project prices
 * from its own invoices rather than from a pricing page — which is how
 * `CREDITS.video` came to be fifteen a unit instead of a flat thirty.
 *
 * Held at the middle rung because that is the safe direction to be wrong in
 * while it is unknown: undercharging for something that turns out dear is a
 * bill with nothing behind it, and this app is being started on the smallest
 * plans its owner can manage. `provider_units` on the row records what each
 * generation really took, which is the number that eventually replaces this.
 */
export function presenterCost(seconds: number): number {
  return videoCost('better', seconds);
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
/**
 * What a job billed by the minute costs, given how long the file is.
 *
 * Rounded up to the minute and floored at one, because a twenty-second take
 * still costs something upstream and a charge of zero is a button that gets
 * pressed forty times while somebody decides.
 *
 * The rates it is applied to are set against ElevenLabs' own published prices:
 * their voice isolator and voice changer are $0.18 a minute on the Creator
 * tier, speech-to-text $3.60 an hour — which is $0.06 a minute and the reason
 * transcribing is the cheapest of the four.
 */
export function perMinute(seconds: number, rate: number): number {
  const minutes = Math.max(1, Math.ceil(Math.max(0, seconds) / 60));
  return minutes * rate;
}

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
  /**
   * None. The free tier does not generate music.
   *
   * ── Why it was ten, and why it is nought ────────────────────────────────
   *
   * Ten was two half songs, and it was decided when a song was assumed to
   * cost us R2.59. On 8 September 2026 Carli sent ElevenLabs' own pricing
   * page: music is $0.15 a minute, so a song costs R4.80, and a plan holds
   * about half the minutes this file had assumed. `docs/ELEVENLABS-PRYSE.md`
   * has the whole derivation.
   *
   * With the real numbers the realistic case stops working — not because the
   * margin per member is thin, it is healthy, but because the plan cannot
   * feed the number of members it takes to break even. Nineteen free users
   * stand behind every paying one, and ten credits each is more music than
   * the paying member makes.
   *
   * Turning that off is the whole difference between a business that works
   * and one that does not: break-even goes from 165 members against a
   * capacity of 132, to 103 against 214. Carli's decision, 8 September.
   *
   * ── What the free tier is instead, and why it is not nothing ────────────
   *
   * Everything the device can make by itself, without limit: browser sketches
   * that are real audio and real video, the whole recording booth, the
   * timeline, hooks, the sound trainer, the radar, the style previews. None
   * of that costs us a cent, and it is the part that convinces people — the
   * two half songs were the expensive part and the part nobody stayed for.
   *
   * The card says so plainly rather than letting somebody find out at the
   * button.
   */
  free: 0,
  /* Opsie E, 8 September 2026. Die toelae is kleiner en die pryse van die twee
     boonste vlakke is hoër, en dit is met opset in daardie volgorde.

     Vandag daal die marge hoe hoër die vlak — 70%, 64%, 62% — want elke tree
     op die leer gee krediete vinniger weg as wat dit prys vat: van Maker na
     Studio was die prys x2,34 teen krediete x2,92. By gewone sagteware kos dit
     niks, want nog 'n gebruiker kos die verskaffer nul. By ons kos elke krediet
     dieselfde, en ElevenLabs stel 'n dak op hoeveel daar in totaal is.

     Onder daardie dak wen die goedkoop vlak: 'n Label-lid is 4,4x meer werd as
     'n Maker-lid, maar die plan voed 6,7x meer Makers.

     Met hierdie getalle styg die marge saam met die vlak — 76%, 79%, 81% — en
     opkoop is vir albei kante beter. Wat 'n hoër vlak in plaas van meer
     krediete kry, is die goed wat ons niks kos nie: Pro Booth se diepte,
     kommersiële regte, voorrang in die tou, meer stemme.

     Sien `docs/OPSIE-E.md` vir die hele som. */
  maker: 90,
  studio: 220,
  label: 440,
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
 * What one top-up credit costs, and the only number that sets it.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * Carli, 10 September 2026: "Ek sien om verdere krediete aan te koop baie
 * goedkoper is as die planne wat 'n mens uit neem."
 *
 * She is right, and the comment that used to stand here claimed the opposite.
 * It said the packs sit above "the dearest plan (Maker, at R1.24 a credit)"
 * and that `capacity.test` refuses to pass if one slips under. Three things
 * were wrong with that sentence at once:
 *
 *   · Maker is R149 for 90 credits — **R1.656**, not R1.24. The old figure
 *     was from when Maker held 120 credits and was never updated.
 *   · Maker is the **cheapest** plan per credit, not the dearest. Bigger
 *     plans here sell features, so their credits cost more, not less.
 *   · **`capacity.test` does not exist in this repository.** The rule was
 *     written down, a guard was claimed for it, and neither was there.
 *
 * Measured, the old packs were R1.650, R1.593 and R1.498 a credit against
 * Maker's R1.656 — every one of them cheaper than the cheapest plan, the
 * biggest by nine and a half percent.
 *
 * ── The comparison that actually binds ───────────────────────────────────
 *
 * "Cheaper than a plan" is the weak version. The real question a paying
 * member asks is *should I top up or move up*, so a pack has to be dearer
 * than the **marginal** cost of the next plan:
 *
 *   Maker → Studio   +R250 for +130 credits = R1.92 a credit
 *   Studio → Label   +R500 for +220 credits = R2.27 a credit
 *
 * Anything at or under R2.27 and a Studio member tops up forever instead of
 * becoming a Label member. R2.50 clears every plan rate (R1.66–R2.04) and
 * every upgrade step, with room to move.
 *
 * **This number is hers.** It is one constant and everything else is derived
 * from it, so changing the business does not mean editing a table and hoping
 * the three rows still agree.
 */
export const RAND_PER_TOPUP_CREDIT = 2.5;

/**
 * Top-ups, shown when somebody runs out and nowhere else.
 *
 * ── Two rules, and the second one is hers ────────────────────────────────
 *
 * **Every pack costs more per credit than every plan, and than every step
 * between plans.** See `RAND_PER_TOPUP_CREDIT`. A subscription business whose
 * own shop sells the same thing cheaper has no subscribers.
 *
 * **And the credits shrink with the money, exactly.** Carli: "dit is sinvol
 * om kleiner bedrae te verkoop vir top up's maar dan moet die krediete krimp
 * saam met die bedrae." The comment here used to say a volume discount
 * between the packs was fine. It is not: a discount for buying more is the
 * same reason not to upgrade, one rung down. Every pack is the same rate, and
 * the credits are derived from the price rather than typed beside it, so the
 * three rows cannot drift apart.
 *
 * Nothing under R99: the gateway takes R2 flat on every charge, which is 13%
 * of a R20 pack and 2% of a R100 one. A cheap pack is a donation to Paystack.
 */
const TOPUP_RAND = [100, 250, 500] as const;

export const PACKS: readonly Pack[] = TOPUP_RAND.map((rand, i) => ({
  id: (['small', 'mid', 'large'] as const)[i],
  rand,
  credits: Math.round(rand / RAND_PER_TOPUP_CREDIT),
}));

export function packById(id: string): Pack | null {
  return PACKS.find((one) => one.id === id) ?? null;
}

/**
 * Whether this member may buy credits at all.
 *
 * ── Carli, 10 September 2026 ─────────────────────────────────────────────
 *
 * "Dit moet ook nie die standaard wees van die begin af nie, iemand kan nie
 * krediete koop sonder 'n subscribed plan nie. Daai opsie moet glad nie
 * sigbaar wees voordat iemand 'n betaalde plan aangekoop het nie."
 *
 * Two separate things, and both were wrong here. `/api/credits` handed the
 * pack list to everybody — signed out, free, anybody — so the shelf was one
 * refusal away from a member who had never paid for anything.
 *
 * ── Why this is the right rule and not only her preference ───────────────
 *
 * The free tier generates no music at all (`TIER_CREDITS.free` is nought), so
 * a free member is short of every generation there is. Offering them a pack
 * at that moment sells the *engine* without the plan: R100 buys forty credits
 * and nothing else — no video engine, no cloned voice, no channels — and
 * somebody who bought that has paid us and been given the thinnest possible
 * version of the app. They do not come back.
 *
 * The answer to "you have no credits" on free is not a shop. It is the plans.
 *
 * ── Enforced in two places, deliberately ─────────────────────────────────
 *
 * Here, and again in `/api/checkout` — a hidden button is not a closed door,
 * and the pack id is a string somebody can post. `check:topups` holds both.
 */
export function mayTopUp(tier: Tier | null | undefined): boolean {
  return tier === 'maker' || tier === 'studio' || tier === 'label';
}

/* ──────────────────────────────────────────────────────────── in words ─ */

/** What a balance buys, said in things rather than in credits. */
export function buys(credits: number): string {
  const songs = Math.floor(credits / CREDITS.song);
  // A video means the commonest one: ten seconds at the base grade.
  const videos = Math.floor(credits / videoCost('standard', 10));
  if (songs < 1) return `${Math.floor(credits / CREDITS.halfSong)} half songs`;
  if (videos < 1) return `${songs} ${songs === 1 ? 'song' : 'songs'}`;
  return `${songs} songs or ${videos} videos`;
}

/** The period key a monthly grant is written under, e.g. 'maker-2026-08'. */
export function monthKey(tier: Tier, when: Date = new Date()): string {
  const month = `${when.getUTCFullYear()}-${String(when.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${tier}-${month}`;
}



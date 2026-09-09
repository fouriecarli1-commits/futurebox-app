/**
 * Telling her the allowance is running out, while she can still do something.
 *
 * ── The question this answers ────────────────────────────────────────────
 *
 * Carli, 9 September 2026: "Ek gaan op 'n manier 'n alert moet kry as die
 * krediete laag raak, sodat ek kan koop. Is daar 'n manier dat ek 'n
 * waarskuwing kan kry?"
 *
 * Until now: no. ElevenLabs sends their own email at 75%, 90% and 98%, and
 * `elevenceiling.ts` will refuse work at the ceiling — but between those two
 * there was nothing from this app at all. The first thing she would have
 * known is a member telling her the songs had stopped.
 *
 * ── Why the warning matters more than the refusal ────────────────────────
 *
 * The refusal is the safety net and it is meant to be hit last. A month that
 * ends in refusals is a month where members were turned away. The point of a
 * warning at half is that there are days left in which to top up, and topping
 * up is not instant — it is a card, a page, and a figure she has to choose.
 *
 * ── The trap this letter names out loud ──────────────────────────────────
 *
 * Buying credits at ElevenLabs does **not** raise this app's ceiling.
 * `ELEVEN_MONTHLY_CREDITS` is a separate number, set on Vercel, and it is what
 * actually stops the app. Somebody who tops up and does nothing else will
 * watch the app refuse work she has already paid for. So the letter says both
 * halves every time, because half of an instruction is how that happens.
 *
 * ── Why the dedupe key is released when the send fails ───────────────────
 *
 * `send()` claims its `once` key *before* sending, and leaves it claimed when
 * the send fails. For a receipt that is right: a duplicate receipt is worse
 * than a missing one. For a warning it is exactly backwards — a duplicate
 * warning is a mild annoyance, and a warning lost forever because a mail
 * provider hiccuped once is the whole failure this exists to prevent. So a
 * failed send gives the key back and the next generation tries again.
 *
 * ── Never in the way ─────────────────────────────────────────────────────
 *
 * Called from the bookkeeping that runs after a generation, and it may not
 * make that generation slower or make it fail. Nothing here throws, nothing
 * here is awaited by the caller, and every database call is best effort. A
 * warning that could break a song would be worse than no warning.
 */

import { admin } from './account';
import { OWNER, configured, tellOwner } from './email';
import { PLAN_CREDITS, RAND_PER_USD, USD_PER_CREDIT, leftCredits, monthlyCredits, usedCredits } from './elevenceiling';
import { leftSeconds, monthlyMinutes, usedSeconds } from './kitsminutes';

/**
 * Where the letters go out.
 *
 * Half is early on purpose. The three that follow are ElevenLabs' own steps,
 * so a member of staff reading both inboxes sees the same numbers rather than
 * two systems disagreeing about how bad it is.
 */
export const STEPS = [0.5, 0.75, 0.9, 1] as const;

/** The highest step this fraction has reached, or null below the first. */
export function stepFor(used: number, ceiling: number): number | null {
  if (!(ceiling > 0)) return null;
  const part = used / ceiling;
  let hit: number | null = null;
  for (const step of STEPS) if (part >= step) hit = step;
  return hit;
}

/** The calendar month, the way the allowance itself is counted. */
export function monthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type Supplier = 'eleven' | 'kits';

/** One claim per supplier, per step, per month. */
export function claimKey(supplier: Supplier, step: number, month = monthKey()): string {
  return `spend:${supplier}:${month}:${Math.round(step * 100)}`;
}

/** Rand per credit beyond the plan. Their published rate, at our rate of exchange. */
export const RAND_PER_CREDIT = USD_PER_CREDIT * RAND_PER_USD;

function rand(amount: number): string {
  return `R${amount.toFixed(2).replace('.', ',')}`;
}

/**
 * Give the claim back, so the next generation tries the letter again.
 *
 * Only ever called on a failed send. A row that cannot be deleted leaves the
 * key claimed, which is the old behaviour rather than a new fault.
 */
async function release(key: string): Promise<void> {
  const db = admin();
  if (!db) return;
  await db
    .from('mail_log')
    .delete()
    .eq('dedupe_key', key)
    .then(
      () => undefined,
      () => undefined,
    );
}

/**
 * Keys this process has already tried, so a busy month is not one insert per
 * generation against a unique index that is going to reject it anyway.
 *
 * Only ever a shortcut past work already done: the database claim is still
 * the real dedupe, and a new instance simply tries once more and is told the
 * letter has gone. A failed send deletes its key from here too, or the retry
 * this whole module exists for would be skipped by its own optimisation.
 */
const tried = new Set<string>();

async function tell(supplier: Supplier, step: number, subject: string, body: string): Promise<void> {
  const key = claimKey(supplier, step);
  if (tried.has(key)) return;
  tried.add(key);
  const sent = await tellOwner(subject, body, { once: key, kind: 'allowance' });
  if (!sent.ok) {
    tried.delete(key);
    await release(key);
  }
}

/** Cleared between tests. Not used by the app. */
export function forgetTold(): void {
  tried.clear();
}

/** What the ElevenLabs letter says at this step. Separate so a check can read it. */
export function elevenLetter(used: number, ceiling: number, step: number): { subject: string; body: string } {
  const left = Math.max(0, ceiling - used);
  const percent = Math.round(step * 100);
  const subject =
    step >= 1
      ? 'ElevenLabs: the month’s allowance is used up'
      : `ElevenLabs: ${percent}% of the month’s allowance is used`;

  const body = [
    step >= 1
      ? `The app has stopped generating. ${used.toLocaleString('en')} of ${ceiling.toLocaleString('en')} credits are spent, and it will not spend past that until you raise the ceiling.`
      : `${used.toLocaleString('en')} of ${ceiling.toLocaleString('en')} credits are spent this month. ${left.toLocaleString('en')} left — about ${Math.floor(left / 900)} minutes of music.`,
    '',
    'Two things have to happen, and doing only the first will not work:',
    '',
    `1. Buy credits at ElevenLabs (Subscription → top up). They cost $${USD_PER_CREDIT} each, about ${rand(RAND_PER_CREDIT * 1000)} per thousand, and expire twelve months later.`,
    `2. Raise ELEVEN_MONTHLY_CREDITS on Vercel to match. This is the number that actually stops the app. It is ${ceiling.toLocaleString('en')} now${ceiling === PLAN_CREDITS ? ', which is the plan itself, so no top-up is authorised yet' : ''}.`,
    '',
    'The ceiling is deliberately what stops things rather than the card. Auto Top Up at ElevenLabs never stops — it keeps buying until somebody reads an invoice.',
  ].join('\n');

  return { subject, body };
}

/** What the Kits letter says. Their roof is real, so the advice is different. */
export function kitsLetter(usedMin: number, ceilingMin: number, step: number): { subject: string; body: string } {
  const left = Math.max(0, ceilingMin - usedMin);
  const percent = Math.round(step * 100);
  const subject =
    step >= 1
      ? 'Kits.AI: the month’s download minutes are used up'
      : `Kits.AI: ${percent}% of the month’s download minutes are used`;

  const body = [
    step >= 1
      ? `Voice splitting, stem splitting and singing conversion have stopped. ${Math.round(usedMin)} of ${ceilingMin} download minutes are spent.`
      : `${Math.round(usedMin)} of ${ceilingMin} download minutes are spent this month. ${Math.round(left)} left.`,
    '',
    'Kits is a real roof rather than a prepayment: it stops on its own and no card is charged past the R640. Buying more means a bigger Kits plan, not a top-up.',
    '',
    'Minutes burn on what comes back, not what is sent — a four-part split of a three-minute song is twelve minutes, not three.',
  ].join('\n');

  return { subject, body };
}

/**
 * Look at where ElevenLabs stands and write if a step has just been crossed.
 *
 * Fire and forget. The caller has audio in hand and is on its way out.
 */
export async function watchEleven(): Promise<void> {
  try {
    const ceiling = monthlyCredits();
    const used = await usedCredits();
    const step = stepFor(used, ceiling);
    if (step === null) return;
    const { subject, body } = elevenLetter(used, ceiling, step);
    await tell('eleven', step, subject, body);
  } catch {
    // A warning that failed is not a reason for a generation to fail.
  }
}

/** The same, for Kits' download minutes. */
export async function watchKits(): Promise<void> {
  try {
    const ceiling = monthlyMinutes();
    const used = (await usedSeconds()) / 60;
    const step = stepFor(used, ceiling);
    if (step === null) return;
    const { subject, body } = kitsLetter(used, ceiling, step);
    await tell('kits', step, subject, body);
  } catch {
    // As above.
  }
}

/**
 * Credits a month per paying member, for the ceiling this app recommends.
 *
 * ── Where the number comes from ──────────────────────────────────────────
 *
 * `scripts/costs-eleven.mts`, realistically and without workshops: the Pro
 * plan breaks even at 24 paying members and its 600,000 credits hold 33. So a
 * member's realistic music use is 600,000 / 33 — about 18,000 credits, or ten
 * minutes of music a month. Twenty thousand is that with a little room.
 *
 * ── Why this is a recommendation and not the ceiling ─────────────────────
 *
 * A ceiling that rises on its own is not a brake against a bug: the runaway
 * that this whole file exists to catch would simply raise its own roof as it
 * went. So the app works out what the ceiling *should* be from the real member
 * count and reports it; `ELEVEN_MONTHLY_CREDITS` is still set by hand.
 *
 * ── Why topping up is not the thing to be afraid of ──────────────────────
 *
 * Each member past the plan costs about 20,000 credits — R62 of top-up — and
 * pays R149 at the lowest tier. That is R87 of margin, so growth past the plan
 * pays for itself and then some. The ceiling is not protection from members.
 * It is protection from a loop and from abuse, which is why the recommendation
 * is tied to members who are actually paying rather than to traffic.
 */
export const CREDITS_A_MEMBER = 20_000;

/** How many paying members there are, or null when it cannot be counted. */
export async function payingMembers(): Promise<number | null> {
  const db = admin();
  if (!db) return null;
  const { count, error } = await db
    .from('subscriptions')
    .select('owner', { count: 'exact', head: true })
    /* Paystack's own words. 'non-renewing' is still paid up to its date, so it
       still uses credits this month and still has to be planned for. */
    .in('status', ['active', 'non-renewing']);
  if (error) return null;
  return typeof count === 'number' ? count : null;
}

/**
 * What the ceiling should be for this many members, never below the plan.
 *
 * The plan is the floor because credits already paid for are credits to use;
 * a recommendation below it would authorise less than she has bought.
 */
export function ceilingFor(members: number): number {
  return Math.max(PLAN_CREDITS, Math.ceil((members * CREDITS_A_MEMBER) / 10_000) * 10_000);
}

export interface Standing {
  readonly used: number;
  readonly ceiling: number;
  readonly left: number;
  readonly part: number;
  readonly step: number | null;
}

/**
 * Where both allowances stand, for a page she can open.
 *
 * The letter is the alert; this is the answer to "how are we doing" asked at
 * any moment, and it exists because the letter cannot arrive until a sending
 * domain is settled — see `docs/GOING_LIVE.md` §2. A warning system whose only
 * channel is switched off is not a warning system, so the report says whether
 * mail can send at all rather than leaving her to assume it can.
 */
export async function standing(): Promise<{
  eleven: Standing;
  kits: Standing;
  canWrite: boolean;
  to: string;
  randToTopUpEleven: number;
  members: number | null;
  recommend: number | null;
}> {
  const members = await payingMembers();
  const elevenCeiling = monthlyCredits();
  const elevenUsed = await usedCredits();
  const kitsCeiling = monthlyMinutes();
  const kitsUsed = (await usedSeconds()) / 60;

  return {
    eleven: {
      used: elevenUsed,
      ceiling: elevenCeiling,
      left: await leftCredits(),
      part: elevenCeiling > 0 ? elevenUsed / elevenCeiling : 0,
      step: stepFor(elevenUsed, elevenCeiling),
    },
    kits: {
      used: kitsUsed,
      ceiling: kitsCeiling,
      left: (await leftSeconds()) / 60,
      part: kitsCeiling > 0 ? kitsUsed / kitsCeiling : 0,
      step: stepFor(kitsUsed, kitsCeiling),
    },
    canWrite: configured(),
    to: OWNER(),
    randToTopUpEleven: Math.max(0, elevenCeiling - PLAN_CREDITS) * RAND_PER_CREDIT,
    members,
    /* Null rather than a guess when the count could not be read. A
       recommendation built on an unknown member count is a number that looks
       authoritative and is not. */
    recommend: members === null ? null : ceilingFor(members),
  };
}

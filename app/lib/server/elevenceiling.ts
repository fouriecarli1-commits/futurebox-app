/**
 * A brake on what ElevenLabs costs this month.
 *
 * ── Why a brake and not a warning ────────────────────────────────────────
 *
 * There has been a warning since #116: an email at 75%, 90% and 98% of the
 * allowance. A warning is a notification that the money is already being
 * spent, and it arrives in an inbox that may not be read for a day.
 *
 * ElevenLabs' support, 9 September 2026, settled what happens next: top-up
 * credits cost $0.000165 each, and **Auto Top Up can be switched on**. That
 * turns the failure mode inside out. Without it the service dies when the
 * plan's credits run out — bad, and loud. With it the service never dies at
 * all: it keeps buying, at about R3,08 per thousand credits, until somebody
 * reads an invoice.
 *
 * Carli, the same day: "Ek gaan eers net krediete top up totdat ek 'n beter
 * begrip het hoeveel mense ons produk gebruik." That is the right way to run
 * it — and it is only safe with a number she sets, on this side, that stops
 * the app before the card does.
 *
 * ── One knob, and it is safe with nothing set ────────────────────────────
 *
 * `ELEVEN_MONTHLY_CREDITS` is the most this app may spend in a calendar month.
 * Unset, it is 600,000: exactly what the Pro plan includes, so out of the box
 * **not one cent of top-up is authorised**. Raising it is how she says "I will
 * pay for this much beyond the plan", and `randOver` says what that costs.
 *
 * ── Which way it errs ────────────────────────────────────────────────────
 *
 * The count reads `eleven_costs.characters`, which is ElevenLabs' own
 * `character-cost` for each call. A call whose header was missing writes null
 * and counts as nothing — so the count can only ever be *low*. A meter that
 * may under-read needs a ceiling that does not over-reach, which is why the
 * default is the plan's own figure and not the plan plus a cushion.
 *
 * And unlike `kitsminutes.ts`, this one cannot be checked against the
 * supplier: ElevenLabs' dashboard is the authority on the real total, and
 * anything spent outside this app — a generation from their own website — is
 * invisible here. The two numbers are meant to drift; theirs is the truth and
 * this one is the brake.
 */

import { admin } from './account';

/** What the Pro plan includes. ElevenLabs support, 9 September 2026. */
export const PLAN_CREDITS = 600_000;

/** What a credit costs beyond the plan, in dollars. Their published rate. */
export const USD_PER_CREDIT = 0.000165;

/**
 * Rand per dollar, and why it is here rather than fetched.
 *
 * The same figure `scripts/costs-eleven.mts` uses. A refusal message that
 * quoted a live exchange rate would be a network call inside a brake, which
 * is the one place a network call must never be — the brake has to answer
 * when everything else is failing.
 */
export const RAND_PER_USD = 18.7;

export function monthlyCredits(): number {
  const said = Number(process.env.ELEVEN_MONTHLY_CREDITS);
  return Number.isFinite(said) && said > 0 ? Math.floor(said) : PLAN_CREDITS;
}

/** What the ceiling authorises beyond the plan, in rand. Zero by default. */
export function randOver(): number {
  return Math.max(0, monthlyCredits() - PLAN_CREDITS) * USD_PER_CREDIT * RAND_PER_USD;
}

/**
 * Thirty seconds of staleness, which is at most one generation's worth of
 * over-run and a great deal less database traffic than asking per call. The
 * same trade `kitsminutes.ts` makes, for the same reason.
 */
const REMEMBER_MS = 30_000;
let cached = { credits: 0, until: 0 };

/** How many credits this calendar month has already spent. */
export async function usedCredits(): Promise<number> {
  const now = Date.now();
  if (now < cached.until) return cached.credits;

  const db = admin();
  /* No database is no count, and no count must not become a refusal: an
     install without Supabase has no accounts, no members and nobody to
     protect from a bill. */
  if (!db) return 0;

  const { data, error } = await db.rpc('eleven_credits_this_month');
  /* A failed read keeps the last figure rather than reading zero. Zero would
     open the brake completely at the exact moment the database is unwell. */
  if (error) return cached.credits;

  const credits = Number(data);
  cached = { credits: Number.isFinite(credits) ? credits : 0, until: now + REMEMBER_MS };
  return cached.credits;
}

/** How many credits of the month remain. Never negative. */
export async function leftCredits(): Promise<number> {
  return Math.max(0, monthlyCredits() - (await usedCredits()));
}

export interface Refusal {
  readonly left: number;
  readonly message: string;
}

/**
 * Whether there is room for a piece of work costing roughly `credits`.
 *
 * Asked *before* the member is charged. Somebody turned away by a ceiling
 * they cannot see must not also have paid for the turn — the same rule
 * `/api/voice/sing` already follows for the Kits minutes.
 *
 * The estimate does not have to be exact. It is compared against a real
 * running total, so an estimate that is a little high stops a little early,
 * which is the safe direction for a brake to be wrong in.
 */
export async function enough(credits: number): Promise<Refusal | null> {
  const wanted = Math.max(0, Math.round(credits) || 0);
  const left = await leftCredits();
  if (wanted <= left) return null;
  return {
    left,
    message:
      left > 0
        ? 'This month’s music allowance is nearly used up, and this one is longer than what is left. A shorter song will still go through.'
        : 'This month’s music allowance is used up. It starts again on the first of the month.',
  };
}

/** Cleared between tests. Not used by the app. */
export function forgetSpend(): void {
  cached = { credits: 0, until: 0 };
}

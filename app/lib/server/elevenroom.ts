/**
 * The brake on the ElevenLabs allowance — the one supplier that had none.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * Two things in the whole app read the ElevenLabs allowance: the 07:00 email
 * in `/api/watch`, and the owner-only money page. **No generation route
 * checked it.** Every route checks the CALLER's own credits and the
 * per-caller rate limiter, and nothing anywhere asked whether the supplier
 * still had anything to give.
 *
 * The pattern already existed twice. The video route checks its provider's
 * ceiling "before the plan, before the ceiling, before the charge".
 * `kitsminutes.ts` counts against Kits' 400-minute roof. ElevenLabs — the
 * supplier the whole product rests on — had nothing.
 *
 * ── Why it is worse than an overage ──────────────────────────────────────
 *
 * `can_extend_character_limit` is **false** on this account, read live rather
 * than assumed. So running past the allowance is not a surprise invoice: the
 * work **fails**. Every generation, for everybody, at the same moment, in the
 * third week of the month, after they have paid.
 *
 * An overage costs money. This costs the members and the launch.
 *
 * ── Why this could be built before ElevenLabs answered ───────────────────
 *
 * It was held back waiting for their reply about plan ceilings, on the
 * reasoning that thresholds derive from the ceiling and building first means
 * building twice. That reasoning had a hole in it: the thresholds here are
 * **percentages of whatever plan is live**, read from their own
 * `/v1/user/subscription`. Pro, Scale, Business or a custom plan — the same
 * numbers mean the same thing. Their answer decides which plan to be ON. It
 * never decided where the brake sits.
 *
 * ── Two brakes, and the first matters more ───────────────────────────────
 *
 * **Stop selling before you stop serving.** Below a headroom, new PAID
 * signups are refused while the free tier stays wide open — the free tier
 * generates nothing at all (`TIER_CREDITS.free` is 0) and so costs nothing.
 * Ten thousand free accounts are safe, and are the right shape for a launch.
 * A waiting list on the paid tier reads as demand; a month of failed
 * generations reads as a broken product, and only one of those is true.
 *
 * **Refuse gracefully, and not all at once.** The cost per credit differs by
 * about eighty times across what this app does — dubbing a minute is 162
 * credits, transcribing one is 2 — so a single cutoff would either stop
 * cheap work far too early or expensive work far too late. Heavy work stops
 * first and light work runs on.
 *
 * ── Which way this fails, and why that direction ─────────────────────────
 *
 * If the allowance cannot be READ, nothing is braked.
 *
 * That is deliberate and it is the uncomfortable choice. Failing closed would
 * turn one bad minute at ElevenLabs into a total outage here — the brake
 * would cause exactly the event it exists to prevent. Failing open means the
 * generation goes ahead and, if the allowance really is gone, fails at
 * ElevenLabs with a real error and the member is refunded, which is the
 * behaviour we have today.
 *
 * A read that did not happen is not a reading of zero and it is not a reading
 * of a hundred. It is not a reading. That distinction has cost this app more
 * mornings than any other single mistake, and it is written here because the
 * tempting shortcut — treat an unreadable allowance as full — is the same
 * mistake wearing a different hat.
 */

import { bill } from './eleven';

/**
 * How much of the plan may be spent before each kind of work stops.
 *
 * Percentages, so the ladder survives a change of plan. One place, because a
 * threshold repeated in four routes is four thresholds.
 */
export const ROOM = {
  /** New paid signups stop here. Everything still WORKS at this point. */
  selling: 85,
  /** Dubbing, music, anything measured in hundreds of credits a minute. */
  heavy: 92,
  /** A read, a cloned voice — a credit or two at a time. */
  medium: 96,
  /** Transcription and alignment. Two credits a minute; the last to go. */
  light: 99,
} as const;

export type Weight = 'heavy' | 'medium' | 'light';

/**
 * The allowance, cached for a minute.
 *
 * `bill()` is a live call to ElevenLabs with `cache: 'no-store'`, because it
 * is used where the number is money. Calling it on every generation would put
 * a round trip in front of every song for a figure that moves by fractions of
 * a percent between requests.
 *
 * The cache is this instance's memory, so it is a brake and not a gate — the
 * same honest limitation `brake.ts` carries. Several instances can each hold
 * their own minute-old copy and each let one more song through. Bounded by
 * how many run at once, which on this app is small, and the alternative is a
 * shared read that costs a database round trip to save an HTTP one.
 */
let held: { at: number; percent: number | null } | null = null;
const HOLD_MS = 60_000;

/** Only for tests: forget what is cached. */
export function forgetAllowance(): void {
  held = null;
}

/**
 * What percentage of the plan is spent, or null when it could not be asked.
 *
 * Null is not zero and it is not a hundred. Every caller below treats it as
 * "do not brake", and that is the whole of the failure policy.
 */
export async function spentPercent(): Promise<number | null> {
  const now = Date.now();
  if (held && now - held.at < HOLD_MS) return held.percent;

  const answer = await bill();
  const percent = answer.ok ? answer.bill.percent : null;
  /* A failed read is cached too, and on purpose. Without it, a supplier that
     is down turns into one extra failing request per generation, at the
     moment the app can least afford them. */
  held = { at: now, percent };
  return percent;
}

export interface Room {
  /** Whether the work may go ahead. True when the allowance cannot be read. */
  readonly go: boolean;
  /** What is spent, or null when it could not be asked. */
  readonly percent: number | null;
  /** The line this weight stops at. */
  readonly stopsAt: number;
}

/** Is there room on the supplier's plan for a piece of work of this weight? */
export async function roomFor(weight: Weight): Promise<Room> {
  const percent = await spentPercent();
  const stopsAt = ROOM[weight];
  return { go: percent === null || percent < stopsAt, percent, stopsAt };
}

/** May somebody start paying today? Free accounts never ask this. */
export async function roomToSell(): Promise<Room> {
  const percent = await spentPercent();
  return { go: percent === null || percent < ROOM.selling, percent, stopsAt: ROOM.selling };
}

/**
 * Which language to refuse in.
 *
 * The routes that spend the allowance do not all carry a language field, and
 * adding one to each would be four places to forget. `Accept-Language` is
 * sent by the browser on every request and is right often enough for a
 * sentence nobody should be reading twice.
 *
 * Afrikaans is the default rather than English, because this app is
 * Afrikaans-first and the wrong guess should be the one that fewer of its
 * members notice.
 */
export function langOf(request: Request): 'af' | 'en' {
  const said = request.headers.get('accept-language') ?? '';
  return /\ben\b/i.test(said) && !/\baf\b/i.test(said) ? 'en' : 'af';
}

/**
 * What a refused member is told.
 *
 * Not "an error occurred". The three things somebody needs are what stopped,
 * that it is not their fault, and when it comes back — and the third is the
 * one that keeps them rather than the first two.
 *
 * No percentages and no supplier name. "ElevenLabs is at 94%" tells a member
 * how our books work and nothing they can act on.
 */
export function refusal(weight: Weight, lang: 'af' | 'en'): string {
  const back = lang === 'af'
    ? 'Dit kom terug wanneer die maand oorslaan.'
    : 'It comes back when the month rolls over.';
  if (lang === 'af') {
    return weight === 'heavy'
      ? `Ons het hierdie maand se ruimte vir nuwe liedjies en oorklanking opgebruik — nie joune nie, ons s’n. ${back} Jou krediete is nie gevat nie, en alles wat jou eie toestel maak werk steeds.`
      : `Ons het hierdie maand se ruimte vir hierdie soort werk opgebruik. ${back} Jou krediete is nie gevat nie.`;
  }
  return weight === 'heavy'
    ? `We have used up this month's room for new songs and dubbing — ours, not yours. ${back} Your credits were not taken, and everything your own device makes still works.`
    : `We have used up this month's room for this kind of work. ${back} Your credits were not taken.`;
}

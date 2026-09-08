/**
 * How much of the month's Kits.AI allowance is left, and the brake on it.
 *
 * ── Why a ceiling exists at all ──────────────────────────────────────────
 *
 * Kits' Professional Plan is R640 a month and is not unlimited: it carries a
 * roof of **400 download minutes**. Conversion time is free; the minutes burn
 * when audio is downloaded, and this app downloads every result, because that
 * is how the audio gets here. So every minute a member gets back spends one of
 * the 400.
 *
 * R640 ÷ 400 = R1.60 a minute. A three-minute song costs R4.80. That is about
 * 133 conversions a month across every member together — a number small enough
 * that one enthusiastic afternoon can eat the month.
 *
 * ── Brake, not gate — and the difference matters here ────────────────────
 *
 * `brake.ts` explains why the per-caller limiter is only a brake: its counter
 * lives in one instance's memory. This one is different. The count is a row in
 * Postgres, shared by every instance, so it is closer to a real gate. What
 * keeps it from being one is the race: two conversions started in the same
 * second both read the same "before" figure and both pass. The overshoot is
 * bounded by however many can start at once, which on this app is small, and
 * the alternative — a lock held across a five-minute conversion — costs more
 * than it saves.
 *
 * ── Which way to be wrong ────────────────────────────────────────────────
 *
 * Two things push the real allowance above what this counts, and both are the
 * safe direction: Kits rolls unused minutes over, and the seconds recorded
 * here are what the caller was billed for, which is the audio's length rather
 * than the (usually shorter) result. So this stops slightly early rather than
 * slightly late. Stopping early costs a member one refusal with a reason on
 * it. Stopping late costs a failed conversion that was already paid for.
 */

import { admin } from './account';

/** The plan's roof, in minutes. Overridable because plans change. */
export function monthlyMinutes(): number {
  const said = Number(process.env.KITS_MONTHLY_MINUTES);
  return Number.isFinite(said) && said > 0 ? Math.floor(said) : 400;
}

/**
 * A short memory of the last answer.
 *
 * The count is asked for on every conversion, before the credits are charged.
 * A round trip to Postgres there is not expensive, but it is on the hot path of
 * a route that the person is already waiting on, and the number cannot move
 * faster than conversions arrive. Thirty seconds of staleness is at most one
 * conversion's worth of drift, which the overshoot above already allows for.
 */
let cached = { seconds: 0, until: 0 };
const REMEMBER_MS = 30_000;

/** How many seconds this calendar month has already spent. */
export async function usedSeconds(): Promise<number> {
  const now = Date.now();
  if (now < cached.until) return cached.seconds;

  const db = admin();
  /* No database configured is not "nothing used" — it is "not known". Zero is
     still the answer that lets the app work, because a deployment without a
     database has no way to count and refusing everything would be worse than
     spending. It is written down here so it is a decision. */
  if (!db) return 0;

  const { data, error } = await db.rpc('kits_seconds_this_month');
  if (error) return cached.seconds;

  const seconds = Number(data);
  cached = { seconds: Number.isFinite(seconds) ? seconds : 0, until: now + REMEMBER_MS };
  return cached.seconds;
}

/** How many seconds of the month remain. Never negative. */
export async function leftSeconds(): Promise<number> {
  return Math.max(0, monthlyMinutes() * 60 - (await usedSeconds()));
}

export interface Refusal {
  readonly message: string;
  readonly left: number;
}

/**
 * Null when there is room for a piece this long, a refusal when there is not.
 *
 * Called before the credits are charged, so a member who is turned away here
 * has not paid for the turn. The message says how much is left rather than
 * just "no", because "come back next month" and "try a shorter take" are
 * different answers and only the number tells you which one applies.
 */
export async function enough(seconds: number): Promise<Refusal | null> {
  const left = await leftSeconds();
  if (seconds <= left) return null;

  const minutes = Math.floor(left / 60);
  return {
    left,
    message:
      minutes > 0
        ? `This month's singing allowance is nearly used up — about ${minutes} minute${
            minutes === 1 ? '' : 's'
          } left, and this take is longer than that. A shorter take will still go through.`
        : "This month's singing allowance is used up. It starts again on the first of the month.",
  };
}

export type Kind = 'sing' | 'split' | 'isolate';

/**
 * Write down what a finished piece of work spent.
 *
 * Called after the work succeeds, never before: minutes burn on download, and
 * a conversion that failed downloaded nothing. Deliberately swallows its own
 * failure — a member whose audio came back should not be handed an error
 * because the bookkeeping did not land, and the next read simply sees a
 * slightly low number, which errs in the spending direction rather than the
 * refusing one.
 */
export async function note(seconds: number, kind: Kind, owner?: string | null): Promise<void> {
  const db = admin();
  if (!db) return;

  const whole = Math.max(0, Math.round(seconds));
  if (!whole) return;

  /* The cached figure is nudged rather than thrown away, so the next caller in
     the same half-minute sees this row even though the database has not been
     asked again. */
  if (Date.now() < cached.until) cached = { ...cached, seconds: cached.seconds + whole };

  await db
    .from('kits_minutes')
    .insert({ owner: owner ?? null, kind, seconds: whole })
    .then(
      () => undefined,
      () => undefined,
    );
}

/** Cleared between tests. Not used by the app. */
export function forgetCount(): void {
  cached = { seconds: 0, until: 0 };
}

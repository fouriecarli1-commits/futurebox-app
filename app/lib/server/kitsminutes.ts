/**
 * How much of the month's Kits.AI allowance is left, and the brake on it.
 *
 * ── Why a ceiling exists at all ──────────────────────────────────────────
 *
 * Kits' Professional Plan is R640 a month and is not unlimited: it carries a
 * roof of **400 download minutes**.
 *
 * ── What Kits confirmed, 9 September 2026 ────────────────────────────────
 *
 * Their support, in writing, to a direct question: the roof is their **fair
 * use policy**, it **resets automatically at the start of the next billing
 * cycle**, and **there is no add-on to purchase additional capacity beyond
 * it**.
 *
 * That last clause is the one that matters here. It means this counter is not
 * a warning before a purchase — there is nothing to purchase. When the four
 * hundred are gone, singing conversion, stem splitting and cleaning are off
 * for the rest of the cycle for everybody, and the only lever is a bigger
 * plan next month. A brake that runs out is therefore the whole of the
 * safety, not the first half of it.
 *
 * Conversion time is free; the minutes burn
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
 * What one member may spend of it in a month, in minutes.
 *
 * ── Why a per-member cap on top of the workspace roof ────────────────────
 *
 * Carli, 9 September 2026: "Ek dink ons gaan baie streng cap op elke user moet
 * sit vir kits se stemkloning. Dus iets soos 5min per persoon."
 *
 * `monthlyMinutes()` above is Kits' own roof and it stops the account running
 * out. What it cannot do is say *who* used it. One member converting fifty
 * minutes leaves everybody else with nothing, and the first they hear of it is
 * a refusal in a room that worked yesterday.
 *
 * It is worth being plain about what this does and does not buy, because the
 * arithmetic is unforgiving: four hundred minutes divided by five is eighty
 * members, and it stays eighty. **The cap adds no capacity.** What it changes
 * is who gets the four hundred — shared out rather than first-come — and that
 * is worth having on its own, because "the person who found the button first
 * took the month" is not a rule anybody would choose.
 *
 * Five is hers. Overridable because it is a number to tune once real members
 * are using it, not a law.
 */
export function minutesEach(): number {
  const said = Number(process.env.KITS_MINUTES_EACH);
  return Number.isFinite(said) && said > 0 ? Math.floor(said) : 5;
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

/**
 * What one member has already spent this month.
 *
 * Not cached, unlike the workspace count. That one is shared by everybody and
 * moves as fast as the whole app converts; this one moves only when this
 * member does, and a member who has just finished a conversion asking again a
 * second later must not be told they have room they no longer have. It is one
 * indexed read on their own rows.
 *
 * A read that fails answers **null** — could not ask. Never nought: the cap
 * is the thing standing between one member and everybody else's month, and a
 * failed read that reported "nothing used" would take the cap off at exactly
 * the moment it stops working. The caller treats null as no room rather than
 * as all of it.
 */
export async function mineSeconds(owner: string): Promise<number | null> {
  const db = admin();
  if (!db) return null;
  const { data, error } = await db.rpc('kits_seconds_this_month_for', { p_owner: owner });
  if (error) return null;
  const seconds = Number(data);
  return Number.isFinite(seconds) ? seconds : null;
}

export interface Refusal {
  readonly message: string;
  readonly left: number;
  /** Which of the three refusals this is, so it can be said in Afrikaans. */
  readonly code: 'kits_yours_used' | 'kits_month_used' | 'kits_unknown';
}

/**
 * Null when there is room for a piece this long, a refusal when there is not.
 *
 * Called before the credits are charged, so a member who is turned away here
 * has not paid for the turn. The message says how much is left rather than
 * just "no", because "come back next month" and "try a shorter take" are
 * different answers and only the number tells you which one applies.
 */
export async function enough(seconds: number, owner?: string | null): Promise<Refusal | null> {
  /* The member's own share first, because it is the one they can act on.

     Told apart from the workspace roof on purpose: "everybody is out until the
     first" and "you are out until the first" are different sentences, and only
     one of them means somebody else can still use the room. They carry
     different codes so `lib/apierror.ts` can say each in Afrikaans. */
  if (owner) {
    const mine = await mineSeconds(owner);
    if (mine === null) {
      /* Could not ask. Refused rather than waved through: this cap is what
         stands between one member and everybody else's month, and a failed
         read that let the take past would take the cap off at exactly the
         moment it stopped working. */
      return {
        left: 0,
        code: 'kits_unknown',
        message:
          'Your singing allowance could not be checked just now, so this one is held rather than guessed at. Try again in a moment.',
      };
    }
    const ownLeft = Math.max(0, minutesEach() * 60 - mine);
    if (seconds > ownLeft) {
      const own = Math.floor(ownLeft / 60);
      return {
        left: ownLeft,
        code: 'kits_yours_used',
        message:
          own > 0
            ? `You have about ${own} minute${own === 1 ? '' : 's'} of singing left this month, and this take is longer than that. A shorter take will still go through.`
            : `You have used your ${minutesEach()} minutes of singing for this month. It starts again on the first.`,
      };
    }
  }

  const left = await leftSeconds();
  if (seconds <= left) return null;

  const minutes = Math.floor(left / 60);
  return {
    left,
    code: 'kits_month_used',
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
 * What a job actually spends: the audio that comes *back*, not the audio sent.
 *
 * ── The undercount this exists to stop ───────────────────────────────────
 *
 * Kits' four hundred minutes burn on **download** — `docs/KITS-KAART.md` §1,
 * and it is the sentence the whole ceiling rests on. Every caller here was
 * writing down the length of the file it *sent*, which is right for a voice
 * conversion, where one file goes and one comes back.
 *
 * It is wrong for a separation. `/api/stems` downloads two files — the voice
 * and the backing — each the full length of the song, and wrote down one
 * song's length. Half of what it burned. A four-stem split would have been a
 * quarter.
 *
 * At R640 for 400 minutes that is R1.60 a minute of real money, and a ceiling
 * that reads half of what has been spent is not a ceiling: it lets the plan
 * run out at two hundred minutes on the counter while Kits' own dashboard —
 * the authoritative one — says four hundred.
 *
 * ── Why files times length, rather than measuring the files ─────────────
 *
 * A separation returns stems that are exactly as long as what went in; that
 * is what a separation is. So the length is known without decoding anything,
 * and it stays known when the stems come back as MP3, which
 * `lib/server/audiolen.ts` cannot read the length of anyway.
 *
 * The one thing this must not do is guess low. `Math.max(1, files)` means a
 * caller that forgets to say still bills one file rather than zero.
 */
export function downloadSeconds(seconds: number, files: number): number {
  const each = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const many = Number.isFinite(files) && files > 1 ? Math.floor(files) : 1;
  return each * many;
}

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

  /* And look at whether the roof is close enough to write about.

     Imported here rather than at the top on purpose: `spendwatch` reads this
     module's `usedSeconds` and `monthlyMinutes`, so a static import would be a
     cycle. A cycle between two modules of hoisted functions happens to work,
     and "happens to work" is not a thing to leave in the path that decides
     whether a warning goes out.

     Not awaited. The caller has already downloaded the audio this row is
     about; a letter may not stand in front of handing it over. */
  void import('./spendwatch').then(
    (watch) => watch.watchKits(),
    () => undefined,
  );
}

/** Cleared between tests. Not used by the app. */
export function forgetCount(): void {
  cached = { seconds: 0, until: 0 };
}

/**
 * Spending and granting credits, from the server only.
 *
 * Every arithmetic decision happens inside Postgres — see `supabase/credits.sql`
 * for why. This file is the thin layer that calls those functions and knows
 * which grant is due.
 *
 * ── Granted when somebody arrives, not by a clock ────────────────────────
 *
 * There is no scheduled job handing out monthly credits. `settle` runs when a
 * person actually opens the app, works out which grants they have not had, and
 * writes them. The period key makes that safe to call as often as it likes:
 * the second call in a month writes nothing.
 *
 * That also means a dormant account costs nothing and accrues nothing. Come
 * back after four months away and you get this month's credits, not four
 * months' worth — which is the honest reading of a monthly allowance, and the
 * one that keeps the video engine's ceiling servable.
 */

import { admin, callerById, callerFrom, callerIsOwner, metered, type Caller } from './account';
import { wrote } from './wrote';
import { budgetFor, capFor, monthKey, TIER_CREDITS, WELCOME_CREDITS } from '@/app/lib/credits';
import { kidsRelease, kidsSpend, kidsWalletReturn, kidsWalletTake } from './kidsmode';
import { splitOf, type Share } from '@/app/lib/paysplit';

export type { Share } from '@/app/lib/paysplit';

/**
 * What is left, or null when the question could not be asked.
 *
 * Null and zero are different answers and it matters which is given. Before
 * `credits.sql` has been run the function does not exist, and returning zero
 * for that told people they had spent credits they had never been given —
 * with no hint that anything was wrong. Null lets the screen say "not now"
 * instead of a number that is a lie.
 */
export async function balanceOf(owner: string): Promise<number | null> {
  const client = admin();
  if (!client) return null;
  const { data, error } = await client.rpc('credit_balance', { p_owner: owner });
  if (error) return null;
  return typeof data === 'number' ? data : Number(data ?? 0);
}

/**
 * Take the credits, or refuse.
 *
 * True means they are gone and the caller may go ahead. False means the
 * balance was short and nothing was written.
 *
 * Every route spends *before* it does the work, and refunds if the work
 * fails. Checking first and charging after reads better and is wrong: two
 * requests can both pass a check, and the second one gets its work free. The
 * lock inside `spend_credits` is the only thing that makes the decision
 * atomic, so it has to come first, and `refund` exists to put it right when
 * the engine then falls over.
 */
export async function spend(
  owner: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<boolean> {
  const client = admin();
  if (!client) return true; // No database: nothing is metered, as everywhere else.
  const { data, error } = await client.rpc('spend_credits', {
    p_owner: owner,
    p_amount: amount,
    p_reason: reason,
    p_ref: ref ?? null,
  });
  if (error) return false;
  return data === true;
}

/**
 * Give back what was taken for work that did not happen.
 *
 * Used when a generation is charged and then the engine fails. It is a grant
 * with no period and no cap, because it is not a gift — it is undoing a
 * charge, and refusing to undo it because somebody is near their ceiling would
 * be theft with a good excuse.
 */
export async function refund(owner: string, amount: number, ref?: string): Promise<void> {
  const client = admin();
  if (!client || amount <= 0) return;
  /* And back onto the child's allowance, if there is one. A generation that
     was charged and then failed upstream is refunded to the account here;
     without this line the credits come back and the allowance does not, so a
     child pays for the engine's bad afternoon. */
  /* Kids credits first: what the kids balance paid goes back to the kids
     balance, never into the account, where a kids pack's cheap credit
     would be spendable in the grown-up studio. Only the rest comes back
     here. See `kids_wallet_return` in `supabase/kinderkrediete.sql`. */
  const toKids = await kidsWalletReturn(owner, amount);
  const rest = amount - toKids;
  if (rest <= 0) return;
  await kidsRelease(owner, rest);
  wrote(await client.from('credit_entries').insert({
    owner,
    amount: rest,
    reason: 'refund',
    ref: ref ?? null,
  }), 'the credit entry');
}

/** A purchase. Written only by the payment webhook, and once per reference. */
export async function topUp(owner: string, credits: number, reference: string): Promise<void> {
  const client = admin();
  if (!client) return;
  await client.rpc('add_credits', {
    p_owner: owner,
    p_amount: credits,
    p_ref: reference,
  });
}

/**
 * Hand over whatever this account is owed, then say what it has.
 *
 * One grant, once a month, on every tier. The budget makes calling it twice
 * harmless, which matters because this runs on every visit rather than from a
 * clock.
 */
export async function settle(caller: Caller): Promise<number | null> {
  const client = admin();
  if (!client) return null;

  const cap = capFor(caller.tier);
  // What may be handed over this month across every grant, so that calling
  // this on every visit cannot become a second month's worth.
  const budget = budgetFor(caller.tier);

  /* The once-off welcome, before the month: see `WELCOME_CREDITS`. The period
     key is what makes it once; the cap is set out of the way, because a
     welcome is owed whatever the balance is — a member who bought a pack on
     day one is not thereby owed less. It is not 'monthly', so the budget
     below does not count it. */
  const welcome = await client.rpc('grant_credits', {
    p_owner: caller.id,
    p_amount: WELCOME_CREDITS,
    p_reason: 'welcome',
    p_period: 'welcome',
    p_cap: 1_000_000_000,
    p_budget: null,
  });
  if (welcome.error) return null;

  const monthly = await client.rpc('grant_credits', {
    p_owner: caller.id,
    p_amount: TIER_CREDITS[caller.tier],
    p_reason: 'monthly',
    p_period: monthKey(caller.tier),
    p_cap: cap,
    p_budget: budget,
  });

  // A grant that fails is not a grant of nothing. Ignoring the error left the
  // balance reading zero with nothing to say why, which is indistinguishable
  // from having spent it — the same confusion the balance itself had.
  if (monthly.error) return null;

  return balanceOf(caller.id);
}

/* ─────────────────────────────────────────────── one pattern, one place ─ */

export interface Charged {
  readonly ok: true;
  /** Null when nothing is metered, so a refund is a no-op. */
  readonly owner: string | null;
  /** Put the credits back. Call it when the work then failed. */
  refund(): Promise<void>;
}

export interface Refused {
  readonly ok: false;
  readonly response: Response;
}

/**
 * Take the credits for a piece of work, or hand back the refusal to send.
 *
 * Every route that costs money calls this before doing anything, and calls
 * `refund()` if the engine then fails. Having it in one function is the point:
 * eight routes each writing their own version of "check who this is, settle
 * what they are owed, spend, and answer nicely when they cannot" is eight
 * chances to get the order wrong.
 *
 * The refusal carries `needsCredits`, which is what opens the top-up panel in
 * the browser. That panel exists nowhere else — running out is the only moment
 * anybody is shown what a pack costs.
 */
export async function charge(
  request: Request,
  amount: number,
  reason: string,
  ref?: string,
): Promise<Charged | Refused> {
  const noop: Charged = { ok: true, owner: null, refund: async () => {} };

  // No accounts configured: nothing is metered anywhere in this app, and this
  // is not the place to start.
  if (!metered()) return noop;

  const caller = await callerFrom(request);
  if (!caller) {
    return {
      ok: false,
      response: Response.json(
        { message: 'Sign in first — credits belong to an account.', signedIn: false },
        { status: 401 },
      ),
    };
  }

  /**
   * Whoever runs the place is not metered by their own meter.
   *
   * Credits are a way of passing a real cost on to somebody. The operator is
   * the somebody that cost lands on already: every generation they make is
   * charged to their own ElevenLabs, Kling and Anthropic accounts before this
   * function is reached. Taking app credits from them as well is a fiction
   * whose only real effect is that the person responsible for the app cannot
   * test it — which is exactly what happened, on the tier the app itself calls
   * its largest.
   *
   * What is deliberately *not* skipped: the provider ceilings in
   * app/api/video, and the safety gate. Those guard real money and real
   * exposure, and the operator is no more exempt from those than anyone. This
   * skips one fiction, not the rules.
   *
   * The work is still recorded wherever the route records it, so an operator's
   * own test generations still feed `video_costs` — which matters, because
   * theirs are the first rows that table will ever have.
   */
  if (callerIsOwner(caller)) return { ok: true, owner: null, refund: async () => {} };

  // Whatever is owed lands before the balance is read, so somebody arriving on
  // the first of the month is not told they are short of their own allowance.
  const balance = await settle(caller);

  // The tables are not there. Refusing for want of credits would be wrong and
  // the top-up panel would be worse — buying credits fixes nothing when there
  // is nowhere to put them.
  if (balance === null) {
    return {
      ok: false,
      response: Response.json(
        { message: 'Credits are not switched on for this app yet.' },
        { status: 503 },
      ),
    };
  }

  /* ── The child's allowance, before the account's balance ──────────────
 
     The owner, 9 October 2026: *"Let the parent give an allowance on an opening
     page."* This is the line that makes that allowance real. Everything
     else about kids mode is a room and a page; this is the only place the
     limit is actually applied, because this is the only place the money
     moves.
 
     Before `spend` rather than after, so a refused child costs the account
     nothing at all — and released again below if `spend` then refuses,
     because an allowance taken for a song the parent could not afford is a
     child short for nothing. `supabase/kinders.sql` holds both halves and
     the lock they share.
 
     An account not in kids mode gets `true` and never touches the table. */
  /* ── Kids credits, before anything of the account's ────────────────
 
     The owner, 14 October 2026: the kids room has its own credits, bought with
     a kids pack. While the room is open they pay first, and only what they
     do not cover goes on to the allowance and the account. A charge the
     kids balance covers whole touches neither. `kids_wallet_take` takes
     nothing when the room is shut, so these credits pay for nothing else. */
  const fromKids = await kidsWalletTake(caller.id, amount);
  const rest = amount - fromKids;
  if (rest <= 0) {
    const owner = caller.id;
    return { ok: true, owner, refund: () => refund(owner, amount, ref) };
  }

  if (!(await kidsSpend(caller.id, rest))) {
    await kidsWalletReturn(caller.id, fromKids);
    return {
      ok: false,
      response: Response.json(
        {
          message: 'That is more than is left of your allowance. Ask a grown-up.',
          kidsSpent: true,
          need: amount,
        },
        { status: 402 },
      ),
    };
  }

  if (!(await spend(caller.id, rest, reason, ref))) {
    await kidsRelease(caller.id, rest);
    await kidsWalletReturn(caller.id, fromKids);
    return {
      ok: false,
      response: Response.json(
        {
          message: `That needs ${amount} ${amount === 1 ? 'credit' : 'credits'} and you have ${balance}.`,
          needsCredits: true,
          need: amount,
          balance,
        },
        { status: 402 },
      ),
    };
  }

  const owner = caller.id;
  return { ok: true, owner, refund: () => refund(owner, amount, ref) };
}

/* ─────────────────────────────────────── a song two people made together ─ */

/**
 * Take the credits for a song made together, from both accounts or from one.
 *
 * The owner, 21 October 2026, asked how a collab song's cost could be split,
 * and then: *"Ja, verdeel dit half-half, en gee die opsie van 1 persoon wat
 * alles dra."* Half each is what a room starts on; carrying all of it is a
 * choice each person can only make for themselves (`/api/pairs` 'pays').
 *
 * All or nothing. The caller's part is taken first, through `charge`, so the
 * caller's own refusals (signed out, short, a kids allowance) read exactly as
 * they always have; then the other part, and if that one is short the
 * caller's part goes back before the refusal is sent. Nobody is left having
 * paid for a song that was not made.
 *
 * Whoever runs the place is not metered, on either side.
 */
export async function chargeTogether(
  request: Request,
  amount: number,
  reason: string,
  other: string,
  share: Share,
): Promise<Charged | Refused> {
  if (share === 'caller' || !metered() || amount <= 0) return charge(request, amount, reason);

  const { mine, theirs } = splitOf(amount, share);

  let first: Charged;
  if (mine > 0) {
    const took = await charge(request, mine, reason);
    if (!took.ok) return took;
    first = took;
  } else {
    /* Paying nothing still needs somebody signed in to press the button. */
    const caller = await callerFrom(request);
    if (!caller) {
      return {
        ok: false,
        response: Response.json({ message: 'Sign in first — credits belong to an account.', signedIn: false }, { status: 401 }),
      };
    }
    first = { ok: true, owner: null, refund: async () => {} };
  }

  const them = await callerById(other);
  if (!them) {
    await first.refund();
    return {
      ok: false,
      response: Response.json(
        { message: 'The other person’s account could not be read just now, so nothing was charged. Try again in a moment.' },
        { status: 503 },
      ),
    };
  }
  if (callerIsOwner(them)) return first;

  const balance = await settle(them);
  if (balance === null || !(await spend(them.id, theirs, `${reason}:together`))) {
    await first.refund();
    const short = balance === null
      ? 'Their credits could not be read just now, so nothing was charged. Try again in a moment.'
      : share === 'half'
        ? `Their half is ${theirs} ${theirs === 1 ? 'credit' : 'credits'} and they have ${balance}. Nothing was charged — they can top up, or one of you can pay it all.`
        : `They chose to pay it all — ${theirs} ${theirs === 1 ? 'credit' : 'credits'} — and they have ${balance}. Nothing was charged — they can top up, or you can split it.`;
    return { ok: false, response: Response.json({ message: short, theirsShort: true }, { status: 402 }) };
  }

  return {
    ok: true,
    owner: first.owner,
    refund: async () => {
      await first.refund();
      await refund(them.id, theirs);
    },
  };
}

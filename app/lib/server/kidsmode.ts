/**
 * Kids mode, as the server sees it.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."*
 *
 * ── Why any of this is server-side ───────────────────────────────────────
 *
 * Because an allowance kept in the page is decoration. The child is on the
 * parent's phone, signed into the parent's account, pressing buttons that
 * charge the parent's credits. A limit the room enforces is a limit a reload
 * does not, and a limit a second tab does not, and a limit that does not
 * exist for the half-second before the room's JavaScript arrives. The only
 * place a spending limit means anything is where the spending happens, which
 * in this app is `charge()` — so that is where this is wired in, and
 * `check:toelaag` asserts the wiring rather than trusting it.
 *
 * `supabase/kinders.sql` carries the shape and why a row's presence is the
 * on-switch.
 *
 * ── What it is not ───────────────────────────────────────────────────────
 *
 * A boundary against the account holder. Whoever can turn this on can turn
 * it off. It is a budget, and what it is actually for is a six-year-old
 * pressing a button forty times — for that it is exact.
 */

import { admin } from './account';
import { sane, saneMinutes } from '../kidsallowance';

export interface KidsRoom {
  readonly allowance: number;
  readonly spent: number;
  /** What is left. Never negative — see `kids_release`. */
  readonly left: number;
  /** How long one sitting may last. Null is a budget with no clock on it. */
  readonly minutes: number | null;
  /**
   * Seconds left in this sitting. Null when there is no clock.
   *
   * Null and zero are different answers and every caller is written to tell
   * them apart: null lets everything through, zero shuts the room. Reading
   * one as the other would lock every kids room opened before today out of
   * its own allowance.
   */
  readonly secondsLeft: number | null;
  /**
   * Kids credits bought with a kids pack (`lib/kidspacks.ts`), spent before
   * the allowance and only in the kids room. Included in `left`.
   */
  readonly bought: number;
}

/**
 * Is this account in kids mode, and how much is left?
 *
 * `null` for "no", which is also what comes back when there is no database.
 * That default is the safe direction: an app with no tables meters nothing
 * anywhere, and inventing a locked kids room for it would lock the only
 * person who could unlock it out of their own studio.
 */
export async function kidsRoom(owner: string): Promise<KidsRoom | null> {
  const client = admin();
  if (!client) return null;
  const { data, error } = await client
    .from('kids_mode')
    .select('allowance, spent, minutes')
    .eq('owner', owner)
    .maybeSingle();
  if (error || !data) return null;
  const allowance = Number(data.allowance) || 0;
  const spent = Number(data.spent) || 0;
  const minutes = data.minutes === null || data.minutes === undefined
    ? null
    : Number(data.minutes);

  /* The clock from the database and not from here.
 
     `now()` in Postgres rather than `Date.now()` in this process is the whole
     point: a sitting measured against the browser's clock is a sitting a
     child ends by changing the time on the phone, and a sitting measured
     against a server process's clock is one that drifts between two
     instances. One clock, in the one place that holds `sitting_from`. */
  const { data: left } = await client.rpc('kids_time_left', { p_owner: owner });
  const secondsLeft = left === null || left === undefined ? null : Number(left);

  const bought = await kidsWallet(owner);
  return {
    allowance,
    spent,
    bought,
    left: Math.max(0, allowance - spent) + bought,
    minutes,
    secondsLeft: Number.isFinite(secondsLeft as number) ? secondsLeft : null,
  };
}

/**
 * Whether a request from the kids room is paid for by the kids room.
 *
 * A kids pack is sold without a plan (`api/checkout`): "the kids room is for
 * anybody's child". But the video, picture and song routes asked "is this a
 * paid plan?" before anything else, so a parent with a kids pack and no plan
 * had a child pressing buttons that all said "starts on Maker" (found 16
 * October 2026, checking the plan cards against the code). An open room with
 * something left in it — allowance or bought kids credits — is what pays,
 * so it is what lets the kids room's own requests through.
 */
export async function kidsCovers(owner: string): Promise<boolean> {
  const room = await kidsRoom(owner);
  return Boolean(room && room.left > 0 && room.secondsLeft !== 0);
}

/**
 * Open the room with an allowance, or change the allowance of an open one.
 *
 * `spent` is deliberately NOT reset when an allowance is raised. A parent
 * topping a child up mid-afternoon means "have ten more", not "start again",
 * and the second reading would hand over the whole allowance twice.
 */
export async function openKids(
  owner: string,
  allowance: number,
  minutes: number | null = null,
): Promise<true | string> {
  if (!sane(allowance) || !saneMinutes(minutes)) return 'That allowance is not one the room takes.';
  const client = admin();
  if (!client) return 'The database is not configured on this server.';
  const { error } = await client
    .from('kids_mode')
    .upsert({
      owner,
      allowance,
      minutes,
      /* Handing the phone over IS the start of the sitting, so the clock
         starts here and not on the child's first press. A clock that started
         when the child pressed something would hand out unlimited time to a
         child who sat looking at the screen, which is the whole thing a
         parent setting screen time is asking about.
 
         Null when there is no clock, which also clears a sitting that was
         running when the parent took the clock off. */
      sitting_from: minutes === null ? null : new Date().toISOString(),
    }, { onConflict: 'owner' });
  if (!error) return true;
  /* Said in words a person can act on, because the two ways this fails in
     practice are both "a file in supabase/ has not been run" — and "could
     not be saved, try again" sends somebody to try again forever. 42P01 is
     Postgres for a table that is not there; 42703 for a column that is
     not. */
  if (error.code === '42P01') {
    return 'The kids room is not in the database yet: run supabase/kinders.sql and supabase/skermtyd.sql.';
  }
  if (error.code === '42703') {
    return 'The kids table is missing the screen-time columns: run supabase/skermtyd.sql.';
  }
  return 'That could not be saved. Try again.';
}

/**
 * Another sitting, without touching the allowance.
 *
 * The grown-up's "another twenty minutes". `spent` is deliberately not reset:
 * more time is not more money, and a parent who meant both presses both.
 */
export async function sitAgain(owner: string): Promise<boolean> {
  const client = admin();
  if (!client) return false;
  const { error } = await client.rpc('kids_sit', { p_owner: owner });
  return !error;
}

/**
 * End this sitting now.
 *
 * The grown-up taking the phone back before the clock runs out. The room
 * stays open with its allowance intact — this is not `shutKids`, which is the
 * off switch.
 */
export async function standUp(owner: string): Promise<boolean> {
  const client = admin();
  if (!client) return false;
  const { error } = await client.rpc('kids_stand', { p_owner: owner });
  return !error;
}

/** Shut it. The delete is the off-switch; there is no flag to clear. */
export async function shutKids(owner: string): Promise<boolean> {
  const client = admin();
  if (!client) return false;
  const { error } = await client.from('kids_mode').delete().eq('owner', owner);
  return !error;
}

/**
 * Take `amount` off the allowance, or say no.
 *
 * `true` means the charge may go ahead — either this account is not in kids
 * mode, or there was room and this took it. `false` is the one case the room
 * has to tell the child about, and the only case where nothing was taken.
 *
 * True when there is no database, for the same reason `spend` is: nothing is
 * metered in that app and this is not the place to start metering.
 */
export async function kidsSpend(owner: string, amount: number): Promise<boolean> {
  const client = admin();
  if (!client) return true;
  const { data, error } = await client.rpc('kids_spend', {
    p_owner: owner,
    p_amount: amount,
  });
  /* An error is a no. A database that cannot answer whether there is
     allowance left is not a database that should be spending it, and the
     direction to be wrong in is the one where a child is told to wait. */
  if (error) return false;
  return data === true;
}

/**
 * Put it back.
 *
 * Called in two places and both are load-bearing. A charge counted here and
 * then refused by `spend_credits` — the parent is out of credits altogether —
 * must not leave the child short for a song that was never made. And a
 * generation that is charged and then fails upstream is refunded to the
 * account, so it has to come back to the allowance too, or a child pays for
 * the engine's bad afternoon.
 */
export async function kidsRelease(owner: string, amount: number): Promise<void> {
  const client = admin();
  if (!client || amount <= 0) return;
  await client.rpc('kids_release', { p_owner: owner, p_amount: amount });
}

/* ─────────────────────────────────────────────── kids credits, bought ─ */

/**
 * The kids balance: credits bought with a kids pack, for the kids room only.
 * `supabase/kinderkrediete.sql` holds the table and the three functions;
 * nothing here moves a number itself. Zero when the file has not been run.
 */
export async function kidsWallet(owner: string): Promise<number> {
  const client = admin();
  if (!client) return 0;
  const { data, error } = await client
    .from('kids_wallet')
    .select('credits')
    .eq('owner', owner)
    .maybeSingle();
  if (error || !data) return 0;
  return Math.max(0, Number((data as { credits: number }).credits) || 0);
}

/** A kids pack paid for. Once per Paystack reference, however often it arrives. */
export async function kidsWalletAdd(
  owner: string,
  credits: number,
  reference: string,
  customerCode: string | null = null,
): Promise<boolean> {
  const client = admin();
  if (!client) return false;
  const { error } = await client.rpc('kids_wallet_add', {
    p_owner: owner,
    p_amount: credits,
    p_ref: reference,
    p_customer: customerCode,
  });
  return !error;
}

/** How much of a charge the kids balance covers. Nothing when the room is shut. */
export async function kidsWalletTake(owner: string, amount: number): Promise<number> {
  const client = admin();
  if (!client || amount <= 0) return 0;
  const { data, error } = await client.rpc('kids_wallet_take', { p_owner: owner, p_amount: amount });
  if (error) return 0;
  return Math.max(0, Math.min(amount, Number(data) || 0));
}

/** A refund, back to the kids balance as far as it paid. Returns how much went back. */
export async function kidsWalletReturn(owner: string, amount: number): Promise<number> {
  const client = admin();
  if (!client || amount <= 0) return 0;
  const { data, error } = await client.rpc('kids_wallet_return', { p_owner: owner, p_amount: amount });
  if (error) return 0;
  return Math.max(0, Math.min(amount, Number(data) || 0));
}

/** Whose kids balance a Paystack customer tops up, for a monthly pack's renewal. */
export async function kidsOwnerOfCustomer(customerCode: string): Promise<string | null> {
  const client = admin();
  if (!client || !customerCode) return null;
  const { data } = await client
    .from('kids_wallet')
    .select('owner')
    .eq('customer_code', customerCode)
    .maybeSingle();
  return (data as { owner?: string } | null)?.owner ?? null;
}

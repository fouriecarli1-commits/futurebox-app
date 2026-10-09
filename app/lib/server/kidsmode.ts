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
import { sane } from '../kidsallowance';

export interface KidsRoom {
  readonly allowance: number;
  readonly spent: number;
  /** What is left. Never negative — see `kids_release`. */
  readonly left: number;
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
    .select('allowance, spent')
    .eq('owner', owner)
    .maybeSingle();
  if (error || !data) return null;
  const allowance = Number(data.allowance) || 0;
  const spent = Number(data.spent) || 0;
  return { allowance, spent, left: Math.max(0, allowance - spent) };
}

/**
 * Open the room with an allowance, or change the allowance of an open one.
 *
 * `spent` is deliberately NOT reset when an allowance is raised. A parent
 * topping a child up mid-afternoon means "have ten more", not "start again",
 * and the second reading would hand over the whole allowance twice.
 */
export async function openKids(owner: string, allowance: number): Promise<boolean> {
  if (!sane(allowance)) return false;
  const client = admin();
  if (!client) return false;
  const { error } = await client
    .from('kids_mode')
    .upsert({ owner, allowance }, { onConflict: 'owner' });
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

/**
 * Whether somebody has actually paid for a room, asked on the server.
 *
 * ── The only answer that counts ──────────────────────────────────────────
 *
 * The screen hides what is not owned, and hiding is not a lock. Every route
 * behind the add-on asks here, with the caller's own id, before it spends
 * anything or writes anything. A page that decides its own permissions decides
 * them in the buyer's favour.
 *
 * ── Fails closed, and says which kind of closed ──────────────────────────
 *
 * With no database configured, or with `supabase/addons.sql` not run, the
 * answer is "no". That is the safe direction for a paywall, and it is also the
 * direction that would silently lock out somebody who has paid — so `ready`
 * carries the difference out to the screen, which says two different things
 * about them. Same distinction the wallet and the queue were fixed for.
 */

import { admin } from './account';

export interface Owned {
  /** Add-on id → when it runs out, as an ISO instant. Only unexpired ones. */
  readonly owns: Readonly<Record<string, string>>;
  /** False where the question could not be asked at all. */
  readonly ready: boolean;
}

export const OWNS_NOTHING: Owned = { owns: {}, ready: false };

export async function ownedBy(owner: string): Promise<Owned> {
  const client = admin();
  if (!client) return OWNS_NOTHING;

  const { data, error } = await client
    .from('addons')
    .select('addon, until')
    .eq('owner', owner)
    /* Filtered in the statement rather than in JavaScript. The row for a
       lapsed month stays in the table on purpose — see `addons.sql` — so a
       version that read them all and forgot to compare would hand out every
       add-on anybody had ever bought. */
    .gt('until', new Date().toISOString());

  if (error) return OWNS_NOTHING;

  const owns: Record<string, string> = {};
  ((data as { addon: string; until: string }[] | null) ?? []).forEach((row) => {
    owns[row.addon] = row.until;
  });
  return { owns, ready: true };
}

/** The one question a gated route asks. */
export async function hasAddon(owner: string, addon: string): Promise<boolean> {
  const owned = await ownedBy(owner);
  return owned.ready && Boolean(owned.owns[addon]);
}

/**
 * Turn a charge into time. Only ever called from the webhook, after a
 * signature has been verified.
 *
 * The reference is what makes a retried webhook safe: `grant_addon` counts it
 * once and returns the unchanged end date for every retry after that.
 */
export async function grantAddon(
  owner: string,
  addon: string,
  days: number,
  reference: string,
): Promise<boolean> {
  const client = admin();
  if (!client) return false;
  const { error } = await client.rpc('grant_addon', {
    p_owner: owner,
    p_addon: addon,
    p_days: days,
    p_reference: reference,
  });
  return !error;
}

/**
 * Remember whose customer code this is, so a renewal a month from now — which
 * carries no metadata of ours — can be given to the right person.
 */
export async function rememberAddonPayer(customerCode: string, owner: string): Promise<void> {
  const client = admin();
  if (!client || !customerCode) return;
  await client
    .from('addon_customers')
    .upsert({ customer_code: customerCode, owner }, { onConflict: 'customer_code' });
}

/** Who a renewal belongs to, read back from that. */
export async function addonPayer(customerCode: string): Promise<string | null> {
  const client = admin();
  if (!client || !customerCode) return null;
  const { data } = await client
    .from('addon_customers')
    .select('owner')
    .eq('customer_code', customerCode)
    .maybeSingle();
  return (data as { owner?: string } | null)?.owner ?? null;
}

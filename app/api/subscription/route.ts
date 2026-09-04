/**
 * What is being charged, and stopping it.
 *
 * A subscription somebody cannot see and cannot cancel from inside the app is
 * a subscription they will cancel at their bank instead, and then ask for
 * their money back. So: what they are on, what it costs next and when, and one
 * button that actually stops it.
 *
 * Cancelling is Paystack's "disable", and the difference is the honest one:
 * the month already paid for is not refunded and not cut short. The membership
 * therefore stays exactly as it is — `renews_at` already says when it ends —
 * and nothing more is charged after that.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { send } from '@/app/lib/server/email';
import { cancelledLetter } from '@/app/lib/server/letters';
import { stopRenewing } from '@/app/lib/server/paystack';
import { TIER_SPECS, type Tier } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Row {
  subscription_code: string | null;
  email_token: string | null;
  tier: Tier;
  status: string;
  next_payment_at: string | null;
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ subscribed: false });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ subscribed: false });

  const { data } = await client
    .from('subscriptions')
    .select('subscription_code, email_token, tier, status, next_payment_at')
    .eq('owner', caller.id)
    .maybeSingle();
  const row = data as Row | null;
  if (!row) return Response.json({ subscribed: false });

  return Response.json({
    subscribed: true,
    tier: row.tier,
    name: TIER_SPECS[row.tier]?.name ?? row.tier,
    status: row.status,
    nextPaymentAt: row.next_payment_at,
    // Whether the cancel button can do anything. Paystack needs both of these
    // and only has them once the arrangement exists on their side.
    cancellable: Boolean(row.subscription_code && row.email_token) && row.status === 'active',
  });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const { data } = await client
    .from('subscriptions')
    .select('subscription_code, email_token, tier, status, next_payment_at')
    .eq('owner', caller.id)
    .maybeSingle();
  const row = data as Row | null;
  if (!row?.subscription_code || !row.email_token) {
    return Response.json({ message: 'There is no recurring payment to stop.' }, { status: 404 });
  }

  const stopped = await stopRenewing(row.subscription_code, row.email_token);
  if (!stopped.ok) return Response.json({ message: stopped.message }, { status: 502 });

  // Recorded only after Paystack agreed. Marking it cancelled first would tell
  // somebody their payments had stopped when they had not.
  await client
    .from('subscriptions')
    .update({ status: 'non-renewing', updated_at: new Date().toISOString() })
    .eq('owner', caller.id);

  /* The last letter they get from us.

     Sent after Paystack agreed and after the row is updated, so it can never
     tell somebody their payments stopped when they have not. Awaited for the
     same reason the receipt is: returning first freezes the send.

     Keyed on the subscription code so a double-click on the cancel button
     cannot send it twice. The person's own language is known here — unlike a
     renewal, they are standing in front of the app — so it is asked for and
     used. */
  const asked = new URL(request.url).searchParams.get('lang');
  await send({
    to: caller.email,
    ...cancelledLetter(
      row.next_payment_at ? new Date(row.next_payment_at) : null,
      asked === 'af' ? 'af' : 'en',
    ),
    kind: 'cancelled',
    once: `cancelled:${row.subscription_code}`,
  });

  return Response.json({ stopped: true });
}

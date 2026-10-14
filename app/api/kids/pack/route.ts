/**
 * The monthly kids pack: what is standing, and stopping it.
 *
 * A monthly kids pack (`lib/kidspacks.ts`) is a Paystack subscription of its
 * own, beside any membership, so the account screen's "stop my plan" does
 * not reach it. The terms say a monthly pack can be stopped at any time from
 * the parents page; this is that door. Stopping ends the renewal — the
 * credits already bought stay on the kids balance, and nothing is charged
 * after.
 *
 * The account is the caller's, from the token; the Paystack customer is the
 * one written on that account's kids balance when the pack was bought.
 * Nothing in the body chooses whose pack is stopped.
 */
import { callerFrom, admin } from '@/app/lib/server/account';
import { kidsArrangementsOf, stopRenewing } from '@/app/lib/server/paystack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function customerOf(owner: string): Promise<string | null | 'unread'> {
  const client = admin();
  if (!client) return null;
  const { data, error } = await client.from('kids_wallet').select('customer_code').eq('owner', owner).maybeSingle();
  if (error) return 'unread';
  return (data as { customer_code?: string | null } | null)?.customer_code ?? null;
}

export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });
  const customer = await customerOf(caller.id);
  if (customer === 'unread') return Response.json({ message: 'The kids balance could not be read.' }, { status: 503 });
  if (!customer) return Response.json({ monthly: [] });
  const standing = (await kidsArrangementsOf(customer)).filter((one) => one.status === 'active');
  return Response.json({
    monthly: standing.map((one) => ({ pack: one.pack, nextPaymentAt: one.nextPaymentAt })),
  });
}

export async function DELETE(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });
  const customer = await customerOf(caller.id);
  if (customer === 'unread') return Response.json({ message: 'The kids balance could not be read, so nothing was stopped. Try again.' }, { status: 503 });
  if (!customer) return Response.json({ stopped: 0 });
  const standing = (await kidsArrangementsOf(customer)).filter((one) => one.status === 'active');
  let stopped = 0;
  const failed: string[] = [];
  for (const one of standing) {
    const done = await stopRenewing(one.subscriptionCode, one.emailToken);
    if (done.ok) stopped += 1;
    else failed.push(done.message);
  }
  if (failed.length) {
    return Response.json({ stopped, message: `It could not all be stopped: ${failed[0]} Try again, or ask on the help page.` }, { status: 502 });
  }
  return Response.json({ stopped });
}

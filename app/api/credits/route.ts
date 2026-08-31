/**
 * What this account has to spend.
 *
 * Asked by every screen that is about to offer something that costs. It also
 * hands over any grant that has come due since the last look, which is why
 * there is no scheduled job anywhere in this app giving out credits.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { settle } from '@/app/lib/server/credits';
import { capFor, PACKS, TIER_CREDITS } from '@/app/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  // Without accounts nothing is metered, and the app has always behaved as
  // though everything were available. Saying so plainly beats reporting zero.
  if (!metered()) return Response.json({ metered: false, balance: 0, packs: PACKS });

  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ metered: true, signedIn: false, balance: 0, packs: PACKS });
  }

  const balance = await settle(caller);
  return Response.json({
    metered: true,
    signedIn: true,
    // False when the credit tables are not there yet. The screen shows a dash
    // rather than a zero, because a zero here reads as "you have used them up".
    ready: balance !== null,
    balance: balance ?? 0,
    tier: caller.tier,
    monthly: TIER_CREDITS[caller.tier],
    cap: capFor(caller.tier),
    packs: PACKS,
  });
}

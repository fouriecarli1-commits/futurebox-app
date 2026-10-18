/**
 * How much cloud space this member is using, and how much their plan holds.
 *
 * The owner, 16 October 2026: *"Please impliment the storage plan as you
 * suggested."* The limit lives in the database (`supabase/berging.sql`) —
 * this only reads it, for the gauge on the account screen and for the
 * sentence an upload refused for space is answered with.
 *
 * The plan's number comes from `plans.ts` (`spaceGb`) so the gauge says the
 * same as the card; `check:berging` holds that and the SQL in step. What is
 * used comes from `storage_used`, which is the only thing that can see the
 * file sizes. Before that file is run it answers `ready: false`, and the
 * screen shows the plan's space with no gauge rather than a false zero.
 */
import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { TIER_SPECS } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GB = 1073741824;

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ metered: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ metered: true, signedIn: false });

  const cap = TIER_SPECS[caller.tier].spaceGb * GB;
  const client = admin();
  if (!client) return Response.json({ metered: true, signedIn: true, ready: false, cap, used: 0, tier: caller.tier });

  const { data, error } = await client.rpc('storage_used', { p_owner: caller.id });
  if (error) return Response.json({ metered: true, signedIn: true, ready: false, cap, used: 0, tier: caller.tier });
  const used = Number(data ?? 0);
  return Response.json({ metered: true, signedIn: true, ready: true, cap, used, full: used >= cap, tier: caller.tier });
}

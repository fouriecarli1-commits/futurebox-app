/**
 * What this person has paid for.
 *
 * The page asks so it can show the right button — open, keep, or download. It
 * is a convenience for the UI and nothing more: the download itself is gated
 * separately, on the server, because a page that decides its own permissions
 * decides them in the buyer's favour.
 *
 * Answers with an empty set rather than an error when nobody is signed in.
 * "You own nothing" is the correct answer to that question, not a failure.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ levels: {} });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ levels: {} });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const db = createClient(url, service, { auth: { persistSession: false } });

  const { data } = await db.from('purchases').select('track_id, level').eq('owner', caller.id);

  // 'owned' wins over 'opened' — one map, highest level per track.
  const levels: Record<string, 'opened' | 'owned'> = {};
  ((data as { track_id: string; level: 'opened' | 'owned' }[] | null) ?? []).forEach((row) => {
    if (row.level === 'owned' || !levels[row.track_id]) levels[row.track_id] = row.level;
  });

  return Response.json({ levels, tier: caller.tier });
}

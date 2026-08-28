/**
 * What this person may do with voices, and which ones they have.
 *
 * One request so the studio can render itself correctly on first paint rather
 * than guessing and then correcting — a screen that offers cloning and then
 * takes it away a second later is worse than one that never offered it.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { configured, stockVoices } from '@/app/lib/server/eleven';
import { PODCAST_CAPS } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ configured: false, mine: [], stock: [], caps: PODCAST_CAPS.free });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const tier = caller?.tier ?? 'free';
  const caps = PODCAST_CAPS[tier];

  let mine: Array<{ id: string; name: string }> = [];
  if (caller) {
    const client = admin();
    const { data } = (await client?.from('voices').select('id, name').eq('owner', caller.id)) ?? {};
    mine = (data ?? []) as Array<{ id: string; name: string }>;
  }

  return Response.json({ configured: true, signedIn: Boolean(caller), tier, caps, mine, stock: await stockVoices() });
}

/**
 * What this person may do with voices, and which ones they have.
 *
 * One request so the studio can render itself correctly on first paint rather
 * than guessing and then correcting — a screen that offers cloning and then
 * takes it away a second later is worse than one that never offered it.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { configured, stockVoices } from '@/app/lib/server/eleven';
import { configured as singConfigured, namedModels } from '@/app/lib/server/kits';
import { PODCAST_CAPS } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * The singing engine, reported beside the speaking one.
 *
 * Two engines rather than one, and the room has to know which are available
 * before it draws anything: offering "sing this properly" and then withdrawing
 * it a second later is the failure `/api/voice` was written to avoid in the
 * first place. Only whether the key is set and the names of the models — never
 * the key, and never the variable's name, which `check:security` scans for.
 */
function singing(): { configured: boolean; models: { id: string; name: string }[] } {
  return { configured: singConfigured(), models: singConfigured() ? namedModels() : [] };
}

export async function GET(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({
      configured: false,
      mine: [],
      stock: [],
      caps: PODCAST_CAPS.free,
      singing: singing(),
    });
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

  return Response.json({
    configured: true,
    signedIn: Boolean(caller),
    tier,
    caps,
    mine,
    stock: await stockVoices(),
    singing: singing(),
  });
}

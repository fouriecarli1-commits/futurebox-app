/**
 * What this person may do with voices, and which ones they have.
 *
 * One request so the studio can render itself correctly on first paint rather
 * than guessing and then correcting — a screen that offers cloning and then
 * takes it away a second later is worse than one that never offered it.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { configured, stockVoices } from '@/app/lib/server/eleven';
import {
  catalogue as singCatalogue,
  configured as singConfigured,
  models as singModels,
} from '@/app/lib/server/kits';
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
async function singing(): Promise<{
  configured: boolean;
  models: { id: string; name: string; demo: string | null; tags: string[]; hasPicture: boolean }[];
  stock: { id: string; name: string; demo: string | null; tags: string[]; hasPicture: boolean }[];
}> {
  /* Two lists, because Kits has two.

     `models` is what this account has trained. `stock` is Kits' own catalogue —
     a hundred-odd voices anybody can sing in without training anything, each
     with a clip you can hear before you spend a credit.

     The second one is not a nice extra. Somebody who has never trained a voice
     has nothing to sing in, and "go and make one at kits.ai first" is where
     their first day ends. This is the room having an answer instead.

     Asked of Kits rather than read out of an environment variable, and a
     failure on either side is an empty list, not an error: the number field is
     still under the picker, and a voice room that will not draw because a list
     could not be fetched is the worse answer.

     `myModels=true` is what separates them, and asking without it returns the
     whole catalogue — which is how a stranger's voice nearly ended up at the
     top of a list labelled "your trained voices". */
  if (!singConfigured()) return { configured: false, models: [], stock: [] };
  const [mine, theirs] = await Promise.all([singModels(), singCatalogue()]);
  return { configured: true, models: mine, stock: theirs };
}

export async function GET(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({
      configured: false,
      mine: [],
      stock: [],
      caps: PODCAST_CAPS.free,
      singing: await singing(),
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
    singing: await singing(),
  });
}

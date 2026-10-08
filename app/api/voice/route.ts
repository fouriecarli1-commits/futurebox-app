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
import { mineSeconds, minutesEach } from '@/app/lib/server/kitsminutes';
import { mine as myVoices } from '@/app/lib/server/ownvoices';
import { isOwnerEmail } from '@/app/lib/server/owners';

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
async function singing(owner?: string | null, runsThePlace = false): Promise<{
  configured: boolean;
  models: { id: string; name: string; demo: string | null; tags: string[]; hasPicture: boolean }[];
  stock: { id: string; name: string; demo: string | null; tags: string[]; hasPicture: boolean }[];
  /**
   * Whether who-owns-what could be read at all.
   *
   * False means the table did not answer, and `models` is therefore empty
   * because it closed rather than opened. A screen can then say "could not
   * check" instead of drawing nothing, which reads as "you have none" and
   * sends somebody off to train a voice they already have.
   */
  voicesKnown: boolean;
  /**
   * How much singing this member has left this month, in whole minutes.
   *
   * ── Why it belongs on this answer ────────────────────────────────────
   *
   * Kits' minutes are capped per member — five a month, see `minutesEach` —
   * and until now the only way to find that out was to record a take, press
   * the button, and be refused. A ceiling somebody only meets by walking into
   * it is the same fault as a button that does nothing: the work is already
   * done by the time the app says no.
   *
   * `null` means it could not be read, or there is nobody signed in to read
   * it for. The screens draw nothing rather than a nought — a "0 minutes
   * left" that is really "we could not ask" would stop somebody using a
   * feature they still have.
   */
  minutesLeft: number | null;
  /** What each member gets a month, so the screen can say "3 of 5". */
  minutesEach: number;
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
  if (!singConfigured()) {
    return {
      configured: false, models: [], stock: [], voicesKnown: true,
      minutesLeft: null, minutesEach: minutesEach(),
    };
  }
  const [trained, theirs, used, held] = await Promise.all([
    singModels(),
    singCatalogue(),
    owner ? mineSeconds(owner) : Promise.resolve(null),
    owner ? myVoices(owner) : Promise.resolve([] as const),
  ]);

  /* ── Only the ones that are actually yours ─────────────────────────────

     Kits cannot create a voice over its API, so every trained voice lives on
     one shared account. `myModels=true` already stops Kits' whole catalogue
     appearing under "your trained voices" — but it does not stop ANOTHER
     MEMBER'S cloned voice appearing there, because on a shared account every
     member's voice is one of "ours".

     So the list is now what this member has been given, by id, out of
     `voice_owners`. Everyone still gets the stock catalogue, which is what
     somebody with no voice of their own sings in.

     ── Why closed by default, and why now is the moment ─────────────────

     An unclaimed trained voice could have been shown to everybody — it
     belongs to nobody yet, and `whose()` treats it as open. That leaves a
     window: between training a voice for somebody and giving it to them, it
     is visible to the whole app. Small, and exactly long enough to be the
     one that matters, because that window is widest the day a voice is new.

     Closing it costs nothing today. The account has had no trained voices on
     it since it was measured on 9 September 2026, and Carli confirmed on
     8 October that she has still not cloned a voice. There is no list to
     break. A default that is safe now and would have been awkward later is
     one worth setting while it is free.

     The owner of the place sees the unclaimed ones, because somebody has to
     be able to see a voice in order to give it to anybody. */
  const ours = new Set((held ?? []).map((one) => one.voiceId));
  const yours = trained.filter((one) => ours.has(one.id));
  const toGive = runsThePlace ? trained.filter((one) => !ours.has(one.id)) : [];

  return {
    configured: true,
    models: [...yours, ...toGive],
    stock: theirs,
    /* Null when the table could not be read, so a screen can say "could not
       check" instead of drawing an empty list that looks like "you have
       none". `ownvoices.ts` has the note on why a failed read closes. */
    voicesKnown: held !== null,
    /* Floored, so it never rounds up into minutes that are not there: a
       screen saying one minute left when there are forty seconds is a screen
       that sets somebody up to be refused. */
    minutesLeft: used === null ? null : Math.max(0, Math.floor((minutesEach() * 60 - used) / 60)),
    minutesEach: minutesEach(),
  };
}

export async function GET(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({
      configured: false,
      mine: [],
      stock: [],
      caps: PODCAST_CAPS.free,
      singing: await singing(null),
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
    singing: await singing(caller?.id ?? null, !!caller?.email && isOwnerEmail(caller.email)),
  });
}

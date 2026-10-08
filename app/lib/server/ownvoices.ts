/**
 * Whose singing voice is whose.
 *
 * ── The hole this closes ─────────────────────────────────────────────────
 *
 * Kits cannot create a voice over its API — measured 9 September 2026,
 * `POST /voice-models` answers 404 — so singing voices are trained by hand on
 * their site, on **one account**: the account this whole app uses.
 *
 * Which means something easy to miss. `SingVoices` draws
 * `listModels(myModels=true)` and draws it for everybody, so without this
 * table **every member can see and sing in every member's cloned voice.**
 * Nobody chose that. It is just what happens when a shared account's
 * catalogue lands straight on a screen.
 *
 * A voice is the one thing in this app that identifies a person. The consent
 * note on `/api/voice/clone` says it for the speaking side: *"a clone of
 * somebody made without them is impersonation whatever it was intended
 * for."* The same sentence applies here and had nothing enforcing it.
 *
 * ── What a missing row means ─────────────────────────────────────────────
 *
 * **Nobody's, so everybody's.** That is Kits' own catalogue of a hundred-odd
 * stock voices, and a stock voice locked away because somebody claimed it
 * first would be a mistake nobody could undo from inside this app. So an
 * unclaimed voice is open, claiming is restricted to voices trained on this
 * account, and only the owner of the place may claim one.
 *
 * ── Why a failed read refuses ────────────────────────────────────────────
 *
 * It costs something real: a database blip stops singing for everybody,
 * including in stock voices, rather than only for the guarded ones. That is
 * the deliberate trade, and it is the same one `kitsminutes.mineSeconds`
 * already makes — *"a read that fails answers null... the cap is the thing
 * standing between one member and everybody else's month."*
 *
 * Here the thing standing between one member and another member's VOICE is
 * this read. Letting it fail open means that on a bad afternoon somebody
 * sings a song in a stranger's cloned voice and no one finds out. A refusal
 * says what happened and can be tried again in a minute.
 */

import { admin } from './account';
import { VOICE_CAPS } from '../plans';
import type { Tier } from '../plans';

/** Which supplier's numbering a voice id belongs to. See `lib/server/singer.ts`. */
const SUPPLIER = 'kits';

export interface Owned {
  readonly voiceId: string;
  readonly title: string;
  readonly at: string;
}

export type Whose =
  /** Nobody has claimed it: Kits' own catalogue. Anyone may sing in it. */
  | { readonly kind: 'free' }
  | { readonly kind: 'mine' }
  | { readonly kind: 'theirs' }
  /** The table could not be read. Not the same as "nobody's" — see above. */
  | { readonly kind: 'unknown' };

/**
 * Who a voice belongs to, from the caller's point of view.
 *
 * `owner` null — a signed-out caller on a deployment without metering — reads
 * any claimed voice as somebody else's. That is right: "I am nobody" is not a
 * claim to anything, and the alternative is that signing out is the way past
 * the guard.
 */
export async function whose(
  voiceId: string,
  owner: string | null,
  supplier = SUPPLIER,
): Promise<Whose> {
  const db = admin();
  /* No database configured is a deployment with no members in it, so there is
     nobody to protect anybody from and nothing claimed. Said here so it is a
     decision rather than a consequence. */
  if (!db) return { kind: 'free' };

  const { data, error } = await db
    .from('voice_owners')
    .select('owner')
    .eq('supplier', supplier)
    .eq('voice_id', voiceId)
    .maybeSingle();

  if (error) return { kind: 'unknown' };
  if (!data) return { kind: 'free' };
  if (owner && data.owner === owner) return { kind: 'mine' };
  return { kind: 'theirs' };
}

/** The voices this member holds. Null when the table could not be read. */
export async function mine(owner: string): Promise<readonly Owned[] | null> {
  const db = admin();
  if (!db) return [];
  const { data, error } = await db
    .from('voice_owners')
    .select('voice_id, title, at')
    .eq('supplier', SUPPLIER)
    .eq('owner', owner);
  if (error) return null;
  return (data ?? []).map((one) => ({
    voiceId: String(one.voice_id),
    title: String(one.title ?? ''),
    at: String(one.at ?? ''),
  }));
}

/**
 * Every claimed voice id, so a list can be filtered.
 *
 * Ids only — never who owns them. The page that calls this is building a
 * picker for one member, and a list naming every member's voice would be the
 * leak this file exists to stop, delivered by the thing meant to stop it.
 *
 * Null when the table could not be read, and the caller shows no trained
 * voices at all rather than all of them. A picker that is briefly short is a
 * nuisance; one that is briefly everybody's is the fault.
 */
export async function claimedIds(supplier = SUPPLIER): Promise<readonly string[] | null> {
  const db = admin();
  if (!db) return [];
  const { data, error } = await db
    .from('voice_owners')
    .select('voice_id')
    .eq('supplier', supplier);
  if (error) return null;
  return (data ?? []).map((one) => String(one.voice_id));
}

export const capFor = (tier: Tier): number => VOICE_CAPS[tier] ?? 0;

export type Refusal =
  | { readonly code: 'voice_cap'; readonly message: string }
  | { readonly code: 'voice_taken'; readonly message: string }
  | { readonly code: 'voice_unknown'; readonly message: string };

/**
 * Give a voice to a member.
 *
 * The caller has already established that this id is one of the account's own
 * trained voices — never a stock one, which is why that check belongs at the
 * route where `listModels` is in hand rather than here.
 *
 * Refuses when the member is at their plan's cap, and when somebody already
 * holds it. The second is checked by the insert itself rather than by looking
 * first: a read-then-write races, and the race is two members ending up with
 * the same voice, which is the exact thing being prevented.
 */
export async function claim(
  voiceId: string,
  owner: string,
  tier: Tier,
  title: string,
): Promise<Refusal | null> {
  const db = admin();
  if (!db) return { code: 'voice_unknown', message: 'Voices cannot be given out on this deployment.' };

  const held = await mine(owner);
  if (held === null) {
    return { code: 'voice_unknown', message: 'Could not check which voices are already given out. Try again in a moment.' };
  }
  if (held.some((one) => one.voiceId === voiceId)) return null;

  const cap = capFor(tier);
  if (held.length >= cap) {
    return {
      code: 'voice_cap',
      message: cap === 0
        ? 'A singing voice of your own needs a paid plan.'
        : `This plan holds ${cap} singing ${cap === 1 ? 'voice' : 'voices'}, and that is how many there are. Release one first, or move up a plan.`,
    };
  }

  const { error } = await db
    .from('voice_owners')
    .insert({ supplier: SUPPLIER, voice_id: voiceId, owner, title });
  if (error) {
    return { code: 'voice_taken', message: 'That voice already belongs to somebody.' };
  }
  return null;
}

/** Take it back, so the slot can be used again. */
export async function release(voiceId: string, owner: string): Promise<boolean> {
  const db = admin();
  if (!db) return false;
  const { error } = await db
    .from('voice_owners')
    .delete()
    .eq('supplier', SUPPLIER)
    .eq('voice_id', voiceId)
    /* Scoped to the owner as well as the id, so a release cannot reach
       somebody else's row even if the id were wrong or forged. */
    .eq('owner', owner);
  return !error;
}

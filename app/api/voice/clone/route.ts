/**
 * Making a voice from a recording of somebody.
 *
 * Two gates, and neither is negotiable.
 *
 * **Consent.** A voice is not a style — it identifies a person, and a clone of
 * one made without them is impersonation whatever it was intended for. So the
 * request must carry an explicit confirmation that the recording is the
 * caller's own voice, the confirmation is stored with the voice, and the
 * screen that sends it says all of this in plain words first. This is also
 * ElevenLabs' own requirement; it would be the right thing regardless.
 *
 * **Ownership.** The ElevenLabs account behind this app is one account, so
 * without a row tying each voice to the person who made it, everybody's clone
 * would be usable by everybody. Their API has no notion of our users, so that
 * ownership is ours to keep.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { cloneVoice, configured, forgetVoice, noteVoiceTaken, voiceRoom } from '@/app/lib/server/eleven';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { addressKey } from '@/app/lib/server/identity';
import { VOICE_CONSENT } from '@/app/lib/consent';
import { watchVoiceSlots } from '@/app/lib/server/spendwatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Their own timeout for this is four minutes; a clone is not a quick call. */
export const maxDuration = 300;

/** Below this there is not enough of a person in the sample to learn from. */
const MIN_BYTES = 40_000;


export async function POST(request: Request): Promise<Response> {
  /* A retry loop is stopped here, before anything is charged or asked for.
     `GENERATION` explains what these numbers are chosen against: not a
     person, but how fast one address could eat the month's allowance
     before the warning at half of it has time to arrive. */
  const flood = refuseIfTooMany('voice-clone', request, GENERATION);
  if (flood) return flood;

  if (!configured()) {
    return Response.json({ message: 'Voice cloning is not switched on for this app yet.' }, { status: 503 });
  }
  if (!metered()) {
    return Response.json({ message: 'Accounts are not configured, so a voice cannot be owned by anybody.' }, { status: 503 });
  }

  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const caps = PODCAST_CAPS[caller.tier];
  if (caps.voices < 1) {
    return Response.json(
      { message: 'Cloning a voice needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the recording.' }, { status: 400 });
  }

  const consent = String(form.get('consent') ?? '');
  if (consent !== 'own-voice') {
    return Response.json(
      { message: 'A voice can only be cloned by the person it belongs to, and that has to be confirmed.' },
      { status: 400 },
    );
  }

  const sample = form.get('sample');
  if (!(sample instanceof Blob) || sample.size < MIN_BYTES) {
    return Response.json(
      { message: 'That recording is too short. Read for about a minute, in a quiet room.' },
      { status: 400 },
    );
  }

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const { count } = await client
    .from('voices')
    .select('id', { count: 'exact', head: true })
    .eq('owner', caller.id);
  if ((count ?? 0) >= caps.voices) {
    return Response.json(
      { message: `Your plan keeps ${caps.voices} ${caps.voices === 1 ? 'voice' : 'voices'}. Remove one first.` },
      { status: 402 },
    );
  }

  /* The workspace's own room, which is a different wall from the one above.

     The check above is this member's plan: how many voices they may keep, and
     "remove one first" is advice they can act on. This one is the single
     ElevenLabs workspace every member's voice lands on running out of slots
     underneath all of them at once — nothing is wrong with their voices and
     there is nothing for them to delete.

     Asked before `charge()` on purpose. Charging, failing upstream and
     refunding does leave the credits right, but it puts a minute of recording
     and an error message about somebody else's account limit in front of a
     member who did nothing wrong.

     `null` means the slots could not be read, and the clone goes ahead. See
     `voiceRoom()` for why that direction: a mistyped field name must not
     become an app that refuses every voice on the site. */
  const left = await voiceRoom();
  /* Sent whatever the answer, so the steps below full are warned on too. It
     is not awaited — she is not what the member is waiting for. */
  void watchVoiceSlots(left);
  if (left && left.left <= 0) {
    return Response.json(
      {
        error: 'voice_slots_full',
        message:
          'Voice cloning is full on this app right now, and it is not something you have done. The owner has been told. Nothing has been charged.',
      },
      { status: 503 },
    );
  }

  const name = String(form.get('name') ?? '').trim().slice(0, 60) || caller.email.split('@')[0];

  // What a voice is called is not decoration: a clone named after a singer is
  // a clone offered as that singer, whoever actually recorded it. The consent
  // above says the voice is the caller's own, and this is the cheapest way to
  // notice when the name says otherwise.
  const allowed = await guard(request, name, 'name', caller);
  if (!allowed.ok) return allowed.response;

  // Prefixed with the account, so the owner is visible from the ElevenLabs
  // dashboard too and a support question does not need this database.
  const paid = await charge(request, CREDITS.clone, 'clone');
  if (!paid.ok) return paid.response;

  const made = await cloneVoice(`${name} · ${caller.id.slice(0, 8)}`, sample, CREDITS.clone);
  if (!made.ok) {
    await paid.refund();
    return Response.json({ message: made.message }, { status: made.status });
  }

  /* One fewer slot, without asking again. Five members cloning inside the
     five-minute cache window would otherwise all read the same "one left". */
  noteVoiceTaken();

  // The consent, written down. See supabase/moderation.sql for why a checkbox
  // that leaves no trace is not consent.
  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '';

  // `consented_at` defaults to now() in the table, so the moment is already
  // kept; what is added here is the wording that was on the screen and where
  // it was accepted from.
  await client.from('voices').insert({
    id: made.voiceId,
    owner: caller.id,
    name,
    consent_ip_hash: addressKey(address) || null,
    consent_text: VOICE_CONSENT,
  });
  return Response.json({ id: made.voiceId, name });
}

/**
 * Withdrawing consent, which has to be as easy as giving it.
 *
 * The voice goes from ElevenLabs as well as from our table. Deleting only the
 * row would leave a copy of somebody's voice on an account they cannot see,
 * which is not deletion — it is hiding.
 */
export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id') ?? '';
  const client = admin();
  if (!id || !client) return Response.json({ message: 'Which voice?' }, { status: 400 });

  const { data: owned } = await client
    .from('voices')
    .select('id')
    .eq('id', id)
    .eq('owner', caller.id)
    .maybeSingle();
  if (!owned) return Response.json({ message: 'Not found.' }, { status: 404 });

  await forgetVoice(id);
  await client.from('voices').delete().eq('id', id).eq('owner', caller.id);
  return new Response(null, { status: 204 });
}

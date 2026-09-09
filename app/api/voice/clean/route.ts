/**
 * The voice without the room.
 *
 * ElevenLabs' audio isolation, pointed at a recording made here. It is the one
 * of their tools that most obviously earns a place in a podcast studio: the
 * difference between a kitchen-table recording and a publishable one is
 * usually the kitchen, not the speaking.
 *
 * Paid only, because it costs per minute and because a free tier that can
 * process arbitrary uploads is a free tier somebody will point a film at.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { configured, isolate } from '@/app/lib/server/eleven';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';
import { audioFrom, dropWork } from '@/app/lib/server/workfile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** About an hour of speech at a sensible bitrate. Beyond this it is a film. */
const MAX_BYTES = 60_000_000;
/**
 * The longest file this route will charge for.
 *
 * A ceiling rather than a refusal: a length the browser reports could be
 * wrong, and this bounds what a wrong one can cost. Files this app makes
 * itself are WAV and are measured from their own header instead, where
 * nobody's word is taken for it at all.
 */
const MAX_SECONDS = 30 * 60;

export async function POST(request: Request): Promise<Response> {
  /* A retry loop is stopped here, before anything is charged or asked for.
     `GENERATION` explains what these numbers are chosen against: not a
     person, but how fast one address could eat the month's allowance
     before the warning at half of it has time to arrive. */
  const flood = refuseIfTooMany('voice-clean', request, GENERATION);
  if (flood) return flood;

  if (!configured()) {
    return Response.json({ message: 'Voices are not switched on for this app yet.' }, { status: 503 });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const caps = PODCAST_CAPS[caller?.tier ?? 'free'];
  if (!caps.clean) {
    return Response.json(
      { message: 'Cleaning up a recording needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the recording.' }, { status: 400 });
  }

  /* Either the audio itself, or a key to a file the browser already put in
     its own folder in storage. A request body over about four and a half
     megabytes is refused by the platform before this route runs, so the
     ceiling below was a promise it could never keep — a lane of any length
     came back as a bare 413. `audioFrom` takes a key, never a URL. */
  const got = await audioFrom(form, request, 'audio');
  if ('problem' in got) return got.problem;
  const { audio, owner: workOwner } = got;

  /* Done with the scratch file the moment the bytes are in hand. */
  if (workOwner) void dropWork(got.key, workOwner, 'wav');

  if (audio.size > MAX_BYTES) {
    return Response.json({ message: 'That file is too big to clean up here.' }, { status: 413 });
  }

  // By the minute. Their voice isolator is charged by the minute upstream,
  // and this broke even at about fifty seconds when it was flat.
  const billed = await billedSeconds(audio, Number(form.get('seconds')), MAX_SECONDS);
  const asked = perMinute(billed, CREDITS.clean);
  const paid = await charge(request, asked, 'clean');
  if (!paid.ok) return paid.response;

  const cleaned = await isolate(audio, asked);
  if (!cleaned.ok) {
    // The engine refused, so the credits go back. A charge for work that did
    // not happen is the one thing a person never forgives.
    await paid.refund();
    return Response.json({ message: cleaned.message }, { status: cleaned.status });
  }

  return new Response(cleaned.audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  });
}

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
import { configured, isolate } from '@/app/lib/server/eleven';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** About an hour of speech at a sensible bitrate. Beyond this it is a film. */
const MAX_BYTES = 60_000_000;

export async function POST(request: Request): Promise<Response> {
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

  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ message: 'There was no recording in that.' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ message: 'That file is too big to clean up here.' }, { status: 413 });
  }

  const paid = await charge(request, CREDITS.clean, 'clean');
  if (!paid.ok) return paid.response;

  const cleaned = await isolate(audio);
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

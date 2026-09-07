/**
 * The same performance, sung by a model built for singing.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * `/api/voice/change` is speech to speech. It is reliable on a spoken lane
 * and a gamble on a sung one, the Pro Booth says so on the button, and §9 of
 * `docs/DIENSTE-EN-KOSTE.md` has called that the one thing the app promises
 * and cannot deliver. This is the other engine: Kits.AI, RVC, models trained
 * on one singer. `lib/server/kits.ts` carries the wire format and, more
 * importantly, which half of it is known and which half is inferred.
 *
 * ── Everything else is the same as its sibling, on purpose ───────────────
 *
 * A key, never a URL, for anything over the platform's body limit — a lane is
 * a WAV, so fifty seconds is the wall and every real take is past it. Charged
 * by the minute, before the work, refunded when the work fails. Nothing about
 * whose file it is is taken from the form.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { configured, convert, namedModels, safeModelId } from '@/app/lib/server/kits';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';
import { audioFrom, dropWork } from '@/app/lib/server/workfile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A conversion takes roughly as long as the audio does, and then some. */
export const maxDuration = 300;

/** Leaves the last forty seconds of the function for fetching the file back. */
const WAIT_MS = 260_000;

/** About ten minutes of mp3. Past this something is wrong with the request. */
const MAX_BYTES = 25 * 1024 * 1024;
/**
 * The longest piece this route will charge for.
 *
 * A ceiling rather than a refusal, for the same reason as everywhere else: a
 * length the browser reports could be wrong, and this bounds what a wrong one
 * can cost. Shorter than its sibling's thirty minutes because the wait above
 * is the real limit — a twenty-minute take cannot finish inside the function
 * whatever the billing says, and charging for one that cannot is the worst of
 * the options.
 */
const MAX_SECONDS = 10 * 60;

export async function POST(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json(
      { message: 'Singing in your own voice is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the recording.' }, { status: 400 });
  }

  /* Either the audio itself, or a key to a file the browser already put in its
     own folder in storage — checked against the folder of whoever's token
     signed this request. Never a URL. */
  const got = await audioFrom(form, request, 'audio');
  if ('problem' in got) return got.problem;
  const { audio, owner: workOwner } = got;

  /* Done with the scratch file the moment the bytes are in hand. */
  if (workOwner) void dropWork(got.key, workOwner, 'wav');

  if (audio.size > MAX_BYTES) {
    return Response.json({ message: 'That take is too long to sing here.' }, { status: 413 });
  }

  /* Which trained voice. Digits only, and either one she named in the
     environment or one she typed in the room — the room remembers it locally
     because this app cannot list her models (see `namedModels`). */
  const wanted = safeModelId(form.get('voiceModelId')) ?? safeModelId(namedModels()[0]?.id);
  if (!wanted) {
    return Response.json(
      {
        message:
          'No singing voice has been chosen. Open a voice model on kits.ai and put its number in here.',
      },
      { status: 400 },
    );
  }

  /* The same plan rule as changing a voice over the speech model — written so
     that a deployment with metering switched off blocks nobody, rather than
     reading a signed-out caller as a free one and refusing everybody. */
  const caller = metered() ? await callerFrom(request) : null;
  if (metered() && !PODCAST_CAPS[caller?.tier ?? 'free'].clean) {
    return Response.json(
      { message: 'Singing a take in another voice needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  const billed = await billedSeconds(audio, Number(form.get('seconds')), MAX_SECONDS);
  const paid = await charge(request, perMinute(billed, CREDITS.sing), 'sing');
  if (!paid.ok) return paid.response;

  const done = await convert(wanted, audio, 'take.wav', Date.now() + WAIT_MS);
  if (!done.ok) {
    await paid.refund();
    return Response.json({ message: done.message }, { status: done.status });
  }

  return new Response(done.audio, {
    headers: { 'Content-Type': done.type, 'Cache-Control': 'no-store' },
  });
}

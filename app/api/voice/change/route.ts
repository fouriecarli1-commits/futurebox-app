/**
 * The same words, in a different voice.
 *
 * ElevenLabs' speech-to-speech: a recording goes up and comes back performed
 * by the chosen voice, keeping the timing and the phrasing of whoever actually
 * said it. For a podcast that is the useful direction — a host who does not
 * like the sound of their own voice keeps their delivery and loses their tone,
 * and a story can be read by several people who are all one person.
 *
 * The same two rules as reading a script aloud, for the same reasons: a cloned
 * voice may only be used by the person who cloned it, checked against our own
 * table because ElevenLabs has no idea who our users are; and it counts
 * against the day, because it is a call to a paid service.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { configured, restage, stockVoices, type Performance } from '@/app/lib/server/eleven';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Their speech-to-speech model. */
const MODEL = 'eleven_multilingual_sts_v2';
/** About twenty minutes of speech at a sensible bitrate. */
const MAX_BYTES = 25 * 1024 * 1024;
/**
 * The longest file this route will charge for.
 *
 * A ceiling rather than a refusal: a length the browser reports could be
 * wrong, and this bounds what a wrong one can cost. Files this app makes
 * itself are WAV and are measured from their own header instead, where
 * nobody's word is taken for it at all.
 */
const MAX_SECONDS = 30 * 60;

function within(value: unknown, low: number, high: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(high, Math.max(low, value))
    : undefined;
}

export async function POST(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ message: 'Voices are not switched on for this app yet.' }, { status: 503 });
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
    return Response.json({ message: 'That recording is too long to change here.' }, { status: 413 });
  }

  const caller = metered() ? await callerFrom(request) : null;
  const tier = caller?.tier ?? 'free';
  const caps = PODCAST_CAPS[tier];
  if (!caps.clean) {
    return Response.json(
      { message: 'Changing a voice needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  const client = admin();
  if (caller && client) {
    const { data } = await client.rpc('speech_today', { p_owner: caller.id });
    const used = typeof data === 'number' ? data : Number(data ?? 0);
    if (used >= caps.speakPerDay) {
      return Response.json(
        { message: `You have used today's ${caps.speakPerDay} readings.`, needsPlan: tier !== 'label' },
        { status: 402 },
      );
    }
  }

  // Whose voice this is, checked the same way the reading route checks it.
  const wanted = String(form.get('voiceId') ?? '');
  let voiceId = '';
  if (wanted) {
    if (caller && client) {
      const { data } = await client
        .from('voices')
        .select('id')
        .eq('owner', caller.id)
        .eq('id', wanted)
        .maybeSingle();
      if (data) voiceId = wanted;
    }
    if (!voiceId) {
      const stock = await stockVoices();
      if (stock.some((one) => one.id === wanted)) voiceId = wanted;
    }
    if (!voiceId) {
      return Response.json({ message: 'That voice is not yours to use.' }, { status: 403 });
    }
  } else {
    const stock = await stockVoices();
    if (!stock.length) {
      return Response.json({ message: 'No voice is available to read with.' }, { status: 503 });
    }
    voiceId = stock[0].id;
  }

  const how: Performance = {
    stability: within(Number(form.get('stability')), 0, 1),
    similarity: within(Number(form.get('similarity')), 0, 1),
    style: within(Number(form.get('style')), 0, 1),
    speakerBoost: form.get('speakerBoost') === 'true',
  };

  // By the minute, like everything else that sends a whole file upstream.
  const billed = await billedSeconds(audio, Number(form.get('seconds')), MAX_SECONDS);
  const paid = await charge(request, perMinute(billed, CREDITS.voiceChange), 'voiceChange');
  if (!paid.ok) return paid.response;

  const done = await restage(voiceId, audio, MODEL, how, form.get('removeNoise') === 'true');
  if (!done.ok) {
    await paid.refund();
    return Response.json({ message: done.message }, { status: done.status });
  }

  // Counted after it worked, so a failure never costs somebody their day.
  if (caller && client) {
    await client.from('speech_runs').insert({ owner: caller.id, characters: 0 });
  }

  return new Response(done.audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  });
}

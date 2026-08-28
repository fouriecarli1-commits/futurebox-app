/**
 * Reading a script aloud.
 *
 * Two limits, both enforced here rather than in the browser: how long one
 * script may be, and how many a day. Characters are the unit ElevenLabs bills
 * in, so the character cap *is* the cost cap — a page that asked politely
 * would be a page that spends the owner's money on request.
 *
 * A cloned voice may only be used by the person who cloned it. That is checked
 * against our own table, because ElevenLabs has no idea who our users are and
 * would happily read anything in anybody's voice.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { configured, speak, stockVoices } from '@/app/lib/server/eleven';
import { PODCAST_CAPS } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Multilingual v2 is the steady one for a long read. v3 covers far more
 * languages — Afrikaans among them — so a script in one of those is better
 * served by it, and the caller says which it wants.
 */
const MODELS: Record<string, string> = {
  steady: 'eleven_multilingual_v2',
  wide: 'eleven_v3',
};

export async function POST(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ message: 'Voices are not switched on for this app yet.' }, { status: 503 });
  }

  let body: { voiceId?: string; text?: string; model?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const text = String(body.text ?? '').trim();
  if (!text) return Response.json({ message: 'There is nothing to read.' }, { status: 400 });

  const caller = metered() ? await callerFrom(request) : null;
  const tier = caller?.tier ?? 'free';
  const caps = PODCAST_CAPS[tier];

  if (text.length > caps.speakChars) {
    return Response.json(
      {
        message: `That script is ${text.length} characters and your plan reads ${caps.speakChars} at a time.`,
        limit: caps.speakChars,
        needsPlan: tier === 'free',
      },
      { status: 402 },
    );
  }

  const client = admin();

  // The day's count, from the database rather than from the caller.
  if (caller && client) {
    const { data } = await client.rpc('speech_today', { p_owner: caller.id });
    const used = typeof data === 'number' ? data : Number(data ?? 0);
    if (used >= caps.speakPerDay) {
      return Response.json(
        {
          message: `You have used today's ${caps.speakPerDay} readings.`,
          needsPlan: tier !== 'label',
        },
        { status: 402 },
      );
    }
  }

  const wanted = String(body.voiceId ?? '');
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
      // Not theirs — but it may be one of ElevenLabs' own, which anybody may use.
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

  const read = await speak(voiceId, text, MODELS[String(body.model ?? 'steady')] ?? MODELS.steady);
  if (!read.ok) return Response.json({ message: read.message }, { status: read.status });

  // Recorded after it worked, so a failure never counts against the day.
  if (caller && client) {
    await client.from('speech_runs').insert({ owner: caller.id, characters: text.length });
  }

  return new Response(read.audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  });
}

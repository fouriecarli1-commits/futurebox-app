/**
 * Two people, talking.
 *
 * ElevenLabs' text-to-dialogue is the one endpoint of theirs that is shaped
 * like a podcast rather than like a narrator: the speakers hear each other, so
 * the second one's answer lands where an answer goes, instead of being a second
 * monologue butted against the first.
 *
 * Three things this route is careful about, in the order they can go wrong.
 *
 * **Nothing is said that should not be.** Every word goes through the same gate
 * as a read script, before a character reaches them. A conversation is a better
 * vehicle for a scam than a monologue — two voices agreeing about an OTP is the
 * thing being guarded against — so the whole script is screened as one text,
 * because a line is only innocent in isolation.
 *
 * **Every voice is one the caller may use.** Checked per unique voice against
 * our own table, then against ElevenLabs' stock list. Theirs has no idea who
 * our users are and would read anything in anybody's voice.
 *
 * **The episode is whole.** Their cap is 2,000 characters a request, and going
 * over it can "terminate early", which is an episode that stops in the middle
 * and looks finished. So `app/lib/dialogue.ts` cuts the script into requests
 * that fit, and the audio comes back as PCM and is joined sample-exactly rather
 * than as MP3 fragments with a seam between them.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { guard } from '@/app/lib/server/safety';
import { configured, converse, stockVoices } from '@/app/lib/server/eleven';
import { spoken, type Turn } from '@/app/lib/dialogue';
import { wavOf } from '@/app/lib/pcmwav';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { readCost } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Several upstream requests, one after another. A long script takes a while. */
export const maxDuration = 300;

/** More than this and it is not a podcast episode, it is an audiobook. */
const MAX_TURNS = 400;

export async function POST(request: Request): Promise<Response> {
  let body: {
    turns?: { voiceId?: string; text?: string }[];
    /** ISO 639-1, to hold the model to a language. Afrikaans is 'af'. */
    language?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const asked: Turn[] = (Array.isArray(body.turns) ? body.turns : [])
    .map((one) => ({ voiceId: String(one?.voiceId ?? ''), text: String(one?.text ?? '').trim() }))
    .filter((one) => one.voiceId && one.text);

  if (!asked.length) {
    return Response.json({ message: 'There is nothing for anybody to say.' }, { status: 400 });
  }
  if (asked.length > MAX_TURNS) {
    return Response.json(
      { message: `That script has ${asked.length} turns in it, and ${MAX_TURNS} is the most one episode can hold.` },
      { status: 400 },
    );
  }

  const script = asked.map((one) => one.text).join('\n');
  const caller = metered() ? await callerFrom(request) : null;

  // Screened as one text rather than line by line: a line is only innocent in
  // isolation, and the dangerous scripts are the ones where the harm is in the
  // exchange rather than in any single turn.
  const allowed = await guard(request, script, 'speech', caller);
  if (!allowed.ok) return allowed.response;

  // After the refusal, not before: what will not be spoken does not depend on
  // whether a key happens to be set.
  if (!configured()) {
    return Response.json({ message: 'Voices are not switched on for this app yet.' }, { status: 503 });
  }

  const tier = caller?.tier ?? 'free';
  const caps = PODCAST_CAPS[tier];
  const characters = spoken(asked);

  if (characters > caps.speakChars) {
    return Response.json(
      {
        message: `That conversation is ${characters} characters and your plan reads ${caps.speakChars} at a time.`,
        limit: caps.speakChars,
        needsPlan: tier === 'free',
      },
      { status: 402 },
    );
  }

  const client = admin();

  // The day's count, from the database rather than from the caller. A
  // conversation is one reading however many requests it takes upstream —
  // charging the day's allowance per internal batch would punish a long script
  // twice, once in credits and once in the daily count.
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

  // Every distinct voice, checked once. A script naming the same person forty
  // times is one permission question, not forty.
  const wanted = Array.from(new Set(asked.map((one) => one.voiceId)));
  const stock = await stockVoices();
  for (const voiceId of wanted) {
    if (stock.some((one) => one.id === voiceId)) continue;
    let mine = false;
    if (caller && client) {
      const { data } = await client
        .from('voices')
        .select('id')
        .eq('owner', caller.id)
        .eq('id', voiceId)
        .maybeSingle();
      mine = Boolean(data);
    }
    if (!mine) {
      return Response.json({ message: 'One of those voices is not yours to use.' }, { status: 403 });
    }
  }

  // Charged by the character, like a read, because that is what ElevenLabs
  // bills and what makes a long episode a real bill rather than a rounding
  // error. Charged once for the conversation, not once per upstream request.
  const paid = await charge(request, readCost(characters), 'read');
  if (!paid.ok) return paid.response;

  const said = await converse(asked, body.language ? String(body.language).slice(0, 8) : undefined);
  if (!said.ok) {
    await paid.refund();
    return Response.json({ message: said.message }, { status: said.status });
  }

  if (caller && client) {
    await client.from('speech_runs').insert({ owner: caller.id, characters });
  }

  const wav = wavOf(said.spoken.pcm, said.spoken.rate);
  return new Response(new Uint8Array(wav), {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'no-store',
      // So the screen can say what it actually did rather than guess.
      'X-Requests': String(said.spoken.requests),
      'X-Model': said.spoken.model,
    },
  });
}

/** What the screen needs to know before it offers the button. */
export async function GET(request: Request): Promise<Response> {
  const caller = metered() ? await callerFrom(request) : null;
  const tier = caller?.tier ?? 'free';
  return Response.json({
    available: configured(),
    chars: PODCAST_CAPS[tier].speakChars,
    perDay: PODCAST_CAPS[tier].speakPerDay,
  });
}

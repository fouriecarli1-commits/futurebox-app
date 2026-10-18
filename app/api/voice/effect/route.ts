/**
 * A sound effect from words: a door slamming, rain on a tin roof, a crowd.
 *
 * The owner, 14 October 2026, of the video editor's "Generate a sound": it must
 * make sound effects and music too, not only speech. Speech is
 * `/api/voice/speak`; music is `/api/music`, asked for without words. This is
 * the third: ElevenLabs' sound generation, `POST /v1/sound-generation` with
 * `text`, `duration_seconds` and `prompt_influence`, answering MP3.
 *
 * One flat price, `CREDITS.sfx`, for anything up to ten seconds — the reason
 * is on the price. Charged before the call and given back if the call fails,
 * the same order as every other paid route, so a refused effect never costs.
 */
import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { guard } from '@/app/lib/server/safety';
import { complain, configured, noteCost } from '@/app/lib/server/eleven';
import { call } from '@/app/lib/server/suppliers';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { langOf, refusal, roomFor } from '@/app/lib/server/elevenroom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** The longest effect one press makes, and the shortest the engine takes. */
const EFFECT_LONGEST = 10;
const EFFECT_SHORTEST = 0.5;

export async function POST(request: Request): Promise<Response> {
  const room = await roomFor('medium');
  if (!room.go) {
    return Response.json(
      { error: 'supplier_full', message: refusal('medium', langOf(request)) },
      { status: 503 },
    );
  }
  const flood = refuseIfTooMany('voice-effect', request, GENERATION);
  if (flood) return flood;

  let body: { text?: string; seconds?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }
  const text = String(body.text ?? '').trim().slice(0, 450);
  if (!text) return Response.json({ message: 'Say what the sound is.' }, { status: 400 });

  const caller = metered() ? await callerFrom(request) : null;
  const allowed = await guard(request, text, 'speech', caller);
  if (!allowed.ok) return allowed.response;

  if (!configured()) {
    return Response.json({ message: 'Sounds are not switched on for this app yet.' }, { status: 503 });
  }

  const asked = Number(body.seconds);
  const seconds = Number.isFinite(asked)
    ? Math.max(EFFECT_SHORTEST, Math.min(EFFECT_LONGEST, asked))
    : null;

  const paid = await charge(request, CREDITS.sfx, 'sfx');
  if (!paid.ok) return paid.response;

  const response = await call('sfx', '/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      /* Left to the engine when she did not choose: it picks a length that
         suits the sound, which for "a door slams" is not ten seconds. */
      ...(seconds ? { duration_seconds: seconds } : {}),
      prompt_influence: 0.4,
    }),
  });
  noteCost(response, 'sfx', CREDITS.sfx);
  if (!response.ok) {
    await paid.refund();
    const failed = await complain(response);
    return Response.json({ message: failed.message }, { status: failed.status });
  }
  const audio = await response.arrayBuffer();
  if (audio.byteLength === 0) {
    await paid.refund();
    return Response.json({ message: 'The engine answered with nothing. Nothing was charged.' }, { status: 502 });
  }
  return new Response(audio, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
  });
}

/**
 * A song from Lyria, paid for twice: by the member in credits, by us in
 * micro-dollars against this engine's own month.
 *
 * ── The order, which is the whole of it ──────────────────────────────────
 *
 * Signed in → on a paid plan → is there room on OUR ceiling → charge the
 * member → ask Google → hand the song back → write down what it cost us.
 *
 * Every one of those is before the charge except the last two, and that is
 * deliberate in both directions. A member refused by a ceiling they cannot
 * see must not also have paid for the turn. And what Google cost us is
 * written down only once the audio is in hand, because a call that failed
 * cost nothing and a ceiling that counts failures closes early for a reason
 * nobody can see.
 *
 * ── Why the credits are refunded on a failure ────────────────────────────
 *
 * The same rule `/api/voice/sing` runs under. The charge happens before the
 * engine is asked because the engine is the thing that costs money; if the
 * engine then refuses, the member is put back. A charge that survives a
 * failure is the thing that makes somebody stop pressing buttons.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { CHOSEN, COSTS, configured } from '@/app/lib/server/google';
import { enough, note } from '@/app/lib/server/googlespend';
import { makeSong } from '@/app/lib/server/lyria';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Their own wait for a clip is well under this; a song is not a quick call. */
export const maxDuration = 120;

/** Long enough to say something, short enough not to be a novel. */
const MOST = 2_000;

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('google-music', request, GENERATION);
  if (flood) return flood;

  if (!configured()) {
    return Response.json({ message: 'The music engine is not switched on yet.' }, { status: 503 });
  }

  let said: { prompt?: unknown; negative?: unknown; seed?: unknown };
  try {
    said = await request.json() as typeof said;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const prompt = String(said.prompt ?? '').trim().slice(0, MOST);
  if (!prompt) {
    return Response.json({ message: 'Say what the song should be.' }, { status: 400 });
  }
  const negative = String(said.negative ?? '').trim().slice(0, MOST);

  /* ── What is being asked for, read before it is sent ─────────────────

     The prompt is a member's words going to another company, and the same
     check every other generating route in this app runs. Before the charge
     and before the engine, because a refusal that has already taken credits
     is a refusal nobody accepts. */
  const caller = metered() ? await callerFrom(request) : null;

  const safe = await guard(request, `${prompt}\n${negative}`, 'song', caller);
  if (!safe.ok) return safe.response;

  if (metered() && !PODCAST_CAPS[caller?.tier ?? 'free'].publish) {
    return Response.json(
      { message: 'Making a song needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  /* Our own ceiling, under Google's one cap — `lib/server/googlespend.ts`
     has why ours has to exist at all. Before the credits. */
  const room = await enough('music', COSTS.music, caller?.id ?? null);
  if (room) {
    return Response.json(
      { error: room.code, message: room.message, left: room.left },
      { status: 429 },
    );
  }

  const paid = await charge(request, CREDITS.song, 'song');
  if (!paid.ok) return paid.response;

  const seed = Number(said.seed);
  const made = await makeSong(
    prompt,
    negative,
    Number.isFinite(seed) ? seed : undefined,
    CHOSEN.music,
  );
  if (!made.ok) {
    await paid.refund();
    return Response.json({ message: made.message }, { status: made.status });
  }

  /* Written down once the audio is in hand, and never awaited: the member's
     song is ready and the bookkeeping must not hold it. */
  void note('music', COSTS.music, CHOSEN.music, caller?.id);

  return new Response(new Uint8Array(made.audio), {
    headers: {
      'Content-Type': made.type,
      'Cache-Control': 'no-store',
      /* Which field the audio actually came back under. The first real song
         settles a guess `lib/server/lyria.ts` had to make, and a header is
         where that answer can be read without a log. */
      'X-Audio-Under': made.under,
    },
  });
}

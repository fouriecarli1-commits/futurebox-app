/**
 * "Klink soos Beat It" → a style an engine can actually make.
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, after testing Google's own app: *"'n mens kan vir
 * gemini vra dat jy 'n liedjie soek wat baie klink soos michael jackson se
 * liedjie beat it, en dit kry dit regtig reg om dit 'n moontlikheid te
 * maak."* And then: *"google is ook nie bereid om copy write wette te
 * oortree nie, dit kry dit net mooi reg om die 80's se styl in baie nader
 * aan daardie formaat te genereer."*
 *
 * The era and the format, hit accurately. Not the song, not the person.
 * `lib/server/styleword.ts` carries the whole design and the three absolute
 * rules; this is the door to it.
 *
 * ── Why it exists where a refusal already did ────────────────────────────
 *
 * `moderation.ts` refuses a named-artist style prompt and tells the person
 * to describe it themselves: the tempo, the instruments, the era, the mood.
 * That is correct and it is also a wall for anybody who does not speak that
 * language, which is most people. This turns the wall into a door, and the
 * song that comes out the other side is theirs to release — which the one
 * they asked for would not have been.
 *
 * ── The guard that is not the model's word ───────────────────────────────
 *
 * The returned style is checked against every name that went in, and a
 * style still carrying one is thrown away rather than sent. The system
 * prompt asks for no names; `clean()` makes it so. A prompt is a request
 * and this is a rule.
 *
 * Then the result goes through `screen()` as well, like any other text
 * reaching an engine — because a translation is still somebody's words by
 * the time the music route sees it, and a door that skipped the front one
 * would be a way round it.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { screen } from '@/app/lib/moderation';
import { aiFault } from '@/app/lib/server/aifault';
import { cachedSystem, notecache } from '@/app/lib/server/aicache';
import { tooMany } from '@/app/lib/server/brake';
import { paidRoom } from '@/app/lib/server/room';
import { charge } from '@/app/lib/server/credits';
import { CREDITS } from '@/app/lib/credits';
import { copilotAvailable } from '@/app/lib/server/aikey';
import { SYSTEM, SaidSchema, clean } from '@/app/lib/server/styleword';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Eight a minute, the same brake the advert writer runs behind. */
const LIMITS = { perMinute: 8, perHour: 60 } as const;

interface Body {
  /** What they typed, names and all. */
  readonly asked?: string;
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('styleword', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many at once. Try again in a moment.' },
      { status: 429 },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'no_key', message: 'This is switched off for this app.' },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  const asked = (body.asked ?? '').trim();
  if (!asked) {
    return Response.json(
      { error: 'empty', message: 'Say what you want it to sound like first.' },
      { status: 400 },
    );
  }
  /* A ceiling, because this is free text going to a model and the whole of
     what it needs is a sentence. Somebody pasting a page is paying for a
     page and getting one style line back. */
  if (asked.length > 600) {
    return Response.json(
      { error: 'long', message: 'Keep it to a sentence or two.' },
      { status: 400 },
    );
  }

  /* ── Screened on the way IN, for everything but the name ──────────────
 
     A named artist is the one thing this route is for, so it cannot refuse
     that. Everything else `screen` catches — a named person's voice, a
     public official, the categories that are never a mistake — still
     applies, and a request carrying one of those is not made safe by being
     described instead of named.
 
     So: screened, and a refusal that is NOT the translatable one is passed
     straight back. */
  const refused = screen(asked, 'song');
  if (refused && !refused.sayItInstead) {
    return Response.json({ error: 'refused', message: refused.message }, { status: 200 });
  }

  /* `songwriter.help`, which is what this is: AI writing help on a song.
     Not a capability of its own — a free account gets three rolls a day of
     writing help and this is one of them, which is the right way round for
     the thing that turns a refusal into a sale. */
  const door = await paidRoom(request, 'songwriter.help');
  if (!door.ok) return door.response;

  const paid = await charge(request, CREDITS.styleword, 'styleword');
  if (!paid.ok) return paid.response;

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5-5',
      /* Small on purpose: a style line and a sentence. The price in
         `credits.ts` is worked back from this number. */
      max_tokens: 1500,
      system: cachedSystem(SYSTEM),
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(SaidSchema) },
      messages: [{ role: 'user' as const, content: asked }],
    });
    await notecache('styleword', response.usage);

    if (response.stop_reason === 'refusal') {
      await paid.refund();
      return Response.json(
        { error: 'refused', message: 'That one cannot be described without naming them.' },
        { status: 200 },
      );
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      await paid.refund();
      return Response.json({ error: 'unparsed', message: 'That came back mangled.' }, { status: 502 });
    }

    /* ── The rule, after the request ──────────────────────────────────
 
       `clean` is deterministic and cheap, and the thing it prevents is the
       only failure here that matters: a name reaching the engine inside a
       field called `style`, which is the exact request refused at the front
       door. Refunded, because a translation that cannot be used is a
       translation nobody got. */
    if (!clean(parsed.style, parsed.dropped)) {
      await paid.refund();
      return Response.json(
        {
          error: 'refused',
          message: 'That one could not be described without naming them, so nothing was sent and nothing was charged.',
        },
        { status: 200 },
      );
    }

    /* And out through the same front door everything else goes through. A
       translation is still text on its way to an engine. */
    const after = screen(parsed.style, 'song');
    if (after) {
      await paid.refund();
      return Response.json({ error: 'refused', message: after.message }, { status: 200 });
    }

    return Response.json(parsed);
  } catch (error) {
    await paid.refund();
    return aiFault(error, 'That could not be reached.');
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ available: copilotAvailable() });
}

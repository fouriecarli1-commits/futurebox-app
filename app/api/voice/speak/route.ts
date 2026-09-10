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
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { guard } from '@/app/lib/server/safety';
import {
  configured,
  modelForLanguage,
  speakStream,
  speakTimed,
  stockVoices,
  type Performance,
} from '@/app/lib/server/eleven';
import { linesFromWords, wordsFromAlignment } from '@/app/lib/spokenwords';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { readCost } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { langOf, refusal, roomFor } from '@/app/lib/server/elevenroom';

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

/**
 * The order to try when the caller says which language is being read.
 *
 * `wide` first, because the point of asking is that it is the one with the
 * longer language list; `steady` behind it, because for a language both of
 * them know it is the better long read. `modelForLanguage` takes the first of
 * these that ElevenLabs' own `GET /v1/models` says covers the language, and
 * changes nothing at all when that list cannot be read.
 */
const BY_LANGUAGE = [MODELS.wide, MODELS.steady] as const;

/**
 * The longest script this route will read *with timings*.
 *
 * ── What the number is protecting ────────────────────────────────────────
 *
 * The ordinary read streams. The first sound arrives in about a second and
 * the bytes keep coming, which is what takes the five-minute function ceiling
 * off this route: a response that has started is a response that has started.
 *
 * The timed read cannot do that. `/with-timestamps` answers with one JSON
 * document holding the whole audio as base64, so nothing exists until all of
 * it exists, and a read that outlasts the ceiling fails having produced
 * nothing and charged for everything.
 *
 * 3,000 characters is roughly three minutes of speech and well under a minute
 * of generating. It is the `maker` plan's own `speakChars`, chosen so the
 * refusal below is never the *first* thing a paying member meets — their plan
 * already stops them there.
 *
 * A longer script is refused rather than quietly read without timings, which
 * is the same rule as everywhere else here: a caller who asked for something
 * and did not get it must be told, not handed a plausible answer with a field
 * missing.
 */
const TIMED_LIMIT = 3_000;

/**
 * The performance dials, clamped here rather than trusted.
 *
 * They arrive from a browser, and a browser can send anything. Out-of-range
 * numbers are a 422 from upstream and a confusing message for somebody who
 * only moved a slider, so they are brought into range instead.
 */
function performance(how?: {
  stability?: number;
  similarity?: number;
  style?: number;
  speed?: number;
  speakerBoost?: boolean;
}): Performance | undefined {
  if (!how) return undefined;
  const within = (value: unknown, low: number, high: number): number | undefined =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(high, Math.max(low, value))
      : undefined;
  return {
    stability: within(how.stability, 0, 1),
    similarity: within(how.similarity, 0, 1),
    style: within(how.style, 0, 1),
    speed: within(how.speed, 0.7, 1.2),
    speakerBoost: typeof how.speakerBoost === 'boolean' ? how.speakerBoost : undefined,
  };
}

export async function POST(request: Request): Promise<Response> {
  /* A retry loop is stopped here, before anything is charged or asked for.
     `GENERATION` explains what these numbers are chosen against: not a
     person, but how fast one address could eat the month's allowance
     before the warning at half of it has time to arrive. */
  /* The supplier's ceiling, at the 'medium' rung: a read is a credit or two,
     so it keeps running long after music has had to stop. */
  const room = await roomFor('medium');
  if (!room.go) {
    return Response.json(
      { error: 'supplier_full', message: refusal('medium', langOf(request)) },
      { status: 503 },
    );
  }

  const flood = refuseIfTooMany('voice-speak', request, GENERATION);
  if (flood) return flood;

  let body: {
    voiceId?: string;
    text?: string;
    model?: string;
    /** How it should be read, rather than who reads it. */
    how?: {
      stability?: number;
      similarity?: number;
      style?: number;
      speed?: number;
      speakerBoost?: boolean;
    };
    /**
     * Ask for the times every character was said at, alongside the audio.
     *
     * Opt-in because it costs the streaming — see `TIMED_LIMIT`. Nothing that
     * does not set it sees any change at all.
     */
    timings?: boolean;
    /**
     * The language the script is written in, so the model that covers it can
     * be chosen. `af`, `en`, or anything with a language in front of a dash.
     *
     * Ignored when `model` is set: a caller that named a model meant it.
     */
    language?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const text = String(body.text ?? '').trim();
  if (!text) return Response.json({ message: 'There is nothing to read.' }, { status: 400 });

  const caller = metered() ? await callerFrom(request) : null;

  // A recording in somebody's voice asking a listener for their OTP is the
  // fraud this technology is actually used for, so this surface is screened
  // before a character of it is read aloud.
  const allowed = await guard(request, text, 'speech', caller);
  if (!allowed.ok) return allowed.response;

  // After the refusal, not before it: what will not be read aloud does not
  // depend on whether a key happens to be set. See app/api/music/route.ts.
  if (!configured()) {
    return Response.json({ message: 'Voices are not switched on for this app yet.' }, { status: 503 });
  }

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

  // A long episode is a real bill rather than a rounding error, so this is
  // charged by the character rather than per reading.
  const asked = readCost(text.length);
  const paid = await charge(request, asked, 'read');
  if (!paid.ok) return paid.response;

  /* Streamed, so the first sound arrives in about a second.

     A ten-minute script is a minute of generating, and waiting for all of it
     before anything plays means somebody watches a spinner and only finds out
     the voice is wrong after paying for the whole read. It also takes a real
     risk off this route: the function has a five-minute ceiling, and a long
     read that does not finish inside it used to fail having produced nothing.

     The refusal path is unchanged — the status is known before a byte is sent,
     so a rate limit or a bad voice still refunds. What cannot be refunded is a
     stream that breaks halfway; see the note on `speakStream`. */
  /* ── Which model reads it ─────────────────────────────────────────────

     A caller that names the language gets the model ElevenLabs' own list says
     covers it. A caller that does not gets exactly what it always got.

     This is #115's other half. Fifteen routes pin Afrikaans in the writing and
     `check:afrikaansrule` holds every one of them; nothing pinned it in the
     speaking. The comment on `MODELS` above has said since the day it was
     written that a script in one of the wider languages "is better served by"
     v3 and that "the caller says which it wants" — and neither of the two
     callers in this app ever said, so every Afrikaans read went to the other
     model. An instruction to a caller that no caller follows is a default in
     the wrong place. */
  const readIn = typeof body.language === 'string' ? body.language : '';
  const named = MODELS[String(body.model ?? '')] ?? '';
  const chosen = named
    ? { id: named, why: 'asked' as const }
    : readIn
      ? await modelForLanguage(readIn, BY_LANGUAGE)
      : { id: MODELS.steady, why: 'default' as const };

  /* ── The timed read, when it is asked for ─────────────────────────────

     Opt-in, and off by default: this path gives up the streaming that keeps
     a long read inside the function ceiling. What it buys is the alignment —
     where every character of the script actually fell in the audio — which is
     the thing this app used to buy back from `/api/transcribe` after
     generating the speech from words it already had.

     Same endpoint family, same model, same price. The timings are a field on
     the answer, not a product. */
  if (body.timings === true) {
    if (text.length > TIMED_LIMIT) {
      /* Refused, not silently downgraded. A caller that asked for timings and
         got audio with none would have no way to tell that from a read whose
         alignment could not be parsed. */
      return Response.json(
        {
          error: 'too_long_for_timings',
          message: `Timings can be taken from a read up to ${TIMED_LIMIT} characters; this one is ${text.length}. Read it without timings, or split it.`,
          limit: TIMED_LIMIT,
        },
        { status: 413 },
      );
    }

    const timed = await speakTimed(
      voiceId,
      text,
      chosen.id,
      performance(body.how),
      asked,
    );
    if (!timed.ok) {
      await paid.refund();
      return Response.json({ message: timed.message }, { status: timed.status });
    }

    if (caller && client) {
      await client.from('speech_runs').insert({ owner: caller.id, characters: text.length });
    }

    /* Null, not an empty list, when the alignment could not be read.

       The audio is good and is sent either way — the member paid for a read
       and gets one. What must not happen is a screen that shows no words
       because the shape changed looking exactly like a screen showing a file
       with nothing in it. `words: null` with `why` beside it is the whole
       difference, and `check:couldnotask` is the rule it belongs to. */
    const words = wordsFromAlignment(timed.alignment);
    return Response.json({
      /* Base64 rather than bytes, because this answer is JSON. The caller
         turns it back into a Blob; `speakTimed` already did the decoding of
         their base64, so this is one encode rather than two guesses. */
      audio: Buffer.from(timed.audio).toString('base64'),
      type: 'audio/mpeg',
      /* Which model read it and why that one. `unasked` means the model list
         could not be read and nothing was changed — which is not the same as
         "no model has this language", and the two must never render as the
         same sentence. */
      model: chosen.id,
      modelWhy: chosen.why,
      words,
      lines: words ? linesFromWords(words) : null,
      ...(words
        ? {}
        : { why: 'The reading came back without timings this app could read. The audio is fine.' }),
    });
  }

  const read = await speakStream(
    voiceId,
    text,
    chosen.id,
    performance(body.how),
    asked,
  );
  if (!read.ok) {
    await paid.refund();
    return Response.json({ message: read.message }, { status: read.status });
  }

  /* Recorded once the read has been accepted rather than once it has finished,
     because with a stream there is no "finished" to wait for on this side. A
     refused read never reaches here, which is what this line was for. */
  if (caller && client) {
    await client.from('speech_runs').insert({ owner: caller.id, characters: text.length });
  }

  return new Response(read.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      /* On a header, because the body of this one is audio. Same two fields
         as the timed answer carries in its JSON. */
      'X-Read-Model': chosen.id,
      'X-Read-Model-Why': chosen.why,
      /* So nothing in front of this waits for the whole body before passing it
         on, which would give back exactly the delay this removes. */
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  });
}

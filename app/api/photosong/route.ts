/**
 * A song out of a photograph.
 *
 * ── What this adds to what already exists ────────────────────────────────
 *
 * `lib/photo.ts` measures a picture on the device — colour, light, busyness —
 * and writes style words from it. That is free, instant, private, and it does
 * not know what is *in* the picture. It can tell warm from cold; it cannot
 * tell a beach from an orange wall.
 *
 * This can. The picture goes to `claude-opus-5`, which is already the model
 * behind the copilot and the safety gate, and comes back as a title, a style
 * and a lyric sheet about what is actually there — in the language the person
 * is reading the app in.
 *
 * The two are offered together and are honest about which is which. The
 * measured one is what you get with no key and no connection; this is what you
 * get when the app has a model behind it.
 *
 * ── The picture is not kept ──────────────────────────────────────────────
 *
 * It arrives, it is sent, it is dropped. Nothing here writes it to storage,
 * to a table or to a log. Most photographs have somebody's face in them, and
 * the one thing this route must never become is a collection of them. The
 * screen says so before anybody picks a file.
 *
 * ── What guards it ───────────────────────────────────────────────────────
 *
 * The same brake as the copilot, per address, because it is the same key and
 * the same bill: one loop must not be able to spend a month's budget in an
 * afternoon. The written idea goes through `screen` at the door, in our own
 * words, before anything is sent. The picture itself is refused by the model,
 * which does that for itself and better than a regular expression could —
 * that is stated rather than dressed up as our own gate.
 *
 * No charge. It is one call on the key the copilot already uses, and inventing
 * a price for it would mean a number in the credits table that nothing else
 * agrees with.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { screen } from '@/app/lib/moderation';
import { tooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Reading a picture and writing a lyric sheet is not a ten-second job. */
export const maxDuration = 60;

/** What the model accepts, and what a phone camera actually produces. */
const KINDS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
/** Their own ceiling is five megabytes on the wire once base64'd. */
const BIGGEST_BYTES = 3 * 1024 * 1024;

/** Same shape as the copilot's, and the same reasoning behind the numbers. */
const LIMITS = { perMinute: 6, perHour: 60 };

const SongSchema = z.object({
  title: z.string().describe('A short title for the song. Four words at most.'),
  style: z
    .string()
    .describe(
      'A comma-separated style direction for a music generator, in ENGLISH whatever language the lyrics are in: genre, instruments, tempo feel, production. Five to eight items.',
    ),
  lyrics: z
    .string()
    .describe(
      'A lyric sheet with [Verse] and [Chorus] markers on their own lines and the sung lines under them. Two or three sections. In the language asked for.',
    ),
  saw: z
    .string()
    .describe('One plain sentence saying what is in the picture, so the person can tell whether it looked properly.'),
});

const SYSTEM = `You write songs from photographs for a small South African music studio.

You are given a picture and, sometimes, an angle to take on it. Answer with a
title, a style direction and a lyric sheet.

Rules:
- Write the lyrics in the language you are asked for. Afrikaans means real
  spoken Afrikaans, the way somebody talks about music in a car — not a
  textbook translation of an English lyric.
- The style line is always in English, whatever the lyrics are in. It is read
  by a music model that was trained on English descriptions of music.
- Write about what is actually in the picture. Name a thing you can see in the
  first verse. Vague is worse than plain.
- Two or three sections, not eight. Somebody is going to sing this.
- No real person's name unless it is written in the picture, and no claim about
  who anybody is.
- If the picture has a person's face in it, write about the moment rather than
  about their appearance.`;

export async function POST(request: Request): Promise<Response> {
  if (tooMany('photosong', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many at once. Try again in a moment.' },
      { status: 429 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'no_key', message: 'Writing a song from a picture is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read the picture.' }, { status: 400 });
  }

  const picture = form.get('picture');
  if (!(picture instanceof Blob) || picture.size === 0) {
    return Response.json({ error: 'bad_request', message: 'There was no picture in that.' }, { status: 400 });
  }
  if (picture.size > BIGGEST_BYTES) {
    return Response.json(
      { error: 'too_big', message: 'That picture is too big. Three megabytes is plenty.' },
      { status: 413 },
    );
  }
  const kind = KINDS.find((one) => one === picture.type);
  if (!kind) {
    return Response.json(
      { error: 'bad_request', message: 'That has to be a JPEG, a PNG or a WebP.' },
      { status: 415 },
    );
  }

  /* The angle somebody typed, screened in our own words before anything is
     spent — the same gate the copilot puts in front of a message. The picture
     is not screened here and this route does not pretend otherwise: the model
     refuses for itself, and it does that better than a list of words could. */
  const idea = String(form.get('idea') ?? '').slice(0, 300);
  const refused = idea ? screen(idea, 'song') : null;
  if (refused) {
    return Response.json({ error: 'refused', message: refused.message }, { status: 400 });
  }

  const wants = form.get('lang') === 'af' ? 'Afrikaans' : 'English';
  const base64 = Buffer.from(await picture.arrayBuffer()).toString('base64');

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(SongSchema) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: kind, data: base64 } },
            {
              type: 'text',
              text: [
                `Write the lyrics in ${wants}.`,
                idea ? `The angle to take: ${idea}` : 'Take whatever angle the picture suggests.',
              ].join('\n'),
            },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { error: 'refused', message: 'That picture is not one this can write about.' },
        { status: 400 },
      );
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return Response.json({ error: 'unparsed', message: 'That reply came back mangled.' }, { status: 502 });
    }
    return Response.json(parsed);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'bad_key', message: 'The configured key was rejected.' }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited', message: 'Too many at once. Try again in a moment.' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: 'api_error', message: 'That could not be reached just now.' }, { status: 502 });
    }
    return Response.json({ error: 'unknown', message: 'That could not be reached just now.' }, { status: 502 });
  }
}

/** Whether this app has a model behind it, so the screen can offer it or not. */
export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

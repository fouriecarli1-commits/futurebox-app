/**
 * The words under the words.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * A music video with Afrikaans lyrics on screen is unreadable to most of the
 * people who will scroll past it, and a music video with English lyrics is
 * unreadable to a good part of this app's own market. A second line under the
 * first — smaller, dimmer, in the other language — costs nothing to watch and
 * is the difference between a song travelling and not.
 *
 * ── Why a route and not the copilot ──────────────────────────────────────
 *
 * The copilot answers one message at a time and returns an action for the
 * studio to apply. This is a list in and the same list out, in order, with
 * nothing else attached — a different shape, and one where the ordering is the
 * whole contract: line three of the answer has to belong to line three of the
 * song or the film puts the wrong sentence under the wrong bar.
 *
 * ── What it is careful about ─────────────────────────────────────────────
 *
 * The count is asserted on the way back. A model that drops a blank line or
 * merges two would silently shift every line after it, and a subtitle that is
 * one line out for the rest of a song is worse than no subtitle. If the count
 * does not match, this refuses rather than guessing at the alignment.
 *
 * Same brake as the copilot, because it is the same key and the same bill.
 * The lyrics go through `screen` first: they are the person's own words, and
 * they are also the one field in this app somebody could use to get a model to
 * write something it should not.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { screen } from '@/app/lib/moderation';
import { tooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** More than any song has, and few enough that one call does it. */
const MOST_LINES = 120;
const LONGEST_LINE = 300;
const LIMITS = { perMinute: 10, perHour: 100 };

const Answer = z.object({
  lines: z
    .array(z.string())
    .describe('The same lines, in the same order, in the language asked for. One for one.'),
});

export async function POST(request: Request): Promise<Response> {
  if (tooMany('translate', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many at once. Try again in a moment.' },
      { status: 429 },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'no_key', message: 'Translating the words is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let body: { lines?: unknown; to?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read the request.' }, { status: 400 });
  }

  const lines = Array.isArray(body.lines)
    ? body.lines.filter((one): one is string => typeof one === 'string').slice(0, MOST_LINES)
    : [];
  if (!lines.length) {
    return Response.json({ error: 'empty', message: 'There were no lines in that.' }, { status: 400 });
  }
  const trimmed = lines.map((one) => one.slice(0, LONGEST_LINE));
  const to = body.to === 'af' ? 'Afrikaans' : 'English';

  const refused = screen(trimmed.join('\n'), 'song');
  if (refused) {
    return Response.json({ error: 'refused', message: refused.message }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4000,
      system: `You translate song lyrics for subtitles.

Answer with exactly as many lines as you were given, in the same order, one
for one. A blank line in stays a blank line out.

Translate for singing rather than for a dictionary: keep the register, keep it
short enough to read in the time a line is on screen, and keep an idiom as the
nearest idiom rather than word by word. Afrikaans means real spoken Afrikaans,
not a textbook rendering of the English.

Leave a proper name, a place and a brand as they are.`,
      output_config: { effort: 'low', format: zodOutputFormat(Answer) },
      messages: [
        {
          role: 'user',
          content: `Into ${to}. ${trimmed.length} lines:\n\n${trimmed.map((one, i) => `${i + 1}. ${one}`).join('\n')}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { error: 'refused', message: 'Those words are not ones this can translate.' },
        { status: 400 },
      );
    }
    const got = response.parsed_output?.lines;
    if (!got) {
      return Response.json({ error: 'unparsed', message: 'That reply came back mangled.' }, { status: 502 });
    }
    /* One for one, or nothing. A model that dropped a line would shift every
       subtitle after it by one, and a film that is one line out for its whole
       second half is worse than a film with no subtitles at all. */
    if (got.length !== trimmed.length) {
      return Response.json(
        {
          error: 'unparsed',
          message: `That came back with ${got.length} lines for ${trimmed.length}, so it would not have lined up.`,
        },
        { status: 502 },
      );
    }
    return Response.json({ lines: got });
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

/** Whether this app has a model behind it, so the panel can offer it or not. */
export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

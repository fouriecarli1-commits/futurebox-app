/**
 * Ad copy, from a brief.
 *
 * The competitor this was measured against gates its advertising product
 * behind Contact Sales, so there is no self-serve version of the loop at all:
 * brief, creative, localise, publish, read the numbers back, scale the winner.
 * We already own the middle of it — the video desk makes the footage, the voice
 * studio reads the line, the credit system prices both. What was missing was
 * the front: somebody who sells something, sitting down with nothing written.
 *
 * This route writes that front. A brief in, a set of ad variants out, each with
 * a headline, a body line, a call to action, and the shot to film for it.
 *
 * Three decisions worth stating.
 *
 * **A set, not one.** Ads are tested against each other or they are guesses, so
 * the route returns several and each one names the single thing it changes —
 * the hook, the promise, the objection it answers. A test whose axis nobody
 * wrote down cannot be read afterwards.
 *
 * **The markets are written, not translated.** Asking for Afrikaans copy gets
 * Afrikaans written by somebody who knows what the line is doing, not English
 * put through a translator with the idiom left in. A translated ad reads like
 * an import, which is the one thing an ad cannot afford to.
 *
 * **It costs nothing.** This is text, and text is not what makes the bill —
 * the video and the voice are, and both already say their price at their own
 * button. Charging for the writing would put a counter on the part somebody
 * has to do six times before they like it.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { screen } from '@/app/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AdsSchema = z.object({
  ads: z
    .array(
      z.object({
        angle: z
          .string()
          .describe('Three or four words naming what this one does differently from the others'),
        headline: z.string().describe('The line that stops the scroll. Short. No full stop needed.'),
        body: z.string().describe('One or two sentences. The promise, or the objection answered.'),
        cta: z.string().describe('The button words. Two or three, an imperative.'),
        spoken: z
          .string()
          .describe(
            'The single line to be read aloud over it, in the market language, or an empty string where the ad works silent. Never longer than the clip.',
          ),
        shot: z
          .string()
          .describe(
            'What the camera sees, for the video desk: subject, what it is doing, the shot, the light, the mood. Never use quotation marks here.',
          ),
      }),
    )
    .describe('Distinct approaches, not rewordings of each other'),
});

interface Body {
  /** What is being sold. */
  what: string;
  /** Who it is for. */
  who?: string;
  /** The offer, if there is one. */
  offer?: string;
  /** How it should sound. */
  tone?: string;
  /** The market language, as a plain name: English, Afrikaans, Zulu. */
  market?: string;
  /** Where it runs, so the length and shape are right. */
  placement?: string;
  /** How many to write. */
  count?: number;
  /** Angles already seen, so asking again returns something else. */
  seen?: string[];
}

const SYSTEM = [
  'You write advertising for people running a small business or releasing their own music.',
  '',
  'What you produce:',
  '- Each ad is a different approach, not the same one reworded. Name the approach in three or four words.',
  '- The headline stops the scroll. The body earns the next second. The call to action asks for exactly one thing.',
  '- Write the spoken line only where a voice adds something. An ad that works silent is better on a feed where sound is off.',
  '- The shot is for a video engine: subject, what it is doing, the shot, the light, the mood. Never put quotation marks in the shot — quoted text gets spoken aloud, and the spoken line is a separate field.',
  '',
  'How you write:',
  '- In the market language, written rather than translated. Afrikaans copy is written by somebody who thinks in Afrikaans; English idiom carried across is the single clearest sign of an imported ad.',
  '- Concrete over clever. "Fixed in a day" beats "solutions that move at the speed of business".',
  '- Short. A headline is under ten words and a body under thirty.',
  '',
  'Lines you do not cross:',
  '- No claim the brief does not support. If they did not say it is the cheapest, it is not the cheapest.',
  '- Nothing about health, money or safety that would need proof to stand behind.',
  '- No named living person, no real brand other than theirs, no borrowed slogan.',
  '- No urgency that is not real: no invented deadline, no invented stock level.',
].join('\n');

function briefFor(body: Body): string {
  const lines = [
    `What they are selling: ${body.what}`,
    body.who ? `Who it is for: ${body.who}` : 'They did not say who it is for. Write for a general audience and keep it specific about the product instead.',
    body.offer ? `The offer: ${body.offer}` : 'There is no offer. Do not invent one.',
    body.tone ? `How it should sound: ${body.tone}` : 'No tone given. Plain and direct.',
    `Market language: ${body.market || 'English'}`,
    body.placement ? `Where it runs: ${body.placement}` : 'Where it runs is not set. Assume a vertical social feed with sound off.',
    `Write ${Math.min(Math.max(body.count ?? 3, 1), 6)} of them.`,
  ];
  if (body.seen?.length) {
    lines.push(`Approaches they have already seen, so do not repeat them: ${body.seen.join('; ')}`);
  }
  return lines.join('\n');
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'no_key', message: 'Ad writing is switched off for this app.' },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }
  if (!body.what?.trim()) {
    return Response.json(
      { error: 'empty', message: 'Say what you are advertising first.' },
      { status: 400 },
    );
  }

  // The brief is free text about a product, and the shot it produces goes on to
  // a video engine. Screened at the door for the same reason the copilot is:
  // a refusal in our own words beats one in the engine's, three minutes later.
  const refused = screen([body.what, body.who, body.offer, body.tone].filter(Boolean).join(' '), 'video');
  if (refused) return Response.json({ error: 'refused', message: refused.message }, { status: 200 });

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(AdsSchema) },
      messages: [{ role: 'user' as const, content: briefFor(body) }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { error: 'refused', message: 'I cannot write that one.' },
        { status: 200 },
      );
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return Response.json({ error: 'unparsed', message: 'That came back mangled.' }, { status: 502 });
    }
    return Response.json(parsed);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'bad_key', message: 'The configured key was rejected.' }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited', message: 'Too many at once. Try again in a moment.' }, { status: 429 });
    }
    return Response.json({ error: 'api_error', message: 'The ad writer could not be reached.' }, { status: 502 });
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

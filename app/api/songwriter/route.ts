/**
 * Songwriting help, from Claude.
 *
 * The rest of FutureBox is deliberately honest that it has no model behind it.
 * This route is the exception: it is the one place the app actually calls one,
 * so the Songwriter can help write rather than only format what you typed.
 *
 * It degrades on purpose. With no API key configured the route answers 503 with
 * a reason the UI can show, and the client falls back to local suggestions that
 * are clearly labelled as not-AI. That is better than a button that fails
 * silently, and it means the app still works for anyone who has not set a key.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        label: z.string().describe('Three or four words naming the idea'),
        text: z.string().describe('The actual lines, or the actual style tags'),
        why: z.string().describe('One sentence on what this does for the song'),
      }),
    )
    .describe('Four distinct options, different from each other in approach'),
});

type Mode = 'continue' | 'style' | 'polish';

interface Body {
  mode: Mode;
  title?: string;
  style?: string;
  lyrics?: string;
  section?: string;
  /** Rolls already shown, so a re-roll returns something new. */
  seen?: string[];
}

const SYSTEM = [
  'You help a songwriter working with AI music generators.',
  '',
  'Rules that matter more than sounding clever:',
  '- Write lyrics a person would actually sing out loud. Say the concrete thing, not the abstract one.',
  '- Never write a line about music, dreams, fire, or "the night" unless the writer put it there first.',
  '- Match the register the writer has already established. If they write plainly, write plainly.',
  '- Keep section tags in square brackets exactly as the writer uses them.',
  '- Never imitate a named living artist, and never suggest prompting for one.',
  '- If the writer wrote in Afrikaans, or any language other than English, answer in that language.',
  '- Four options, genuinely different from each other. Not four rewrites of one idea.',
].join('\n');

function promptFor(body: Body): string {
  const context = [
    body.title ? `Title: ${body.title}` : 'No title yet.',
    body.style ? `Style: ${body.style}` : '',
    body.lyrics?.trim() ? `Lyrics so far:\n${body.lyrics}` : 'Nothing written yet.',
    body.seen?.length ? `Already suggested, do not repeat these ideas:\n- ${body.seen.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const ask: Record<Mode, string> = {
    continue: body.section
      ? `Write four different options for the [${body.section}]. Each one two to four lines.`
      : 'Write four different options for the next section. Each one two to four lines, and say which section it is for.',
    style: 'Suggest four different style lines for this song — the comma-separated field a generator takes. Read what is actually written and let the words decide the sound, not the other way round. Name instruments, a tempo feel and a production choice.',
    polish: 'Four specific improvements to what is written. Point at an actual line, give the rewrite, say what it fixes. No general encouragement.',
  };

  return `${context}\n\n${ask[body.mode]}`;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'Send JSON.' }, { status: 400 });
  }

  if (!['continue', 'style', 'polish'].includes(body.mode)) {
    return Response.json({ error: `Unknown mode: ${body.mode}` }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error: 'no_key',
        detail:
          'No ANTHROPIC_API_KEY is configured, so the writing help is off. Add one to the deployment environment and it turns on with no code change.',
      },
      { status: 503 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      // The re-roll button is meant to be pressed over and over, so suggestions
      // run at low effort to keep it quick; a polish pass is read once and is
      // worth the extra thinking.
      output_config: {
        effort: body.mode === 'polish' ? 'medium' : 'low',
        format: zodOutputFormat(SuggestionsSchema),
      },
      messages: [{ role: 'user', content: promptFor(body) }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { error: 'refused', detail: response.stop_details?.explanation ?? 'The request was declined.' },
        { status: 422 },
      );
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return Response.json({ error: 'unparsed', detail: 'The reply did not match the expected shape.' }, { status: 502 });
    }

    return Response.json({ suggestions: parsed.suggestions });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'bad_key', detail: 'The configured API key was rejected.' }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited', detail: 'Too many requests just now. Try again in a moment.' }, { status: 429 });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return Response.json({ error: 'bad_request', detail: error.message }, { status: 400 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: 'api_error', detail: `${error.status}: ${error.message}` }, { status: 502 });
    }
    return Response.json({ error: 'unknown', detail: 'The writing help could not be reached.' }, { status: 502 });
  }
}

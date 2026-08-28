/**
 * The copilot — the panel on the right that you talk to.
 *
 * It is not a chatbot bolted onto a form. It can see what is on the canvas
 * (title, style, lyrics, what you have already made) and it answers with an
 * action the studio applies: set the style, write the words, make the song, go
 * to another screen. That is the difference between a assistant that explains
 * where the button is and one that presses it.
 *
 * One rule shapes everything here: it never spends money on its own. An action
 * that costs credits comes back with `confirm` set, and the studio has to ask
 * you first. The model is told this, and the studio enforces it regardless of
 * what the model says.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel kills a function at 10 seconds unless it is told otherwise, and a
 * reasoning model answering a chat turn regularly needs longer than that. The
 * timeout comes back as an HTML gateway page rather than JSON, so it does not
 * even reach the error handling below — the panel just goes quiet.
 */
export const maxDuration = 60;

const ReplySchema = z.object({
  reply: z
    .string()
    .describe('What you say back. Two or three sentences at most, in the language they wrote in.'),
  action: z
    .object({
      kind: z
        .enum(['none', 'set_title', 'set_style', 'set_lyrics', 'generate', 'go'])
        .describe('What the studio should do. Use none when talking is enough.'),
      value: z
        .string()
        .describe(
          'The title, the style, or the full lyric sheet. For go, one of: make, video, write, hooks, studio, arena, collab. Empty for none and generate.',
        ),
    })
    .describe('One action, or none. Never more than one.'),
});

interface Body {
  message: string;
  title?: string;
  style?: string;
  lyrics?: string;
  trackCount?: number;
  /** Prior turns, oldest first, so it can follow a conversation. */
  history?: { role: 'user' | 'assistant'; text: string }[];
  /** True when a real music engine is connected, so it knows what it can offer. */
  engineReady?: boolean;
}

const SYSTEM = [
  'You are the copilot inside FutureBox, a studio where people make songs and music videos.',
  '',
  'How you work:',
  '- You can act, not just advise. Answer with one action the studio applies.',
  '- set_lyrics takes a complete lyric sheet with [Section] tags on their own lines.',
  '- set_style takes a short comma-separated list of musical directions, in English, because that is what the music model reads. Everything you say to the person stays in their language.',
  '- generate makes the song from what is on the canvas. Only choose it when there is enough to work with.',
  '- go moves them to another screen. Use it when what they want lives elsewhere.',
  '- none is right most of the time. Answer the question and stop.',
  '',
  'How you talk:',
  '- Short. Two or three sentences. You are beside them while they work, not writing them a guide.',
  '- Reply in the language they wrote in. If they write Afrikaans, answer in plain spoken Afrikaans, not formal or academic Afrikaans.',
  '- Never describe the app to itself, never narrate what you are about to do, and never mention actions, fields or screens by their internal names.',
  '- Say the useful specific thing. "Ninety is slow for this" beats "consider adjusting the tempo".',
  '',
  'Lines you do not cross:',
  '- Never imitate a named living artist, and never suggest prompting for one.',
  '- Never claim the song is finished, released, or published. It is theirs, on their screen.',
  '- You never spend their money. The studio asks before anything that costs.',
].join('\n');

function contextFor(body: Body): string {
  const lines = [
    body.title ? `Title on the canvas: ${body.title}` : 'No title yet.',
    body.style ? `Style: ${body.style}` : 'No style chosen yet.',
    body.lyrics ? `Lyrics so far:\n${body.lyrics}` : 'No lyrics yet.',
    `Songs they have already made: ${body.trackCount ?? 0}`,
    body.engineReady
      ? 'A real music engine is connected, so generate makes a sung, produced track and costs credits.'
      : 'No music engine is connected, so generate makes a rough instrumental sketch in their browser and costs nothing.',
  ];
  return `${lines.filter(Boolean).join('\n')}\n\nThey said:\n${body.message}`;
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'no_key', message: 'The copilot is switched off for this app.' },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }
  if (!body.message?.trim()) {
    return Response.json({ error: 'empty', message: 'Nothing to answer.' }, { status: 400 });
  }

  const client = new Anthropic();

  // Only the last few turns: the canvas is sent in full every time, so old turns
  // add cost without adding much.
  const history = (body.history ?? []).slice(-8).map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      // It is typed at, so it has to feel quick. Writing a whole lyric sheet is
      // the one thing worth more thinking, and that arrives as a longer message.
      output_config: {
        effort: body.message.length > 120 ? 'medium' : 'low',
        format: zodOutputFormat(ReplySchema),
      },
      messages: [...history, { role: 'user' as const, content: contextFor(body) }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { reply: 'I cannot help with that one.', action: { kind: 'none', value: '' } },
        { status: 200 },
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
      return Response.json({ error: 'api_error', message: 'The copilot could not be reached.' }, { status: 502 });
    }
    return Response.json({ error: 'unknown', message: 'The copilot could not be reached.' }, { status: 502 });
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

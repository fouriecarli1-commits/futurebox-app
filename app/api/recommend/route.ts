/**
 * "Pick for me" — one field, one choice, one reason.
 *
 * The competitor this was measured against has exactly one of these: a small
 * `✨ Recommend` beside the voice selector, which reads the script you have
 * written and fills the field. It is the strongest AI affordance in their whole
 * product, and it is strong because of where it is rather than what it is — a
 * button next to the thing it decides, not a chat window across the room that
 * you have to describe the thing to.
 *
 * We had none, anywhere, across twelve rooms. This is the route behind all of
 * them.
 *
 * ── The one rule that makes it trustworthy ───────────────────────────────
 *
 * **It chooses; it does not invent.** The caller sends the options that exist
 * on the screen, and the answer is validated against them before it leaves. An
 * id that is not in the list is refused rather than passed on, because a
 * recommendation the field cannot accept is worse than no recommendation: the
 * button appears to work and the control does not move.
 *
 * ── And the one that makes it useful ─────────────────────────────────────
 *
 * **The reason comes back with it.** A recommendation without a reason is a
 * lottery ticket — you either take it on faith or you ignore it, and neither
 * teaches you anything about your own work. One sentence, about *this* choice
 * against *this* material, is what turns it into something you can disagree
 * with.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PickSchema = z.object({
  id: z.string().describe('The id of the option you are choosing, copied exactly from the list.'),
  why: z
    .string()
    .describe(
      'One sentence on why this one, for this material. Speak to the person about their work, not about the option in general.',
    ),
});

interface Option {
  id: string;
  label: string;
  note?: string;
}

interface Body {
  /** What is being chosen: "a voice to read this", "a kind of video". */
  what: string;
  /** The material the choice is about: the script, the brief, the song. */
  context?: string;
  options: Option[];
  /** The reader's language, so the reason comes back in it. */
  lang?: string;
}

const SYSTEM = [
  'You choose one option from a list, for somebody working in a creative studio.',
  '',
  '- Choose from the list. Never name anything that is not on it.',
  '- The reason is one sentence, about their material, not about the option in the abstract. "Your script is forty seconds and conversational, and his pacing suits that" beats "a versatile, professional voice".',
  '- Where the material is thin, say what you went on. "Nothing to go on yet, so: the one that suits most things" is honest and useful.',
  '- Answer in the language you are told they read.',
  '- Never flatter the work, and never call the choice obvious.',
].join('\n');

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'no_key', message: 'Recommendations are switched off for this app.' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  const options = Array.isArray(body.options) ? body.options.filter((one) => one?.id && one?.label) : [];
  if (options.length < 2) {
    return Response.json(
      { error: 'nothing_to_choose', message: 'There is nothing to choose between.' },
      { status: 400 },
    );
  }

  const listed = options
    .map((one) => `- ${one.id}: ${one.label}${one.note ? ` — ${one.note}` : ''}`)
    .join('\n');
  const material = body.context?.trim()
    ? `What it is for:\n${body.context.trim().slice(0, 4000)}`
    : 'They have not written anything yet, so there is nothing to go on but the options themselves.';

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: 'low', format: zodOutputFormat(PickSchema) },
      messages: [
        {
          role: 'user' as const,
          content: [
            `They are choosing ${body.what}.`,
            `They read ${body.lang === 'af' ? 'Afrikaans' : 'English'}.`,
            '',
            'The options:',
            listed,
            '',
            material,
          ].join('\n'),
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'refused', message: 'I cannot choose for that one.' }, { status: 200 });
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return Response.json({ error: 'unparsed', message: 'That came back mangled.' }, { status: 502 });
    }

    // Chosen, not invented. An id the field cannot accept is refused here
    // rather than handed on to a control that would ignore it.
    if (!options.some((one) => one.id === parsed.id)) {
      return Response.json(
        { error: 'not_an_option', message: 'It picked something that is not on the list.' },
        { status: 502 },
      );
    }
    return Response.json(parsed);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited', message: 'Too many at once. Try again in a moment.' }, { status: 429 });
    }
    return Response.json({ error: 'api_error', message: 'The recommendation could not be reached.' }, { status: 502 });
  }
}

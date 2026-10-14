/**
 * The story helper: Story mode's own AI.
 *
 * Carli, 14 October 2026: *"Story mode binne my profile, moet ook 'n ai hê."*
 *
 * Story mode was built on her answer that the words are the writer's, not the
 * app's (`lib/storypages.ts`). That stays true: this writes into the box, and
 * the box is still hers to change before anything is drawn or read. What it
 * adds is a start for somebody who has an idea and no story — "a hedgehog
 * who is scared of the dark, for a four-year-old" — and a second pair of eyes
 * on a story that is already written.
 *
 * It answers in pages because the room makes pages: a blank line between
 * them is exactly what `pagesFrom` splits on, so what comes back is priced
 * and drawn the moment it lands, with no second step. It also offers a look
 * for the pictures, because that line is the one people leave empty and the
 * one that decides whether page six looks like page one.
 *
 * Free, like the songwriter beside it, and braked for the same reason: the
 * credits are spent on the pictures and the reading, which are charged where
 * they are made. A suggestion somebody throws away should not cost anything.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { screen } from '@/app/lib/moderation';
import { AFRIKAANS_RULE } from '@/app/lib/server/afrikaans';
import { aiFault } from '@/app/lib/server/aifault';
import { cachedSystem, notecache } from '@/app/lib/server/aicache';
import { tooMany } from '@/app/lib/server/brake';
import { copilotAvailable } from '@/app/lib/server/aikey';
import { STORY_MAX_PAGES } from '@/app/lib/storypages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const StorySchema = z.object({
  title: z.string().describe('A short title for the story, in its language.'),
  pages: z
    .array(z.string())
    .describe('The story, one entry a page. Each page two to four short sentences that can be read aloud in under twenty seconds.'),
  look: z
    .string()
    .describe('One line describing how every picture should look, so all the pages match: medium, colours, mood. No artist names.'),
});

type Mode = 'write' | 'better';

interface Body {
  mode: Mode;
  /** What the story should be about, in her words. */
  idea?: string;
  /** What is in the box already. */
  story?: string;
  /** How the pictures should look, if she has said. */
  look?: string;
  /** How many pages she wants. */
  pages?: number;
  lang?: string;
}

const SYSTEM = [
  'You help somebody make an illustrated storybook that will be read aloud, a picture a page.',
  '',
  'Rules that matter more than sounding clever:',
  '- Write for the ear. Short sentences, concrete things a child can picture, a little repetition they can join in with.',
  '- Every page must be drawable: say what is in the scene. A page that is only feelings cannot be illustrated.',
  '- Keep the same characters, with the same names and looks, from the first page to the last.',
  '- A real beginning, a problem, and an ending that resolves it. No moral spelled out at the end.',
  '- Nothing frightening beyond what a picture book would hold, nothing cruel, nothing a parent would skip.',
  '- Never use a real, named person or a character somebody else owns.',
  '- Answer in the language the person wrote in. If they wrote Afrikaans, write Afrikaans.',
  `${AFRIKAANS_RULE}`,
].join('\n');

function promptFor(body: Body, pages: number): string {
  const said = [
    body.idea?.trim() ? `What it should be about: ${body.idea.trim()}` : '',
    body.story?.trim() ? `What is written so far:\n${body.story.trim()}` : '',
    body.look?.trim() ? `How the pictures should look: ${body.look.trim()}` : '',
    body.lang === 'af' ? 'The person uses the app in Afrikaans.' : '',
  ].filter(Boolean).join('\n\n');

  const ask = body.mode === 'better'
    ? `Make this story better to read aloud and to illustrate, in about ${pages} pages. Keep its characters, its events and its voice; fix what is hard to say, what cannot be drawn, and an ending that does not land. Do not make it longer for the sake of it.`
    : `Write the story in ${pages} pages.${body.story?.trim() ? ' Use what is written so far as the beginning and carry on from it.' : ''}`;

  return `${said}\n\n${ask}`;
}

const LIMITS = { perMinute: 6, perHour: 60 };

export async function POST(request: Request): Promise<Response> {
  if (tooMany('story', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'Too many at once. Try again in a moment.' },
      { status: 429 },
    );
  }
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'Send JSON.' }, { status: 400 });
  }
  if (body.mode !== 'write' && body.mode !== 'better') {
    return Response.json({ error: `Unknown mode: ${String(body.mode)}` }, { status: 400 });
  }
  if (body.mode === 'better' && !body.story?.trim()) {
    return Response.json({ error: 'empty', message: 'Write or say a story first, then ask for it to be made better.' }, { status: 400 });
  }
  if (body.mode === 'write' && !body.idea?.trim() && !body.story?.trim()) {
    return Response.json({ error: 'empty', message: 'Say what the story should be about.' }, { status: 400 });
  }
  /* Long enough for a whole book, and no longer: the box is the limit that
     matters, and this only stops a pasted novel being sent to the model. */
  if ((body.idea?.length ?? 0) > 2000 || (body.story?.length ?? 0) > 12000) {
    return Response.json({ error: 'too_long', message: 'That is longer than one storybook holds.' }, { status: 413 });
  }

  /* The story is read aloud and every page is drawn, so it is screened as
     speech — the same rules a reading gets — before it leaves. */
  const refused = screen([body.idea, body.story, body.look].filter(Boolean).join('\n'), 'speech');
  if (refused) {
    return Response.json({ error: refused.message, rule: refused.rule }, { status: 422 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error: 'no_key',
        detail: 'No ANTHROPIC_API_KEY is configured, so the story helper is off. Add one to the deployment environment and it turns on with no code change.',
      },
      { status: 503 },
    );
  }

  const pages = Math.max(3, Math.min(STORY_MAX_PAGES, Math.round(Number(body.pages) || 6)));
  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8000,
      system: cachedSystem(SYSTEM),
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low', format: zodOutputFormat(StorySchema) },
      messages: [{ role: 'user', content: promptFor(body, pages) }],
    });
    await notecache('story', response.usage);

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { error: 'refused', detail: response.stop_details?.explanation ?? 'The request was declined.' },
        { status: 422 },
      );
    }
    const parsed = response.parsed_output;
    if (!parsed || parsed.pages.length === 0) {
      return Response.json({ error: 'unparsed', detail: 'The reply did not match the expected shape.' }, { status: 502 });
    }
    return Response.json({
      title: parsed.title.trim(),
      pages: parsed.pages.map((one) => one.trim()).filter(Boolean).slice(0, STORY_MAX_PAGES),
      look: parsed.look.trim(),
    });
  } catch (error) {
    return aiFault(error, 'The story helper could not be reached.');
  }
}

/** Whether there is a model behind this, so the helper is drawn or not. */
export async function GET(): Promise<Response> {
  return Response.json({ available: copilotAvailable() });
}

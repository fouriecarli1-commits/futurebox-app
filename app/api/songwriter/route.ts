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
import { screen } from '@/app/lib/moderation';
import { AFRIKAANS_RULE } from '@/app/lib/server/afrikaans';
import { aiFault } from '@/app/lib/server/aifault';
import { cachedSystem, notecache } from '@/app/lib/server/aicache';
import { tooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Same reason as the other model routes: 10 seconds is not enough. */
export const maxDuration = 60;

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
  `${AFRIKAANS_RULE}`,
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

/**
 * The brake, on a route that spends her money and asks nobody who they are.
 *
 * Found on 24 September 2026 while going through the surface before handing
 * the app over to be rated. Three routes called Anthropic with no account, no
 * charge and no ceiling: this one, the songwriter and the recommender. The
 * other eleven model routes had `tooMany` — these three were simply never
 * given it, and nothing in the checks asked.
 *
 * The moderation screen below was already there and is a different question:
 * it stops a bad REQUEST, not a thousand ordinary ones. Anybody with the
 * address could put this in a loop and the first anybody would know is the
 * invoice.
 */
const LIMITS = { perMinute: 10, perHour: 100 };

export async function POST(request: Request) {
  if (tooMany('songwriter', request, LIMITS)) {
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

  if (!['continue', 'style', 'polish'].includes(body.mode)) {
    return Response.json({ error: `Unknown mode: ${body.mode}` }, { status: 400 });
  }

  // The fixed rules only, not the classifier: what this route sends already
  // goes to a model that refuses for itself, so a second model reading it
  // first would double the wait and the bill to reach the same answer. What
  // the rules add is a refusal in this app's own words, arriving before the
  // request leaves, and identical to the one the studio gives.
  const refused = screen([body.title, body.style, body.lyrics].filter(Boolean).join('\n'), 'song');
  if (refused) {
    return Response.json({ error: refused.message, rule: refused.rule }, { status: 422 });
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
      system: cachedSystem(SYSTEM),
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
    await notecache('songwriter', response.usage);

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
    return aiFault(error, 'The writing help could not be reached.');
  }
}

/**
 * Whether there is a model behind this, so a wand can be offered or not.
 *
 * The four-option panel below the box degrades gracefully — it falls back to
 * local suggestions that say they are not AI. A wand cannot: it is one press
 * that either fills the card in or does nothing, and a button that always
 * does nothing is worse than one that is not on the screen.
 */
export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

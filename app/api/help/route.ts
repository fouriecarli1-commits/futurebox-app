/**
 * The help desk: questions about how the app works, what it costs, and what
 * the terms and the privacy policy actually say.
 *
 * ── Why this is not the copilot ──────────────────────────────────────────
 *
 * `app/api/copilot/route.ts` is a different job. It sits inside the studio,
 * sees the canvas, and answers with an action the studio applies — it presses
 * the button. This one answers questions *about* the app, including the two
 * kinds it must never guess at: what a thing costs, and what the policy says.
 * Keeping them apart means this one can be given the whole rulebook and no
 * ability to do anything, which is the right shape for a support answer.
 *
 * ── Where its answers come from ──────────────────────────────────────────
 *
 * Everything it is told is generated from the app itself:
 *
 *   the handbook   `handbook.generated.ts`, built from /terms and /privacy by
 *                  `scripts/build-handbook.mts`. Not a summary of the policy,
 *                  the policy. `npm run check:handbook` fails the build if it
 *                  falls behind the pages.
 *   the rooms      `surfaceDirectory()`, the same lines the copilot is given.
 *   the prices     `TIER_SPECS` and `PACKS`, the single source the pricing
 *                  card and the checkout also read.
 *   the costs      `CREDITS`, so "what does a video cost" is answered with the
 *                  number the button will actually charge.
 *
 * Nothing is written here twice. A support assistant quoting a price that a
 * page contradicts is worse than no assistant, and the only way to be sure it
 * cannot is to give it no second copy to quote from.
 *
 * ── The rule it is held to ───────────────────────────────────────────────
 *
 * Answer from the material or say it is not there and offer the address. It
 * is told this and it is also true structurally: it has no tools, no account
 * access and no way to look anything up. It cannot check a specific person's
 * balance, cancel anything, or see an invoice — and the prompt says so plainly
 * rather than letting it improvise an apology when asked.
 *
 * ── Anonymous, and braked ────────────────────────────────────────────────
 *
 * No account needed. Somebody who cannot sign in is exactly the person with a
 * question, and putting the help behind the thing they are stuck on would be
 * absurd. That makes it an unauthenticated route that costs money per call, so
 * `lib/server/brake.ts` caps it per address — see that file for why it is a
 * brake and not a gate.
 */
import Anthropic from '@anthropic-ai/sdk';
import { CREDITS } from '@/app/lib/credits';
import { PACKS } from '@/app/lib/credits';
import { TIERS, TIER_SPECS } from '@/app/lib/plans';
import { surfaceDirectory } from '@/app/lib/surfaces';
import { HANDBOOK } from '@/app/lib/server/handbook.generated';
import { ENQUIRIES } from '@/app/lib/server/email';
import { tooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Same reason as the copilot: a gateway timeout comes back as HTML, not JSON. */
export const maxDuration = 60;

/** A question, not an essay. Longer than this is a paste, and it is truncated. */
const MAX_QUESTION = 1200;

/** Eight in a minute and forty in an hour is far more than anybody types. */
const LIMITS = { perMinute: 8, perHour: 40 };

interface Body {
  question?: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
  lang?: string;
}

function plans(): string {
  return TIERS.map((id) => {
    const spec = TIER_SPECS[id];
    const price = spec.rand === 0 ? 'free' : `R${spec.rand} a month`;
    return `- ${spec.name} (${price}): ${spec.who} Includes: ${spec.includes.join('; ')}.`;
  }).join('\n');
}

function costs(): string {
  return [
    `- A full song (two minutes, clean): ${CREDITS.song} credits.`,
    `- A half song (one minute, watermarked): ${CREDITS.halfSong} credits.`,
    `- Generated video: ${CREDITS.video} credits per five seconds at the base grade, so a ten-second clip is ${CREDITS.video * 2}.`,
    `- Credit packs, bought once and never expiring: ${PACKS.map((pack) => `${pack.credits} for R${pack.rand}`).join(', ')}.`,
    '- Browser sketches, the recording booth, listening and the radar cost nothing.',
    '- Credits are taken before the work is asked for and given back if it fails.',
  ].join('\n');
}

const SYSTEM = `You answer questions about FutureBox, a South African studio app for making
songs, podcasts and videos with AI. You are its help desk.

Answer only from the material below. It is the app's own terms, privacy policy,
room list, prices and credit costs, generated from the code that enforces them,
so it is correct by construction. If the answer is not in it, say so plainly and
give the address ${ENQUIRIES}. Never guess at a policy, a price, a refund or
what happens to somebody's data. A confident wrong answer about money or
ownership is the one thing you must not produce.

You have no access to any account. You cannot see a balance, an invoice or a
payment, you cannot cancel anything, and you cannot change a setting. When
somebody asks you to do one of those, say where in the app it is — for
cancelling and for what they are paying, that is their own channel page — or
give them the address.

Reply in the language the question is written in. If it is Afrikaans, answer in
Afrikaans, in plain South African Afrikaans rather than Dutch-sounding formal
Afrikaans. Keep it short: two or three sentences unless they asked for a list.
Do not open with a greeting or "great question". Do not use headings.

Quote the policy's own words when the question is about the terms or privacy,
and say which section it comes from, so they can go and read it.

── The rooms ─────────────────────────────────────────────
${surfaceDirectory()}

── The plans ─────────────────────────────────────────────
${plans()}
Prices are in rand and are converted for other regions at checkout.

── What things cost in credits ───────────────────────────
${costs()}

── Where things are ──────────────────────────────────────
- What you are paying, and the button that stops the monthly payment: on your
  own channel page, under the studio.
- Deleting the account: the same page, below that.
- The terms are at /terms and the privacy policy is at /privacy.

── The terms and the privacy policy, in full ─────────────
${HANDBOOK.split('{{contact}}').join(ENQUIRIES)}`;

export async function POST(request: Request): Promise<Response> {
  if (tooMany('help', request, LIMITS)) {
    return Response.json(
      {
        error: 'rate_limited',
        message: `That is a lot of questions at once. Try again shortly, or write to ${ENQUIRIES}.`,
      },
      { status: 429 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error: 'no_key',
        message: `The help assistant is switched off for this app. Write to ${ENQUIRIES}.`,
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  const question = (body.question ?? '').trim().slice(0, MAX_QUESTION);
  if (!question) {
    return Response.json({ error: 'empty', message: 'Nothing to answer.' }, { status: 400 });
  }

  // Four turns of context. A support conversation that needs more than that has
  // become something to answer by email, and every extra turn is paid for.
  const history = (body.history ?? [])
    .slice(-4)
    .map((turn) => ({ role: turn.role, content: turn.text.slice(0, MAX_QUESTION) }));

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1200,
      system: SYSTEM,
      messages: [...history, { role: 'user' as const, content: question }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({
        reply: `I cannot answer that one. Write to ${ENQUIRIES} and a person will.`,
      });
    }

    const reply = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!reply) {
      return Response.json(
        { error: 'empty_reply', message: `Nothing came back. Write to ${ENQUIRIES}.` },
        { status: 502 },
      );
    }

    return Response.json({ reply });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: 'rate_limited', message: 'Too many at once. Try again in a moment.' },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: 'api_error', message: `The help assistant could not be reached. Write to ${ENQUIRIES}.` },
        { status: 502 },
      );
    }
    return Response.json(
      { error: 'unknown', message: `The help assistant could not be reached. Write to ${ENQUIRIES}.` },
      { status: 502 },
    );
  }
}

/** So the panel can say whether the assistant is on before somebody types. */
export async function GET(): Promise<Response> {
  return Response.json({
    available: Boolean(process.env.ANTHROPIC_API_KEY),
    enquiries: ENQUIRIES,
  });
}

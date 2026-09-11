/**
 * What this business should actually make, before anybody writes an advert.
 *
 * ── The question the desk never asked ────────────────────────────────────
 *
 * `/api/campaign` writes adverts and is good at it. It assumes the answer is
 * an advert, filmed — and for a great many small businesses it is not. Carli,
 * 11 September 2026: "dalk is 'n podcast styl soms die voordeel, ander kere
 * weer kort videos, dalk 'n explainer video, dalk net 'n liedjie met 'n
 * foto... die advert funksie gaan baie mense attract as dit diepte het."
 *
 * So this route answers the earlier question. A brief in; two or three of the
 * things this studio can make out, ranked, each said in terms of THIS product
 * and THIS buyer, with the one to do first named outright.
 *
 * ── It recommends, it does not invent ────────────────────────────────────
 *
 * The formats are `app/lib/adformats.ts` and the schema takes an id from that
 * list. Anything else is dropped before it reaches the screen. A model asked
 * openly what a business should make writes a lovely paragraph about a
 * billboard campaign; every answer here is a room in this app with a button
 * that opens it, already set up.
 *
 * ── What it does NOT claim to know ───────────────────────────────────────
 *
 * She asked for the suggestions to have looked at "wat nou die in ding is op
 * marketing videos", and that is the honest limit of this route. Nothing here
 * reads the internet. The model has a training cutoff and this machine cannot
 * reach a trends page, so a recommendation that says "this is what is working
 * right now" would be a claim nobody checked — the same shape of lie as a
 * check that names a property it never measured, which has cost this app four
 * mornings.
 *
 * What it does instead:
 *
 *   · it is told today's date, and asked to say out loud where its answer
 *     rests on something that moves quickly, so a reader knows which lines to
 *     distrust;
 *   · it reasons from craft that does not move much on this timescale — that
 *     these are watched with the sound off, that the first second decides it,
 *     that a real photograph of real work outperforms a generated one for a
 *     small local business;
 *   · and where the account has imported its own report, THAT is the
 *     current evidence, and it is hers rather than an average of other
 *     people's accounts. `/api/plan` already does this for the week.
 *
 * Costs nothing. It is a paragraph of judgement before somebody spends a
 * credit on the wrong shape of thing, so charging for it would be charging
 * for the part that saves the money.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { screen } from '@/app/lib/moderation';
import { AFRIKAANS_RULE } from '@/app/lib/server/afrikaans';
import { tooMany } from '@/app/lib/server/brake';
import { FORMAT_IDS, describeFormats, formatById } from '@/app/lib/adformats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Judgement over a short brief, not a document. Well inside the ceiling, and
   said explicitly so nobody raises it to 300 by reflex. */
export const maxDuration = 90;

const PickSchema = z.object({
  /**
   * Two or three, best first.
   *
   * Not eight. A menu is what the desk already had — a list of everything it
   * could do, which is a way of making somebody else do the choosing.
   */
  picks: z
    .array(
      z.object({
        id: z
          .enum(FORMAT_IDS as [string, ...string[]])
          .describe('One of the formats in the list. Never anything else.'),
        why: z
          .string()
          .describe(
            'Why THIS one for THIS business, in two or three sentences. Name their product, ' +
            'their buyer and the decision that buyer is making. A reason that would be true of ' +
            'any business is not a reason.',
          ),
        first: z
          .string()
          .describe(
            'The first thing to actually make, concretely enough to start today. One sentence. ' +
            'Not "create engaging content" — the subject of the first clip, or the title of the ' +
            'first episode, or what the song is about.',
          ),
        watchOut: z
          .string()
          .describe(
            'The specific way this goes wrong for THIS business. Every format has one; say theirs.',
          ),
      }),
    )
    .describe('Two or three formats, best first. Never more than three.'),
  instead: z
    .string()
    .describe(
      'One format from the list that looks obvious for this business and is the wrong answer, ' +
      'and one sentence on why. Empty string only if nothing obvious is wrong. This is the most ' +
      'useful line on the page — telling somebody what not to spend a month on.',
    ),
  moves: z
    .string()
    .describe(
      'Where your reasoning rests on something that changes quickly — a platform’s behaviour, ' +
      'what audiences are tired of — and so may have moved since you were trained. One or two ' +
      'sentences, in their language. Empty string if nothing here is time-sensitive. Never ' +
      'claim to know what is working this week; you cannot see this week.',
    ),
});

interface Body {
  what?: string;
  who?: string;
  offer?: string;
  tone?: string;
  market?: string;
  place?: string;
  lang?: 'en' | 'af';
  /** What their own imported report says did better, when there is one. */
  betterDays?: string[];
}

const SYSTEM = [
  'You advise one small business or creator on what to MAKE. Not on what to say — somebody else writes the words.',
  '',
  'The studio they are in makes songs, videos, podcast episodes and spoken reads. The list you are given is everything it can make. You pick from that list and nothing else.',
  '',
  'How to choose:',
  '- Two or three, best first. Never more. A list of eight is a way of making them do the choosing, which is the job.',
  '- Rank by what this particular business needs, not by what is easy. Sometimes the right answer is the one that takes a month.',
  '- Say what NOT to do. The obvious format is often wrong, and nobody else will tell them.',
  '- Where the person IS the product — a craft, a service, a one-person business — their own voice and their own photographs beat anything generated, and say so plainly. A generated clip of a person is the fastest way to look like everybody else.',
  '- Afrikaans is an advantage, not a translation. Almost nothing is being made in it, so a thing made properly in Afrikaans has a room to itself.',
  '',
  'What you know and do not know:',
  '- You cannot see this week. You have a training cutoff and no way to look anything up, so never say "this is what is working right now" or name a trend as current. Reason from craft that does not move fast: these are watched with the sound off, the first second decides whether there is a second, a real thing filmed badly beats a fake thing rendered well for a local business.',
  '- Where your reasoning does rest on something that moves, say so in `moves`. A reader who knows which line to distrust can check it; one who does not, cannot.',
  '- Where you are given their own numbers, those are the only current evidence in the room. Use them and say you are.',
  '',
  'How you write:',
  '- Concrete. "The first clip is the stitching on a finished bag, in daylight, no words" beats "showcase your craftsmanship".',
  '- Short. Two or three sentences each. They are deciding, not reading.',
  '- In their language.',
  `- ${AFRIKAANS_RULE}`,
  '- Never promise a result. You do not know how it will do and neither does anybody else.',
].join('\n');

function briefFor(body: Body): string {
  const lines = [
    body.lang === 'af' ? 'They are using the app in Afrikaans, so answer in Afrikaans.' : '',
    body.lang === 'en' ? 'They are using the app in English.' : '',
    '',
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    '',
    'What they sell:',
    body.what ?? '(not said)',
    body.who ? `Who it is for: ${body.who}` : 'Who it is for: not said.',
    body.offer ? `The offer: ${body.offer}` : 'No offer mentioned — do not invent one.',
    body.tone ? `How it should sound: ${body.tone}` : '',
    body.market ? `Written in: ${body.market}` : '',
    body.place ? `Where they said it runs: ${body.place}` : '',
    '',
    body.betterDays?.length
      ? `Their own imported report says these weekdays do better for them: ${body.betterDays.join(', ')}. That is real evidence about this account and nothing else here is.`
      : 'They have imported no report of their own, so you have no evidence about this account specifically. Do not pretend otherwise.',
    '',
    'Everything this studio can make:',
    describeFormats(),
  ].filter((one) => one !== '');
  return lines.join('\n');
}

const LIMITS = { perMinute: 6, perHour: 60 };

export async function POST(request: Request): Promise<Response> {
  if (tooMany('adformats', request, LIMITS)) {
    return Response.json({ error: 'rate_limited', message: 'Too many at once. Try again in a moment.' }, { status: 429 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'not_configured', message: 'The adviser is not switched on.' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }
  if (!body.what?.trim()) {
    return Response.json({ error: 'empty', message: 'Say what you are selling first.' }, { status: 400 });
  }

  const refused = screen(
    [body.what, body.who, body.offer, body.tone, body.place].filter(Boolean).join(' '),
    'brief',
  );
  if (refused) return Response.json({ error: 'refused', message: refused.message }, { status: 200 });

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 6000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      /* High, and worth it. This is one paragraph that decides whether the
         next month is spent on the right shape of thing, and it is read
         before any credit is spent rather than after. */
      output_config: { effort: 'high', format: zodOutputFormat(PickSchema) },
      messages: [{ role: 'user' as const, content: briefFor(body) }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'refused', message: 'I cannot advise on that one.' }, { status: 200 });
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return Response.json({ error: 'unparsed', message: 'That came back mangled.' }, { status: 502 });
    }

    /* Dropped rather than trusted.

       The schema restricts the id to the catalogue and a schema is not a
       contract — and the cost of a bad one here is not a validation error,
       it is a card on screen offering to open a room that does not exist.
       Deduplicated too: the same format recommended twice with two reasons
       is a model that has run out of answers, and showing both makes a list
       of three read as a list of two. */
    const seen = new Set<string>();
    const picks = parsed.picks
      .filter((one) => formatById(one.id) !== null)
      .filter((one) => (seen.has(one.id) ? false : (seen.add(one.id), true)))
      .slice(0, 3);

    if (picks.length === 0) {
      return Response.json(
        { error: 'unparsed', message: 'Nothing usable came back. Try again.' },
        { status: 502 },
      );
    }

    return Response.json({ picks, instead: parsed.instead, moves: parsed.moves });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'bad_key', message: 'The configured key was rejected.' }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited', message: 'Too many at once. Try again in a moment.' }, { status: 429 });
    }
    return Response.json({ error: 'api_error', message: 'The adviser could not be reached.' }, { status: 502 });
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

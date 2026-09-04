/**
 * The market read, and the plan that comes out of it.
 *
 * ── What this is, next to the ad writer ──────────────────────────────────
 *
 * `/api/campaign` writes the ads. This works out whether they are pointed at
 * anything: what kind of product this is, who actually buys it, which angles
 * the category is already crowded with, where the buyers are, and — the part
 * somebody would pay for — a week of posting with days, times, platforms and
 * what goes in each slot.
 *
 * ── The honest problem with "the best time to post" ──────────────────────
 *
 * Nobody knows the best time to post *your* thing. Everything published on the
 * subject is an average over other people's accounts in other people's
 * categories, and a model asked the question will confidently repeat it. So
 * this is not asked for as a fact and is not presented as one: the model is
 * told to produce a **starting** schedule and to say what each slot is for, so
 * that it can be argued with.
 *
 * What makes it more than a template is the second half. Where the account has
 * imported its own platform export, `lib/adweek.ts` reads which weekdays their
 * own spend actually did better on, and those days are handed in here so the
 * schedule is built around them. The raw report never leaves the device —
 * only the weekday numbers do, which is all this needs.
 *
 * ── One thing deliberately not asked for ─────────────────────────────────
 *
 * Volume. A model asked for a posting plan will fill seven days with three
 * slots each, which nobody with a job can keep up, and a plan abandoned in
 * week two is worse than no plan. The cap is in the prompt and the effort is
 * named per slot so it can be cut down honestly.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { screen } from '@/app/lib/moderation';
import { callerFrom, metered } from '@/app/lib/server/account';
import { tooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Slower and dearer than the ad writer, and asked for far less often.
 *
 * One plan is a month of work, not a button somebody leans on. The per-hour
 * window is the one that matters here: it is what stops a key being burned
 * through by a loop, and it is generous enough that nobody working normally
 * will ever see it.
 */
const LIMITS = { perMinute: 3, perHour: 12 };

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const PlanSchema = z.object({
  category: z
    .string()
    .describe(
      'What kind of product this is, named as somebody in the trade would name it. One line. Not a restatement of the brief.',
    ),
  demand: z
    .string()
    .describe(
      'What people in this category are actually buying, and what they are actually deciding between. Two or three sentences. Concrete about this category, useless if it would be true of any product.',
    ),
  buyers: z
    .array(
      z.object({
        who: z.string().describe('The segment, named specifically enough to picture one of them.'),
        wants: z.string().describe('What they are trying to achieve. Their words, not marketing words.'),
        doubt: z.string().describe('The thing that stops them buying. Name the real one.'),
      }),
    )
    .describe('Two or three distinct segments. Not one segment described three ways.'),
  angles: z
    .array(
      z.object({
        angle: z.string().describe('Three or four words naming the approach.'),
        why: z.string().describe('Why it works in this category.'),
        against: z
          .string()
          .describe('What it is up against — who is already saying this, or why it is getting tired.'),
      }),
    )
    .describe('The approaches this category is already crowded with, and where the gap is.'),
  platforms: z
    .array(
      z.object({
        platform: z.string().describe('Named plainly: TikTok, Instagram Reels, YouTube Shorts, a newsletter, a shop listing.'),
        why: z.string().describe('Why the buyers above are there, specifically. Not "everybody is on it".'),
        format: z.string().describe('What actually works there for this product. A shape, not a platitude.'),
        effort: z.enum(['low', 'medium', 'high']).describe('What it costs to keep up weekly.'),
      }),
    )
    .describe('Ranked, best first. Three or four. Somewhere they should not bother is worth saying.'),
  week: z
    .array(
      z.object({
        day: z.enum(DAYS),
        at: z
          .string()
          .describe('Local time on a 24-hour clock, as HH:MM. Their market’s local time, not UTC.'),
        platform: z.string().describe('One of the platforms above.'),
        what: z.string().describe('What goes in this slot. Specific enough to make on the day.'),
        why: z.string().describe('Why this slot, in one line. Says what the guess rests on so it can be argued with.'),
      }),
    )
    .describe(
      'A week somebody can actually keep up: at most eight slots, fewer if the product does not need more. A plan abandoned in week two is worse than no plan.',
    ),
  beyondSocial: z
    .array(
      z.object({
        what: z.string().describe('The move, named plainly.'),
        why: z.string().describe('Why it fits this product specifically.'),
        effort: z.enum(['low', 'medium', 'high']),
      }),
    )
    .describe(
      'Where the buyers are that is not a social feed: search, marketplaces, directories, other people’s newsletters, a partner’s audience, the product page itself. Two or three, concrete.',
    ),
  watch: z
    .array(
      z.object({
        number: z.string().describe('The one number, named.'),
        why: z.string().describe('What it tells you that the others do not.'),
        healthy: z.string().describe('Roughly what good looks like in this category, said as a range and admitted to be rough.'),
      }),
    )
    .describe('Two or three numbers worth watching. Not a dashboard.'),
});

interface Body {
  /** What is being sold. The only thing that is required. */
  what: string;
  who?: string;
  offer?: string;
  tone?: string;
  /** The market language, as a plain name: English, Afrikaans, Zulu. */
  market?: string;
  /** Where they sell — a country or region, which moves everything. */
  place?: string;
  /**
   * The weekdays their own report says did better and worse, as names.
   *
   * Computed on the device from their own imported export — see
   * `lib/adweek.ts`. Empty when they have no report or too little of one, in
   * which case the schedule is a starting guess and says so.
   */
  betterDays?: string[];
  worseDays?: string[];
  /** Which number those days were judged on, so the prompt can say it out loud. */
  measure?: 'cpr' | 'ctr';
}

const SYSTEM = [
  'You are planning marketing for one small business or creator who has no agency and no marketing team.',
  '',
  'What matters most:',
  '',
  '- Be specific to this product. Anything you write that would be equally true of a different product is wasted space, and the reader can tell.',
  '- Say what you do not know. You do not know this account’s audience, and the times you suggest are a starting point drawn from how the category generally behaves — write the "why" on each slot so the reader can disagree with it on their own evidence.',
  '- Name the real objection. The reason people do not buy is rarely the price, and writing "it is too expensive" when it is actually "I do not believe it will work" sends the whole plan the wrong way.',
  '- A plan has to be survivable. At most eight slots in the week, and fewer where that is honest. Somebody who cannot keep up abandons the whole thing in a fortnight, which is worse than four slots they keep.',
  '- Where the buyers are not on social media, say so and say where they are instead. Search, a marketplace, a trade directory, somebody else’s newsletter, the product page itself. For a great many products this is the larger half and it is the half nobody plans.',
  '- Write in the market language given, written rather than translated. English idiom carried across is the clearest sign of an imported plan.',
  '',
  'Do not use the words "engagement", "leverage", "synergy", "brand awareness" or "content strategy". Say the thing itself.',
].join('\n');

function briefFor(body: Body): string {
  const lines = [
    `What is being sold: ${body.what}`,
    body.who ? `Who it is for: ${body.who}` : 'Who it is for: not said — work it out and say so.',
    body.offer ? `The offer: ${body.offer}` : '',
    body.tone ? `The tone they want: ${body.tone}` : '',
    body.place ? `Where they sell: ${body.place}` : '',
    `Market language: ${body.market || 'English'}`,
  ].filter(Boolean);

  /* Their own numbers, where they have them.

     This is the difference between a plan and a template, so it is stated
     plainly rather than mixed in with the brief, and the model is told to
     treat it as evidence that outranks anything it believes about the
     category. */
  if (body.betterDays?.length || body.worseDays?.length) {
    const measure =
      body.measure === 'ctr' ? 'click-through rate' : 'cost per result';
    lines.push(
      '',
      'THIS ACCOUNT’S OWN NUMBERS, from their imported advertising report:',
      body.betterDays?.length
        ? `- Better than their own average on ${measure}: ${body.betterDays.join(', ')}`
        : '- No day did better than their own average.',
      body.worseDays?.length
        ? `- Worse than their own average: ${body.worseDays.join(', ')}`
        : '- No day did worse than their own average.',
      '',
      'Build the week around those days and say in the "why" that it comes from their own report rather than from the category. This is real evidence about this account and it outranks anything you believe about when people in general are online.',
    );
  } else {
    lines.push(
      '',
      'They have no report of their own yet, so the days and times are your opening guess for this category. Write each "why" so they can tell what it rests on.',
    );
  }

  return lines.join('\n');
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('plan', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'That is a lot of plans at once. Try again shortly.' },
      { status: 429 },
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'no_key', message: 'Planning is switched off for this app.' },
      { status: 503 },
    );
  }

  /* Signed in, where there are accounts to be signed into.

     This is the piece the add-on will be sold on, so it belongs to an account
     rather than to a browser. What is deliberately *not* here yet is the paid
     check itself: the purchase, the webhook and the entitlement are the next
     piece of work, and a half-built gate that lets everything through while
     looking like a gate is worse than an honest open door. When it lands it
     goes here, on the route, not on the screen. */
  if (metered()) {
    const caller = await callerFrom(request);
    if (!caller) {
      return Response.json(
        { error: 'signed_out', message: 'Sign in first — a plan belongs to an account.' },
        { status: 401 },
      );
    }
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }
  if (!body.what?.trim()) {
    return Response.json(
      { error: 'empty', message: 'Say what you are selling first.' },
      { status: 400 },
    );
  }

  /* Screened at the door, in our own words, before anything is spent.

     `brief` rather than `video`: the advert desk screens the same sentences as
     `video` because what it writes ends up in front of a video engine, and
     this makes a document. The rules that bite on a brief — a real person put
     in an advert, a public office claimed — apply to both. */
  const refused = screen(
    [body.what, body.who, body.offer, body.tone, body.place].filter(Boolean).join(' '),
    'brief',
  );
  if (refused) return Response.json({ error: 'refused', message: refused.message }, { status: 200 });

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 12000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      /* Higher effort than the ad writer, because this is one answer somebody
         works from for a month rather than eight lines they pick between. */
      output_config: { effort: 'high', format: zodOutputFormat(PlanSchema) },
      messages: [{ role: 'user' as const, content: briefFor(body) }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'refused', message: 'I cannot plan that one.' }, { status: 200 });
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
    return Response.json({ error: 'api_error', message: 'The planner could not be reached.' }, { status: 502 });
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

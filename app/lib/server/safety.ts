/**
 * The gate every prompt goes through, and the record it leaves.
 *
 * `app/lib/moderation.ts` holds the fixed rules. This holds the part that
 * needs a network, a database and a decision about what to do when either is
 * missing.
 *
 * ── The second reader ────────────────────────────────────────────────────
 *
 * A word list cannot tell "a song about a man who wants to kill his brother"
 * from "a song telling people to kill their brothers", and the difference is
 * the entire question. So after the rules pass, a model reads the sentence and
 * answers one narrow question about it. It is given the categories and told to
 * answer only about those, because a classifier asked to be generally careful
 * becomes a classifier that refuses anything sad.
 *
 * ── What happens when it cannot be asked ─────────────────────────────────
 *
 * This is the decision that matters, and it is different per surface.
 *
 * A video model rendering a real person, a voice being cloned, a sound being
 * trained — those are the three places where a bad output is expensive,
 * permanent and somebody else's problem. If the classifier cannot be reached,
 * those refuse. A person waiting five minutes is a worse afternoon; a deepfake
 * is a worse year.
 *
 * A song prompt and a line of speech go through on the rules alone, and the
 * pass is written to the log marked as unread. The reasoning: the rules have
 * already caught the categories that are never a mistake, these two surfaces
 * are the app's whole daily use, and an app that stops working every time an
 * API has a bad ten minutes is an app that gets its gate removed by whoever is
 * on call. The honest cost is written down instead of hidden: those rows say
 * `classifier: unavailable`, and they can be read back.
 *
 * ── Repetition ───────────────────────────────────────────────────────────
 *
 * Refusals that count are counted, by account and by address, over thirty
 * days. Three is a warning carried in the refusal message. Six stops the
 * account generating anything at all, and says so plainly rather than
 * pretending the engine is down.
 */

import Anthropic from '@anthropic-ai/sdk';
import { screen, type Refusal, type Rule, type Surface } from '@/app/lib/moderation';
import { admin, type Caller } from '@/app/lib/server/account';
import { addressKey } from '@/app/lib/server/identity';

/** Surfaces that refuse rather than proceed when the classifier is down. */
const STRICT: readonly Surface[] = ['video', 'name', 'finetune'];

/** Counted refusals in thirty days before an account is stopped. */
const WARN_AT = 3;
const STOP_AT = 6;

export interface Blocked {
  readonly ok: false;
  readonly response: Response;
}
export interface Passed {
  readonly ok: true;
}
export type Guarded = Blocked | Passed;

function refusalResponse(refusal: Refusal, strikes: number): Response {
  const remaining = STOP_AT - strikes;
  const warning =
    refusal.counts && strikes >= WARN_AT && remaining > 0
      ? ` This is the ${ordinal(strikes)} refused request on this account in thirty days. After ${STOP_AT} the account stops generating.`
      : '';

  return Response.json(
    {
      error: 'refused',
      rule: refusal.rule,
      message: refusal.message + warning,
    },
    { status: 422 },
  );
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/**
 * Write down what was refused.
 *
 * Never throws and never blocks the refusal: if the table is missing because
 * the migration has not been run, the prompt is still refused. A gate that
 * only works once somebody has run a migration is not a gate.
 */
async function record(
  refusal: Refusal | null,
  surface: Surface,
  text: string,
  caller: Caller | null,
  request: Request,
  decidedBy: string,
): Promise<void> {
  const client = admin();
  if (!client) return;

  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '';

  try {
    await client.from('moderation_events').insert({
      owner: caller?.id ?? null,
      surface,
      rule: refusal?.rule ?? 'unscreened',
      counts: refusal ? refusal.counts : false,
      decided_by: decidedBy,
      excerpt: text.slice(0, 200),
      ip_hash: addressKey(address) || null,
    });
  } catch {
    // Deliberately silent. See above.
  }
}

async function strikesFor(caller: Caller | null, request: Request): Promise<number> {
  const client = admin();
  if (!client || !caller) return 0;

  const address =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '';

  const { data, error } = await client.rpc('moderation_strikes', {
    p_owner: caller.id,
    p_ip_hash: addressKey(address) || null,
    p_days: 30,
  });
  // A missing function reads as no strikes rather than as everybody suspended.
  if (error || typeof data !== 'number') return 0;
  return data;
}

const CLASSIFIER = `You screen prompts for a music, podcast and video generation app before they reach an engine.

Answer only about these categories. Nothing else is your business, and a prompt that is merely sad, angry, political, profane, religious, sexual between adults in a lyric, or about drugs, crime, war or death as a *subject* is allowed. Art is about those things.

  minors          sexual content involving anyone under 18, in any framing
  likeness        the voice, face, name or performance of a real, identifiable
                  person — living or dead, famous or not. A prompt naming an
                  artist to get their sound belongs here. A prompt describing a
                  sound does not.
  fabricated-news a thing built to be mistaken for a real recording of a real
                  event: fake reporting, fake leaked footage, a fake statement
                  by a real person or organisation
  explicit        pornographic imagery or audio
  violence        incitement to violence against a real person or group, or a
                  threat against one
  extremism       promotion of, or recruitment for, a violent organisation, or
                  the description of a group of people as less than human
  weapons         workable instructions for making a weapon or an explosive
  drugs           workable instructions for manufacturing a controlled drug
  fraud           a script for deceiving somebody out of money or credentials,
                  including anything read in the name of a bank or an authority
  self-harm       encouragement of, or a method for, suicide or self-harm

Reply with JSON only: {"allow": true} or {"allow": false, "rule": "<one of the above>", "why": "<one sentence, addressed to the person who typed it, saying what was refused and what would work instead>"}.`;

interface Decision {
  allow: boolean;
  rule?: Rule;
  why?: string;
}

/**
 * The model's reading of the sentence, or null if it could not be had.
 *
 * Null means unavailable — not allowed. The caller decides what unavailable
 * means for its surface, because that answer is different for a song and for a
 * video of somebody's face.
 */
async function classify(text: string, surface: Surface): Promise<Decision | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      system: CLASSIFIER,
      // Small and cheap: this runs in front of every generation, and a screen
      // that doubles the wait is a screen somebody removes.
      output_config: { effort: 'low' },
      messages: [
        {
          role: 'user',
          content: `Surface: ${surface}\nPrompt:\n${text.slice(0, 4000)}`,
        },
      ],
    });

    const block = response.content.find((part) => part.type === 'text');
    if (!block || block.type !== 'text') return null;

    const json = /\{[\s\S]*\}/.exec(block.text);
    if (!json) return null;

    const parsed = JSON.parse(json[0]) as Decision;
    return typeof parsed.allow === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Run a prompt past everything, and answer with a response to return or
 * nothing at all.
 *
 * Called before the credit is charged and before the engine is asked, so a
 * refused prompt costs the person nothing and costs the platform nothing.
 */
export async function guard(
  request: Request,
  text: string,
  surface: Surface,
  caller: Caller | null,
): Promise<Guarded> {
  const value = (text ?? '').trim();
  if (!value) return { ok: true };

  const strikes = await strikesFor(caller, request);
  if (strikes >= STOP_AT) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'suspended',
          message: `This account has had ${strikes} requests refused in the last thirty days and has stopped generating. Nothing has been deleted. Write to us if you think this is wrong.`,
        },
        { status: 403 },
      ),
    };
  }

  // Layer one: fixed, free, and not arguable.
  const ruled = screen(value, surface);
  if (ruled) {
    await record(ruled, surface, value, caller, request, 'rules');
    return { ok: false, response: refusalResponse(ruled, strikes + (ruled.counts ? 1 : 0)) };
  }

  // Layer two: the sentence, read.
  const decision = await classify(value, surface);

  if (decision === null) {
    if (STRICT.includes(surface)) {
      return {
        ok: false,
        response: Response.json(
          {
            error: 'unavailable',
            message:
              'The safety check could not be run just now, and this is one of the things that does not go ahead without it. Try again shortly.',
          },
          { status: 503 },
        ),
      };
    }
    await record(null, surface, value, caller, request, 'unavailable');
    return { ok: true };
  }

  if (!decision.allow) {
    const refusal: Refusal = {
      rule: decision.rule ?? 'likeness',
      message:
        decision.why?.trim() ||
        'This is outside what the app will make. Describing what you want rather than who it should sound like usually gets there.',
      counts: decision.rule !== 'likeness',
    };
    await record(refusal, surface, value, caller, request, 'classifier');
    return { ok: false, response: refusalResponse(refusal, strikes + (refusal.counts ? 1 : 0)) };
  }

  return { ok: true };
}

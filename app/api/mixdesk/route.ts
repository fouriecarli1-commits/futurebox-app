/**
 * Ask the copilot what to change about the mix, and get changes back.
 *
 * Carli, 14 September 2026: *"AI icon (Copilot pop op en vra dat persoon 'n
 * mixing voorstel en copilot kan die mixing verander volgens die vraag en
 * voorstel)"*
 *
 * ── What it is given, and what it is deliberately not ───────────────────
 *
 * The lanes' names, levels, positions, mutes, and which effects are on. The
 * master's measured peak and average where the room has measured them.
 *
 * NOT the audio. Sending a mix to a model to listen to is a different and
 * much more expensive product, and pretending to do it would produce advice
 * that sounds specific and is invented. What this can honestly do is what a
 * second engineer does when you describe the problem: read the desk, hear
 * what you say is wrong, and reach for the right fader. The panel says as
 * much, and the model is told so too.
 *
 * ── Nothing is applied here ─────────────────────────────────────────────
 *
 * This returns proposals. `app/lib/mixplan.ts` clamps them to what the
 * controls accept and drops anything naming a lane that is not there, and
 * the panel shows them as a list with an Apply button. A mix is somebody's
 * taste; an assistant that moved eight faders while they were listening
 * would be indistinguishable from a bug.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { screen } from '@/app/lib/moderation';
import { tooMany } from '@/app/lib/server/brake';
import { AFRIKAANS_RULE } from '@/app/lib/server/afrikaans';
import { planMix, MOST_MOVES, type LaneNow } from '@/app/lib/mixplan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** The same brake as the copilot's, and for the same reason. */
const LIMITS = { perMinute: 20, perHour: 200 };

const MoveSchema = z.object({
  laneId: z.string().describe('Which lane, by the id you were given. Never a name.'),
  gain: z
    .number()
    .nullable()
    .describe('The new fader position, 0 to 1.5, where 1 is unchanged. Null to leave it.'),
  pan: z
    .number()
    .nullable()
    .describe('Where it sits, −1 hard left to 1 hard right. Null to leave it.'),
  fxOn: z
    .string()
    .nullable()
    .describe('An effect to switch on: eq, compressor, limiter, utility, saturator, folder, crusher, tremolo, chorus, delay, reverb. Null for none.'),
  fxOff: z.string().nullable().describe('An effect to switch off, same names. Null for none.'),
  why: z.string().describe('One short line saying why, in the language they wrote in.'),
});

const AnswerSchema = z.object({
  reply: z
    .string()
    .describe('Two or three sentences answering them, in the language they wrote in. Say what you are changing and what it should do to the sound.'),
  moves: z.array(MoveSchema).describe(`The changes. At most ${MOST_MOVES}, one per lane, fewest that do the job.`),
});

const SYSTEM = [
  'You are a mixing engineer sitting beside somebody at a small desk.',
  'You are given the state of their session: every lane with its name, its fader, where it sits left to right, whether it is muted, and which effects are switched on. Where the room has measured the mix you are given its peak and average in decibels.',
  'You CANNOT hear the audio. Never pretend otherwise and never describe what something sounds like as though you had listened. What you can do is read the desk and act on what they tell you is wrong.',
  'Answer with the fewest changes that do the job. Two good moves beat eight.',
  'A fader is 0 to 1.5 where 1 is unchanged. Moving a lane from 1 to 0.7 is about 3 dB down. Prefer turning the loud thing down over turning everything else up: the second runs out of headroom.',
  'Only switch an effect on if they asked for something it does. Do not put a reverb on everything.',
  'If what they asked for cannot be done from the desk — a bad take, a wrong note, a room recording — say so plainly and return no moves. Advice you cannot act on is better than a fader moved for the sake of it.',
  `- ${AFRIKAANS_RULE}`,
].join('\n');

interface Body {
  readonly question?: unknown;
  readonly lanes?: unknown;
  readonly reading?: unknown;
}

function laneList(raw: unknown): LaneNow[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).map((one) => {
    const lane = (one ?? {}) as Record<string, unknown>;
    return {
      id: String(lane.id ?? '').slice(0, 80),
      name: String(lane.name ?? '').trim().slice(0, 60),
      gain: Number(lane.gain) || 0,
      pan: Number(lane.pan) || 0,
      muted: lane.muted === true,
      fx: Array.isArray(lane.fx) ? lane.fx.slice(0, 16).map((each) => String(each).slice(0, 20)) : [],
    };
  }).filter((lane) => lane.id);
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('mixdesk', request, LIMITS)) {
    return Response.json({ error: 'rate_limited', message: 'Too many at once. Try again in a moment.' }, { status: 429 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'no_key', message: 'The copilot is not switched on.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const question = String(body.question ?? '').trim().slice(0, 800);
  if (!question) {
    return Response.json({ error: 'empty', message: 'Say what you want changed.' }, { status: 400 });
  }
  /* Through the same gate as everything else somebody types, and answered
     in the gate's own words rather than a status code — the panel shows the
     reply, so a refusal that arrives as a 4xx reads as the app being broken
     instead of as an answer. */
  const refused = screen(question, 'song');
  if (refused) {
    return Response.json({ reply: refused.message, moves: [] }, { status: 200 });
  }

  const lanes = laneList(body.lanes);
  if (!lanes.length) {
    return Response.json({ error: 'no_lanes', message: 'There is nothing in the session to mix yet.' }, { status: 400 });
  }

  const desk = [
    'The session, lane by lane:',
    ...lanes.map((lane) =>
      `- id ${lane.id} · "${lane.name}" · fader ${lane.gain.toFixed(2)} · ${
        lane.pan === 0 ? 'centre' : `${Math.abs(Math.round(lane.pan * 100))}% ${lane.pan < 0 ? 'left' : 'right'}`
      }${lane.muted ? ' · MUTED' : ''}${lane.fx.length ? ` · effects on: ${lane.fx.join(', ')}` : ' · no effects'}`,
    ),
    typeof body.reading === 'string' && body.reading ? `The mix measures: ${String(body.reading).slice(0, 200)}` : 'The mix has not been measured yet.',
    '',
    `They say: ${question}`,
  ].join('\n');

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4000,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low', format: zodOutputFormat(AnswerSchema) },
      messages: [{ role: 'user' as const, content: desk }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ reply: 'I cannot help with that one.', moves: [] }, { status: 200 });
    }
    const parsed = response.parsed_output;
    if (!parsed) {
      return Response.json({ error: 'unparsed', message: 'That reply came back mangled.' }, { status: 502 });
    }

    /* The schema asks for the ranges and a model is not a contract, so
       `planMix` applies them. See the note at the top of `lib/mixplan.ts`. */
    const moves = planMix(
      (parsed.moves ?? []).map((one) => ({
        laneId: one.laneId,
        gain: one.gain ?? undefined,
        pan: one.pan ?? undefined,
        fxOn: one.fxOn ?? undefined,
        fxOff: one.fxOff ?? undefined,
        why: one.why,
      })),
      lanes,
    );
    return Response.json({ reply: parsed.reply, moves });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'bad_key', message: 'The configured key was rejected.' }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'rate_limited', message: 'Too many at once. Try again in a moment.' }, { status: 429 });
    }
    return Response.json({ error: 'api_error', message: 'The copilot could not be reached.' }, { status: 502 });
  }
}

export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

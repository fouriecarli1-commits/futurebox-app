/**
 * Real music generation.
 *
 * This is the route that makes FutureBox worth opening: you give it a style and
 * your words, and it gives back a sung, produced track. Everything else in the
 * studio arranges the request and handles the result.
 *
 * It calls ElevenLabs Music. That choice is deliberate:
 *   - It has a documented, stable HTTP API, unlike Suno, whose generation API is
 *     not public and whose community wrappers both break and breach its terms.
 *   - It takes lyrics per section, which is what a songwriter actually has,
 *     rather than one prompt blob.
 *   - Paid plans carry a commercial licence, so a track made here can be
 *     released. The free tier does not — that matters and the UI says so.
 *
 * The key stays on the server. The browser never sees it, which is the whole
 * reason this is a route handler and not a fetch from a component.
 *
 * The wire format below is taken from the official SDK's own serializers
 * (@elevenlabs/elevenlabs-js), not from memory: POST /v1/music with
 * output_format as a query parameter, `xi-api-key` for auth, snake_case JSON in,
 * and raw audio bytes — not JSON — back.
 */

import { allowanceFor, callerFrom, metered, recordGeneration } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generating a minute of music takes tens of seconds upstream, so the 10-second
 * default would fail every request before the first one could ever succeed.
 * 300 is the Pro ceiling and comfortably covers a full-length song. On Hobby
 * the cap is 60, which is enough for a short one and not for a long one.
 */
export const maxDuration = 300;

const ENDPOINT = 'https://api.elevenlabs.io/v1/music';
const OUTPUT_FORMAT = 'mp3_44100_128';
/**
 * music_v1 is marked deprecated in ElevenLabs' own SDK. v2 is current, and it
 * takes a different plan: a flat list of chunks, each with its own text, length
 * and styles, rather than v1's sections under a global style. The field names
 * below come from the SDK's serialisers, not from memory.
 */
const MODEL_ID = 'music_v2';

/** ElevenLabs' own bounds. Sending outside them is a 422, so clamp first. */
const MIN_MS = 3_000;
const MAX_MS = 600_000;
const SECTION_MIN_MS = 3_000;
const SECTION_MAX_MS = 120_000;
const MAX_LINES_PER_SECTION = 30;
const MAX_LINE_CHARS = 200;

export interface MusicSection {
  name: string;
  lines: string[];
  seconds: number;
}

interface Body {
  /** What it should sound like. Free text, and the styles are derived from it. */
  style?: string;
  /** Sung lyrics, split into sections. Empty means an instrumental. */
  sections?: MusicSection[];
  /** Used when there are no sections: a single prompt for the whole track. */
  prompt?: string;
  seconds?: number;
  instrumental?: boolean;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, Math.round(value)));

/**
 * A section's lyrics, trimmed to what the API accepts. Over-long lines are cut
 * rather than dropped: losing the tail of one line beats losing the verse.
 */
function toLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES_PER_SECTION)
    .map((line) => (line.length > MAX_LINE_CHARS ? line.slice(0, MAX_LINE_CHARS) : line));
}

/** Style text becomes the list of directions the model reads. */
function toStyles(style: string): string[] {
  return style
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * The request body. With sections we send a composition plan, which is the only
 * way to say which words belong to which part of the song. Without them we send
 * a plain prompt and let the model decide the shape.
 */
function buildRequest(body: Body): Record<string, unknown> {
  const styles = toStyles(body.style ?? '');
  const sections = (body.sections ?? [])
    .map((section) => ({ ...section, lines: toLines(section.lines ?? []) }))
    .filter((section) => section.lines.length > 0);

  if (sections.length > 0 && !body.instrumental) {
    return {
      model_id: MODEL_ID,
      composition_plan: {
        chunks: sections.map((section, index) => ({
          // The section name in square brackets is how v2 is told what this
          // part of the song is; the lines follow it, one per line.
          text: `[${section.name}]\n${section.lines.join('\n')}`,
          duration_ms: clamp((section.seconds || 20) * 1000, SECTION_MIN_MS, SECTION_MAX_MS),
          // The first chunk's styles set the whole song, so it carries the full
          // list and later chunks carry a shorter one. That is the SDK's own
          // advice, and it is why these are not simply the same array copied.
          positive_styles: index === 0 ? withDefaults(styles) : styles.slice(0, 6),
          negative_styles: index === 0 ? ['muddy mix', 'distorted', 'off-key vocal'] : [],
        })),
      },
    };
  }

  const prompt = [body.prompt, body.style].filter(Boolean).join('. ').trim();
  return {
    model_id: MODEL_ID,
    prompt: prompt || 'An instrumental track with a clear groove and a memorable hook.',
    music_length_ms: clamp((body.seconds || 60) * 1000, MIN_MS, MAX_MS),
    force_instrumental: Boolean(body.instrumental),
  };
}

/**
 * The first chunk wants six or seven styles before the direction is settled,
 * so a request carrying two gets padded rather than under-specified.
 */
function withDefaults(styles: string[]): string[] {
  const base = styles.length ? styles.slice() : ['modern production', 'clear vocal'];
  // Enough of these to reach seven from a two-word style. Deliberately generic:
  // they describe how it should be made, not what it should sound like, so they
  // never argue with whatever the person actually asked for.
  const padding = [
    'great production quality',
    'balanced mix',
    'clear vocal',
    'warm analogue character',
    'tight low end',
    'natural stereo width',
    'dynamic performance',
  ];
  padding.forEach((extra) => {
    if (base.length < 7 && base.indexOf(extra) === -1) base.push(extra);
  });
  return base;
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    // The same shape app/api/songwriter uses, so the client handles both alike.
    return Response.json(
      { error: 'no_key', message: 'Music generation is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read the request.' }, { status: 400 });
  }

  // What this person may spend, decided here and not by the page that asked.
  // Without accounts configured there is nobody to meter, so the request goes
  // through as it always did — that keeps a local or half-configured install
  // working rather than locking everyone out of a feature they had.
  let record: (() => Promise<void>) | null = null;
  if (metered()) {
    const caller = await callerFrom(request);
    const allowance = await allowanceFor(caller);
    if (!allowance.allowed) {
      return Response.json(
        {
          error: caller ? 'out_of_allowance' : 'signed_out',
          message: allowance.reason,
          usedToday: allowance.usedToday,
          limit: allowance.limit,
        },
        { status: caller ? 402 : 401 },
      );
    }
    // A free account gets a short preview whatever the request asked for. This
    // is the line the whole cost model rests on, so it is enforced by
    // overwriting the request rather than by trusting it.
    if (allowance.kind === 'preview') {
      body = { ...body, seconds: allowance.seconds, sections: undefined };
    }
    const seconds = allowance.kind === 'preview' ? allowance.seconds : (body.seconds ?? 60);
    if (caller) record = () => recordGeneration(caller, allowance.kind, seconds);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${ENDPOINT}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest(body)),
    });
  } catch {
    return Response.json(
      { error: 'unreachable', message: 'Could not reach the music service. Try again in a moment.' },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const raw = await upstream.text().catch(() => '');

    // Their own words first. Summarising an upstream error into one of four
    // buckets throws away the only sentence that says what to change, and the
    // bucket for "anything else" is where every unfamiliar failure lands —
    // which is exactly when the detail matters most.
    let theirs = '';
    try {
      const parsed = JSON.parse(raw) as {
        detail?: unknown;
        message?: string;
        error?: { message?: string };
      };
      const detail = parsed.detail;
      theirs =
        (typeof detail === 'string' ? detail : '') ||
        (detail && typeof detail === 'object'
          ? ((detail as { message?: string }).message ?? JSON.stringify(detail))
          : '') ||
        parsed.message ||
        parsed.error?.message ||
        '';
    } catch {
      theirs = raw.slice(0, 300);
    }

    const known =
      upstream.status === 401
        ? 'The music service rejected the key.'
        : upstream.status === 422
          ? 'The music service could not use that request.'
          : upstream.status === 429
            ? 'Out of music credits, or too many requests at once.'
            : '';

    // The status number is included on an unrecognised failure. It is not
    // pretty, and it is the difference between a fixable report and "it broke".
    // Trailing full stop dropped before appending, or the line reads "…request.:"
    const lead = (known || `The music service said no (${upstream.status})`).replace(/\.$/, '');
    const message = theirs
      ? `${lead}: ${theirs}`.slice(0, 400)
      : known || `The music service said no (${upstream.status}), without saying why.`;

    return Response.json(
      { error: 'upstream', status: upstream.status, message, detail: raw.slice(0, 800) },
      { status: 502 },
    );
  }

  // Counted only now, after upstream said yes: a rejected request costs
  // nothing and must not spend someone's allowance.
  if (record) await record();

  // Audio bytes, streamed straight through — no point buffering a whole song
  // in this process just to hand it on.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Music-Model': 'ElevenLabs Music',
    },
  });
}

/** Whether a key is set, so the studio can offer the real thing or not. */
export async function GET(): Promise<Response> {
  return Response.json({ available: Boolean(process.env.ELEVENLABS_API_KEY) });
}

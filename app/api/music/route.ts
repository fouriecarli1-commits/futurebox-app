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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generating a minute of music takes tens of seconds upstream, so the 10-second
 * default would fail every request before the first one could ever succeed.
 * 60 is the ceiling on Vercel's Hobby plan; a long song may still need Pro.
 */
export const maxDuration = 60;

const ENDPOINT = 'https://api.elevenlabs.io/v1/music';
const OUTPUT_FORMAT = 'mp3_44100_128';
const MODEL_ID = 'music_v1';

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
        positive_global_styles: styles.length ? styles : ['modern production', 'clear vocal'],
        // Named rather than left empty: these are the failure modes of generated
        // music, and saying so up front is cheaper than regenerating.
        negative_global_styles: ['muddy mix', 'distorted', 'off-key vocal'],
        sections: sections.map((section) => ({
          section_name: section.name.slice(0, 100),
          positive_local_styles: styles.slice(0, 6),
          negative_local_styles: [],
          duration_ms: clamp((section.seconds || 20) * 1000, SECTION_MIN_MS, SECTION_MAX_MS),
          lines: section.lines,
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
    // Their error body is JSON; ours must be too, so the UI can say what went
    // wrong instead of showing a blank failure.
    const detail = await upstream.text().catch(() => '');
    const message =
      upstream.status === 401
        ? 'The music service rejected the key.'
        : upstream.status === 422
          ? 'The music service could not use that request. Try a shorter song or fewer lines.'
          : upstream.status === 429
            ? 'Out of music credits, or too many requests at once.'
            : 'The music service could not make that one.';
    return Response.json({ error: 'upstream', status: upstream.status, message, detail: detail.slice(0, 500) }, { status: 502 });
  }

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

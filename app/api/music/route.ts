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

import { admin, allowanceFor, callerFrom, metered, recordGeneration } from '@/app/lib/server/account';
import { buildRequest, type Body } from '@/app/lib/server/musicplan';
import { songCost } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';

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

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read the request.' }, { status: 400 });
  }

  const caller = metered() ? await callerFrom(request) : null;

  // What is being asked for, before anything is spent on it.
  //
  // Everything the person wrote goes through together — the style, the prompt
  // and every sung line — because a request whose style is innocent and whose
  // chorus is not is still that request. Refused here rather than after the
  // charge, so a refusal costs nobody anything.
  const asked = [
    body.style ?? '',
    body.prompt ?? '',
    ...(body.sections ?? []).flatMap((section) => section.lines ?? []),
  ]
    .filter(Boolean)
    .join('\n');
  const allowed = await guard(request, asked, 'song', caller);
  if (!allowed.ok) return allowed.response;

  // The key check comes *after* the refusal on purpose. What the app will not
  // make is not a function of what it happens to be configured with, and a
  // gate that can only be exercised on a fully configured install is a gate
  // nobody can test.
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    // The same shape app/api/songwriter uses, so the client handles both alike.
    return Response.json(
      { error: 'no_key', message: 'Music generation is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  // What this person may spend, decided here and not by the page that asked.
  // Without accounts configured there is nobody to meter, so the request goes
  // through as it always did — that keeps a local or half-configured install
  // working rather than locking everyone out of a feature they had.
  let record: (() => Promise<void>) | null = null;
  let length = body.seconds ?? 60;
  if (metered()) {

    // A trained sound is the caller's or it is nobody's. Checked against our
    // own table, because ElevenLabs cannot tell our users apart; and dropped
    // rather than refused when it does not match, so a stale id left in a
    // browser makes an ordinary song instead of an error.
    if (body.finetuneId) {
      const client = admin();
      const mine =
        caller && client
          ? await client
              .from('finetunes')
              .select('id')
              .eq('id', body.finetuneId)
              .eq('owner', caller.id)
              .eq('status', 'completed')
              .maybeSingle()
          : null;
      if (!mine?.data) body = { ...body, finetuneId: undefined };
    }

    // The request goes with it: the address it came from is one of the three
    // things the free allowance is counted against.
    const allowance = await allowanceFor(caller, request);
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
      body = { ...body, seconds: allowance.seconds, sections: undefined, finetuneId: undefined };
    }
    const seconds = allowance.kind === 'preview' ? allowance.seconds : (body.seconds ?? 60);
    if (caller) record = () => recordGeneration(caller, allowance.kind, seconds, undefined, request);
    length = seconds;
  }

  // Paid for before a byte is asked for, and given back below if the engine
  // then refuses. Charging afterwards would hand free work to whoever is
  // quickest, because two requests can both pass a check that is not a write.
  const paid = await charge(request, songCost(length), 'song');
  if (!paid.ok) return paid.response;

  let upstream: Response;
  try {
    upstream = await fetch(`${ENDPOINT}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest(body)),
    });
  } catch {
    await paid.refund();
    return Response.json(
      { error: 'unreachable', message: 'Could not reach the music service. Try again in a moment.' },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    await paid.refund();
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

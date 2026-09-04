/**
 * One stem, streamed back through this app's own origin.
 *
 * ── Why it cannot simply be a link ───────────────────────────────────────
 *
 * A finished workflow hands back signed URLs on Music.ai's storage host. The
 * browser is not allowed to fetch those: this app's Content-Security-Policy
 * lists `self` and Supabase and nothing else. That is deliberate — a
 * `connect-src` that grows a line for every supplier is a policy that stops
 * being a policy — so the file comes through here instead.
 *
 * ── And why it takes a job id rather than a URL ──────────────────────────
 *
 * A route that fetched whatever URL it was handed is an open proxy: anybody
 * could point it at anything and have this app's server fetch it for them.
 * So it takes a job id and an output name, asks Music.ai what that output's
 * URL actually is, and fetches only that. The caller never names an address.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { tooMany } from '@/app/lib/server/brake';
import { configured, jobOf } from '@/app/lib/server/musicai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LIMITS = { perMinute: 30, perHour: 300 };

export async function GET(request: Request): Promise<Response> {
  if (tooMany('analysepart', request, LIMITS)) {
    return Response.json({ error: 'rate_limited', message: 'Too many at once.' }, { status: 429 });
  }
  if (!configured()) {
    return Response.json({ error: 'no_key', message: 'Not switched on.' }, { status: 503 });
  }
  /* Signed in, where there are accounts at all. The job id is not a secret
     worth relying on: it is a handle this app handed out minutes ago, and a
     download that costs bandwidth should belong to somebody. */
  if (metered() && !(await callerFrom(request))) {
    return Response.json({ error: 'signed_out', message: 'Sign in first.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const name = url.searchParams.get('name') ?? '';
  if (!id || id.length > 200 || !name || name.length > 120) {
    return Response.json({ error: 'bad_request', message: 'Which part?' }, { status: 400 });
  }

  const job = await jobOf(id);
  const found = job?.result?.[name];
  if (typeof found !== 'string' || !/^https:\/\//.test(found)) {
    return Response.json({ error: 'gone', message: 'That part is not there.' }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(found, { cache: 'no-store' });
  } catch {
    return Response.json({ error: 'unreachable', message: 'That part could not be fetched.' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: 'unreachable', message: 'That part could not be fetched.' }, { status: 502 });
  }

  /* Streamed rather than buffered: a stem of a five-minute song is tens of
     megabytes and holding one in memory to hand it on is how a function runs
     out of it on the day somebody uploads an album. */
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}

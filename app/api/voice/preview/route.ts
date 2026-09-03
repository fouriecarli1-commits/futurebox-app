/**
 * A free listen to a stock voice, before anybody spends a credit on it.
 *
 * ── Why this route exists at all ─────────────────────────────────────────
 *
 * ElevenLabs publish a sample for every one of their own voices. It is free,
 * it needs no generation, and it is the difference between choosing a voice
 * and guessing at one — the only way to find out what "Antoni" sounded like
 * was to pay for a reading and listen to the result.
 *
 * The sample lives on their storage host. Playing it in the page directly
 * would mean adding that host to `media-src` in the
 * Content-Security-Policy, and a policy is a list of who this app trusts with
 * a person's browser. A sample is not worth a line on that list, so it is
 * fetched here and passed through: same origin, no policy change, and the key
 * stays on this side of the wire.
 *
 * ── Why it does not charge ───────────────────────────────────────────────
 *
 * Because it costs nothing. The sample is a static file on their side; there
 * is no generation and no per-character bill. Charging for it would be
 * charging for our own bandwidth, and it would put a price on the one step
 * that stops somebody buying the wrong thing.
 *
 * ── What stops it being an open proxy ────────────────────────────────────
 *
 * The id has to be one this process has already seen in a stock-voice listing.
 * Nothing arbitrary can be fetched through here: an id that is not in that map
 * is a 404, and the map only ever holds URLs that came back from
 * `GET /v1/voices` under our own key.
 */

import { configured, sampleUrlFor, stockVoices } from '@/app/lib/server/eleven';

/** A sample does not change. Let the browser keep it. */
const CACHE = 'public, max-age=86400, immutable';

export async function GET(request: Request): Promise<Response> {
  if (!configured()) {
    return Response.json({ message: 'The voice service is not switched on.' }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ message: 'Which voice?' }, { status: 400 });

  // The map is filled by listing the voices. A cold process — a new serverless
  // instance, a redeploy — has an empty one, so fill it before giving up.
  let url = sampleUrlFor(id);
  if (!url) {
    await stockVoices();
    url = sampleUrlFor(id);
  }
  if (!url) return Response.json({ message: 'No sample for that voice.' }, { status: 404 });

  const sample = await fetch(url).catch(() => null);
  if (!sample?.ok || !sample.body) {
    return Response.json({ message: 'That sample could not be fetched.' }, { status: 502 });
  }

  return new Response(sample.body, {
    headers: {
      'content-type': sample.headers.get('content-type') ?? 'audio/mpeg',
      'cache-control': CACHE,
    },
  });
}

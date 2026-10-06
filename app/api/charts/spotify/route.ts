/**
 * Why the Spotify bar is not on Spotlight.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The bar is either there or it is not. That is right for a visitor — an
 * error message about somebody else's API is not their problem — and it
 * leaves the person who set the keys with nothing at all. Six different
 * things make `spotifyChart` answer with nothing, and from the outside they
 * are one blank space.
 *
 * It matters more here than for the other suppliers: the outbound call to
 * Spotify is blocked where this app is built, so that code path has never run
 * against their real API. The first time it runs is in production, and "it
 * did not appear" would be the whole of what either of us knew.
 *
 * ── And one answer this is specifically for ──────────────────────────────
 *
 * `not-found` with a list of what the search DID return. Spotify have been
 * narrowing what a newly created app may read, and their own editorial
 * playlists are among the things that have moved behind that line. If their
 * Top 50 is simply not handed to this app, the search comes back full of
 * other people's playlists named after it — and that is a Spotify decision,
 * not a fault here. The difference is visible in `saw` and nowhere else.
 *
 * ── Guarded, like the others ─────────────────────────────────────────────
 *
 * It confirms whether a paid key works, so it refuses without `POST_SECRET`
 * rather than defaulting to open. Compared in constant time, the same shape
 * as `/api/mail/setup` and `/api/analyse/setup`.
 */

import crypto from 'node:crypto';
import { probeAccess, spotifyWhy, type SpotifyWhy } from '@/app/lib/server/spotify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** What to do about it, in the words of somebody who has to go and do it. */
const NEXT: Record<SpotifyWhy, string> = {
  ok: 'The chart came back. If the bar is still not on Spotlight, the fault is on the screen rather than in the data.',
  'no-keys':
    'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is not set in Vercel. Set both, then redeploy —'
    + ' a value saved without a redeploy changes nothing.',
  'token-refused':
    'Spotify refused the key pair, before any chart was asked for. In order of'
    + ' how often it is each one: the two values are in the wrong variables (the'
    + ' Client ID is shown openly, the secret is behind "View client secret");'
    + ' the secret was not copied in full; or it was pasted with a space on the'
    + ' end. Open developer.spotify.com → your app → Settings, copy both again,'
    + ' and redeploy. A space either side is trimmed here now, so that one will'
    + ' not bite twice.',
  'no-token': 'Spotify accepted the keys and returned no token, which is theirs to explain.',
  'search-refused':
    'The search was refused. A 403 on a new app means Spotify are not serving this endpoint to it,'
    + ' which is their policy rather than a mistake here.',
  'not-found':
    'The search worked and no playlist in it is owned by Spotify themselves. See `saw` below. If'
    + ' every row there belongs to somebody else, their own chart is not being handed to this app —'
    + ' nothing to fix here, and the honest move is to leave the bar off rather than show a'
    + " stranger's playlist as Spotify's chart.",
  'tracks-refused':
    'Their chart was found and its tracks were refused, which is the same policy line one step later.',
  threw:
    'The call fell over — a timeout or no route out. Nothing to set; try the page again before'
    + ' reading anything into it.',
};

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  if (!wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Set POST_SECRET before using this.' },
      { status: 503 },
    );
  }
  const given =
    new URL(request.url).searchParams.get('key') ??
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!given || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  const look = await spotifyWhy();
  /* When they refuse, ask WHICH refusal it is. Three different worlds hide
     behind one 403 and only one of them has a way forward; see `probeAccess`.
     Skipped when the chart came back, because there is nothing to diagnose
     about a thing that worked. */
  const access = look.why === 'ok' ? null : await probeAccess();
  return Response.json({
    working: look.why === 'ok',
    why: look.why,
    next: NEXT[look.why],
    ...(look.status ? { theirStatus: look.status } : {}),
    ...(look.saw ? { saw: look.saw } : {}),
    chart: look.chart
      ? { name: look.chart.name, url: look.chart.url, songs: look.chart.rows.length }
      : null,
    ...(access ? { access } : {}),
  });
}

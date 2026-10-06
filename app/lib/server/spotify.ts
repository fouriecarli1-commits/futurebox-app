/**
 * Spotify's own chart, for the bar beside ours on Spotlight.
 *
 * Client credentials: it reads public things and touches nobody's account,
 * ours included. No redirect, no scopes, no person signed in — which is why
 * `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are the whole of it.
 *
 * ── Why this is a seam and not two lines in a route ──────────────────────
 *
 * It started inside `app/api/charts/route.ts`, and the diagnostic that reads
 * the same thing had to import a ROUTE to get at it. Beyond being an odd
 * shape, it made the reach invisible: `check:gratis` asks which routes can
 * reach a supplier by reading their imports, and a route that reaches one
 * through another route reads as reaching nothing. A rule that is green
 * because it is looking one level too high is worse than no rule.
 */

import type { ChartRow } from '@/app/api/charts/route';

const HOW_MANY = 10;

/**
 * Why the Spotify bar is not there, for the one page allowed to ask.
 *
 * Six things can go wrong in `spotifyChart` and every one of them used to be
 * the same `return null`. The bar then simply does not appear — the room says
 * so plainly and that is right for a visitor, but it left nobody, her or me,
 * able to tell an unset key from a refused key from a chart Spotify will not
 * hand to a new app. The code path has never run against their real API from
 * where this was built, so the first time it runs is on her phone.
 *
 * So the reason is carried out of the function and dropped on the floor by
 * the public route. One code path, two readers.
 */
export type SpotifyWhy =
  | 'ok'
  | 'no-keys'
  | 'token-refused'
  | 'no-token'
  | 'search-refused'
  | 'not-found'
  | 'tracks-refused'
  | 'threw';

export interface SpotifyLook {
  readonly chart: { name: string; url: string; rows: ChartRow[] } | null;
  readonly why: SpotifyWhy;
  /** What the search did return, when none of it was theirs. */
  readonly saw?: Array<{ name: string; owner: string }>;
  /** Their HTTP status, when they refused. */
  readonly status?: number;
}

/**
 * Spotify's own global chart.
 *
 * Carli, 6 October 2026: *"ek vra vir international playlist nie south
 * african nie. dit is beter"* — so it is Top 50 Global rather than Top 50
 * South Africa. The reasoning is hers and it is sound: the room already
 * counts what South Africa is playing *here*, which is the chart above this
 * one and the one that is actually ours. A second local chart beside it is
 * two answers to one question; the world's is the thing we cannot count.
 */
async function spotifyLook(): Promise<SpotifyLook> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return { chart: null, why: 'no-keys' };

  try {
    const auth = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    });
    if (!auth.ok) return { chart: null, why: 'token-refused', status: auth.status };
    const token = ((await auth.json()) as { access_token?: string }).access_token;
    if (!token) return { chart: null, why: 'no-token' };
    const bearer = { Authorization: `Bearer ${token}` };

    /* Searched, not pinned to an id. Only a playlist Spotify themselves own
       counts as their chart — anybody may name a playlist "Top 50 - Global",
       and one of those is a stranger's list, not a chart. */
    const found = await fetch(
      'https://api.spotify.com/v1/search?type=playlist&limit=20&q=' +
        encodeURIComponent('Top 50 Global'),
      { headers: bearer, signal: AbortSignal.timeout(8000) },
    );
    if (!found.ok) return { chart: null, why: 'search-refused', status: found.status };
    const lists = ((await found.json()) as {
      playlists?: { items?: Array<{ id?: string; name?: string; owner?: { id?: string }; external_urls?: { spotify?: string } }> };
    }).playlists?.items ?? [];
    const theirs = lists.find(
      (one) => one?.owner?.id === 'spotify' && /global/i.test(String(one?.name ?? '')),
    );
    if (!theirs?.id) {
      return {
        chart: null,
        why: 'not-found',
        /* What DID come back, because "not found" and "found somebody else's"
           are different problems and only one of them is ours. */
        saw: lists.slice(0, 10).map((one) => ({
          name: String(one?.name ?? ''),
          owner: String(one?.owner?.id ?? ''),
        })),
      };
    }

    const tracks = await fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(theirs.id)}/tracks?limit=${HOW_MANY}`,
      { headers: bearer, signal: AbortSignal.timeout(8000) },
    );
    if (!tracks.ok) return { chart: null, why: 'tracks-refused', status: tracks.status };
    const items = ((await tracks.json()) as {
      items?: Array<{ track?: { id?: string; name?: string; artists?: Array<{ name?: string }>; external_urls?: { spotify?: string } } }>;
    }).items ?? [];

    return {
      why: 'ok',
      chart: {
      name: String(theirs.name ?? 'Spotify'),
      url: String(theirs.external_urls?.spotify ?? ''),
      rows: items
        .map((one, at) => ({
          ref: String(one?.track?.external_urls?.spotify ?? one?.track?.id ?? ''),
          title: String(one?.track?.name ?? ''),
          by: (one?.track?.artists ?? []).map((a) => String(a?.name ?? '')).filter(Boolean).join(', '),
          /* Their position, not a play count. Named `count` because the screen
             draws one shape; the screen knows not to print "plays" for these. */
          count: at + 1,
          recent: 0,
        }))
        .filter((one) => one.title),
      },
    };
  } catch {
    return { chart: null, why: 'threw' };
  }
}

/** The chart alone, for the public route. The reason is not a visitor's. */
export async function spotifyChart(): Promise<{ name: string; url: string; rows: ChartRow[] } | null> {
  return (await spotifyLook()).chart;
}

/** The whole answer, for `/api/charts/spotify`, which is guarded. */
export async function spotifyWhy(): Promise<SpotifyLook> {
  return spotifyLook();
}

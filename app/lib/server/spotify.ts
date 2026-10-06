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
  /* Trimmed, for the reason `slugFor` is trimmed in `musicai.ts`: these
     values reach us by being pasted into a web form, and Vercel keeps what it
     is given. Neither of these ever legitimately begins or ends with a space,
     and a stray one is a 400 from Spotify that reads exactly like a wrong
     secret — which is an evening spent re-copying a value that was right. */
  const id = (process.env.SPOTIFY_CLIENT_ID ?? '').trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET ?? '').trim();
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

/**
 * Which of three worlds a refusal puts us in.
 *
 * A 403 on the search says Spotify will not serve that endpoint to this app.
 * It does NOT say whether the app may call anything at all, and those are
 * different problems with different answers:
 *
 *   everything refused  → an access-level problem on her side. A new app
 *                         starts restricted, and that is a dashboard setting
 *                         rather than something to code around.
 *   catalogue works,
 *   search refused      → the search endpoint specifically. Their chart could
 *                         still be reachable by id, which is a real way
 *                         forward rather than a guess.
 *   catalogue works,
 *   the chart refused   → their own editorial playlists are behind the line
 *                         they have been drawing for new apps. Nothing here
 *                         can fix that, and the honest move is to leave the
 *                         bar off.
 *
 * Only reachable from the guarded page. The id below is Spotify's published
 * Top 50 Global, used HERE as a probe and deliberately not in the chart path
 * above — a pinned id fails silently the day they retire it, which is why
 * that path searches instead.
 */
const TOP_50_GLOBAL = '37i9dQZEVXbMDoHDwVN2tF';

export interface Access {
  readonly token: boolean;
  /** Plain catalogue: an album by id. Nothing editorial, nothing personal. */
  readonly catalogue: number | 'threw' | null;
  readonly search: number | 'threw' | null;
  readonly theirChart: number | 'threw' | null;
  readonly reading: string;
}

export async function probeAccess(): Promise<Access> {
  const id = (process.env.SPOTIFY_CLIENT_ID ?? '').trim();
  const secret = (process.env.SPOTIFY_CLIENT_SECRET ?? '').trim();
  const nothing: Access = {
    token: false, catalogue: null, search: null, theirChart: null,
    reading: 'No keys are set, so there is nothing to ask.',
  };
  if (!id || !secret) return nothing;

  let token = '';
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
    if (!auth.ok) {
      return { ...nothing, reading: `The key pair was refused (${auth.status}).` };
    }
    token = ((await auth.json()) as { access_token?: string }).access_token ?? '';
  } catch {
    return { ...nothing, reading: 'The token call fell over.' };
  }
  if (!token) return { ...nothing, reading: 'They accepted the keys and sent no token.' };

  const bearer = { Authorization: `Bearer ${token}` };
  const status = async (url: string): Promise<number | 'threw'> => {
    try {
      return (await fetch(url, { headers: bearer, signal: AbortSignal.timeout(8000) })).status;
    } catch {
      return 'threw';
    }
  };

  /* An album every account can see, so a refusal here is about the APP and
     not about what is being asked for. */
  const catalogue = await status('https://api.spotify.com/v1/albums/4aawyAB9vmqN3uQ7FjRGTy');
  const search = await status(
    'https://api.spotify.com/v1/search?type=playlist&limit=1&q=' + encodeURIComponent('Top 50 Global'),
  );
  const theirChart = await status(`https://api.spotify.com/v1/playlists/${TOP_50_GLOBAL}`);

  const fine = (one: number | 'threw'): boolean => one === 200;
  let reading: string;
  if (!fine(catalogue)) {
    reading = `Even a plain album came back ${catalogue}. This app is not allowed to`
      + ' read anything, which is an access level on the Spotify dashboard rather'
      + ' than anything to change here. Open developer.spotify.com → your app and'
      + ' look at what mode it is in.';
  } else if (fine(theirChart)) {
    reading = 'The catalogue is open and their Top 50 Global can be read BY ID,'
      + ` while the search came back ${search}. That is a way forward: the chart`
      + ' path can ask for the playlist directly instead of searching for it.';
  } else if (fine(search)) {
    reading = `The search works and their own chart came back ${theirChart}.`
      + ' Their editorial playlists are behind the line they have been drawing'
      + ' for new apps. Nothing here can fix that.';
  } else {
    reading = `The catalogue is open, the search came back ${search} and their`
      + ` chart came back ${theirChart}. Both of the ways to their list are shut`
      + ' to this app, which is their policy and not a fault here. The bar stays'
      + " off rather than showing a stranger's playlist as Spotify's chart.";
  }
  return { token: true, catalogue, search, theirChart, reading };
}

/** The chart alone, for the public route. The reason is not a visitor's. */
export async function spotifyChart(): Promise<{ name: string; url: string; rows: ChartRow[] } | null> {
  return (await spotifyLook()).chart;
}

/** The whole answer, for `/api/charts/spotify`, which is guarded. */
export async function spotifyWhy(): Promise<SpotifyLook> {
  return spotifyLook();
}

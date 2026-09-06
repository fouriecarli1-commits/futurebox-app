/**
 * The charts on Spotlight.
 *
 *   "top 10 AI musiek in Suid afrika (sal mens hier dalk met apple music, of
 *    spotify kon saam werk om dit uit te gooi?" … "Ek dink daar moet ook top
 *    10 podcasts wees."
 *
 * ── Two charts, and they are not the same kind of thing ──────────────────
 *
 * **Ours** is counted from `events`: one person, one song, one day, one row,
 * over the last thirty days. It is honest, it is ours, and today it is small,
 * because the app has a handful of people on it. A chart that starts at three
 * songs and grows is worth more than a full one nobody can check — and the
 * screen says how many plays are behind each row, so nobody has to guess.
 *
 * **Spotify's** is Spotify's. Their own editorial South African chart, read
 * through their public API, shown beside ours and labelled as theirs. It is
 * there for the reason she asked for it: so the page has something worth
 * opening on the day ours has four rows on it.
 *
 * What it is *not* is a source for the AI chart. Their API has no idea what
 * was made with AI — there is no field, no tag, nothing — so a "top 10 AI
 * music in South Africa" built from it would be us deciding and putting their
 * name on it. That is the fault that was just deleted from the masterclasses,
 * and it is not being reintroduced one screen over.
 *
 * ── Finding the playlist rather than hard-coding its id ──────────────────
 *
 * Their chart is searched for by name and owner, not pinned to an id copied
 * out of a browser. An id cannot be checked from here and would fail silently
 * the day they retire it; a search either finds a playlist that Spotify
 * themselves own or honestly finds nothing.
 */

import { admin, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Long enough to be worth caching, short enough that a new play shows up. */
const CACHE_SECONDS = 300;
const WINDOW_DAYS = 30;
const HOW_MANY = 10;

export interface ChartRow {
  readonly ref: string;
  readonly title: string;
  readonly by: string;
  readonly count: number;
  readonly recent: number;
}

type Top = ReadonlyArray<{ ref?: unknown; count?: unknown; recent?: unknown }>;

async function topOf(kind: string): Promise<Top> {
  const client = admin();
  if (!client) return [];
  const { data, error } = await client.rpc('charts_top', {
    want_kind: kind,
    days: WINDOW_DAYS,
    want: HOW_MANY,
  });
  if (error || !Array.isArray(data)) return [];
  return data as Top;
}

const whole = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/**
 * Spotify's own South African chart.
 *
 * Client-credentials, which is the flow for reading public things and carries
 * no user's data at all. Empty when no key is set, which is the honest answer
 * and the one the screen is written to show.
 */
async function spotifyChart(): Promise<{ name: string; url: string; rows: ChartRow[] } | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

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
    if (!auth.ok) return null;
    const token = ((await auth.json()) as { access_token?: string }).access_token;
    if (!token) return null;
    const bearer = { Authorization: `Bearer ${token}` };

    /* Searched, not pinned to an id. Only a playlist Spotify themselves own
       counts as their chart — anybody may name a playlist "Top 50 - South
       Africa", and one of those is a stranger's list, not a chart. */
    const found = await fetch(
      'https://api.spotify.com/v1/search?type=playlist&limit=10&market=ZA&q=' +
        encodeURIComponent('Top 50 South Africa'),
      { headers: bearer, signal: AbortSignal.timeout(8000) },
    );
    if (!found.ok) return null;
    const lists = ((await found.json()) as {
      playlists?: { items?: Array<{ id?: string; name?: string; owner?: { id?: string }; external_urls?: { spotify?: string } }> };
    }).playlists?.items ?? [];
    const theirs = lists.find(
      (one) => one?.owner?.id === 'spotify' && /south africa/i.test(String(one?.name ?? '')),
    );
    if (!theirs?.id) return null;

    const tracks = await fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(theirs.id)}/tracks?limit=${HOW_MANY}&market=ZA`,
      { headers: bearer, signal: AbortSignal.timeout(8000) },
    );
    if (!tracks.ok) return null;
    const items = ((await tracks.json()) as {
      items?: Array<{ track?: { id?: string; name?: string; artists?: Array<{ name?: string }>; external_urls?: { spotify?: string } } }>;
    }).items ?? [];

    return {
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
    };
  } catch {
    return null;
  }
}

export async function GET(): Promise<Response> {
  if (!metered()) {
    return Response.json({ configured: false, music: [], podcasts: [], spotify: null });
  }

  const [playRows, podcastRows, spotify] = await Promise.all([
    topOf('play'),
    topOf('podcast'),
    spotifyChart(),
  ]);

  const client = admin();
  const music: ChartRow[] = [];
  const podcasts: ChartRow[] = [];

  if (client && playRows.length) {
    const ids = playRows.map((one) => String(one.ref ?? '')).filter(Boolean);
    const { data: tracks } = await client
      .from('tracks')
      .select('id, title, owner')
      .in('id', ids);
    const owners = Array.from(new Set((tracks ?? []).map((one) => one.owner)));
    const { data: makers } = owners.length
      ? await client.from('creators').select('owner, name').in('owner', owners)
      : { data: [] };
    const nameOf = new Map((makers ?? []).map((one) => [one.owner, String(one.name ?? '')]));
    const byId = new Map((tracks ?? []).map((one) => [one.id as string, one]));

    for (const row of playRows) {
      const track = byId.get(String(row.ref ?? ''));
      /* A play whose song has since been deleted is a row with nothing behind
         it. Dropped rather than printed as "Unknown" — a chart position held
         by a song nobody can open is worse than a chart of nine. */
      if (!track) continue;
      music.push({
        ref: String(track.id),
        title: String(track.title ?? ''),
        by: nameOf.get(track.owner) || 'A maker',
        count: whole(row.count),
        recent: whole(row.recent),
      });
    }
  }

  if (client && podcastRows.length) {
    const ids = podcastRows.map((one) => String(one.ref ?? '')).filter(Boolean);
    const { data: shows } = await client.from('shows').select('id, title, author').in('id', ids);
    const byId = new Map((shows ?? []).map((one) => [String(one.id), one]));
    for (const row of podcastRows) {
      const show = byId.get(String(row.ref ?? ''));
      if (!show) continue;
      podcasts.push({
        ref: String(show.id),
        title: String(show.title ?? ''),
        by: String(show.author ?? ''),
        count: whole(row.count),
        recent: whole(row.recent),
      });
    }
  }

  return Response.json(
    { configured: true, music, podcasts, spotify, days: WINDOW_DAYS },
    { headers: { 'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600` } },
  );
}

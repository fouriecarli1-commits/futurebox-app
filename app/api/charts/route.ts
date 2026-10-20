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
 * over the last thirty days, and **only songs their maker has put on the
 * radar**. That last clause is not a detail — see the note beside the query. It is honest, it is ours, and today it is small,
 * because the app has a handful of people on it. A chart that starts at three
 * songs and grows is worth more than a full one nobody can check — and the
 * screen says how many plays are behind each row, so nobody has to guess.
 *
 * **Apple Music's** sits beside it in its own bar and comes from its own
 * route, `/api/charts/apple`. It replaced Spotify's on 20 October 2026; see
 * `lib/server/applemusic.ts`. Neither is, or could be, a source for the AI
 * chart: nothing in their data says what was made with AI, so a "top 10 AI
 * music" built from it would be us deciding and putting their name on it.
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

export async function GET(): Promise<Response> {
  if (!metered()) {
    return Response.json({ configured: false, music: [], podcasts: [] });
  }

  const [playRows, podcastRows] = await Promise.all([topOf('play'), topOf('podcast')]);

  const client = admin();
  const music: ChartRow[] = [];
  const podcasts: ChartRow[] = [];

  if (client && playRows.length) {
    const ids = playRows.map((one) => String(one.ref ?? '')).filter(Boolean);
    /* Only songs their maker has put on the radar.
 
       Without this the chart is a hole rather than a chart. Plays are counted
       one per person per song per day, so somebody playing their own song
       once a day for a month reaches the top of it — and a song they never
       shared would be published with its title and their name against it.
       `shared` is the switch they already have, in the room where they turn
       it on one song at a time, and it is the same consent this app asks for
       everywhere else. A chart of four songs somebody chose to show beats a
       chart of ten they did not. */
    const { data: tracks } = await client
      .from('tracks')
      .select('id, title, owner')
      .eq('shared', true)
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
    { configured: true, music, podcasts, days: WINDOW_DAYS },
    { headers: { 'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600` } },
  );
}

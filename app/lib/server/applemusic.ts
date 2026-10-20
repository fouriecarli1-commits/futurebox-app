/**
 * Apple Music's own top 20, for the bar beside ours on Spotlight.
 *
 * The owner, 20 October 2026, asked whether the app was connected to Spotify
 * for the UK and US top 20 or should use another chart, and answered it
 * herself: *"Gebruik Apple Music vir die top 20 charts."*
 *
 * ── Why this one and not Spotify's ───────────────────────────────────────
 *
 * Spotify's chart sat behind a key pair and a search for their editorial
 * playlist, and Spotify stopped handing their own playlists to newly created
 * apps — so the bar was a code path that had never once run where it was
 * built, and as far as anybody could tell never appeared on her phone either.
 * Apple publish their charts as a plain feed for exactly this use: no key, no
 * account, nothing of anybody's sent, a link back to Apple Music on every row.
 *
 * ── What is read ─────────────────────────────────────────────────────────
 *
 * "Most played" songs, per country — Apple Music's daily Top 100, cut to the
 * first twenty. South Africa first because that is who the app is for, then
 * the UK and the US because those are the two she named.
 *
 * Kept for an hour by the platform's own fetch cache. The chart moves once a
 * day; asking Apple on every visit would be rude to them and slow for her.
 */

export type ChartCountry = 'za' | 'gb' | 'us';

export const CHART_COUNTRIES: readonly ChartCountry[] = ['za', 'gb', 'us'];

export interface AppleRow {
  /** The song on Apple Music. Every row opens there, never anywhere of ours. */
  readonly ref: string;
  readonly title: string;
  readonly by: string;
  /** Their cover, small. */
  readonly art: string;
  readonly explicit: boolean;
}

export interface AppleChart {
  readonly country: ChartCountry;
  readonly rows: AppleRow[];
  /** When Apple last moved it, as they wrote it. */
  readonly updated: string | null;
}

const HOW_MANY = 20;
const KEEP_SECONDS = 3600;

/* Two names for the same feed. Apple moved it from the first to the second
   and still answer on both; whichever answers first is used. */
const HOSTS = ['https://rss.marketingtools.apple.com', 'https://rss.applemarketingtools.com'];

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Only Apple's own pages and their own image host, whatever the feed says. */
const theirs = (value: string, host: RegExp): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && host.test(url.hostname) ? url.toString() : '';
  } catch {
    return '';
  }
};

function rowsOf(said: unknown): { rows: AppleRow[]; updated: string | null } {
  const feed = (said as { feed?: { results?: unknown; updated?: unknown } } | null)?.feed;
  const results = Array.isArray(feed?.results) ? feed.results : [];
  const rows: AppleRow[] = [];
  for (const one of results) {
    /* A feed is somebody else's text: an entry that is not an object is
       skipped, not read, so a broken feed is a shorter chart and not a crash. */
    if (!one || typeof one !== 'object' || Array.isArray(one)) continue;
    const song = one as Record<string, unknown>;
    const ref = theirs(text(song.url), /(^|\.)music\.apple\.com$/);
    const title = text(song.name);
    if (!ref || !title) continue;
    rows.push({
      ref,
      title,
      by: text(song.artistName),
      art: theirs(text(song.artworkUrl100), /(^|\.)mzstatic\.com$/),
      /* Apple's feed spells it "Explict". Matched on the stem, so their
         typo and its correction both count. */
      explicit: /^expli/i.test(text(song.contentAdvisoryRating)),
    });
    if (rows.length === HOW_MANY) break;
  }
  return { rows, updated: text(feed?.updated) || null };
}

/** One country's chart, or an empty one when Apple could not be reached. */
export async function appleChart(country: ChartCountry): Promise<AppleChart> {
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}/api/v2/${country}/music/most-played/${HOW_MANY}/songs.json`, {
        next: { revalidate: KEEP_SECONDS },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const { rows, updated } = rowsOf(await response.json());
      if (rows.length) return { country, rows, updated };
    } catch {
      // The other name, then the honest empty answer.
    }
  }
  return { country, rows: [], updated: null };
}

export { rowsOf as appleRowsOf };

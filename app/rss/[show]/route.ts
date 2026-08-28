/**
 * The feed. This is the thing that makes it a podcast.
 *
 * Apple Podcasts, Spotify, Pocket Casts and the rest do not integrate with
 * anything — they read an RSS file on a schedule, for years. So "link with
 * podcast platforms" is, in practice, one valid XML document at a stable
 * address, and everything else about publishing here exists to keep this
 * document correct.
 *
 * Which is why a few things elsewhere are the way they are: the audio bucket
 * is public because an expiring link is a show that stops working; the show's
 * slug is fixed at creation because it is in this URL and subscribers keep it;
 * and `bytes` is stored on every episode because `enclosure length` is
 * required and guessing it breaks players that trust it.
 */

import { admin } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** XML has five characters that cannot appear raw. Missing one breaks the feed. */
function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 822, which is what RSS requires and what players parse. */
function rfc822(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function hhmmss(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export async function GET(
  request: Request,
  { params }: { params: { show: string } },
): Promise<Response> {
  const client = admin();
  if (!client) return new Response('Not configured', { status: 503 });

  const { data: show } = await client.from('shows').select('*').eq('id', params.show).maybeSingle();
  if (!show) return new Response('No such show', { status: 404 });

  const { data: episodes } = await client
    .from('episodes')
    .select('*')
    .eq('show_id', show.id)
    .order('published_at', { ascending: false })
    .limit(300);

  const site = new URL(request.url).origin;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const audioUrl = (path: string) => `${base}/storage/v1/object/public/episodes/${path}`;

  const items = (episodes ?? [])
    .map((episode) => {
      // Said in the episode's own description, not only in our database. A
      // listener in a podcast app never sees this site, so a synthesised voice
      // has to declare itself where they actually are.
      const madeNote =
        episode.made === 'spoken'
          ? '\n\n(Read aloud by a cloned voice, from a script written by the host.)'
          : episode.made === 'cleaned'
            ? '\n\n(Recorded, with the room noise removed.)'
            : '';
      return `    <item>
      <title>${xml(episode.title)}</title>
      <description>${xml(episode.notes + madeNote)}</description>
      <guid isPermaLink="false">${xml(episode.id)}</guid>
      <pubDate>${rfc822(episode.published_at)}</pubDate>
      <enclosure url="${xml(audioUrl(episode.audio_path))}" length="${episode.bytes}" type="audio/mpeg"/>
      <itunes:duration>${hhmmss(episode.seconds)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
    })
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(show.title)}</title>
    <link>${xml(show.links?.website || site)}</link>
    <description>${xml(show.about)}</description>
    <language>${xml(show.language || 'en')}</language>
    <atom:link href="${xml(`${site}/rss/${show.id}`)}" rel="self" type="application/rss+xml"/>
    <itunes:author>${xml(show.author || show.title)}</itunes:author>
    <itunes:summary>${xml(show.about)}</itunes:summary>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Technology"/>
${show.image_url ? `    <itunes:image href="${xml(show.image_url)}"/>` : ''}
${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Podcast apps poll often; a few minutes of cache costs nothing and
      // spares the database a hit per listener per check.
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

/**
 * Apple Music's top 20 for South Africa, the UK and the US, in one answer.
 *
 * Not behind `metered()` like the chart beside it: ours is counted from
 * accounts this app holds, and with none set up there is nothing to count.
 * Apple's needs no account of ours at all, so it shows on a fresh install too.
 * See `lib/server/applemusic.ts` for why this replaced Spotify's.
 */

import { appleChart, CHART_COUNTRIES } from '@/app/lib/server/applemusic';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(): Promise<Response> {
  const charts = await Promise.all(CHART_COUNTRIES.map((country) => appleChart(country)));
  const reached = charts.some((one) => one.rows.length > 0);
  return Response.json(
    { charts },
    {
      /* An hour when it worked; a minute when it did not, so a blip at Apple
         is not an empty bar for the rest of the hour. */
      headers: {
        'Cache-Control': reached
          ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=7200'
          : 'public, max-age=0, s-maxage=60',
      },
    },
  );
}

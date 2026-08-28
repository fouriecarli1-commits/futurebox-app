/**
 * The counters.
 *
 * One query, cached for half a minute, shared by every page that shows a
 * number. When the database is not configured this answers 204 and the page
 * shows no counters at all — which is the honest outcome. A board of zeros
 * looks like a product nobody uses; an invented figure is worse than either.
 */

import { board } from '@/app/lib/server/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const data = await board();
  if (!data) return new Response(null, { status: 204 });
  return Response.json(data, {
    // The route's own cache decides freshness; this stops a CDN from serving a
    // much older copy than the one the route would have produced.
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' },
  });
}

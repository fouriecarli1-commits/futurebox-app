/**
 * How many people are on the site at this moment.
 *
 * `events` already counts visits, but a visit is something that happened
 * today. "Who is here now" is a different question and needs a different
 * shape: one row per browser, overwritten each time it says hello, counted
 * over the last two minutes.
 *
 * It holds nothing about anybody. The visitor id is the same random string the
 * event counters use — thirty-two hex characters the browser made up — and the
 * rows are swept within the hour.
 *
 * When there is no database this answers 204 and the page shows nothing. A
 * number nobody can stand behind is worse than no number, and "1 person here"
 * hard-coded is the worst of all.
 */

import { admin, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/** The same shape the events route insists on, for the same reason. */
const VISITOR = /^[0-9a-f]{32}$/;

async function count(): Promise<number | null> {
  const client = admin();
  if (!client) return null;
  const { data, error } = await client.rpc('here_now');
  if (error || typeof data !== 'number') return null;
  return data;
}

export async function GET(): Promise<Response> {
  if (!metered()) return new Response(null, { status: 204 });
  const here = await count();
  if (here === null) return new Response(null, { status: 204 });
  return Response.json({ here }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return new Response(null, { status: 204 });
  const client = admin();
  if (!client) return new Response(null, { status: 204 });

  let body: { visitor?: unknown };
  try {
    body = (await request.json()) as { visitor?: unknown };
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }
  const visitor = typeof body.visitor === 'string' ? body.visitor : '';
  if (!VISITOR.test(visitor)) {
    return Response.json({ message: 'That is not a visitor id.' }, { status: 400 });
  }

  await client.from('presence').upsert({ visitor, seen_at: new Date().toISOString() });
  // Cheap, and it keeps the table a number rather than a history. Failing to
  // sweep is not worth failing the request over.
  void client.rpc('presence_sweep').then(
    () => undefined,
    () => undefined,
  );

  const here = await count();
  if (here === null) return new Response(null, { status: 204 });
  return Response.json({ here }, { headers: { 'Cache-Control': 'no-store' } });
}

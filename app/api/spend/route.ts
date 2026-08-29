/**
 * What the engine has actually cost.
 *
 * The app has recorded every generation since metering went in — how long, of
 * what kind, on what day — and has never shown any of it. That gap is why the
 * only answer to "is ElevenLabs expensive" was a comparison of published rates
 * from the internet rather than a number out of this account.
 *
 * Nothing here is estimated. It counts rows and adds seconds. What it costs in
 * rand is the one thing this cannot know, because that depends on which plan
 * the owner is on — so the screen asks for the monthly bill and divides. A
 * number derived from what somebody actually pays beats a rate card.
 *
 * Owner only. It is a spending report.
 */

import { admin, callerFrom, callerIsOwner, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Row {
  kind: 'preview' | 'full';
  seconds: number;
  credits: number;
  created_at: string;
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ configured: false });
  const caller = await callerFrom(request);
  if (!callerIsOwner(caller)) {
    // Not 403: somebody who is not the owner has no business knowing this
    // panel exists, and the screen simply does not render it.
    return Response.json({ configured: true, isOwner: false });
  }

  const client = admin();
  if (!client) return Response.json({ configured: false });

  // A month back. Enough to answer "what did last month cost" without pulling
  // the whole table into memory on every load.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await client
    .from('generations')
    .select('kind, seconds, credits, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5_000);

  const rows = (data ?? []) as Row[];
  const totals = { previews: 0, songs: 0, previewSeconds: 0, songSeconds: 0, credits: 0 };
  rows.forEach((row) => {
    totals.credits += Number(row.credits) || 0;
    if (row.kind === 'preview') {
      totals.previews += 1;
      totals.previewSeconds += Number(row.seconds) || 0;
    } else {
      totals.songs += 1;
      totals.songSeconds += Number(row.seconds) || 0;
    }
  });

  // Per day, so a spike is visible rather than averaged away.
  const byDay = new Map<string, number>();
  rows.forEach((row) => {
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  });

  return Response.json({
    configured: true,
    isOwner: true,
    days: 30,
    totals,
    byDay: Array.from(byDay.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  });
}

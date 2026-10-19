/**
 * A report of something offensive: kept, and sent to the owner.
 *
 * Google Play asks that somebody who meets something offensive — made by the
 * AI, or posted by another member — can report it without leaving the app.
 * `lib/reports.ts` has the why and the list of reasons.
 *
 * Kept in `reports` (supabase/reports.sql) so nothing is lost if a letter
 * is, and mailed to the owner so a report is read the day it arrives. Either
 * one is enough to say "sent": a report that reached a person, by either
 * road, has done its job.
 *
 * Signed in or not. A person should not need an account to tell us something
 * on the site is harmful.
 *
 * GET is the owner's list of the open ones, behind the owner door.
 */
import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { refuseIfTooMany } from '@/app/lib/server/brake';
import { tellOwner } from '@/app/lib/server/email';
import { opened } from '@/app/lib/server/ownerdoor';
import { cleanReport, urgent, REPORT_REASONS } from '@/app/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('report', request, { perMinute: 5, perHour: 30 });
  if (flood) return flood;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }
  const report = cleanReport(raw);
  if (!report) return Response.json({ message: 'Pick what is wrong with it first.' }, { status: 400 });

  const caller = metered() ? await callerFrom(request) : null;
  let kept = false;
  const client = admin();
  /* Whose it is, looked up from the post itself: the browser only holds a
     `who` key (`server/who.ts`), and the owner needs the account to act. */
  let about = report.about;
  if (client && report.kind !== 'ai' && UUID.test(report.ref)) {
    const table = report.where === 'live-link' ? 'live_says' : 'live_posts';
    const { data } = await client.from(table).select('owner').eq('id', report.ref).maybeSingle();
    const owner = (data as { owner?: string } | null)?.owner;
    if (owner) about = owner;
  }
  if (client) {
    const { error } = await client.from('reports').insert({
      reporter: caller?.id ?? null,
      kind: report.kind,
      reason: report.reason,
      ref: report.ref,
      about,
      seen_in: report.where,
      note: report.note,
    });
    kept = !error;
  }

  const why = REPORT_REASONS.find((one) => one.id === report.reason)?.says[1] ?? report.reason;
  const told = await tellOwner(
    `${urgent(report) ? 'URGENT report' : 'Report'}: ${why}`,
    [
      `What: ${report.kind === 'ai' ? 'something the AI made' : report.kind === 'post' ? 'a member’s post' : 'a member'}`,
      `Why: ${why}`,
      `Where: ${report.where || '—'}`,
      `Item: ${report.ref || '—'}`,
      `Member reported: ${about ?? '—'}`,
      `Sent by: ${caller ? caller.id : 'somebody signed out'}`,
      '',
      report.note ? `Their note:\n${report.note}` : 'No note.',
      '',
      kept ? 'Kept in the reports table.' : 'NOT kept in the database — this letter is the only copy.',
    ].join('\n'),
    { kind: 'report' },
  ).catch(() => null);
  const mailed = told?.ok === true;

  if (!kept && !mailed) {
    return Response.json(
      { message: 'That could not be sent just now. Try again in a moment, or write to us from the help page.' },
      { status: 503 },
    );
  }
  return Response.json({ ok: true });
}

/** The open reports, newest first, the urgent ones on top. Owner only. */
export async function GET(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return Response.json({ reports: [] });
  const { data, error } = await client
    .from('reports')
    .select('id, kind, reason, ref, about, seen_in, note, created_at')
    .is('handled_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return Response.json({ reports: [], message: 'Run supabase/reports.sql to start keeping reports.' });
  const rows = data ?? [];
  return Response.json({
    reports: [...rows.filter((one) => urgent(one)), ...rows.filter((one) => !urgent(one))],
  });
}

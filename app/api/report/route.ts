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

/**
 * The owner acting on a report: `handled`, or `takedown`. Owner only.
 *
 * `takedown` is steps 2 and 3 of `docs/CHILD-SAFETY-REPORTING.md` in one
 * press, because those are the steps that have to happen in minutes and
 * were, until 26 October 2026, a row deleted by hand in the database:
 *
 *   - the post or the message comes out of the Live room (its row goes);
 *   - the account that posted it can no longer sign in (a ban on the auth
 *     user, which outlasts anything the app itself holds);
 *   - the song or episode BEHIND a post is not touched. It is the evidence,
 *     and deleting it can destroy the case. It stays where it is, and a
 *     suspended member's podcast feed stops answering (`app/rss/[show]`);
 *   - and a record goes to the owner's inbox: what the row said, whose it
 *     was, when, and what was done. That letter is step 6's record, and it
 *     carries the reminder of step 4, because the SAPS report is the one
 *     step no button can take.
 */
export async function PATCH(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return Response.json({ message: 'No database on this deployment.' }, { status: 503 });

  let raw: { id?: unknown; action?: unknown };
  try {
    raw = await request.json() as typeof raw;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }
  const id = Number(raw.id);
  const action = raw.action === 'takedown' ? 'takedown' : raw.action === 'handled' ? 'handled' : null;
  if (!Number.isInteger(id) || id <= 0 || !action) {
    return Response.json({ message: 'Say which report, and what to do with it.' }, { status: 400 });
  }

  const { data: found } = await client
    .from('reports')
    .select('id, kind, reason, ref, about, seen_in, note, created_at')
    .eq('id', id)
    .maybeSingle();
  const report = found as { id: number; kind: string; reason: string; ref: string; about: string | null; seen_in: string; note: string; created_at: string } | null;
  if (!report) return Response.json({ message: 'There is no such report.' }, { status: 404 });

  if (action === 'handled') {
    await client.from('reports').update({ handled_at: new Date().toISOString() }).eq('id', id);
    return Response.json({ ok: true, handled: true });
  }

  /* The post, written down before it goes. */
  let removed: Record<string, unknown> | null = null;
  if (report.kind !== 'ai' && UUID.test(report.ref)) {
    const table = report.seen_in === 'live-link' ? 'live_says' : 'live_posts';
    const { data: row } = await client.from(table).select('*').eq('id', report.ref).maybeSingle();
    if (row) {
      const { error } = await client.from(table).delete().eq('id', report.ref);
      if (!error) removed = { table, ...(row as Record<string, unknown>) };
    }
  }

  /* The account. A hundred years is how the auth service spells "until lifted". */
  let suspended = false;
  const whose = typeof removed?.owner === 'string' ? removed.owner : report.about;
  if (whose && UUID.test(whose)) {
    const { error } = await client.auth.admin.updateUserById(whose, { ban_duration: '876000h' });
    suspended = !error;
  }

  await client.from('reports').update({ handled_at: new Date().toISOString() }).eq('id', id);

  const why = REPORT_REASONS.find((one) => one.id === report.reason)?.says[1] ?? report.reason;
  const told = await tellOwner(
    `Taken down — report ${report.id}: ${why}`,
    [
      `Report ${report.id}, made ${report.created_at}, acted on ${new Date().toISOString()}.`,
      `Why it was reported: ${why}`,
      `Where: ${report.seen_in || '—'}`,
      '',
      removed
        ? `Removed from the Live room (${String(removed.table)}). What the row said:\n${JSON.stringify(removed, null, 2)}`
        : 'Nothing was removed: the report did not point at a post or a message that still exists.',
      '',
      suspended
        ? `The account ${whose} can no longer sign in. Lifting that is done from the Supabase dashboard (Authentication → the user → unban).`
        : 'No account was suspended: the report does not say whose it was.',
      '',
      'Nothing behind the post was deleted: the song or episode stays where it is, as evidence. A suspended member\'s podcast feed no longer answers.',
      '',
      'If this is child sexual abuse material: report it to the SAPS today (any police station, or Crime Stop 08600 10111),',
      'and to the Film and Publication Board. Do not download, copy or forward it. Keep this letter: it is the record.',
      'The full steps are in docs/CHILD-SAFETY-REPORTING.md.',
    ].join('\n'),
    { kind: 'report' },
  ).catch(() => null);

  return Response.json({ ok: true, removed: removed !== null, suspended, recorded: told?.ok === true });
}

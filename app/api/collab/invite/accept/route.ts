/**
 * Redeeming an invite: a link becomes a request from the person who sent it.
 *
 * ── One statement, on purpose ────────────────────────────────────────────
 *
 * Counting the use and making the request have to happen together. Apart, a
 * redemption that failed halfway either burns a use with no request behind
 * it, or makes a request the count never knew about — and two people
 * redeeming the last use at the same moment would both get one. So the whole
 * thing is `redeem_collab_invite` in `supabase/invites.sql`, which takes the
 * row's lock before it reads the count.
 *
 * ── What comes back ──────────────────────────────────────────────────────
 *
 * The reason, as a value rather than a sentence, because this screen is
 * translated and a server does not know which language somebody reads. The
 * five outcomes are: it worked, you already had a thread with them, the link
 * is used up, it has expired, or it was your own link.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });

  let value = '';
  try {
    value = String(((await request.json()) as { invite?: unknown }).invite ?? '');
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }
  // The shape the route hands out, checked before it reaches a query.
  if (!/^[0-9a-f]{64}$/i.test(value)) return Response.json({ code: 'unknown' }, { status: 404 });

  const { data, error } = await client.rpc('redeem_collab_invite', {
    p_token: value,
    p_who: caller.id,
  });
  if (error) {
    return Response.json(
      { message: 'Invites are not set up on this app yet. The owner needs to run supabase/invites.sql.' },
      { status: 503 },
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { collab: string | null; owner: string | null; note: string | null; problem: string | null }
    | null;
  const problem = row?.problem ?? 'unknown';
  if (problem && problem !== 'already') {
    return Response.json({ code: problem }, { status: problem === 'yourself' ? 400 : 404 });
  }

  /* Their name, so the screen can say who. Read after the redemption rather
     than before: until it succeeds there is nobody to name. */
  let from = '';
  if (row?.owner) {
    const { data: who } = await client
      .from('creators')
      .select('name')
      .eq('owner', row.owner)
      .maybeSingle();
    from = ((who as { name?: string } | null)?.name ?? '').trim();
  }

  return Response.json({
    code: problem === 'already' ? 'already' : 'asked',
    collab: row?.collab ?? null,
    from: from || 'Somebody on FutureBox',
  });
}

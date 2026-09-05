/**
 * A link that turns a stranger into a collaborator.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * The radar drafts an email to a podcast host or another maker, and that
 * email had nowhere to send them. The room only exists once two FutureBox
 * accounts have accepted each other, so a stranger reading it had to find the
 * app, sign up, work out a handle and ask — four steps between "yes,
 * interesting" and a conversation. A link is one.
 *
 * ── What the token is ────────────────────────────────────────────────────
 *
 * A bearer for exactly one thing: being asked to collaborate by the person
 * who made it. It reads nothing, writes nothing else, and names nobody until
 * it is redeemed. The worst somebody can do with a stolen link is end up with
 * a request they can decline.
 *
 * It is generated here rather than by a column default, because a default
 * would be the same generator for every row and this is the only secret in
 * the table. `randomUUID` twice, hyphens out: 256 bits from the platform's own
 * CSPRNG rather than a hand-rolled alphabet.
 *
 * ── GET tells the reader almost nothing ──────────────────────────────────
 *
 * Only whether the link is still good and who sent it, because "somebody
 * invited you" with no name is not something anybody should accept. Not the
 * note, not the uses left, not the expiry. A link is handed to strangers by
 * definition, so what it reveals to a stranger is the whole question.
 */

import { randomUUID } from 'node:crypto';
import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { SITE_URL } from '@/app/lib/brand';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Long enough for a slow reply, short enough that an old email is a dead one. */
const LASTS_DAYS = 30;

const NOT_SET_UP = {
  message: 'Invites are not set up on this app yet. The owner needs to run supabase/invites.sql.',
  ready: false,
};

function token(): string {
  return `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let note = '';
  try {
    note = String(((await request.json()) as { note?: unknown }).note ?? '').trim().slice(0, 300);
  } catch {
    // A body is optional: an invite with no reason on it is still an invite.
  }

  const value = token();
  const expires = new Date(Date.now() + LASTS_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client
    .from('collab_invites')
    .insert({ token: value, owner: caller.id, note, expires_at: expires });
  if (error) return Response.json(NOT_SET_UP, { status: 503 });

  return Response.json({
    url: `${SITE_URL}/?invite=${value}`,
    expiresAt: expires,
    days: LASTS_DAYS,
  });
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ good: false });
  const client = admin();
  if (!client) return Response.json({ good: false });

  const value = new URL(request.url).searchParams.get('invite') ?? '';
  if (!/^[0-9a-f]{64}$/i.test(value)) return Response.json({ good: false });

  const { data, error } = await client
    .from('collab_invites')
    .select('owner, uses, max_uses, expires_at')
    .eq('token', value)
    .maybeSingle();
  if (error) return Response.json({ good: false });

  const row = data as { owner: string; uses: number; max_uses: number; expires_at: string } | null;
  /* One answer for every way of being no good — expired, used up, never
     existed. Telling somebody which one tells them a link existed. */
  if (!row || row.uses >= row.max_uses || new Date(row.expires_at).getTime() < Date.now()) {
    return Response.json({ good: false });
  }

  const { data: who } = await client
    .from('creators')
    .select('name, handle')
    .eq('owner', row.owner)
    .maybeSingle();
  const named = who as { name?: string; handle?: string } | null;
  return Response.json({
    good: true,
    from: (named?.name ?? '').trim() || 'Somebody on FutureBox',
  });
}

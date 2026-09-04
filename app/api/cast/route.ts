/**
 * The cast, as rows.
 *
 * Reading and deleting could have been done straight from the browser — the
 * policies in `supabase/cast.sql` already scope every row to its owner. It
 * goes through here for the one thing a policy cannot express: a ceiling.
 * "At most twelve" is a count across the table at the moment of an insert,
 * and a limit only the browser enforces is not a limit.
 *
 * The other thing this is for is the path. Storage policies stop somebody
 * writing into another person's folder; nothing stops them *pointing a row*
 * at a file they do not own. The row is the claim, so the row is where the
 * claim is checked — the same rule as the avatar on `/api/creator`.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { ownedPath } from '@/app/lib/server/ownedpath';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Matches `lib/cast.ts`. Both, because neither alone is the limit. */
const LIMIT = 12;

const MAX_NAME = 60;
const MAX_NOTE = 400;

function clean(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ cast: [] });
  const caller = await callerFrom(request);
  const client = admin();
  if (!caller || !client) return Response.json({ cast: [] });

  const { data } = await client
    .from('cast_members')
    .select('id, name, note, path, created_at')
    .eq('owner', caller.id)
    .order('created_at', { ascending: false });

  return Response.json({ cast: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) {
    return Response.json({ error: 'not_configured', message: 'Accounts are not configured.' }, { status: 503 });
  }
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ error: 'signed_out', message: 'Sign in first.' }, { status: 401 });
  const client = admin();
  if (!client) {
    return Response.json({ error: 'not_configured', message: 'Storage is not configured.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : null;

  /* Editing somebody already there.

     Name and note only. A picture is never swapped under an existing member:
     the name is what people choose by, and quietly changing the face behind a
     name they trust is how the wrong person ends up in a paid-for clip. To
     change the picture, add a member and take the old one out. */
  if (id) {
    const fields: Record<string, string> = { updated_at: new Date().toISOString() };
    if ('name' in body) fields.name = clean(body.name, MAX_NAME);
    if ('note' in body) fields.note = clean(body.note, MAX_NOTE);

    const { error } = await client
      .from('cast_members')
      .update(fields)
      .eq('id', id)
      // Scoped as well as filtered. The service key bypasses row-level
      // security, so without this an id from another account would be edited.
      .eq('owner', caller.id);
    if (error) return Response.json({ error: 'failed', message: error.message }, { status: 500 });
    return Response.json({ saved: true });
  }

  const path = ownedPath(body.path, caller.id, 'webp');
  if (!path) return Response.json({ error: 'bad_path' }, { status: 400 });

  const { count } = await client
    .from('cast_members')
    .select('id', { count: 'exact', head: true })
    .eq('owner', caller.id);
  if ((count ?? 0) >= LIMIT) {
    return Response.json(
      { error: 'full', message: `A cast holds ${LIMIT}. Take somebody out first.` },
      { status: 409 },
    );
  }

  const { data, error } = await client
    .from('cast_members')
    .insert({
      owner: caller.id,
      name: clean(body.name, MAX_NAME),
      note: clean(body.note, MAX_NOTE),
      path,
    })
    .select('id, name, note, path, created_at')
    .single();

  if (error || !data) {
    return Response.json({ error: 'failed', message: error?.message ?? 'Could not save.' }, { status: 500 });
  }
  return Response.json({ member: data });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ error: 'not_configured' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ error: 'signed_out' }, { status: 401 });
  const client = admin();
  if (!client) return Response.json({ error: 'not_configured' }, { status: 503 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'bad_request' }, { status: 400 });

  const { error } = await client
    .from('cast_members')
    .delete()
    .eq('id', id)
    .eq('owner', caller.id);
  if (error) return Response.json({ error: 'failed', message: error.message }, { status: 500 });
  return Response.json({ removed: true });
}

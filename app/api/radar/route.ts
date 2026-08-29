/**
 * The songs people have chosen to show, and who made them.
 *
 * Only what a match is computed from: title, genre, tempo, key, the style
 * words. Not the audio. Somebody looking for a collaborator does not need the
 * file, and handing it over would be a licence question nobody agreed to.
 *
 * POST here turns sharing on or off for one of your own songs. Opt-in, one at
 * a time, and reversible — nothing on this app makes anything public by
 * default.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Enough to match against; more would be a page nobody scrolls. */
const LIMIT = 120;

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ configured: false, tracks: [] });
  const client = admin();
  if (!client) return Response.json({ configured: false, tracks: [] });

  // Who is asking, so their own songs can be left out of their own results.
  const caller = await callerFrom(request).catch(() => null);

  const { data: tracks } = await client
    .from('tracks')
    .select('id, owner, title, genre, bpm, song_key, style, models, created_at')
    .eq('shared', true)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  const rows = (tracks ?? []).filter((one) => !caller || one.owner !== caller.id);
  const owners = Array.from(new Set(rows.map((one) => one.owner)));

  const { data: creators } = owners.length
    ? await client.from('creators').select('owner, name, handle, about, links').in('owner', owners)
    : { data: [] };

  const byOwner = new Map((creators ?? []).map((one) => [one.owner, one]));

  // Which of the caller's own songs are already showing. Without this the
  // switches would render off on every load and the first click would turn
  // sharing *off* on a song that was already on.
  let mineShared: string[] = [];
  if (caller) {
    const { data: mine } = await client
      .from('tracks')
      .select('id')
      .eq('owner', caller.id)
      .eq('shared', true);
    mineShared = (mine ?? []).map((one) => one.id as string);
  }

  return Response.json({
    configured: true,
    mineShared,
    tracks: rows.map((one) => {
      const creator = byOwner.get(one.owner);
      return {
        id: one.id,
        title: one.title,
        genre: one.genre,
        bpm: one.bpm,
        key: one.song_key,
        style: one.style,
        models: one.models ?? [],
        // A song whose maker has not filled anything in still matches; it just
        // has nobody to write to yet, and the screen says so.
        creator: creator?.name || 'A creator',
        handle: creator?.handle ? `@${creator.handle}` : '',
        links: creator?.links ?? {},
      };
    }),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let body: { id?: unknown; shared?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  if (!id) return Response.json({ message: 'Which song?' }, { status: 400 });

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  // Scoped to the caller, so the id in the request cannot reach anybody else's
  // song even if it names one.
  const { error, count } = await client
    .from('tracks')
    .update({ shared: Boolean(body.shared) }, { count: 'exact' })
    .eq('id', id)
    .eq('owner', caller.id);

  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (!count) return Response.json({ message: 'That song is not on your account yet.' }, { status: 404 });
  return Response.json({ id, shared: Boolean(body.shared) });
}

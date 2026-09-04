/**
 * Who you are on the radar.
 *
 * A name, a handle and links out. Separate from a podcast show on purpose:
 * somebody can be looking for a collaborator without running one, and tying
 * the two together would mean making a show to be findable.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const LINK_KEYS = ['website', 'x', 'instagram', 'youtube', 'tiktok', 'facebook', 'soundcloud', 'spotify'];

function cleanLinks(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, string> = {};
  LINK_KEYS.forEach((key) => {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== 'string') return;
    const trimmed = value.trim().slice(0, 300);
    // These end up in an href on a page other people look at, so anything that
    // is not plainly http(s) — a javascript: URL, say — does not go in.
    if (/^https?:\/\//i.test(trimmed)) out[key] = trimmed;
  });
  return out;
}

/**
 * A path in the avatars bucket, or null.
 *
 * Checked against the caller's own id rather than merely sanitised. The
 * storage policies already stop somebody writing into another person's folder,
 * but nothing stops them *pointing their row* at a path they do not own — and
 * a profile that displays a file somebody else uploaded is somebody else's
 * face on a stranger's channel. The row is the claim, so the row is where the
 * claim is checked.
 */
function cleanAvatar(value: unknown, owner: string): string | null {
  if (typeof value !== 'string' || !value) return null;
  if (value.length > 200) return null;
  // <owner>/<digits>.webp, and nothing else — no traversal, no other folder.
  return new RegExp(`^${owner}/\\d+\\.webp$`).test(value) ? value : null;
}

/** Lower case, letters, digits, dots and underscores. It is shown as @handle. */
function cleanHandle(value: string, fallback: string): string {
  const made = value.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24);
  return made || fallback;
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ configured: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ configured: true, signedIn: false });

  const client = admin();
  if (!client) return Response.json({ configured: false });

  const { data } = await client.from('creators').select('*').eq('owner', caller.id).maybeSingle();
  return Response.json({ configured: true, signedIn: true, creator: data ?? null });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  /* A save that does not mention the picture must not remove it.

     `upsert` writes the whole row, so an absent field becomes null. Two
     different screens save this row — the collab profile form, which knows
     nothing about a photo, and the channel, which is where the photo is set —
     and without this the first would silently delete what the second did. The
     key being absent and the key being explicitly null are different things
     and are treated differently. */
  let avatar: string | null = null;
  if ('avatar_path' in body) {
    avatar = cleanAvatar(body.avatar_path, caller.id);
  } else {
    const { data: existing } = await client
      .from('creators')
      .select('avatar_path')
      .eq('owner', caller.id)
      .maybeSingle();
    avatar = (existing?.avatar_path as string | null) ?? null;
  }

  const row = {
    owner: caller.id,
    name: String(body.name ?? '').trim().slice(0, 80),
    handle: cleanHandle(String(body.handle ?? ''), caller.id.slice(0, 8)),
    about: String(body.about ?? '').trim().slice(0, 500),
    links: cleanLinks(body.links),
    avatar_path: avatar,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('creators').upsert(row);
  if (error) {
    // A taken handle is the one failure worth naming: it is fixable by the
    // person reading it, and "could not save" is not.
    const taken = error.message.toLowerCase().indexOf('duplicate') !== -1;
    return Response.json(
      { message: taken ? 'That handle is taken. Try another.' : error.message },
      { status: taken ? 409 : 500 },
    );
  }
  return Response.json({ creator: row });
}

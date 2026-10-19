/**
 * A member blocking a member: written to the account, so it follows them.
 *
 * Named by a post or a link they made, and answered with their `who` — the
 * key the feed carries for them — so the phone can hide every post of theirs
 * at once.
 *
 * The device keeps its own copy and acts on it at once (`lib/blocked.ts`);
 * this is the second phone. Signed in only, because a block belongs to
 * somebody — a signed-out block lives on the device and nowhere else.
 */
import { admin, callerFrom } from '@/app/lib/server/account';
import { refuseIfTooMany } from '@/app/lib/server/brake';
import { blockedList, MOST_BLOCKED } from '@/app/lib/reports';
import { blockedBy, whoOf } from '@/app/lib/server/who';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('block', request, { perMinute: 20, perHour: 200 });
  if (flood) return flood;
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });
  let body: { post?: unknown; said?: unknown; on?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }
  const client = admin();
  if (!client) return Response.json({ message: 'The database is not configured on this server.' }, { status: 503 });

  /* The member, from what they posted. The browser never holds an account
     id (`server/who.ts`), so it names the post and the server looks up whose
     it is. */
  const post = String(body.post ?? '');
  const said = String(body.said ?? '');
  const found = UUID.test(post)
    ? await client.from('live_posts').select('owner').eq('id', post).maybeSingle()
    : UUID.test(said)
      ? await client.from('live_says').select('owner').eq('id', said).maybeSingle()
      : null;
  const owner = (found?.data as { owner?: string } | null)?.owner ?? '';
  if (!UUID.test(owner) || owner === caller.id) {
    return Response.json({ message: 'That is not a member who can be blocked.' }, { status: 400 });
  }

  if (body.on === false) {
    const { error } = await client.from('blocks').delete().eq('blocker', caller.id).eq('blocked', owner);
    if (error) return Response.json({ message: 'That could not be saved.' }, { status: 500 });
    return Response.json({ ok: true, who: whoOf(owner) });
  }
  const { count } = await client.from('blocks').select('blocked', { count: 'exact', head: true }).eq('blocker', caller.id);
  if ((count ?? 0) >= MOST_BLOCKED) {
    return Response.json({ message: `${MOST_BLOCKED} is the most members one account can block.` }, { status: 400 });
  }
  const { error } = await client.from('blocks').upsert({ blocker: caller.id, blocked: owner });
  if (error) return Response.json({ message: 'That could not be saved.' }, { status: 500 });
  return Response.json({ ok: true, who: whoOf(owner) });
}

/** The caller's blocked list. */
export async function GET(request: Request): Promise<Response> {
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ blocked: [] });
  const client = admin();
  if (!client) return Response.json({ blocked: [] });
  const owners = await blockedBy(client, caller.id);
  return Response.json({ blocked: blockedList([...owners].map(whoOf)) });
}

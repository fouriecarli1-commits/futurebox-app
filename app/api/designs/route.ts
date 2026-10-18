/**
 * Photo templates the owner saves, for every member's photo editor.
 *
 * The owner, 16 October 2026: *"Hoe hou ons sulke cool templates? Moet ons dit
 * generate en oor tyd op bou?"* The app carries a starting set
 * (`lib/postdesigns.ts`); this is the set that grows — she makes a post she
 * likes and saves it as a template.
 *
 *   GET     a signed-in member reads the list, newest first.
 *   POST    the owner saves one. Behind `opened()` — her session or
 *           POST_SECRET — and held to `cleanDesign` first, the same function
 *           the room builds it with, so every row is one every room can draw.
 *           With `{ for: 'art' }` instead, it opens a signed upload for one
 *           picture from her device — a template's artwork — under a name
 *           the server chooses, in the public `designs` bucket.
 *   DELETE  the owner takes one out, and its artwork with it.
 *
 * `admin()` with no caller scope, on purpose, like the amp catalogue: one
 * list for everybody is what a set of templates is. `check:security` carries
 * the exemption with this reason. No photographs ever: a design's frames are
 * saved empty.
 */

import { admin, callerFrom, callerIsOwner, metered } from '@/app/lib/server/account';
import { opened } from '@/app/lib/server/ownerdoor';
import { ART_BUCKET, ART_PATH, cleanDesign } from '@/app/lib/postdesigns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Rows read for the list. Hundreds at most, never thousands. */
const MOST = 200;

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ ready: false, designs: [], owner: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ ready: true, signedIn: false, designs: [], owner: false }, { status: 401 });
  const client = admin();
  if (!client) return Response.json({ ready: false, designs: [], owner: false });
  const { data, error } = await client
    .from('post_designs')
    .select('id, design, created_at')
    .order('created_at', { ascending: false })
    .limit(MOST);
  if (error) {
    /* The migration not run is the one failure worth naming. */
    const notThere = error.code === '42P01';
    return Response.json({ ready: !notThere, designs: [], owner: callerIsOwner(caller) }, { status: notThere ? 503 : 500 });
  }
  /* Read back through the same check: a row edited by hand in the table is
     still a design every room can draw, or it is left out. */
  const designs = (data ?? []).flatMap((row) => {
    const clean = cleanDesign(row.design);
    return clean ? [{ ...clean, id: String(row.id), saved: true }] : [];
  });
  return Response.json({ ready: true, designs, owner: callerIsOwner(caller) });
}

export async function POST(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return Response.json({ error: 'not_configured', message: 'Accounts are not configured.' }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  /* ── One picture from her device, for a template's artwork ──
     A signed upload rather than the bytes through this route: Vercel's body
     ceiling is 4.5 MB and the picture goes straight to storage. The name is
     ours — a fresh id — so nothing she uploads can land on another file. */
  if ((body as { for?: unknown } | null)?.for === 'art') {
    const kind = (body as { type?: unknown }).type;
    const ext = kind === 'image/png' ? 'png' : kind === 'image/jpeg' ? 'jpg' : 'webp';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { data, error } = await client.storage.from(ART_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      return Response.json({ error: 'no_upload', message: 'The templates bucket is not there yet: run supabase/designs.sql.' }, { status: 503 });
    }
    return Response.json({ path, token: data.token });
  }

  const design = cleanDesign(body);
  if (!design) {
    return Response.json({ error: 'not_a_design', message: 'That is not a template this app can draw: it needs a name, a category and a shape.' }, { status: 422 });
  }
  if (!design.art && !design.slots.length && !design.words.length && !design.marks.length) {
    return Response.json({ error: 'empty', message: 'There is nothing on that post to keep as a template yet.' }, { status: 422 });
  }
  const caller = await callerFrom(request);
  const { data, error } = await client
    .from('post_designs')
    .insert({
      name_en: design.en,
      name_af: design.af,
      category: design.category,
      design,
      added_by: caller?.id ?? null,
    })
    .select('id')
    .single();
  if (error) {
    const notThere = error.code === '42P01';
    return Response.json(
      { error: notThere ? 'not_ready' : 'failed', message: notThere ? 'The templates table is not there yet: run supabase/designs.sql.' : 'That could not be saved just now.' },
      { status: notThere ? 503 : 500 },
    );
  }
  return Response.json({ ok: true, id: data?.id });
}

export async function DELETE(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return Response.json({ error: 'not_configured' }, { status: 503 });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
  /* The artwork goes with the template, so the bucket holds nothing nobody uses. */
  const { data: row } = await client.from('post_designs').select('design').eq('id', id).maybeSingle();
  const { error } = await client.from('post_designs').delete().eq('id', id);
  if (error) return Response.json({ error: 'failed' }, { status: 500 });
  const art = (row?.design as { art?: unknown } | null)?.art;
  if (typeof art === 'string' && ART_PATH.test(art)) await client.storage.from(ART_BUCKET).remove([art]);
  return Response.json({ ok: true });
}

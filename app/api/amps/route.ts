/**
 * The amp catalogue — captures she chose, for members to search.
 *
 * ── Whose idea, and what it replaced ─────────────────────────────────────
 *
 * The owner, 11 October 2026: *"Ek wil die amps manually oplaai, dan word dit 'n
 * katelogus waarna mense in ons app kan soek. Dit moet alles in ons sisteem
 * en databasis wees. Ons kan nie deur hulle website werk nie, want dit werk
 * nie."*
 *
 * The booth's "Browse TONE3000" went out through their OAuth door and came
 * back with one capture for one person, and on her phone it did not come
 * back at all. This is the other shape: she downloads a capture herself,
 * puts it here once with the maker's name and the licence, and every member
 * finds it in the booth. Nothing leaves the app.
 *
 * ── Three answers, three doors ───────────────────────────────────────────
 *
 *   GET     a signed-in member searches. The list never carries the capture
 *           itself — names, makers and licences — and `?id=` fetches one
 *           row's capture on its own, because the list is read on every
 *           keystroke and must stay light while the capture is a megabyte
 *           of weights read once.
 *   POST    the owner adds one. Behind `opened()` — her session or the
 *           POST_SECRET, nothing else — and refused outright for a licence
 *           we may not pass on, which is the whole of the legal risk in one
 *           field. See `mayBeShared`.
 *   DELETE  the owner takes one out.
 *
 * `admin()` with no caller scope, on purpose: the catalogue is one list for
 * everybody, which is what a catalogue is. `check:security` carries the
 * exemption with this reason.
 *
 * ── What the server does not prove ───────────────────────────────────────
 *
 * Whether the capture loads. The engine is the browser's, and the owner's
 * upload form runs `loads()` on the file before it is sent — the same
 * engine, the same rule as the shelf: run it first, keep it only once it
 * worked. The server holds the shape (JSON, an architecture, weights) and
 * the size, so a text file renamed `.nam` is refused here as well.
 */

import { admin, callerFrom, callerIsOwner, metered } from '@/app/lib/server/account';
import { opened } from '@/app/lib/server/ownerdoor';
import { mayBeShared, SHAREABLE } from '@/app/lib/amplicence';
import { LISTABLE, mayList, originRefusal } from '@/app/lib/ampsource';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Vercel's body ceiling is 4.5 MB; a real capture is usually under one. */
export const NAM_MAX_BYTES = 4 * 1024 * 1024;
/** Rows shown for one search. */
const MOST = 60;
/* Rows read for one search. The catalogue is hundreds of captures, not
   millions, and the search is done here in plain code rather than as an
   interpolated PostgREST filter — a member's own text never reaches a
   query string, which is the rule check:security holds on interpolated filters. */
const READ = 400;

const LISTED = 'id, name, maker, licence, source, gear, tone, bytes, created_at, origin, permission' as const;

function clean(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ ready: false, amps: [], owner: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ ready: true, signedIn: false, amps: [], owner: false }, { status: 401 });
  const client = admin();
  if (!client) return Response.json({ ready: false, amps: [], owner: false });

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  if (id) {
    if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
    const { data, error } = await client
      .from('amp_catalogue')
      .select('id, name, maker, licence, source, nam, origin')
      .eq('id', id)
      .maybeSingle();
    if (error) return Response.json({ error: 'failed' }, { status: 500 });
    /* Not said where it came from: not for members (`lib/ampsource.ts`). */
    if (!data || (!mayList(data.origin) && !callerIsOwner(caller))) {
      return Response.json({ error: 'gone', message: 'That capture is not in the catalogue any more.' }, { status: 404 });
    }
    return Response.json({ amp: data });
  }

  const q = clean(url.searchParams.get('q'), 60).toLowerCase();
  const { data, error } = await client
    .from('amp_catalogue')
    .select(LISTED)
    .order('created_at', { ascending: false })
    .limit(READ);
  if (error) {
    /* The table not being there is the one failure worth naming: the
       migration not run reads otherwise as an empty catalogue, which is
       the cast fault again. */
    /* 42703 is a column that is not there: `supabase/amps.sql` gained
       `origin` on 27 October and has not been run again yet. */
    const notThere = error.code === '42P01' || error.code === '42703';
    return Response.json({ ready: !notThere, amps: [], owner: callerIsOwner(caller) }, { status: notThere ? 503 : 500 });
  }
  const isOwner = callerIsOwner(caller);
  const amps = (data ?? [])
    /* Members see only captures that say where they came from; the owner
       sees all of them, the unmarked ones flagged, so she can mark them. */
    .filter((row) => isOwner || mayList(row.origin))
    .filter((row) => !q || [row.name, row.maker, row.gear, row.tone].some((field) => (field ?? '').toLowerCase().includes(q)))
    .slice(0, MOST);
  return Response.json({ ready: true, amps: isOwner ? amps : amps.map(({ permission: _note, ...row }) => row), owner: isOwner });
}

/** The shape every capture has, whatever its architecture. */
function looksLikeCapture(nam: string): boolean {
  try {
    const model = JSON.parse(nam) as { architecture?: unknown; weights?: unknown };
    return typeof model.architecture === 'string' && Array.isArray(model.weights) && model.weights.length > 0;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return Response.json({ error: 'not_configured', message: 'Accounts are not configured.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const licence = clean(body.licence, 20);
  if (!mayBeShared(licence)) {
    return Response.json(
      {
        error: 'licence',
        message: `That licence does not allow the capture to be passed on. The catalogue takes ${SHAREABLE.join(', ')}.`,
      },
      { status: 422 },
    );
  }
  const nam = typeof body.nam === 'string' ? body.nam : '';
  const bytes = Buffer.byteLength(nam, 'utf8');
  if (!nam || bytes > NAM_MAX_BYTES || !looksLikeCapture(nam)) {
    return Response.json({ error: 'capture', message: 'That is not a capture this engine can read, or it is over 4 MB.' }, { status: 422 });
  }
  const origin = clean(body.origin, 20);
  const permission = clean(body.permission, 300);
  const source = clean(body.source, 300);
  const refused = originRefusal(origin, source, permission);
  if (refused) return Response.json({ error: 'origin', message: refused }, { status: 422 });
  const name = clean(body.name, 80);
  const maker = clean(body.maker, 80);
  if (!name || !maker) {
    return Response.json({ error: 'fields', message: 'A name and the maker are both needed — the credit names the maker.' }, { status: 422 });
  }

  const caller = door.as === 'owner' ? await callerFrom(request) : null;
  const { data, error } = await client
    .from('amp_catalogue')
    .insert({
      name,
      maker,
      licence,
      source,
      origin,
      permission: origin === 'permission' ? permission : '',
      gear: clean(body.gear, 30),
      tone: clean(body.tone, 30),
      bytes,
      nam,
      added_by: caller?.id ?? null,
    })
    .select(LISTED)
    .single();
  if (error || !data) {
    console.error(`amps: a capture could not be added — ${error?.message ?? 'no row came back'}`);
    const notThere = error?.code === '42P01';
    return Response.json(
      { error: notThere ? 'not_set_up' : 'failed', message: notThere ? 'The catalogue table is not there yet — run supabase/amps.sql.' : 'That could not be saved just now.' },
      { status: notThere ? 503 : 500 },
    );
  }
  return Response.json({ amp: data });
}

/** The owner marks where one already in the catalogue came from. */
export async function PATCH(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return Response.json({ error: 'not_configured' }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const id = clean(body.id, 40);
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
  const { data: row } = await client.from('amp_catalogue').select('source').eq('id', id).maybeSingle();
  if (!row) return Response.json({ error: 'gone' }, { status: 404 });
  const origin = clean(body.origin, 20);
  const permission = clean(body.permission, 300);
  const refused = originRefusal(origin, row.source ?? '', permission);
  if (refused) return Response.json({ error: 'origin', message: refused }, { status: 422 });
  const { error } = await client
    .from('amp_catalogue')
    .update({ origin, permission: origin === 'permission' ? permission : '' })
    .eq('id', id);
  if (error) return Response.json({ error: 'failed' }, { status: 500 });
  return Response.json({ marked: true, listed: (LISTABLE as readonly string[]).includes(origin) });
}

export async function DELETE(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;
  const client = admin();
  if (!client) return Response.json({ error: 'not_configured' }, { status: 503 });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
  const { error } = await client.from('amp_catalogue').delete().eq('id', id);
  if (error) return Response.json({ error: 'failed' }, { status: 500 });
  return Response.json({ removed: true });
}

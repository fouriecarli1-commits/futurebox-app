/**
 * A video you filmed yourself, kept where the rest of your work is kept.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"die video nie in die channel save nie, sodat
 * dit later in die live channel gedeel kan word nie."*
 *
 * A take filmed against the words on screen was offered exactly one thing:
 * Download. It went into the phone's files and out of this app's knowledge,
 * so the room could not post it, the channel could not show it, and a second
 * device had never heard of it. A generated video is kept — fetched from the
 * engine, put in our own bucket, and rowed in `videos` — and a filmed one was
 * not, for no better reason than that nothing had asked for it.
 *
 * ── Why the file does not come through here ──────────────────────────────
 *
 * A minute of 1080p is tens of megabytes and the platform refuses a request
 * body over about four and a half, at the edge, before this function runs —
 * see `lib/workfile.ts` for the same wall in the audio path. So the browser
 * uploads the file straight into the `videos` bucket with its own signed-in
 * session, and hands this route the key.
 *
 * `livevideo.sql` grants that write, and grants it narrowly: only inside
 * `<own id>/filmed/`, so it cannot land on `<own id>/<video id>.mp4`, where a
 * paid render lives. The row is still written here, with the service key,
 * exactly as `video.sql` intended — "a browser that could insert its own row
 * could grant itself a video". A filmed take grants nothing: no credits are
 * charged, none are refunded, `source` says where it came from, and the
 * monthly engine spend counts `kling_credits`, which is zero on these.
 *
 * ── What is checked ──────────────────────────────────────────────────────
 *
 * That the key is the caller's own `filmed/` folder, in shape, before it is
 * stored — a bad path saved now is a bad path signed later, by code with no
 * idea the value came from a browser. And that the object is actually there:
 * a row pointing at nothing is a video in a list that plays as an error, and
 * it is one HEAD to rule out.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { guard } from '@/app/lib/server/safety';

/** A filmed take's key, or null. Never a repaired string — see `ownedpath`. */
export function filmedPath(value: unknown, owner: string): string | null {
  if (typeof value !== 'string' || !value || value.length > 200) return null;
  if (!/^[0-9a-f-]{36}$/i.test(owner)) return null;
  return new RegExp(`^${owner}/filmed/[A-Za-z0-9-]{1,64}\\.(mp4|webm)$`).test(value) ? value : null;
}

/** Long enough to watch a take through; short enough that a leaked link dies. */
const LINK_SECONDS = 60 * 60;

/** The shapes the video desk offers. Anything else is not from this app. */
const ASPECTS = ['9:16', '16:9', '1:1'];

/** Everything of yours that could go in the room. */
export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ videos: [], signedIn: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ videos: [], signedIn: false }, { status: 401 });
  const client = admin();
  if (!client) return Response.json({ videos: [], signedIn: true }, { status: 503 });

  const { data } = await client
    .from('videos')
    .select('id, title, prompt, seconds, seconds_real, source, created_at, path')
    .eq('owner', caller.id)
    .eq('status', 'done')
    .not('path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(60);

  return Response.json({
    signedIn: true,
    videos: (data ?? []).map((one) => ({
      id: one.id as string,
      /* The name a person gave it, and the prompt only as a fallback. A
         generated video has no title of its own and its prompt is the nearest
         thing to one; a filmed take has a title and its prompt is empty. */
      title: String(one.title || one.prompt || '').slice(0, 120),
      seconds: Number(one.seconds_real || one.seconds || 0),
      filmed: one.source === 'filmed',
      createdAt: String(one.created_at ?? ''),
    })),
  });
}

/** Keep a take that was just filmed. The file is already in the bucket. */
export async function POST(request: Request): Promise<Response> {
  let body: { path?: unknown; title?: unknown; seconds?: unknown; source?: unknown; aspect?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });
  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const path = filmedPath(body.path, caller.id);
  if (!path) return Response.json({ message: 'That is not a file of yours.' }, { status: 400 });

  const title = String(body.title ?? '').trim().slice(0, 120) || 'Take';
  /* A title is a line of somebody's writing that other people will read the
     moment it is posted, so it goes through the same gate as a post's. Done
     here rather than at posting time: a name screened once, where it is set,
     cannot be set past the gate and posted later. */
  const allowed = await guard(request, title, 'room', caller);
  if (!allowed.ok) return allowed.response;

  /* It has to actually be there. Listing the one key is the cheapest way to
     ask: `createSignedUrl` on a missing object succeeds in some versions and
     hands back a link that 404s when somebody presses play. */
  const folder = path.slice(0, path.lastIndexOf('/'));
  const name = path.slice(path.lastIndexOf('/') + 1);
  const { data: there } = await client.storage.from('videos').list(folder, { search: name, limit: 1 });
  if (!there?.some((one) => one.name === name)) {
    return Response.json({ message: 'That take did not finish uploading. Try keeping it again.' }, { status: 404 });
  }

  const { data, error } = await client
    .from('videos')
    .insert({
      owner: caller.id,
      /* Nothing asked an engine for this, so there is no task and no prompt.
         `prompt` is `not null`, so it is empty rather than absent — the two
         read differently in a list, and empty is the true one. */
      prompt: '',
      title,
      /* ── Filmed, or made here and stitched ─────────────────────────────
 
         This said `'filmed'` flat, because a camera take was the only thing
         that ever reached this route. A music video is the other one: the
         engine hands back a silent clip, `lib/stitch.ts` lays the song under
         it in the browser, and what comes out is a NEW blob the server has
         never seen. Nothing uploaded it, so no row existed, so the live
         room's list — which reads this table — had nothing to offer.
 
         Carli, 16 September: "die music video werk nie in die live nie."
 
         The value matters beyond bookkeeping: the room labels a post
         "filmed" or "generated" off this column, and a stitched clip is
         somebody's face in neither sense. Anything that is not the literal
         string `filmed` is treated as made. */
      source: body.source === 'filmed' ? 'filmed' : 'made',
      status: 'done',
      path,
      /* Recorded rather than measured: this route never sees the file, and a
         number it guessed would be a number somebody later trusted.
 
         It was hard-coded to 9:16 because `FollowWords` asks the camera for
         that and takes were all this route kept. A music video is whatever
         shape the desk was set to, and a 16:9 clip filed as 9:16 is a clip
         the room draws in the wrong box. Checked against the three the desk
         offers rather than taken on trust. */
      aspect: ASPECTS.includes(String(body.aspect)) ? String(body.aspect) : '9:16',
      seconds: 0,
      seconds_real: Math.max(0, Math.min(3600, Math.round(Number(body.seconds) || 0))),
      credits: 0,
      kling_credits: 0,
      finished_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    return Response.json(
      { message: 'The take could not be kept. Run supabase/livevideo.sql if this is a new project.' },
      { status: 503 },
    );
  }

  const { data: signed } = await client.storage.from('videos').createSignedUrl(path, LINK_SECONDS);
  return Response.json({ ok: true, id: data.id, url: signed?.signedUrl ?? null });
}

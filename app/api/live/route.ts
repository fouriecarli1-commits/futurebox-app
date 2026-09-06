/**
 * The live channel: one room, everybody in it.
 *
 * People put a song in, other people listen to each other's, and you can see
 * who is in there with you. One room rather than a room each, on purpose — a
 * channel with four people in it is a place; forty rooms with one person in
 * each is nobody.
 *
 * It also carries the other kind of live. This app has no media server: it
 * cannot take a microphone or a camera to an audience, and a "Go live" button
 * that quietly did nothing would be the worst thing on the site. What it can
 * do honestly is say when and where — a time, a platform and a link — so the
 * room counts down and everybody follows to wherever the broadcast really is.
 *
 * ── The one decision this route exists to make ───────────────────────────
 *
 * Songs live in the `tracks` bucket, which is **private**: the storage policy
 * only lets an account read files under its own id. That is right, and it is
 * also why a live channel cannot be built in the browser. Somebody listening
 * to your song is reading a file they have no permission to read.
 *
 * So the server signs it, briefly, and only for a song that has actually been
 * posted. Nothing is copied: a public bucket would leave a second copy of
 * somebody's master at a guessable address forever, and posting to a room is
 * not the same as publishing a file. The link expires; the post is what grants
 * it, and deleting the post takes the grant away.
 *
 * A published episode needs none of this — its bucket is already public,
 * because podcast apps do not sign in.
 *
 * See `supabase/live.sql`, which says the rest.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { guard } from '@/app/lib/server/safety';
import { episodeAudioUrl } from '@/app/lib/episodeaudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Long enough to listen to a song, short enough not to be a public address. */
const LINK_SECONDS = 60 * 60;
/** How much of the room is worth loading at once. */
const POSTS = 40;
const SAYS = 60;

const NOT_SET_UP = {
  ready: false,
  /* A code beside the sentence, so the room can say this in the reader's own
     language — see `lib/apierror.ts`. Without one the component prints the
     server's English straight out, which is how an otherwise Afrikaans room
     answers in English at the only moment somebody is reading it closely. */
  error: 'live_not_set_up',
  message: 'The live channel is not set up on this app yet. The owner needs to run supabase/live.sql.',
  posts: [],
  says: [],
  here: 0,
};

interface PostRow {
  id: string;
  owner: string;
  kind: 'track' | 'episode' | 'elsewhere';
  source_id: string;
  title: string;
  note: string;
  seconds: number;
  platform: string;
  link: string;
  starts_at: string | null;
  created_at: string;
}

/** Where a track's audio sits, which is the shape `pushTrack` writes. */
const trackPath = (owner: string, trackId: string) => `${owner}/${trackId}.wav`;

export async function GET(request: Request): Promise<Response> {
  const client = admin();
  if (!client) {
    return Response.json({ ...NOT_SET_UP, error: 'no_accounts', message: 'This app has no accounts, so there is no room.' }, { status: 503 });
  }

  const caller = await callerFrom(request);

  const { data: posts, error } = await client
    .from('live_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(POSTS);
  if (error) return Response.json(NOT_SET_UP, { status: 503 });

  const { data: says, error: saysError } = await client
    .from('live_says')
    .select('id, owner, body, created_at')
    .order('created_at', { ascending: false })
    .limit(SAYS);
  if (saysError) return Response.json(NOT_SET_UP, { status: 503 });

  const { data: here } = await client.rpc('live_room_count');

  // Names, so the room is people rather than uuids. Read once for everybody
  // mentioned, not once per row.
  const owners = Array.from(
    new Set([...(posts ?? []).map((p) => p.owner), ...(says ?? []).map((s) => s.owner)]),
  );
  const names = new Map<string, string>();
  if (owners.length) {
    const { data: who } = await client.from('creators').select('owner, handle, name').in('owner', owners);
    for (const one of who ?? []) {
      /* The recording name if there is one, the handle otherwise.

         A handle is an address and a name is what goes on a release. Beside a
         song title in a room full of listeners, the address is the wrong one
         of the two — nobody introduces a track as "@anrefourie". */
      const named = ((one.name as string) ?? '').trim();
      const handle = ((one.handle as string) ?? '').trim();
      names.set(one.owner as string, named || handle);
    }
  }

  // An episode post carries the episode's id, like every other `source_id` in
  // this app. Its file is at a different name, so the paths are looked up in
  // one query rather than the column being made to mean two different things
  // depending on `kind` — which is the sort of subtlety that is fine until the
  // day somebody reads the column and believes it.
  const episodeIds = ((posts ?? []) as PostRow[])
    .filter((post) => post.kind === 'episode')
    .map((post) => post.source_id);
  const episodePaths = new Map<string, string>();
  if (episodeIds.length) {
    const { data: files } = await client.from('episodes').select('id, audio_path').in('id', episodeIds);
    for (const one of files ?? []) episodePaths.set(one.id as string, one.audio_path as string);
  }

  // The signing. Only for posts that exist, and only for as long as a listen.
  const listed = await Promise.all(
    ((posts ?? []) as PostRow[]).map(async (post) => {
      let audio: string | null = null;
      if (post.kind === 'episode') {
        const path = episodePaths.get(post.source_id);
        // Deleted since it was posted. Null rather than an address that 404s,
        // so the room can say the episode is gone instead of drawing a player
        // that does nothing.
        audio = path ? episodeAudioUrl(path) : null;
      } else if (post.kind === 'track') {
        const { data } = await client.storage
          .from('tracks')
          .createSignedUrl(trackPath(post.owner, post.source_id), LINK_SECONDS);
        audio = data?.signedUrl ?? null;
      }
      return {
        id: post.id,
        kind: post.kind,
        title: post.title,
        note: post.note,
        seconds: post.seconds,
        platform: post.platform,
        link: post.link,
        startsAt: post.starts_at,
        at: post.created_at,
        by: names.get(post.owner) || 'someone',
        mine: caller ? post.owner === caller.id : false,
        audio,
        /* The song behind the post, on a track post only.
 
           The charts on Spotlight are keyed on the song, not on the post, so
           the same song put in the room four times is one row rather than
           four. Sent only for `track` because an episode's id belongs to a
           different table and an `elsewhere` post has no song at all. */
        sourceId: post.kind === 'track' ? post.source_id : undefined,
      };
    }),
  );

  return Response.json({
    ready: true,
    signedIn: Boolean(caller),
    here: typeof here === 'number' ? here : Number(here ?? 0),
    posts: listed,
    says: ((says ?? []) as { id: string; owner: string; body: string; created_at: string }[])
      .map((one) => ({
        id: one.id,
        body: one.body,
        at: one.created_at,
        by: names.get(one.owner) || 'someone',
        mine: caller ? one.owner === caller.id : false,
      }))
      .reverse(),
  });
}

/**
 * Say hello, put a song in, say something, or announce a broadcast.
 *
 * Four things through one route because they are one screen and three of them
 * are two lines each. `what` says which.
 */
export async function POST(request: Request): Promise<Response> {
  let body: {
    what?: 'hello' | 'post' | 'say' | 'elsewhere';
    visitor?: string;
    kind?: 'track' | 'episode';
    sourceId?: string;
    title?: string;
    note?: string;
    seconds?: number;
    platform?: string;
    link?: string;
    startsAt?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const client = admin();
  if (!client) return Response.json({ error: 'no_accounts', message: 'This app has no accounts, so there is no room.' }, { status: 503 });

  const caller = await callerFrom(request);

  // ── Hello: being in the room needs no account ──────────────────────────
  // Somebody who has not signed in can listen and be counted. They cannot
  // post, which is checked below rather than here.
  if (body.what === 'hello') {
    const visitor = String(body.visitor ?? '').slice(0, 64);
    if (!/^[a-f0-9]{8,64}$/i.test(visitor)) {
      return Response.json({ message: 'No visitor id.' }, { status: 400 });
    }
    const { data, error } = await client.rpc('live_hello', {
      p_visitor: visitor,
      p_owner: caller?.id ?? null,
      p_name: caller?.email?.split('@')[0]?.slice(0, 40) ?? '',
    });
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    return Response.json({ here: typeof data === 'number' ? data : Number(data ?? 0) });
  }

  // ── Everything else needs an account ───────────────────────────────────
  if (metered() && !caller) {
    return Response.json(
      { message: 'Sign in to post in the room — listening needs no account, posting does.', signedIn: false },
      { status: 401 },
    );
  }
  if (!caller) return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });

  if (body.what === 'say') {
    const text = String(body.note ?? body.title ?? '').trim();
    if (!text) return Response.json({ message: 'Nothing to say.' }, { status: 400 });
    if (text.length > 500) {
      return Response.json({ message: 'That is longer than the room takes.' }, { status: 400 });
    }

    // Screened before anybody else reads it. This is the one surface where the
    // audience is people rather than a model, and a room is exactly where the
    // rules stop being about generation and start being about each other.
    const allowed = await guard(request, text, 'room', caller);
    if (!allowed.ok) return allowed.response;

    const { error } = await client.from('live_says').insert({ owner: caller.id, body: text });
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    return Response.json({ ok: true });
  }

  const title = String(body.title ?? '').trim().slice(0, 200);
  if (!title) return Response.json({ message: 'Give it a name.' }, { status: 400 });
  const note = String(body.note ?? '').trim().slice(0, 500);

  const allowed = await guard(request, `${title}\n${note}`, 'room', caller);
  if (!allowed.ok) return allowed.response;

  if (body.what === 'elsewhere') {
    const platform = String(body.platform ?? '').trim().slice(0, 40);
    const link = String(body.link ?? '').trim().slice(0, 500);
    // A link the room will offer to follow. Only the two schemes a browser
    // should ever be handed — `javascript:` in an href is the oldest trick
    // there is, and this one is typed by a person and read by everybody.
    if (link && !/^https:\/\/[^\s]+$/i.test(link)) {
      return Response.json({ message: 'That link has to be an https address.' }, { status: 400 });
    }
    const startsAt = String(body.startsAt ?? '');
    const when = startsAt ? new Date(startsAt) : null;
    if (when && Number.isNaN(when.getTime())) {
      return Response.json({ message: 'That is not a time.' }, { status: 400 });
    }
    const { error } = await client.from('live_posts').insert({
      owner: caller.id,
      kind: 'elsewhere',
      title,
      note,
      platform,
      link,
      starts_at: when ? when.toISOString() : null,
    });
    if (error) return Response.json(NOT_SET_UP, { status: 503 });
    return Response.json({ ok: true });
  }

  // ── A song, or an episode ──────────────────────────────────────────────
  const kind = body.kind === 'episode' ? 'episode' : 'track';
  const sourceId = String(body.sourceId ?? '').trim().slice(0, 200);
  if (!sourceId) return Response.json({ message: 'Which song?' }, { status: 400 });

  // It has to be theirs, and it has to actually be there. Posting an id that
  // is not yours would have the server sign a path under your own folder that
  // does not exist — a post nobody can play, and a listener who thinks the
  // channel is broken.
  if (kind === 'track') {
    const { data } = await client.from('tracks').select('id').eq('owner', caller.id).eq('id', sourceId).maybeSingle();
    if (!data) {
      return Response.json(
        { message: 'That song is not in your account yet. Songs are posted from the channel once they have synced.' },
        { status: 404 },
      );
    }
  } else {
    const { data } = await client
      .from('episodes')
      .select('audio_path')
      .eq('owner', caller.id)
      .eq('id', sourceId)
      .maybeSingle();
    if (!data) return Response.json({ message: 'That episode is not yours.' }, { status: 404 });
  }

  const { error } = await client.from('live_posts').insert({
    owner: caller.id,
    kind,
    source_id: sourceId,
    title,
    note,
    seconds: Math.max(0, Math.round(Number(body.seconds) || 0)),
  });
  if (error) return Response.json(NOT_SET_UP, { status: 503 });
  return Response.json({ ok: true });
}

/** Take your own post out of the room. Only your own. */
export async function DELETE(request: Request): Promise<Response> {
  const client = admin();
  if (!client) return Response.json({ message: 'No room.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.', signedIn: false }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id) return Response.json({ message: 'Which post?' }, { status: 400 });

  const { error } = await client.from('live_posts').delete().eq('id', id).eq('owner', caller.id);
  if (error) return Response.json(NOT_SET_UP, { status: 503 });
  return Response.json({ ok: true });
}

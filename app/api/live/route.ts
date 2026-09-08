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
import { readPlatformLink } from '@/app/lib/server/platformlink';
import { guard } from '@/app/lib/server/safety';
import { episodeAudioUrl } from '@/app/lib/episodeaudio';
import { storageId } from '@/app/lib/server/ownedpath';

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

  /* The hearts for everything on this page, in one read.

     Every heart for the forty visible posts rather than a count per post: a
     query per row is forty round trips for a number, and the rows are two
     uuids each. Counted here in JavaScript, which is the cheaper half.

     No counter column on `live_posts`. A count kept beside the rows it counts
     is a count that disagrees with them one day, and then nobody knows which
     one is true. */
  const ids = (posts ?? []).map((one) => one.id as string);
  const hearts = new Map<string, number>();
  const mineHearted = new Set<string>();
  if (ids.length > 0) {
    const { data: rows } = await client.from('live_hearts').select('post, owner').in('post', ids);
    for (const row of rows ?? []) {
      const post = row.post as string;
      hearts.set(post, (hearts.get(post) ?? 0) + 1);
      if (caller && row.owner === caller.id) mineHearted.add(post);
    }
  }

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
        hearts: hearts.get(post.id as string) ?? 0,
        /* Whether this reader has hearted it, so the button opens in the
           right state rather than filling in a moment later. False for
           somebody signed out, who can see the count and cannot add to it. */
        hearted: mineHearted.has(post.id as string),
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
    what?: 'hello' | 'post' | 'say' | 'elsewhere' | 'heart';
    visitor?: string;
    /** Which post a heart is for. Unused by everything else. */
    id?: string;
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

  /* ── A heart, on or off ───────────────────────────────────────────────
     One row per person per post, so pressing it again takes it back. The
     table's own primary key is what makes that true — a second heart cannot
     be inserted whatever this route does, which is a better place for the
     rule than a check here that somebody could later move or forget.

     No moderation gate. A heart carries no words: there is nothing in it to
     screen, and running the safety model over a boolean would be spending
     money to read an empty string. */
  if (body.what === 'heart') {
    const post = String(body.id ?? '').trim();
    if (!post) return Response.json({ message: 'Which post?' }, { status: 400 });

    const { data: already } = await client
      .from('live_hearts')
      .select('post')
      .eq('post', post)
      .eq('owner', caller.id)
      .maybeSingle();

    if (already) {
      const { error } = await client
        .from('live_hearts')
        .delete()
        .eq('post', post)
        .eq('owner', caller.id);
      if (error) return Response.json(NOT_SET_UP, { status: 503 });
      return Response.json({ ok: true, hearted: false });
    }

    /* The post id is not checked against `live_posts` first: the foreign key
       does that, and a read to find out what the write already enforces is a
       round trip for nothing. */
    const { error } = await client.from('live_hearts').insert({ post, owner: caller.id });
    if (error) {
      /* Two different things land here and they need different answers. A
         foreign key refusal means the post is gone. A duplicate key means two
         presses raced each other and the heart is already on — which is not a
         failure at all, and telling somebody their heart failed while it sits
         there filled in is worse than saying nothing.

         Read it back rather than parsing the driver's message, which is
         Postgres' wording and not ours to depend on. */
      const { data: landed } = await client
        .from('live_hearts')
        .select('post')
        .eq('post', post)
        .eq('owner', caller.id)
        .maybeSingle();
      if (landed) return Response.json({ ok: true, hearted: true });
      return Response.json(
        { message: 'That post is no longer in the room.' },
        { status: 404 },
      );
    }
    return Response.json({ ok: true, hearted: true });
  }

  const title = String(body.title ?? '').trim().slice(0, 200);
  if (!title) return Response.json({ message: 'Give it a name.' }, { status: 400 });
  const note = String(body.note ?? '').trim().slice(0, 500);

  const allowed = await guard(request, `${title}\n${note}`, 'room', caller);
  if (!allowed.ok) return allowed.response;

  if (body.what === 'elsewhere') {
    /* One of the seven, and nothing else.
 
       This used to take any https address, which is not a link field — it is
       a place to publish a URL of your choosing to everybody in the room,
       with nothing between it and wherever somebody wanted to send them
       except the scheme. A closed list is the whole of the answer: it does
       not make what is on the far end good, but it means the destination is
       a platform with its own moderation and its own reporting rather than
       an arbitrary server, and the room says exactly that where the link is
       shown. `scripts/check-platformlink.mts` holds the matching.
 
       The platform name comes back from the matcher rather than from the
       request. A label the client chooses is a label that can say "YouTube"
       over a link that goes somewhere else, and it is printed next to it. */
    const read = readPlatformLink(String(body.link ?? '').slice(0, 500));
    if (!read.ok) {
      return Response.json(
        {
          message:
            read.why === 'not_a_link'
              ? 'Paste a link to the video or the song.'
              : 'Links in the room have to go to YouTube, TikTok, Facebook, Vimeo, Spotify, Apple Music or SoundCloud — so everybody knows where a link goes before they press it.',
        },
        { status: 400 },
      );
    }
    const link = read.url;
    const platform = read.platform;
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
  /* This id is stored on the post and read back into a storage path when
     somebody plays it, so it is checked where it enters rather than where it
     is used — a bad shape saved now is a bad path built later, by code that
     has no idea the value came from a browser. */
  if (!storageId(sourceId)) return Response.json({ message: 'Which song?' }, { status: 400 });

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

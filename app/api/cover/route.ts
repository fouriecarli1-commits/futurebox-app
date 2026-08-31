/**
 * A cover for a song.
 *
 * Same shape as the video route and for the same reason: the engine answers
 * with an id and makes the picture afterwards, so this starts a job rather
 * than holding the line. It is quicker than a video — seconds, not minutes —
 * but quick is not instant, and a route that waits is a route that times out
 * on somebody's slow afternoon.
 *
 *   POST /api/cover          start one for a track; answers with an id
 *   GET  /api/cover?id=…     how is it going; the picture when it is done
 *   GET  /api/cover?track=…  is there already one for this track
 *
 * The file goes beside the audio at `<owner>/<trackId>.cover.png`, which is
 * why there is no migration here: the bucket already exists, the path is
 * derived rather than stored, and account deletion already sweeps everything
 * under `<owner>/`.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { CREDITS } from '@/app/lib/credits';
import { checkCover, configured, coverPrompt, startCover } from '@/app/lib/server/cover';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'tracks';
const LINK_SECONDS = 3600;

/** Derived, never stored: a function of who owns it and which song. */
const coverPath = (owner: string, trackId: string): string => `${owner}/${trackId}.cover.png`;

interface Body {
  trackId?: string;
  title?: string;
  genre?: string;
  style?: string;
}

async function link(client: NonNullable<ReturnType<typeof admin>>, path: string): Promise<string | null> {
  const { data } = await client.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
  return data?.signedUrl ?? null;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const trackId = url.searchParams.get('track');

  if (!id && !trackId) return Response.json({ available: configured() });

  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  // Asking about a track: is there one already, without generating anything.
  if (trackId && !id) {
    const { data } = await client.storage.from(BUCKET).list(caller.id, {
      search: `${trackId}.cover.png`,
      limit: 1,
    });
    return Response.json(
      data?.length
        ? { state: 'done', url: await link(client, coverPath(caller.id, trackId)) }
        : { state: 'none' },
    );
  }

  const progress = await checkCover(String(id));
  if (progress.state !== 'done') return Response.json(progress);

  // Fetched and kept, because their link expires and a cover a member cannot
  // open next week is not a cover they were given.
  const path = coverPath(caller.id, String(trackId ?? id));
  try {
    const file = await fetch(progress.url);
    if (!file.ok) throw new Error('download');
    const put = await client.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: 'image/png', upsert: true });
    if (put.error) throw put.error;
  } catch {
    // It exists at the engine and we could not keep a copy. Their URL is good
    // for a while yet, so hand that over rather than losing the picture.
    return Response.json({ state: 'done', url: progress.url, kept: false });
  }

  return Response.json({ state: 'done', url: await link(client, path), kept: true });
}

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const trackId = String(body.trackId ?? '').trim();
  if (!trackId) return Response.json({ message: 'Which song?' }, { status: 400 });

  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  // The style words came from a person and reach an image model, so they go
  // through the same gate everything else does. A named artist in a style
  // field is exactly as much of a problem on a sleeve as in a song.
  const allowed = await guard(request, `${body.title ?? ''} ${body.style ?? ''}`.trim(), 'video', caller);
  if (!allowed.ok) return allowed.response;

  if (!configured()) {
    return Response.json({ message: 'Cover art is not switched on for this app yet.' }, { status: 503 });
  }

  const paid = await charge(request, CREDITS.cover, 'cover', `cover:${trackId}:${Date.now()}`);
  if (!paid.ok) return paid.response;

  const started = await startCover(
    coverPrompt({
      title: String(body.title ?? ''),
      genre: String(body.genre ?? ''),
      style: String(body.style ?? ''),
    }),
  );
  if (!started.ok) {
    await paid.refund();
    return Response.json({ message: started.message }, { status: started.status });
  }

  return Response.json({ id: started.id, track: trackId, state: 'running' });
}

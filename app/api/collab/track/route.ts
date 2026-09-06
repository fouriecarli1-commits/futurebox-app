/**
 * A song a collaborator put in your room, so you can sing on it.
 *
 * ── The rule, and why it is this one ─────────────────────────────────────
 *
 * The audio bucket is private and every other route signs a path under the
 * *caller's own* id. That is the correct default and it is why a song
 * somebody sent you could be named in the room and never heard in it.
 *
 * The grant here is deliberately the narrowest one that makes the room
 * useful: **the audio is signed for you when its owner put that song into a
 * thread you are in, and that thread is accepted.**
 *
 * Not "the track is shared on the radar". Sharing on the radar is a decision
 * to be *matched*, and `radar.sql` is explicit that it hands over tempo, key
 * and style and not the audio. Treating it as permission to download would
 * quietly turn a discovery switch into a distribution one, for every shared
 * song on the platform, without anybody being asked.
 *
 * The message is the consent event. Somebody chose that song, that thread and
 * that person; the row is the record of it, and the row is what is checked.
 *
 * ── Why a signed URL rather than the bytes ───────────────────────────────
 *
 * Same as `track/download`: the bucket is private so the URL is the only way
 * in, it expires, and Supabase serves the file instead of this function
 * streaming megabytes through Vercel for no reason.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { filterSafe } from '@/app/lib/server/filtersafe';
import { storageId } from '@/app/lib/server/ownedpath';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'tracks';
/** Long enough to fetch on a slow line, short enough not to pass around. */
const VALID_SECONDS = 120;

export async function POST(request: Request): Promise<Response> {
  if (!metered()) {
    return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  }
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  let trackId = '';
  try {
    trackId = String(((await request.json()) as { trackId?: unknown }).trackId ?? '').slice(0, 100);
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }
  if (!trackId) return Response.json({ message: 'Which song?' }, { status: 400 });
  // Two rows have to name this id before it reaches a path, so traversal is
  // already unreachable here. Checked anyway: the rows are what makes it safe
  // today, and a later shortcut past them would not come with a reminder.
  if (!storageId(trackId)) return Response.json({ message: 'Which song?' }, { status: 400 });

  /* Refused rather than sent. An id that is not a UUID is not a caller this
     app made, and building a filter out of it is the one thing worth not
     doing — see `server/filtersafe.ts`. */
  if (!filterSafe(caller.id)) {
    return Response.json({ message: 'That song is not in a room you are in.' }, { status: 404 });
  }

  /* Every accepted thread this person is in. Read first, because the message
     lookup below is only meaningful inside one of them. */
  const { data: threads, error: threadError } = await client
    .from('collabs')
    .select('id, asked_by, asked_of')
    .eq('state', 'accepted')
    .or(`asked_by.eq.${caller.id},asked_of.eq.${caller.id}`);
  if (threadError) {
    return Response.json({ message: 'Collab is not set up on this app yet.' }, { status: 503 });
  }
  const mine = (threads ?? []) as { id: string; asked_by: string; asked_of: string }[];
  if (!mine.length) return Response.json({ message: 'That song is not in a room you are in.' }, { status: 404 });

  /* And the message that put this song in one of them. Whoever wrote it is
     the person handing the song over, so their id is the one the file is
     stored under — taken from the row rather than from anything the caller
     sent, which is the difference between a check and a formality. */
  const { data: said } = await client
    .from('collab_messages')
    .select('owner, collab')
    .eq('track_id', trackId)
    .in('collab', mine.map((one) => one.id))
    .limit(1)
    .maybeSingle();
  const from = (said as { owner?: string } | null)?.owner;
  if (!from) {
    // Not there and not yours read the same way on purpose. Telling somebody a
    // song exists but is not theirs tells them a song exists.
    return Response.json({ message: 'That song is not in a room you are in.' }, { status: 404 });
  }

  const { data: row } = await client
    .from('tracks')
    .select('id, owner, title, genre, bpm, song_key, lyrics, style, models, seconds, created_at, seed')
    .eq('id', trackId)
    .maybeSingle();
  const track = row as Record<string, unknown> | null;
  if (!track || track.owner !== from) {
    return Response.json({ message: 'That song is not in a room you are in.' }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { data: signed, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(`${from}/${trackId}.wav`, VALID_SECONDS);
  if (error || !signed?.signedUrl) {
    return Response.json(
      { message: 'They put that song in the room, but its file is not on their account — it may only be on the device that made it.' },
      { status: 404 },
    );
  }

  return Response.json({
    url: signed.signedUrl,
    expiresIn: VALID_SECONDS,
    track: {
      id: String(track.id),
      title: String(track.title ?? 'Their song'),
      genre: String(track.genre ?? ''),
      bpm: Number(track.bpm) || 0,
      key: String(track.song_key ?? ''),
      lyrics: String(track.lyrics ?? ''),
      style: String(track.style ?? ''),
      models: Array.isArray(track.models) ? track.models.map(String) : [],
      seconds: Number(track.seconds) || 0,
      createdAt: String(track.created_at ?? new Date().toISOString()),
      seed: Number(track.seed) || 0,
    },
  });
}

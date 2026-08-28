/**
 * Publishing an episode.
 *
 * This is the moment a file goes onto the open internet under somebody's name,
 * so it is the moment the app has to be plainest: the bucket is public, the
 * feed is public, and podcast apps will keep fetching that URL for years. The
 * screen says so before the button is pressed; this route enforces the rest.
 *
 * How the episode was made is stored and printed on it — recorded, cleaned, or
 * read aloud by a cloned voice. The provenance rule this app already applies
 * to lectures applies here too: a listener must never have to work out unaided
 * that a voice was synthesised.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { PODCAST_CAPS } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Roughly two hours at a spoken-word bitrate. */
const MAX_BYTES = 120_000_000;
const MADE = ['recorded', 'cleaned', 'spoken'];

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });
  if (!PODCAST_CAPS[caller.tier].publish) {
    return Response.json({ message: 'Publishing needs a paid plan.', needsPlan: true }, { status: 402 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the episode.' }, { status: 400 });
  }

  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ message: 'There was no audio in that.' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ message: 'That episode is too large to publish here.' }, { status: 413 });
  }

  const title = String(form.get('title') ?? '').trim().slice(0, 200);
  if (!title) return Response.json({ message: 'An episode needs a title.' }, { status: 400 });

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const { data: show } = await client.from('shows').select('id').eq('owner', caller.id).maybeSingle();
  if (!show) return Response.json({ message: 'Make the show first.' }, { status: 400 });

  const made = String(form.get('made') ?? 'recorded');
  const id = `e-${Date.now()}`;
  // The first path segment is the owner, which is what the storage policy
  // checks. Everything about who may write where hangs off that.
  const path = `${caller.id}/${id}.mp3`;

  const { error: upload } = await client.storage
    .from('episodes')
    .upload(path, audio, { contentType: 'audio/mpeg', upsert: false });
  if (upload) return Response.json({ message: upload.message }, { status: 500 });

  const row = {
    id,
    show_id: show.id,
    owner: caller.id,
    title,
    notes: String(form.get('notes') ?? '').trim().slice(0, 8_000),
    audio_path: path,
    seconds: Math.max(0, Math.round(Number(form.get('seconds') ?? 0)) || 0),
    bytes: audio.size,
    made: MADE.indexOf(made) === -1 ? 'recorded' : made,
  };

  const { error } = await client.from('episodes').insert(row);
  if (error) {
    // Nothing half-published: the file goes back if the row will not.
    await client.storage.from('episodes').remove([path]);
    return Response.json({ message: error.message }, { status: 500 });
  }

  return Response.json({ episode: row });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id') ?? '';
  const client = admin();
  if (!id || !client) return Response.json({ message: 'Which episode?' }, { status: 400 });

  const { data: episode } = await client
    .from('episodes')
    .select('id, audio_path')
    .eq('id', id)
    .eq('owner', caller.id)
    .maybeSingle();
  if (!episode) return Response.json({ message: 'Not found.' }, { status: 404 });

  await client.storage.from('episodes').remove([episode.audio_path]);
  await client.from('episodes').delete().eq('id', id).eq('owner', caller.id);
  return new Response(null, { status: 204 });
}
